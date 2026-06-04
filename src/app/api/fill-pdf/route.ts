import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument, PDFFont, TextAlignment, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Local Unicode fonts (Czech-friendly), loaded from the project's /fonts directory.
const FONT_FILES = {
  body: 'Inter_18pt-Light.ttf',
  display: 'Calistoga-Regular.ttf',
} as const;

const fontCache: Partial<Record<keyof typeof FONT_FILES, Buffer>> = {};
async function loadFontBytes(kind: keyof typeof FONT_FILES): Promise<Buffer> {
  if (fontCache[kind]) return fontCache[kind]!;
  const fontPath = path.join(process.cwd(), 'fonts', FONT_FILES[kind]);
  const bytes = await readFile(fontPath);
  fontCache[kind] = bytes;
  return bytes;
}

// Pravidlo: názvy jídel (_cz, _en) i ceny (_price) → display font (Calistoga), zbytek → body font (Inter).
function pickFontForField(fieldName: string, fonts: { body: PDFFont; display: PDFFont }): PDFFont {
  if (/_(cz|en|price)$/i.test(fieldName)) return fonts.display;
  return fonts.body;
}

// Pevná velikost fontu podle typu pole (shodná s návrhem šablony Polévky), aby texty byly
// konzistentní napříč šablonami a nedocházelo k auto-size nafouknutí / ořezu.
function pickFontSizeForField(fieldName: string): number {
  if (/_price$/i.test(fieldName)) return 12;
  if (/_allergens$/i.test(fieldName)) return 7;
  if (/_(cz|en)$/i.test(fieldName)) return 11;
  return 11;
}

// O kolik PDF bodů posunout cenu doleva, aby nekončila úplně u kraje stránky, ale srovnala
// se zhruba s koncem horní oddělovací čáry. POZOR: cena je zarovnaná doprava, proto neposouváme
// celé pole (to by posunulo i LEVOU hranu do pole názvu a jeho neprůhledné pozadí by ořízlo
// konec dlouhých názvů). Místo toho jen ZÚŽÍME pole zprava (posuneme pravou hranu doleva),
// levá hrana zůstává → pole názvu se nikdy nepřekryje. Text ceny skončí na stejném místě.
const PRICE_LEFT_SHIFT = 18;

// O kolik zvětšit pole názvu jídla dolů, aby se dlouhý název zalomil na 2. řádek místo ořezu.
const NAME_FIELD_EXTRA = 24;
// O kolik posunout pole alergenů dolů, ať skončí pod (případně 2řádkovým) názvem a nepřekryje se.
const ALLERGEN_DOWN_SHIFT = 20;

// --- Patičková poznámka (jen šablony Hlavní chod + Týdenní menu, tj. s poli mainN_) ---
// Text se vykreslí AŽ PO flatten(), takže je vždy navrch a nic ho nepřekreslí.
// Kreslí se DVĚ verze: česká do levého sloupce, anglická do pravého — každá vystředěná
// ve svém sloupci, takže ani jedna nepřekročí střed stránky.
const FOOTER_NOTE_TEXT_CZ = 'K týdennímu menu Romerquelle voda 0,33l za 45,-';
const FOOTER_NOTE_TEXT_EN = 'With the weekly menu Romerquelle water 0.33l for 45,-';
const FOOTER_NOTE_SIZE = 8; // velikost fontu poznámky (malým)

// Vodorovné středy sloupců jako podíl šířky stránky (levý = CZ, pravý = EN).
const FOOTER_NOTE_LEFT_FRAC = 0.25;
const FOOTER_NOTE_RIGHT_FRAC = 0.75;

// Svislá pozice (PDF body od spodního okraje):
// Týdenní menu (2 jídla) → NAD řádkem "...podáváme od 11-15 hodin".
const FOOTER_NOTE_WEEKLY_Y = 210;
// Hlavní chod (5 jídel) → dole nad spodní oddělovací čarou.
const FOOTER_NOTE_MAIN_Y = 96;

