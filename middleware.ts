import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * ENTERPRISE MIDDLEWARE with Loop Breaker
 * - Atomic session sync compatible
 * - Loop prevention at the top
 * - Clear role-based routing
 */

// Routes that NEVER require authentication
const isPublicRoute = createRouteMatcher([
    '/',
    '/login(.*)',
    '/signup(.*)',
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/onboarding(.*)',
    '/contact-admin',
    '/invite(.*)',
    '/accept-invite(.*)',
    '/brand/dashboard',
]);

// API routes - always allow
const isApiRoute = createRouteMatcher([
    '/api/(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
    const { userId, sessionClaims, orgSlug } = await auth();
    const pathname = req.nextUrl.pathname;

    // 1. API ROUTES - Always allow
    if (isApiRoute(req)) {
        return NextResponse.next();
    }

    // 2. PUBLIC ROUTES - Allow without auth
    if (isPublicRoute(req)) {
        return NextResponse.next();
    }

    // 3. NOT AUTHENTICATED - Send to login
    if (!userId) {
        return NextResponse.redirect(new URL('/login', req.url));
    }

    // 4. GET USER ROLE FROM SESSION CLAIMS
    const metadata = sessionClaims?.metadata as { role?: string; tenantId?: string } | undefined;
    let role = metadata?.role;
    const tenantId = metadata?.tenantId;

    // Locked Super Admin
    if (userId === 'user_36YCfDC2SUMzvSvFyPhhtLE1Jmv') {
        role = 'SUPER';
    }

    // ============================================================
    // 5. LOOP BREAKER - Check if user is ALREADY on their correct dashboard
    // ============================================================

    // Super Admin on Super pages - OK
    if (role === 'SUPER' && pathname.startsWith('/super/')) {
        return NextResponse.next();
    }

    // Brand Admin on Brand pages - OK
    if (role === 'BRAND_ADMIN' && pathname.startsWith('/brand/')) {
        return NextResponse.next();
    }

    // Outlet Manager or Staff on Outlet pages - OK
    if ((role === 'OUTLET_MANAGER' || role === 'STAFF') && pathname.startsWith('/outlet/')) {
        return NextResponse.next();
    }

    // ============================================================
    // 6. ROLE-BASED REDIRECTS - Send to correct dashboard
    // ============================================================

    if (role === 'SUPER') {
        return NextResponse.redirect(new URL('/super/dashboard', req.url));
    }

    if (role === 'BRAND_ADMIN') {
        return NextResponse.redirect(new URL('/brand/dashboard', req.url));
    }

    if (role === 'OUTLET_MANAGER') {
        return NextResponse.redirect(new URL('/outlet/dashboard', req.url));
    }

    if (role === 'STAFF') {
        return NextResponse.redirect(new URL('/outlet/orders', req.url));
    }

    // Has Clerk Organization context but no role set
    if (orgSlug) {
        return NextResponse.redirect(new URL(`/brand/${orgSlug}/dashboard`, req.url));
    }

    // 7. FALLBACK - Onboarding
    return NextResponse.redirect(new URL('/onboarding', req.url));
});

export const config = {
    matcher: [
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    ],
};
