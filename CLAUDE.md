# Stav: migrace exportu menu z Placid/n8n na vlastní PDF šablony

Datum: 2026-05-27

## Cíl

Nahradit pipeline `App → n8n webhook → Placid → PNG` přímým vyplňováním PDF AcroForm šablon přes `pdf-lib` v Next.js API route. Placid/n8n je zachován jako fallback přes toggle.

## Architektura

```
[Nastavení page]  →  upload PDF → Supabase Storage (bucket `menu-templates`)
[Export page]     →  toggle "Vlastní PDF" → POST /api/fill-pdf
                                              ├─ fetch template (public URL)
                                              ├─ pdf-lib + fontkit
                                              ├─ embed Inter + Calistoga
                                              ├─ setText + updateAppearances per field
                                              └─ flatten + save → vrátí PDF binárně
```

## Co je hotové ✅

- `pdf-lib` + `@pdf-lib/fontkit` nainstalované
- **Supabase Storage bucket `menu-templates`** (public) + RLS policy `Authenticated can manage menu-templates`
- Stránka **`/nastaveni`** — 3 upload sloty (Polévky / Hlavní chod / Týdenní menu), badge Nahrána/Chybí, návod na konvenci pojmenování polí
- Položka **"Nastavení"** v sidebaru
- API route **`/api/fill-pdf`** s top-level try/catch, podrobnými logy `[fill-pdf]` a chybovými JSON odpověďmi
- Toggle **Placid (n8n) / Vlastní PDF** na export stránce (preference se ukládá do localStorage)
- iframe preview pro PDF výstup (jednotlivě i hromadně)
- Download tlačítka s dynamickou příponou `.pdf` vs `.png`
- Fonty `Inter_18pt-Light.ttf` + `Calistoga-Regular.ttf` v adresáři **`fonts/`** (v root projektu, NE v public/)
- Mapování fontů: `*_cz`, `*_en` → Calistoga · `*_price`, `*_allergens` → Inter
- `subset: false` při embed (subsetting měl bug se ztrátou glyfů)
- Per-field `updateAppearances(font)` + safety net `form.updateFieldAppearances(bodyFont)`
- `save({ updateFieldAppearances: false })` aby pdf-lib znovu nepřepsal appearance Helvetica fontem

## Co stále vázne / kde jsme skončili ⚠️

Uživatel poslal screenshot kde už PDF generuje a **český text se renderuje správně** (Hráškový krém se slaninovým chipsem, krutony / Pea cream with bacon chip and croutons), ale stěžoval si: **"furt to není ono, můžeš použít ty fonty co máš nahrané?"**

Reakce: rozdělil jsem fonty per-field (Calistoga pro názvy, Inter pro čísla). **Uživatel ještě nepotvrdil, zda je to teď OK** — čekáme na nový screenshot.

## Podezřelé věci k dořešení po návratu

