import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Přímý zápis menu na WordPress web klienta (nogluten-noproblem.cz).
// Nahrazuje původní cestu přes n8n webhook — ten běžel na VPS, který spadl
// a shodil s sebou celý export na web. Tahle routa volá WordPress REST API napřímo.
//
// Na webu existuje vlastní typ obsahu `jidelni-menu` s 9 PEVNÝMI položkami.
// Nikdy nezakládáme nové příspěvky — jen přepisujeme těchhle devět na místě,
// protože jsou natvrdo zadrátované v Elementor šabloně.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Mapování: pozice v appce -> ID příspěvku na WordPressu.
// Pořadí v poli = pořadí položky v dané sekci (index 0 = první jídlo).
// Ověřeno proti https://www.nogluten-noproblem.cz/wp-json/wp/v2/jidelni-menu
const WP_POSTS: Record<string, { id: number; slug: string }[]> = {
    // taxonomie "Polévky" (term 12)
    soups: [
        { id: 497, slug: 'polevka1' },
        { id: 812, slug: 'polevka2' },
    ],
    // taxonomie "Hlavni chod" (term 8)
    mains: [
        { id: 888, slug: 'jidlo1' },
        { id: 504, slug: 'jidlo2' },
        { id: 503, slug: 'jidlo3' },
        { id: 814, slug: 'jidlo4' },
        { id: 889, slug: 'jidlo5' },
    ],
    // taxonomie "Týdenní menu" (term 13)
    weekly: [
        { id: 2394, slug: 'tydennimenu2' },
        { id: 899, slug: 'jidlo6' },
    ],
};

const SECTION_LABEL: Record<string, string> = {
    soups: 'Polévky',
    mains: 'Hlavní chod',
    weekly: 'Týdenní menu',
};

const WP_BASE = process.env.WP_API_BASE || 'https://www.nogluten-noproblem.cz';
const REQUEST_TIMEOUT_MS = 20_000;

type IncomingDish = { title?: string; price?: number | string };
type ItemResult = {
    section: string;
    position: number;
    slug: string;
    id: number;
    status: 'updated' | 'hidden' | 'failed';
    title?: string;
    message?: string;
};

// Middleware v src/middleware.ts hlídá jen stránky, NE /api/*. Bez téhle
// kontroly by byl endpoint veřejný a kdokoli by mohl přepsat klientovi
// menu na webu. Proto si session ověřujeme přímo tady.
async function getUser(request: NextRequest) {
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll() {
                    // V route handleru cookies nenastavujeme — jen čteme session.
                },
            },
        },
    );
    // getUser() (na rozdíl od getSession()) si token nechá ověřit Supabasem,
    // takže se nedá podvrhnout ručně sestavenou cookie.
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data.user ?? null;
}

function authHeader(): string | null {
    const user = process.env.WP_USERNAME;
    const pass = process.env.WP_APP_PASSWORD;
    if (!user || !pass) return null;
    // WordPress aplikační hesla se generují s mezerami ("abcd EFGH ...").
    // WP si je sám normalizuje, ale ořežeme je i tady, ať je jedno,
    // jestli se do env proměnné zkopírovaly s mezerami nebo bez.
    const normalized = pass.replace(/\s+/g, '');
    return 'Basic ' + Buffer.from(`${user}:${normalized}`).toString('base64');
}

