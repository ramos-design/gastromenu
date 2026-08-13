import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Zapíše aktuální čas do public.keep_alive přes RPC keep_alive_ping().
// Slouží k tomu, aby Supabase free tier neuspal projekt po 7 dnech neaktivity.
//
// Primárně to volá GitHub Actions workflow .github/workflows/supabase-keepalive.yml
// přímo na Supabase. Tahle route je alternativa, pokud chceš cron navěsit
// na hosting (Vercel Cron, Cloud Scheduler, cron-job.org, UptimeRobot…).
//
// Volitelná ochrana: nastav env CRON_SECRET a volej s hlavičkou
//   Authorization: Bearer <secret>
// nebo s ?secret=<secret> v URL. Bez CRON_SECRET je route otevřená
// (nic citlivého nedělá — jen zapíše timestamp, max 1× za hodinu).

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isAuthorized(request: Request): boolean {
    const secret = process.env.CRON_SECRET
    if (!secret) return true

    const header = request.headers.get('authorization')
    if (header === `Bearer ${secret}`) return true

    const fromQuery = new URL(request.url).searchParams.get('secret')
    return fromQuery === secret
}

async function ping(request: Request) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) {
        console.error('[keep-alive] chybí NEXT_PUBLIC_SUPABASE_URL nebo NEXT_PUBLIC_SUPABASE_ANON_KEY')
        return NextResponse.json({ error: 'Supabase env vars nejsou nastavené' }, { status: 500 })
    }

    const supabase = createClient(url, key, { auth: { persistSession: false } })
    const { data, error } = await supabase.rpc('keep_alive_ping', { p_source: 'app-cron' })

    if (error) {
        console.error('[keep-alive] RPC selhalo:', error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('[keep-alive] ping OK:', data)
    return NextResponse.json({ ok: true, pinged_at: data })
}

export async function GET(request: Request) {
    return ping(request)
}

export async function POST(request: Request) {
    return ping(request)
}
