import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    );
                    response = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const {
        data: { session },
    } = await supabase.auth.getSession();

    // Protected routes - require authentication
    const protectedRoutes = ['/dashboard', '/jidla', '/alergeny', '/sestav-menu', '/export', '/historie'];
    const isProtectedRoute = protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route));

    // Auth routes - redirect to dashboard if already logged in
    const authRoutes = ['/login', '/register'];
    const isAuthRoute = authRoutes.some(route => request.nextUrl.pathname.startsWith(route));

    if (isProtectedRoute && !session) {
        // Redirect to login if trying to access protected route without session
        return NextResponse.redirect(new URL('/login', request.url));
    }

    if (isAuthRoute && session) {
        // Redirect to dashboard if trying to access auth routes with active session
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Redirect root to dashboard if logged in, otherwise to login
    if (request.nextUrl.pathname === '/') {
        if (session) {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        } else {
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }

    return response;
}

export const config = {
    matcher: [
        '/',
        '/dashboard/:path*',
        '/jidla/:path*',
        '/alergeny/:path*',
        '/sestav-menu/:path*',
        '/export/:path*',
        '/historie/:path*',
        '/login',
        '/register',
    ],
};