1. **Druhá polévka — řádek s alergenem působí "useknutý"** na screenshotu (vidět jen "/ /"). Možná je alergen pole prázdné a render dělá artefakt, nebo je layout PDF šablony tak, že druhé pole je mimo viditelný region. Ověřit na novém výstupu.
2. **Inter Light může být pořád příliš tenký** — pokud uživatel chce tučnější, stáhnout `Inter_18pt-Regular.ttf` nebo `-Medium.ttf` z Google Fonts a hodit do `fonts/`, pak jen změnit cestu v [src/app/api/fill-pdf/route.ts](src/app/api/fill-pdf/route.ts#L11-L14).
3. **Calistoga je velmi decorative serif** — možná není ideální pro běžné názvy jídel. Možnost: prohodit Inter pro názvy + Calistoga pro značku/headery (ale headery jsou součástí PDF šablony, ne AcroForm pole).
4. **Pravidlo `pickFontForField`** je hardcoded podle suffixu. Pokud uživatel bude chtít jinak (např. všechno Inter Regular), upravit funkci v [src/app/api/fill-pdf/route.ts](src/app/api/fill-pdf/route.ts#L18-L21).

## Klíčové soubory

| Soubor | Co dělá |
|---|---|
| [src/app/api/fill-pdf/route.ts](src/app/api/fill-pdf/route.ts) | API endpoint — stáhne šablonu, embedne fonty, vyplní AcroForm pole, flatten, vrátí PDF |
| [src/app/(app)/nastaveni/page.tsx](src/app/(app)/nastaveni/page.tsx) | Upload UI pro 3 PDF šablony do Supabase Storage |
| [src/app/(app)/export/page.tsx](src/app/(app)/export/page.tsx) | Export stránka s Placid/Vlastní PDF toggle + iframe preview |
| [src/components/layout/sidebar.tsx](src/components/layout/sidebar.tsx) | Sidebar nav (přidána položka Nastavení) |
| [src/lib/types.ts](src/lib/types.ts) | Type `PdfTemplate` |
| [fonts/](fonts/) | Lokální TTF fonty (NE `public/fonts/` — server čte přes `fs` z `process.cwd()/fonts/`) |

## Důležité konvence

### Pojmenování AcroForm polí v PDF šablonách
- Polévky (2 položky): `soup1_cz`, `soup1_en`, `soup1_price`, `soup1_allergens`, `soup2_*`
- Hlavní chod (5 položek): `main1_*` … `main5_*` (4 pole × 5)
- Týdenní menu (2 hlavní jídla): `main1_*` … `main2_*` (4 pole × 2)

### Supabase Storage struktura
- Bucket: `menu-templates` (public)
- Cesta: `{user.id}/{variant}.pdf` (např. `6d0316a2-adf1-4b83-b9fb-c4502762a001/weekly.pdf`)
- RLS policy: `Authenticated can manage menu-templates` — `FOR ALL TO authenticated USING/WITH CHECK (bucket_id = 'menu-templates')`
  - Pozn: per-user izolace je vypnutá (zjednodušeno po RLS chybách); pro produkci přidat zpět `(storage.foldername(name))[1] = auth.uid()::text`

### Načítání fontů v API route
- `path.join(process.cwd(), 'fonts', FILENAME)` + `fs.readFile`
- Cached v module-scoped Map `fontCache`
- **Důležité pro deploy:** složka `fonts/` v rootu projektu musí být součástí deployment artefaktu (Next.js standalone build by ji měl převzít, ale ověřit)

## Pipeline historie problémů (chronologicky)

1. ❌ **RLS violation při uploadu** → vyřešeno zjednodušením policy na `FOR ALL TO authenticated`
2. ❌ **500 "Cannot fetch Unicode font (HTTP 404)"** → CDN URL pro Roboto byla špatná → přešli jsme na lokální `fonts/`
3. ❌ **500 "Object not found"** → uživatel měl nahrané jen šablony pro některé sekce, snažil se vyexportovat jinou → vylepšili jsme chybovou hlášku
4. ❌ **500 "WinAnsi cannot encode 'ř'"** → vyřešeno embedem Unicode fontu + `pdfDoc.registerFontkit(fontkit)`
5. ❌ **Output potrhaný, jen pár znaků** ("p, ut, y") → vyřešeno `subset: false` + per-field `updateAppearances`
6. 🟡 **Text se rendruje správně, ale uživatel chce použít OBA uploadované fonty** → udělal jsem per-field mapping; čeká se na potvrzení

## Jak debugovat dál

1. Browser DevTools Console → hledat `[fill-pdf client]`
2. Terminál kde běží `npm run dev` → hledat `[fill-pdf]` server logy (přehled jakých polí v šabloně bylo, jaká byla vyplněna, jaká neznámá)
3. HTTP response headers obsahují `X-Fields-Filled` a `X-Fields-Unknown`

## TODO po dokončení font finetuningu

- [ ] Vrátit per-user RLS izolaci v Storage policy (jakmile bude flow stabilní)
- [ ] Smazat n8n `/api/export-menu` route po úplném přechodu (zatím necháno jako fallback)
- [ ] Případně přidat PNG render z PDF (přes pdfjs/pdf-to-png) — uživatel zatím odložil ("Jen PDF zatím")
- [ ] Ověřit že `fonts/` se dostane do production buildu
- [ ] Lépe zarovnat / format empty allergens (nezobrazovat "/ /" pro prázdné)
