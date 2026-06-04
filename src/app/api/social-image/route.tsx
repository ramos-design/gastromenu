import { NextRequest, NextResponse } from 'next/server';
import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Sociální export: barevný obrázek menu 1080×1440 (Instagram portrét).
// Šablona je definovaná JEDNOU v kódu (SocialMenuCard) — při každém exportu se
// předají jen data jídel, grafika se nemění. Renderuje se přes next/og (Satori).
// Výstup je PNG; JPG si klient odvodí přes <canvas>.
// ---------------------------------------------------------------------------

// --- Brand barvy (odvozené z globals.css) ---
const CREAM = '#FFFCF0'; // hsl(47 100% 97%) — pozadí appky
const GREEN = '#54A062'; // hsl(131 31% 48%) — primary
const GREEN_DARK = '#3E7A4A';
const GREEN_SOFT = '#E3EFE4'; // jemná oddělovací linka
const INK = '#1A1A1A';
const GRAY = '#7A8579';

// --- Fonty (lokální, stejné jako PDF flow) ---
const FONT_FILES = {
  body: 'Inter_18pt-Light.ttf', // Inter Light → alergeny, patička
  display: 'Calistoga-Regular.ttf', // Calistoga → názvy, nadpis, cena
} as const;

const fontCache: Partial<Record<keyof typeof FONT_FILES, ArrayBuffer>> = {};
async function loadFont(kind: keyof typeof FONT_FILES): Promise<ArrayBuffer> {
  if (fontCache[kind]) return fontCache[kind]!;
  const buf = await readFile(path.join(process.cwd(), 'fonts', FONT_FILES[kind]));
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  fontCache[kind] = ab;
  return ab;
}

let logoCache: string | null = null;
async function loadLogoDataUrl(): Promise<string> {
  if (logoCache) return logoCache;
  const buf = await readFile(path.join(process.cwd(), 'public', 'LOGO.png'));
  logoCache = `data:image/png;base64,${buf.toString('base64')}`;
  return logoCache;
}

type Lang = 'cz' | 'en';
type Variant = 'soups' | 'mains' | 'weekly';
type SocialItem = { name: string; price: string; allergens: string };

const SECTION_TITLE: Record<Variant, Record<Lang, string>> = {
  soups: { cz: 'POLÉVKY', en: 'SOUPS' },
  mains: { cz: 'HLAVNÍ CHOD', en: 'MAIN COURSE' },
  weekly: { cz: 'TÝDENNÍ MENU', en: 'WEEKLY MENU' },
};

// Patička s nabídkou vody — jen u Hlavního chodu / Týdenního menu (jako PDF).
const FOOTER_NOTE: Partial<Record<Variant, Record<Lang, string>>> = {
  mains: {
    cz: 'K týdennímu menu Römerquelle voda 0,33 l za 45,-',
    en: 'With the weekly menu Römerquelle water 0.33 l for 45,-',
  },
  weekly: {
    cz: 'K týdennímu menu Römerquelle voda 0,33 l za 45,-',
    en: 'With the weekly menu Römerquelle water 0.33 l for 45,-',
  },
};

const ALLERGEN_LABEL: Record<Lang, string> = { cz: 'Alergeny', en: 'Allergens' };

// Web v patičce u sekcí bez poznámky o vodě (Polévky).
const WEB_URL = 'www.nogluten-noproblem.cz';

