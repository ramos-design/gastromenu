import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument, PDFFont } from 'pdf-lib';
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

// Pravidlo: názvy jídel (_cz, _en) → display font (Calistoga), zbytek → body font (Inter).
function pickFontForField(fieldName: string, fonts: { body: PDFFont; display: PDFFont }): PDFFont {
  if (/_(cz|en)$/i.test(fieldName)) return fonts.display;
  return fonts.body;
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

    const unknownFields: string[] = [];
    const filledFields: string[] = [];

    for (const [name, rawValue] of Object.entries(fields)) {
      if (!fieldNames.has(name)) {
        unknownFields.push(name);
        continue;
      }
      const value = rawValue == null ? '' : String(rawValue);
      const fontForField = pickFontForField(name, fonts);
      try {
        const tf = form.getTextField(name);
        tf.setText(value);
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