// --- Řádka "Týdenní menu podáváme od 11-15 hodin" (jen šablona Týdenní menu) ---
// V šabloně je tato řádka zapečená do grafiky a VLEVO zarovnaná v každé půlce.
// Uživatel ji chce vystředěnou v každé půlce a STEJNÝM fontem i velikostí jako poznámku
// o vodě nad ní. Zapečený text nejde editovat, proto ho zakryjeme bílým pruhem a vykreslíme
// znovu na střed přesně stejným stylem jako poznámku o vodě (bodyFont, FOOTER_NOTE_SIZE, šedá).
// Souřadnice (PDF body) jsou naměřené z nahrané weekly.pdf (842×595; spodní čára ~y176,
// poznámka o vodě ~y210) — při výměně šablony za jinak řešenou je nutné je přeměřit.
const SERVE_NOTE_TEXT_CZ = 'Týdenní menu podáváme od 11-15 hodin';
const SERVE_NOTE_TEXT_EN = 'The weekly menu is available from 11:00 to 15:00';
const SERVE_NOTE_Y = 187; // účaří vystředěného textu (nad spodní oddělovací čarou)
const SERVE_NOTE_MASK_Y = 181; // spodní hrana bílého maskovacího pruhu (nad čarou ~176)
const SERVE_NOTE_MASK_H = 20; // výška pruhu — kryje původní (větší) text do ~y201

// Cenová pole vždy zakončit " Kč" (pokud tam měna ještě není a hodnota není prázdná).
function formatFieldValue(fieldName: string, value: string): string {
  if (!/_price$/i.test(fieldName)) return value;
  const trimmed = value.trim();
  if (trimmed === '') return trimmed;
  if (/kč/i.test(trimmed)) return trimmed;
  return `${trimmed} Kč`;
}

type FillPdfBody = {
  templateUrl: string;
  fields: Record<string, string | number>;
  filename?: string;
  flatten?: boolean;
};

function errorResponse(message: string, status: number, extra?: Record<string, unknown>) {
  console.error(`[fill-pdf] ${status} — ${message}`, extra ?? '');
  return NextResponse.json({ message, ...(extra || {}) }, { status });
}

