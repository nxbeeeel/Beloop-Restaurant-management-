import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
    '/',
    '/login(.*)',
    '/signup(.*)',
    '/onboarding(.*)',
    '/contact-admin',
    '/api/webhooks(.*)',
    '/api/trpc(.*)',
    '/api/onboarding',
    '/api/debug(.*)',
    '/api/admin(.*)',
    '/api/inngest',
    '/api/create-super-admin',
    '/api/emergency-fix-super-admin',
    '/invite(.*)',
    '/accept-invite(.*)',
    '/brand/dashboard',
]);

export default clerkMiddleware(async (auth, req) => {
    const { userId, sessionClaims, orgId, orgSlug } = await auth();
    const currentPath = req.nextUrl.pathname;

    // 1. ALWAYS allow these routes (no redirects)
    if (currentPath.startsWith('/onboarding') ||
        currentPath.startsWith('/invite') ||
        currentPath.startsWith('/accept-invite') ||
        currentPath.startsWith('/api/') ||
        currentPath === '/brand/dashboard') {
        return NextResponse.next();
    }

    // 2. PUBLIC ROUTES
    if (isPublicRoute(req) && !userId) {
        return NextResponse.next();
    }

    // 3. LANDING PAGE - Redirect authenticated users
    if (currentPath === '/' && userId) {
        const metadata = sessionClaims?.metadata as any;
        const role = metadata?.role;

        // Locked Super Admin
        if (userId === 'user_36YCfDC2SUMzvSvFyPhhtLE1Jmv') {
            return NextResponse.redirect(new URL('/super/dashboard', req.url));
        }

        if (role === 'SUPER') return NextResponse.redirect(new URL('/super/dashboard', req.url));
        if (role === 'BRAND_ADMIN') return NextResponse.redirect(new URL('/brand/dashboard', req.url));
        if (role === 'OUTLET_MANAGER') return NextResponse.redirect(new URL('/outlet/dashboard', req.url));
        if (role === 'STAFF') return NextResponse.redirect(new URL('/outlet/orders', req.url));

        // No role - go to onboarding
        return NextResponse.redirect(new URL('/onboarding', req.url));
    }

    // 4. NOT AUTHENTICATED - Redirect to login
    if (!userId) {
        const signInUrl = new URL('/login', req.url);
        signInUrl.searchParams.set('redirect_url', req.url);
        return NextResponse.redirect(signInUrl);
    }

    // 5. EXTRACT ROLE
    const metadata = sessionClaims?.metadata as any;
    let role = metadata?.role;

    // Locked Super Admin
    if (userId === 'user_36YCfDC2SUMzvSvFyPhhtLE1Jmv') {
        role = 'SUPER';
    }

    // 6. ROLE-BASED ACCESS

    // SUPER - Full access
    if (role === 'SUPER') {
        if (currentPath.startsWith('/super') || currentPath.startsWith('/brand') || currentPath.startsWith('/outlet')) {
            return NextResponse.next();
        }
        return NextResponse.redirect(new URL('/super/dashboard', req.url));
    }

    // BRAND ADMIN
    if (role === 'BRAND_ADMIN') {
        if (currentPath.startsWith('/brand')) {
            return NextResponse.next();
        }
        return NextResponse.redirect(new URL('/brand/dashboard', req.url));
    }

    // OUTLET MANAGER
    if (role === 'OUTLET_MANAGER') {
        if (currentPath.startsWith('/outlet')) {
            return NextResponse.next();
        }
        return NextResponse.redirect(new URL('/outlet/dashboard', req.url));
    }

    // STAFF
    if (role === 'STAFF') {
        if (currentPath.startsWith('/outlet')) {
            return NextResponse.next();
        }
        return NextResponse.redirect(new URL('/outlet/orders', req.url));
    }

    // HAS ORG CONTEXT
    if (orgId && orgSlug) {
        if (currentPath.startsWith('/brand/')) {
            return NextResponse.next();
        }
        return NextResponse.redirect(new URL(`/brand/${orgSlug}/dashboard`, req.url));
    }

    // NO ROLE - Already allowed onboarding above
    return NextResponse.redirect(new URL('/onboarding', req.url));
});

export const config = {
    matcher: [
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        '/(api|trpc)(.*)',
    ],
};