// Nevyplněná pozice: příspěvek přepneme na koncept, čímž zmizí z webu.
// Nemažeme ho — celé mapování stojí na pevných ID, takže o ně nesmíme přijít.
// Až se pozice zase vyplní, updateOne ho vrátí na 'publish'.
async function hideOne(
    post: { id: number; slug: string },
    auth: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
    try {
        const resp = await fetch(`${WP_BASE}/wp-json/wp/v2/jidelni-menu/${post.id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: auth,
            },
            body: JSON.stringify({ status: 'draft' }),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        if (!resp.ok) {
            let detail = '';
            try {
                const j = await resp.json();
                detail = j?.message || JSON.stringify(j);
            } catch {
                detail = await resp.text().catch(() => '');
            }
            return { ok: false, message: `HTTP ${resp.status}: ${detail || resp.statusText}` };
        }
        return { ok: true };
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('timeout') || msg.includes('aborted') || msg.includes('TimeoutError')) {
            return { ok: false, message: `Web neodpověděl do ${REQUEST_TIMEOUT_MS / 1000} s.` };
        }
        return { ok: false, message: msg };
    }
}

async function updateOne(
    post: { id: number; slug: string },
    dish: IncomingDish,
    auth: string,
): Promise<{ ok: true; title: string } | { ok: false; message: string }> {
    const title = (dish.title || '').trim();
    const priceRaw = dish.price;
    const price = typeof priceRaw === 'string' ? Number(priceRaw) : priceRaw;

    // status: 'publish' posíláme vždy — kdyby byla položka z dřívějška
    // skrytá jako koncept, tímhle se zase vrátí na web.
    const body: Record<string, unknown> = { title, status: 'publish' };
    // ACF pole `cena` je číslo. Když cena chybí nebo není číslo, radši ji
    // vůbec neposíláme, než abychom na web propsali 0 Kč.
    if (typeof price === 'number' && Number.isFinite(price)) {
        body.acf = { cena: price };
    }
    // Alergeny se na web záměrně NEPOSÍLAJÍ — web pro ně nemá pole
    // a klient potvrdil, že je tam nechce.

    try {
        const resp = await fetch(`${WP_BASE}/wp-json/wp/v2/jidelni-menu/${post.id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: auth,
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        if (!resp.ok) {
            let detail = '';
            try {
                const j = await resp.json();
                detail = j?.message || JSON.stringify(j);
            } catch {
                detail = await resp.text().catch(() => '');
            }
            // 401/403 = problém s přihlášením nebo bezpečnostní plugin,
            // to je jiná liga chyby než "nepovedlo se uložit".
            if (resp.status === 401 || resp.status === 403) {
                return {
                    ok: false,
                    message: `Web odmítl přihlášení (HTTP ${resp.status}). ${detail}`.trim(),
                };
            }
            return { ok: false, message: `HTTP ${resp.status}: ${detail || resp.statusText}` };
        }

        const data = await resp.json();
        return { ok: true, title: data?.title?.rendered || title };
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('timeout') || msg.includes('aborted') || msg.includes('TimeoutError')) {
            return { ok: false, message: `Web neodpověděl do ${REQUEST_TIMEOUT_MS / 1000} s.` };
        }
        return { ok: false, message: msg };
    }
}

export async function POST(request: NextRequest) {
    const user = await getUser(request);
    if (!user) {
        console.warn('[export-web] odmítnut nepřihlášený požadavek');
        return NextResponse.json(
            { message: 'Nejste přihlášeni. Přihlaste se prosím znovu a zkuste export zopakovat.' },
            { status: 401 },
        );
    }

    const auth = authHeader();
    if (!auth) {
        console.error('[export-web] chybí WP_USERNAME nebo WP_APP_PASSWORD');
        return NextResponse.json(
            {
                message:
                    'Chybí přihlašovací údaje k webu (WP_USERNAME / WP_APP_PASSWORD). Nastavte je v proměnných prostředí.',
            },
            { status: 500 },
        );
    }

    let payload: { sections?: Record<string, IncomingDish[]> };
    try {
        payload = await request.json();
    } catch {
        return NextResponse.json({ message: 'Neplatný formát požadavku.' }, { status: 400 });
    }

    const sections = payload.sections || {};
    const results: ItemResult[] = [];

    // Sekvenčně, ne paralelně: na webu běží iThemes Security a devět
    // souběžných zápisů by mohlo spustit rate limit. Devět requestů
    // za sebou trvá pár sekund, což je pro tenhle případ v pohodě.
    for (const section of ['soups', 'mains', 'weekly']) {
        const posts = WP_POSTS[section];
        const dishes = sections[section] || [];

        for (let i = 0; i < posts.length; i++) {
            const post = posts[i];
            const dish = dishes[i];
            const base = { section, position: i + 1, slug: post.slug, id: post.id };

            // Prázdná pozice: schováme ji, ať na webu nezůstane viset staré jídlo.
            if (!dish || !(dish.title || '').trim()) {
                const hid = await hideOne(post, auth);
                if (hid.ok) {
                    results.push({
                        ...base,
                        status: 'hidden',
                        message: 'V appce není pro tuhle pozici jídlo — na webu byla skryta.',
                    });
                    console.log(`[export-web] SKRYTO ${post.slug} (${post.id})`);
                } else {
                    results.push({ ...base, status: 'failed', message: `Nepodařilo se skrýt: ${hid.message}` });
                    console.error(`[export-web] SKRYTI SELHALO ${post.slug} (${post.id}): ${hid.message}`);
                }
                continue;
            }

            const res = await updateOne(post, dish, auth);
            if (res.ok) {
                results.push({ ...base, status: 'updated', title: res.title });
                console.log(`[export-web] OK ${post.slug} (${post.id}) <- ${res.title}`);
            } else {
                results.push({ ...base, status: 'failed', message: res.message });
                console.error(`[export-web] SELHALO ${post.slug} (${post.id}): ${res.message}`);
            }
        }
    }

    const updated = results.filter(r => r.status === 'updated');
    const failed = results.filter(r => r.status === 'failed');
    const hidden = results.filter(r => r.status === 'hidden');

    console.log(
        `[export-web] hotovo — zapsáno ${updated.length}, selhalo ${failed.length}, skryto ${hidden.length}`,
    );

    // Sestavíme lidsky čitelné shrnutí, ať uživatel v appce hned vidí,
    // co přesně se nepovedlo, a nemusí lézt do konzole.
    const describe = (r: ItemResult) => `${SECTION_LABEL[r.section]} #${r.position}`;
    const failSummary = failed.map(r => `${describe(r)}: ${r.message}`).join(' · ');
    const hiddenSummary = hidden.map(describe).join(', ');

    if (failed.length > 0) {
        return NextResponse.json(
            {
                success: false,
                updated: updated.length,
                failed: failed.length,
                hidden: hidden.length,
                results,
                message:
                    updated.length > 0
                        ? `Část menu se nepropsala (${updated.length} z ${updated.length + failed.length} uloženo). Chyby: ${failSummary}`
                        : `Na web se nepodařilo zapsat nic. Chyby: ${failSummary}`,
            },
            { status: 502 },
        );
    }

    return NextResponse.json({
        success: true,
        updated: updated.length,
        failed: 0,
        hidden: hidden.length,
        results,
        message:
            hidden.length > 0
                ? `Na web propsáno ${updated.length} položek. Nevyplněné pozice (${hiddenSummary}) byly na webu skryty.`
                : `Na web propsáno všech ${updated.length} položek.`,
    });
}