export async function POST(request: NextRequest) {
  try {
    let body: FillPdfBody;
    try {
      body = await request.json();
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }

    const { templateUrl, fields, filename = 'menu.pdf', flatten = true } = body;

    if (!templateUrl || typeof templateUrl !== 'string') {
      return errorResponse('Missing templateUrl', 400);
    }
    if (!fields || typeof fields !== 'object') {
      return errorResponse('Missing fields', 400);
    }

    console.log('[fill-pdf] start', {
      templateUrl,
      fieldCount: Object.keys(fields).length,
      filename,
    });

    let templateBytes: ArrayBuffer;
    try {
      const r = await fetch(templateUrl, { cache: 'no-store' });
      if (!r.ok) {
        const bodyText = await r.text().catch(() => '');
        const isMissing =
          r.status === 404 || /not[_ ]found/i.test(bodyText) || /Object not found/i.test(bodyText);
        const msg = isMissing
          ? 'Šablona pro tuto sekci ještě nebyla nahrána. Otevřete Nastavení a nahrajte PDF šablonu.'
          : `Šablonu se nepodařilo stáhnout (HTTP ${r.status}). Zkontrolujte, že je bucket veřejný.`;
        return errorResponse(msg, isMissing ? 404 : 502, {
          templateUrl,
          status: r.status,
          body: bodyText.slice(0, 500),
        });
      }
      templateBytes = await r.arrayBuffer();
      console.log('[fill-pdf] template fetched', { size: templateBytes.byteLength });
    } catch (e) {
      return errorResponse(
        `Template fetch failed: ${e instanceof Error ? e.message : 'unknown'}`,
        502,
      );
    }

    let pdfDoc: PDFDocument;
    try {
      pdfDoc = await PDFDocument.load(templateBytes);
      pdfDoc.registerFontkit(fontkit);
    } catch (e) {
      return errorResponse(
        `Šablona není platné PDF: ${e instanceof Error ? e.message : 'unknown'}`,
        422,
      );
    }

    let bodyFont: PDFFont;
    let displayFont: PDFFont;
    try {
      const [bodyBytes, displayBytes] = await Promise.all([
        loadFontBytes('body'),
        loadFontBytes('display'),
      ]);
      // subset: false — celý font, žádný subsetting bug v kombinaci s updateAppearances.
      bodyFont = await pdfDoc.embedFont(bodyBytes, { subset: false });
      displayFont = await pdfDoc.embedFont(displayBytes, { subset: false });
    } catch (e) {
      return errorResponse(
        `Nelze načíst Unicode fonty ze složky fonts/: ${e instanceof Error ? e.message : 'unknown'}. Zkontrolujte, že soubory existují: ${Object.values(FONT_FILES).join(', ')}.`,
        500,
      );
    }
    const fonts = { body: bodyFont, display: displayFont };

    let form: ReturnType<PDFDocument['getForm']>;
    let formFields: ReturnType<typeof form.getFields>;
    try {
      form = pdfDoc.getForm();
      formFields = form.getFields();
    } catch (e) {
      return errorResponse(
        `Nelze číst formulářová pole: ${e instanceof Error ? e.message : 'unknown'}`,
        422,
      );
    }

    const fieldNames = new Set(formFields.map(f => f.getName()));
    console.log('[fill-pdf] form fields in template:', Array.from(fieldNames));

    if (formFields.length === 0) {
      return errorResponse(
        'PDF šablona neobsahuje žádná formulářová pole (AcroForm). Otevřete šablonu v Adobe Acrobat → Prepare Form (nebo v Affinity) a přidejte textová pole s názvy podle konvence.',
        422,
      );
    }

    // --- Dynamické svislé rozložení pro šablonu Hlavní chod ---
    // Šablona má pevných 5 slotů (main1..main5). Když je vyplněno méně jídel,
    // přepozicujeme JEN vyplněné sloty tak, aby se rovnoměrně rozprostřely přes
    // celou plochu (nezůstane prázdné místo dole). Týká se pouze šablon s ≥3 sloty
    // "mainN_" (Hlavní chod). Týdenní menu (jen main1/main2) zůstává beze změny.
    // Pozice se mění PŘED vyplněním, takže navazující posuny (název/cena/alergeny)
    // se počítají už z nových souřadnic.
    try {
      const mainSlotIdx = (n: string) => {
        const m = /^main(\d+)_cz$/i.exec(n);
        return m ? parseInt(m[1], 10) : 0;
      };
      const slots = Array.from(fieldNames).map(mainSlotIdx).filter(i => i > 0);
      const maxSlot = slots.length ? Math.max(...slots) : 0;
      if (maxSlot >= 3) {
        // Export plní jídla souvisle od main1; počet = poslední vyplněný název.
        let filledCount = 0;
        for (let i = 1; i <= maxSlot; i++) {
          const v = fields[`main${i}_cz`];
          if (v != null && String(v).trim() !== '') filledCount = i;
        }
        if (filledCount >= 1) {
          // Geometrie plochy Hlavního chodu. Jídla kotvíme OD HORNÍHO okraje (Y_TOP, hned
          // pod hlavičkou) a rozteč zastropujeme (MAX_PITCH), aby se 5 jídel netlačilo až
          // k patičkové čáře a poznámce o vodě. Y_BOT_LIMIT = nejnižší přípustná pozice
          // posledního jídla (nad patičkou) — drží spodní jídlo bezpečně nad čarou.
          const Y_TOP = 450, Y_BOT_LIMIT = 180, MAX_PITCH = 78;
          const rowsFor = (count: number): number[] => {
            if (count <= 1) return [Y_TOP];
            // Rozteč: vejít se mezi Y_TOP a Y_BOT_LIMIT, ale nikdy víc než MAX_PITCH.
            // Málo jídel → větší (ale ne přehnané) mezery; 5 jídel → kompaktnější rozložení.
            const pitch = Math.min(MAX_PITCH, (Y_TOP - Y_BOT_LIMIT) / (count - 1));
            return Array.from({ length: count }, (_, k) => Y_TOP - k * pitch);
          };
          const rows = rowsFor(filledCount);
          for (let i = 1; i <= filledCount; i++) {
            let baseYcz: number | null = null;
            try {
              baseYcz = form.getTextField(`main${i}_cz`).acroField.getWidgets()[0]?.getRectangle().y ?? null;
            } catch { /* pole chybí */ }
            if (baseYcz == null) continue;
            const dy = rows[i - 1] - baseYcz;
            if (Math.abs(dy) < 0.01) continue;
            // Posuň CELÝ řádek (název CZ/EN, cena, alergeny — i jejich druhé widgety) o dy.
            for (const suffix of ['cz', 'en', 'price', 'allergens']) {
              let f: ReturnType<typeof form.getTextField>;
              try { f = form.getTextField(`main${i}_${suffix}`); } catch { continue; }
              for (const w of f.acroField.getWidgets()) {
                const r = w.getRectangle();
                w.setRectangle({ x: r.x, y: r.y + dy, width: r.width, height: r.height });
              }
            }
          }
          console.log('[fill-pdf] dynamic mains layout — filled', filledCount, 'rows', rows.map(r => Math.round(r)));
        }
      }
    } catch (e) {
      console.warn('[fill-pdf] dynamic mains layout failed', e);
    }

    const unknownFields: string[] = [];
    const filledFields: string[] = [];

    for (const [name, rawValue] of Object.entries(fields)) {
      if (!fieldNames.has(name)) {
        unknownFields.push(name);
        continue;
      }
      const value = formatFieldValue(name, rawValue == null ? '' : String(rawValue));
      // Prázdná hodnota → nevyplňovat; pole se níže přemaskuje bílým obdélníkem
      // (jinak by prosvítal placeholder zapečený v obsahu šablony).
      if (value.trim() === '') continue;
      const fontForField = pickFontForField(name, fonts);
      try {
        const tf = form.getTextField(name);
        tf.setText(value);
        // Cenu zarovnat doprava a posunout doleva ZÚŽENÍM pole zprava (levá hrana zůstává,
        // aby pole ceny nepřekrylo a neořízlo konec dlouhých názvů — viz PRICE_LEFT_SHIFT).
        if (/_price$/i.test(name)) {
          try {
            tf.setAlignment(TextAlignment.Right);
            for (const widget of tf.acroField.getWidgets()) {
              const rect = widget.getRectangle();
              widget.setRectangle({
                x: rect.x,
                y: rect.y,
                width: Math.max(20, rect.width - PRICE_LEFT_SHIFT),
                height: rect.height,
              });
            }
          } catch (e) {
            console.warn(`[fill-pdf] price alignment on "${name}" failed`, e);
          }
        }
        // Názvy jídel: povolit víceřádkový text a zvětšit pole dolů, aby se dlouhý název
        // zalomil na další řádek místo ořezu na konci.
        if (/_(cz|en)$/i.test(name)) {
          try {
            tf.enableMultiline();
            for (const widget of tf.acroField.getWidgets()) {
              const rect = widget.getRectangle();
              widget.setRectangle({
                x: rect.x,
                y: rect.y - NAME_FIELD_EXTRA,
                width: rect.width,
                height: rect.height + NAME_FIELD_EXTRA,
              });
            }
          } catch (e) {
            console.warn(`[fill-pdf] multiline on "${name}" failed`, e);
          }
        }
        // Alergeny posunout dolů, ať skončí pod (případně 2řádkovým) názvem a nepřekryjí se.
        if (/_allergens$/i.test(name)) {
          try {
            for (const widget of tf.acroField.getWidgets()) {
              const rect = widget.getRectangle();
              widget.setRectangle({
                x: rect.x,
                y: rect.y - ALLERGEN_DOWN_SHIFT,
                width: rect.width,
                height: rect.height,
              });
            }
          } catch (e) {
            console.warn(`[fill-pdf] allergen shift on "${name}" failed`, e);
          }
        }
        // Pevná velikost fontu (shodná napříč šablonami), ať se text nenafoukne auto-sizem.
        try {
          tf.setFontSize(pickFontSizeForField(name));
        } catch (e) {
          console.warn(`[fill-pdf] setFontSize on "${name}" failed`, e);
        }
        // Per-field font + regenerace appearance streamu (Calistoga pro názvy, Inter pro zbytek).
        try {
          tf.updateAppearances(fontForField);
        } catch (e) {
          console.warn(`[fill-pdf] updateAppearances on "${name}" failed`, e);
        }
        filledFields.push(name);
      } catch (e) {
        console.warn(`[fill-pdf] field "${name}" exists but is not a text field — skipped`, e);
      }
    }

    console.log('[fill-pdf] filled', filledFields.length, '/ unknown in template:', unknownFields);

    // Prázdná datová pole (alergeny / soupN_ / mainN_) odsunout MIMO stránku ještě
    // PŘED flatten. Důvod: flatten zploští i prázdné pole a jeho appearance (bílé
    // pozadí pole) přitom překreslí obsah, který do jeho obdélníku zasahuje — typicky
    // spodní řádek víceřádkového názvu nad polem alergenů. Posun mimo stránku zařídí,
    // že se prázdné pole zploští "do prázdna" a nic nepřekreslí.
    // (Šablony jsou čisté, bez zapečených placeholderů, takže není co maskovat.)
    const filledSet = new Set(filledFields);
    const isDataField = (n: string) => /allerg/i.test(n) || /^(soup|main)\d+_/i.test(n);
    const movedFields: string[] = [];
    for (const field of formFields) {
      const name = field.getName();
      if (filledSet.has(name) || !isDataField(name)) continue;
      try {
        // hodnotu taky vyprázdnit (kdyby flatten selhal a pole zůstalo interaktivní)
        try {
          form.getTextField(name).setText('');
        } catch {
          /* není textové pole */
        }
        for (const widget of field.acroField.getWidgets()) {
          const r = widget.getRectangle();
          widget.setRectangle({ x: -10000, y: -10000, width: r.width, height: r.height });
        }
        movedFields.push(name);
      } catch (e) {
        console.warn(`[fill-pdf] moving empty field "${name}" off-page failed`, e);
      }
    }
    if (movedFields.length) {
      console.log('[fill-pdf] moved empty data fields off-page:', movedFields);
    }

    // Bezpečnostní síť — pokud zůstala pole bez aktualizace, dorenderujeme je body fontem.
    try {
      form.updateFieldAppearances(bodyFont);
    } catch (e) {
      console.warn('[fill-pdf] form.updateFieldAppearances failed', e);
    }

    if (flatten) {
      try {
        form.flatten();
      } catch (e) {
        console.warn('[fill-pdf] flatten failed, keeping interactive form', e);
      }
    }

    // Patičková poznámka — jen u šablon Hlavní chod / Týdenní menu (mají pole mainN_).
    // Kreslíme AŽ TADY (po flatten), aby byla vždy na vrchu a nepřekryla ji žádná appearance pole.
    try {
      const mainSlot = (n: string) => {
        const m = /^main(\d+)_cz$/i.exec(n);
        return m ? parseInt(m[1], 10) : 0;
      };
      const maxMainSlot = Math.max(0, ...Array.from(fieldNames).map(mainSlot));
      if (maxMainSlot >= 1) {
        // ≤2 jídla → Týdenní menu (poznámka nad patičkovou větou);
        // ≥3 jídel → Hlavní chod (poznámka dole nad spodní čarou).
        const isWeekly = maxMainSlot <= 2;
        const noteY = isWeekly ? FOOTER_NOTE_WEEKLY_Y : FOOTER_NOTE_MAIN_Y;

        const page = pdfDoc.getPage(0);
        const { width } = page.getSize();
        // Vykreslí text vystředěný kolem zadaného vodorovného podílu šířky stránky.
        // y lze přepsat (výchozí = noteY) — využívá i řádka o čase níže, aby měla
        // identický font, velikost i barvu jako poznámka o vodě.
        const drawCentered = (text: string, frac: number, y: number = noteY) => {
          const tw = bodyFont.widthOfTextAtSize(text, FOOTER_NOTE_SIZE);
          page.drawText(text, {
            x: Math.max(0, width * frac - tw / 2),
            y,
            size: FOOTER_NOTE_SIZE,
            font: bodyFont,
            color: rgb(0.25, 0.25, 0.25),
          });
        };
        drawCentered(FOOTER_NOTE_TEXT_CZ, FOOTER_NOTE_LEFT_FRAC); // levý (CZ) sloupec
        drawCentered(FOOTER_NOTE_TEXT_EN, FOOTER_NOTE_RIGHT_FRAC); // pravý (EN) sloupec

        // Týdenní menu: zapečenou (vlevo zarovnanou) řádku "podáváme od 11-15 hodin"
        // přemažeme bílým pruhem a vykreslíme znovu vystředěnou v každé půlce — stejným
        // fontem, velikostí i barvou jako poznámku o vodě. (Hlavní chod tuto řádku nemá.)
        if (isWeekly) {
          page.drawRectangle({ x: 18, y: SERVE_NOTE_MASK_Y, width: 388, height: SERVE_NOTE_MASK_H, color: rgb(1, 1, 1) });
          page.drawRectangle({ x: 436, y: SERVE_NOTE_MASK_Y, width: 388, height: SERVE_NOTE_MASK_H, color: rgb(1, 1, 1) });
          drawCentered(SERVE_NOTE_TEXT_CZ, FOOTER_NOTE_LEFT_FRAC, SERVE_NOTE_Y); // levý (CZ) sloupec
          drawCentered(SERVE_NOTE_TEXT_EN, FOOTER_NOTE_RIGHT_FRAC, SERVE_NOTE_Y); // pravý (EN) sloupec
        }
        console.log('[fill-pdf] footer notes drawn', {
          template: isWeekly ? 'weekly' : 'mains',
          y: noteY,
          size: FOOTER_NOTE_SIZE,
        });
      }
    } catch (e) {
      console.warn('[fill-pdf] footer note draw failed', e);
    }

    let out: Uint8Array;
    try {
      out = await pdfDoc.save({ updateFieldAppearances: false });
    } catch (e) {
      return errorResponse(
        `Uložení PDF selhalo: ${e instanceof Error ? e.message : 'unknown'}`,
        500,
      );
    }

    console.log('[fill-pdf] done', { outputBytes: out.byteLength });

    return new NextResponse(out, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
        'Cache-Control': 'no-store',
        'X-Fields-Filled': String(filledFields.length),
        'X-Fields-Unknown': unknownFields.join(',').slice(0, 800),
      },
    });
  } catch (e) {
    return errorResponse(
      `Neočekávaná chyba: ${e instanceof Error ? e.message : 'unknown'}`,
      500,
      { stack: e instanceof Error ? e.stack?.slice(0, 1500) : undefined },
    );
  }
}
