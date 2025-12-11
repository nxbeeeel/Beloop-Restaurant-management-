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

    // UNIVERSAL AUTHENTICATED ROUTES
    if (currentPath.startsWith('/support')) return NextResponse.next();


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

    // 5. ROUTING LOGIC (Zero-Trust Priority)

    // A. SUPER ADMIN
    if (role === 'SUPER') {
        if (currentPath.startsWith('/super')) return NextResponse.next();
        if (currentPath.startsWith('/brand')) return NextResponse.next();
        if (currentPath.startsWith('/outlet')) return NextResponse.next();
        if (currentPath === '/super/dashboard') return NextResponse.next();
        return NextResponse.redirect(new URL('/super/dashboard', req.url));
    }

    // B. OUTLET MANAGER & STAFF (Priority over Brand Admin)
    // If user has OUTLET_MANAGER/STAFF role OR is accessing /outlet with an Org Context.
    // This MUST come before the generic Brand check to prevent them being sucked into /brand/...
    if ((role === 'OUTLET_MANAGER' || role === 'STAFF') || (orgId && currentPath.startsWith('/outlet'))) {

        if (currentPath.startsWith('/outlet')) {
            return NextResponse.next();
        }

        if (currentPath === '/' || currentPath === '/dashboard') {
            const dest = role === 'OUTLET_MANAGER' ? '/outlet/dashboard' : '/outlet/orders';
            console.log(`[MIDDLEWARE] 🛡️ STAFF/MANAGER -> ${dest}`);
            return NextResponse.redirect(new URL(dest, req.url));
        }

        // Redirect away from Brand/Super pages
        if (currentPath.startsWith('/brand') || currentPath.startsWith('/super')) {
            const dest = role === 'OUTLET_MANAGER' ? '/outlet/dashboard' : '/outlet/orders';
            return NextResponse.redirect(new URL(dest, req.url));
        }
    }

    // C. BRAND ADMIN / GENERIC ORG MEMBER
    if (orgId && orgSlug) {
        // Enforce Slug Match
        if (currentPath.startsWith('/brand/')) {
            const pathSlug = currentPath.split('/')[2];
            // Allow if path matches active slug
            if (pathSlug === orgSlug) {
                return NextResponse.next();
            }
            // If mismatch, redirect to correct slug (Data Leak Prevention)
            console.log(`[MIDDLEWARE] ⛔ URL Slug (${pathSlug}) mismatch with Active Org (${orgSlug}). Redirecting.`);
            return NextResponse.redirect(new URL(`/brand/${orgSlug}/dashboard`, req.url));
        }

        // Redirect root/others to Brand Dashboard
        if (currentPath === '/brand/dashboard' || currentPath === '/' || currentPath.startsWith('/super')) {
            return NextResponse.redirect(new URL(`/brand/${orgSlug}/dashboard`, req.url));
        }
    }

    // C2. BRAND ADMIN FALLBACK (Metadata-based)
    // If we missed Block B (No Active Org), but user IS a Brand Admin, allow access to /brand routes.
    // The Layout will enforce actual ownership. This prevents Redirect Loops for new Brands.
    if (role === 'BRAND_ADMIN' && currentPath.startsWith('/brand/')) {
        return NextResponse.next();
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
