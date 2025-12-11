import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
    '/',
    '/login(.*)',
    '/signup(.*)',
    '/onboarding',
    '/contact-admin',
    '/api/webhooks(.*)',
    '/api/trpc(.*)',
    '/api/onboarding',
    '/api/debug(.*)',
    '/api/admin(.*)',
    '/api/create-super-admin',
    '/api/emergency-fix-super-admin',
]);

export default clerkMiddleware(async (auth, req) => {
    const { userId, sessionClaims, orgId, orgSlug } = await auth();
    const currentPath = req.nextUrl.pathname;

    const requestId = Math.random().toString(36).substring(7);

    // 2. CHECK IF PUBLIC ROUTE
    if (isPublicRoute(req)) {
        if (userId && (currentPath === '/' || currentPath.startsWith('/login') || currentPath.startsWith('/signup'))) {
            // Fall through to strict checking
        } else {
            return NextResponse.next();
        }
    }

    // 3. ENFORCE AUTHENTICATION
    if (!userId) {
        const signInUrl = new URL('/login', req.url);
        signInUrl.searchParams.set('redirect_url', req.url);
        return NextResponse.redirect(signInUrl);
    }

    // 4. ROLE & ORG EXTRACTION
    const metadata = sessionClaims?.metadata as CustomJwtSessionClaims['metadata'] | undefined;
    let role = metadata?.role;

    // EMERGENCY OVERRIDE: Check email directly in case JWT metadata is missing
    // This unblocks the user while JWT template propagates
    // EMERGENCY OVERRIDE: Check User ID directly (100% reliable)
    // This unblocks the user while JWT template propagates
    const superAdminId = 'user_36YCfDC2SUMzvSvFyPhhtLE1Jmv';
    if (userId === superAdminId) {
        console.log(`[MIDDLEWARE] 🚨 Emergency Grant: SUPER role for ${userId}`);
        role = 'SUPER';
    }

    console.log(`[MIDDLEWARE-${requestId}] 👤 User: ${userId} | Role: ${role || 'NONE'} | Org: ${orgSlug || 'NONE'} | Path: ${currentPath}`);

    // 5. ROUTING LOGIC (Zero-Trust)

    // A. SUPER ADMIN
    if (role === 'SUPER') {
        if (currentPath.startsWith('/super')) return NextResponse.next();
        if (currentPath.startsWith('/brand')) return NextResponse.next();
        if (currentPath.startsWith('/outlet')) return NextResponse.next();
        if (currentPath === '/super/dashboard') return NextResponse.next();

        // Allow public pages while logged in as SUPER? Maybe just dashboard.

        console.log(`[MIDDLEWARE-${requestId}] 🛡️ SUPER -> /super/dashboard`);
        return NextResponse.redirect(new URL('/super/dashboard', req.url));
    }

    // B. BRAND/ORG MEMBER
    if (orgId && orgSlug) {
        if (currentPath.startsWith(`/brand/${orgSlug}`)) {
            return NextResponse.next();
        }

        if (currentPath === '/brand/dashboard' || currentPath === '/') {
            return NextResponse.redirect(new URL(`/brand/${orgSlug}/dashboard`, req.url));
        }

        if (currentPath.startsWith('/super')) {
            return NextResponse.redirect(new URL(`/brand/${orgSlug}/dashboard`, req.url));
        }

        if (currentPath.startsWith('/brand/')) {
            const pathSlug = currentPath.split('/')[2];
            if (pathSlug !== orgSlug) {
                console.log(`[MIDDLEWARE] ⛔ URL Slug (${pathSlug}) mismatch with Active Org (${orgSlug}). Redirecting.`);
                return NextResponse.redirect(new URL(`/brand/${orgSlug}/dashboard`, req.url));
            }
        }
    }

    // C. STAFF & OUTLET MANAGER (Metadata Based / Org Agnostic for now)
    if (role === 'OUTLET_MANAGER' || role === 'STAFF') {
        if (currentPath.startsWith('/outlet')) {
            return NextResponse.next();
        }

        if (currentPath === '/') {
            const dest = role === 'OUTLET_MANAGER' ? '/outlet/dashboard' : '/outlet/orders';
            console.log(`[MIDDLEWARE-${requestId}] 🛡️ STAFF/MANAGER -> ${dest}`);
            return NextResponse.redirect(new URL(dest, req.url));
        }

        if (currentPath.startsWith('/brand') || currentPath.startsWith('/super')) {
            return NextResponse.redirect(new URL('/', req.url));
        }
    }

    // D. PENDING / NO ORGANIZATION
    if (currentPath.startsWith('/onboarding')) {
        return NextResponse.next();
    }

    if (currentPath.startsWith('/accept-invite')) {
        return NextResponse.next();
    }

    if (currentPath.startsWith('/invite')) {
        return NextResponse.next();
    }

    console.log(`[MIDDLEWARE-${requestId}] ⚠️ No Role/Org. -> /onboarding`);
    return NextResponse.redirect(new URL('/onboarding', req.url));
});

export const config = {
    matcher: [
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        '/(api|trpc)(.*)',
    ],
};