// --- Šablona (graficky pevná, mění se jen text z `items`) ---
function SocialMenuCard({
  variant,
  lang,
  items,
  logo,
}: {
  variant: Variant;
  lang: Lang;
  items: SocialItem[];
  logo: string;
}) {
  const title = SECTION_TITLE[variant][lang];
  const footer = FOOTER_NOTE[variant]?.[lang] ?? '';

  return (
    <div
      style={{
        width: 1080,
        height: 1440,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: CREAM,
        fontFamily: 'Inter',
        position: 'relative',
        padding: 64,
      }}
    >
      {/* Dekorace — jemné zelené tvary v rozích (za obsahem) */}
      <div style={{ position: 'absolute', top: -120, right: -120, width: 360, height: 360, borderRadius: 360, backgroundColor: GREEN, opacity: 0.08, display: 'flex' }} />
      <div style={{ position: 'absolute', bottom: -140, left: -120, width: 380, height: 380, borderRadius: 380, backgroundColor: GREEN, opacity: 0.07, display: 'flex' }} />
      <div style={{ position: 'absolute', top: 120, left: -60, width: 150, height: 150, borderRadius: 150, backgroundColor: GREEN, opacity: 0.06, display: 'flex' }} />
      {/* Vnitřní rámeček */}
      <div style={{ position: 'absolute', top: 28, left: 28, right: 28, bottom: 28, border: `3px solid ${GREEN}`, opacity: 0.25, borderRadius: 40, display: 'flex' }} />

      {/* Hlavička — logo */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 8 }}>
        <img src={logo} width={224} height={200} style={{ objectFit: 'contain' }} alt="logo" />
      </div>

      {/* Pruh s názvem sekce */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
        <div
          style={{
            display: 'flex',
            backgroundColor: GREEN,
            color: CREAM,
            fontFamily: 'Calistoga',
            fontSize: 34,
            letterSpacing: 1.5,
            padding: '10px 32px',
            borderRadius: 999,
            boxShadow: '0 6px 18px rgba(62,122,74,0.22)',
          }}
        >
          {title}
        </div>
      </div>

      {/* Seznam jídel — vždy odshora dolů, pevná stejná mezera mezi položkami */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'flex-start', marginTop: 60 }}>
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              flexDirection: 'column',
              paddingBottom: 22,
              marginBottom: i === items.length - 1 ? 0 : 34,
              borderBottom: i === items.length - 1 ? '0px solid transparent' : `2px solid ${GREEN_SOFT}`,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingRight: 28 }}>
                <div style={{ display: 'flex', fontFamily: 'Calistoga', fontSize: 30, color: INK, lineHeight: 1.2 }}>
                  {item.name}
                </div>
                {item.allergens ? (
                  <div style={{ display: 'flex', fontFamily: 'Inter', fontSize: 20, color: GRAY, marginTop: 8 }}>
                    {ALLERGEN_LABEL[lang]}: {item.allergens}
                  </div>
                ) : null}
              </div>
              <div
                style={{
                  display: 'flex',
                  backgroundColor: GREEN,
                  color: '#FFFFFF',
                  fontFamily: 'Calistoga',
                  fontSize: 28,
                  padding: '8px 22px',
                  borderRadius: 999,
                  whiteSpace: 'nowrap',
                }}
              >
                {item.price}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Patička */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 56, marginTop: 8 }}>
        {footer ? (
          <div style={{ display: 'flex', fontFamily: 'Inter', fontSize: 24, color: GREEN_DARK }}>{footer}</div>
        ) : (
          <div style={{ display: 'flex', fontFamily: 'Calistoga', fontSize: 24, color: GREEN, letterSpacing: 1 }}>
            {WEB_URL}
          </div>
        )}
      </div>
    </div>
  );
}

type Body = { variant: Variant; lang: Lang; items: SocialItem[] };

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body;
    const { variant, lang, items } = body;

    if (!variant || !lang || !Array.isArray(items)) {
      return NextResponse.json({ message: 'Chybí variant, lang nebo items' }, { status: 400 });
    }

    const [inter, calistoga, logo] = await Promise.all([
      loadFont('body'),
      loadFont('display'),
      loadLogoDataUrl(),
    ]);

    return new ImageResponse(
      <SocialMenuCard variant={variant} lang={lang} items={items} logo={logo} />,
      {
        width: 1080,
        height: 1440,
        fonts: [
          { name: 'Inter', data: inter, weight: 400, style: 'normal' },
          { name: 'Calistoga', data: calistoga, weight: 400, style: 'normal' },
        ],
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  } catch (e) {
    console.error('[social-image] error', e);
    return NextResponse.json(
      { message: `Generování obrázku selhalo: ${e instanceof Error ? e.message : 'unknown'}` },
      { status: 500 },
    );
  }
}
