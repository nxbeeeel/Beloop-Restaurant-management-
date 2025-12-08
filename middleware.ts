import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { type CustomJwtSessionClaims } from '@/types/clerk';

const isPublicRoute = createRouteMatcher([
    '/',
    '/login(.*)',
    '/signup(.*)',
    '/onboarding',
    '/contact-admin',
    '/api/webhooks(.*)',
    '/api/trpc(.*)', // Allow tRPC API access for POS
    '/api/onboarding', // Brand creation API - handles own auth
    '/api/debug(.*)', // Debug endpoints
    '/api/admin(.*)', // Admin fix endpoints
    '/api/create-super-admin', // Super Admin creation
    '/api/emergency-fix-super-admin', // Emergency fix
]);

export default clerkMiddleware(async (auth, req) => {
    const { userId, sessionClaims } = await auth();
    const currentPath = req.nextUrl.pathname;

    // 1. GENERATE REQUEST ID FOR LOGGING
    const requestId = Math.random().toString(36).substring(7);

    // 2. CHECK IF PUBLIC ROUTE
    if (isPublicRoute(req)) {
        return NextResponse.next();
    }

    // 3. ENFORCE AUTHENTICATION (All non-public routes require login)
    if (!userId) {
        console.log(`[MIDDLEWARE-${requestId}] 🚫 Unauthenticated access to protected route: ${currentPath}`);
        return auth.protect();
    }

    // 4. EXTRACT ROLES & METADATA
    const metadata = sessionClaims?.metadata as CustomJwtSessionClaims['metadata'] | undefined;
    const role = metadata?.role;
    const onboardingComplete = metadata?.onboardingComplete;

    console.log(`[MIDDLEWARE-${requestId}] 👤 User: ${userId} | Role: ${role || 'NONE'} | Path: ${currentPath}`);

    // 5. ROLE-BASED ROUTING LOGIC (The "Zero-Tolerance" Core)

    // CASE A: SUPER ADMIN
    if (role === 'SUPER') {
        // If already in super admin area, ALLOW.
        if (currentPath.startsWith('/super')) {
            return NextResponse.next();
        }

        // If stuck at root or onboarding, FORCE REDIRECT to Dashboard.
        console.log(`[MIDDLEWARE-${requestId}] 🛡️ Enforcing SUPER landing zone: ${currentPath} → /super/dashboard`);
        return NextResponse.redirect(new URL('/super/dashboard', req.url));
    }

    // CASE B: BRAND ADMIN
    if (role === 'BRAND_ADMIN') {
        // If already in brand area, ALLOW.
        if (currentPath.startsWith('/brand')) {
            return NextResponse.next();
        }

        // Prevent accessing Super Admin areas
        if (currentPath.startsWith('/super')) {
            console.log(`[MIDDLEWARE-${requestId}] ⛔ BRAND_ADMIN tried to access SUPER area. Redirecting.`);
            return NextResponse.redirect(new URL('/brand/dashboard', req.url));
        }

        console.log(`[MIDDLEWARE-${requestId}] 🛡️ Enforcing BRAND landing zone: ${currentPath} → /brand/dashboard`);
        return NextResponse.redirect(new URL('/brand/dashboard', req.url));
    }

    // CASE C: OUTLET MANAGER
    if (role === 'OUTLET_MANAGER') {
        if (currentPath.startsWith('/outlet') && !currentPath.startsWith('/outlet/orders')) {
            return NextResponse.next();
        }

        console.log(`[MIDDLEWARE-${requestId}] 🛡️ Enforcing OUTLET_MANAGER landing zone: ${currentPath} → /outlet/dashboard`);
        return NextResponse.redirect(new URL('/outlet/dashboard', req.url));
    }

    // CASE D: STAFF
    if (role === 'STAFF') {
        if (currentPath.startsWith('/outlet/orders')) {
            return NextResponse.next();
        }
        console.log(`[MIDDLEWARE-${requestId}] 🛡️ Enforcing STAFF landing zone: ${currentPath} → /outlet/orders`);
        return NextResponse.redirect(new URL('/outlet/orders', req.url));
    }

    // CASE E: NO ROLE / ONBOARDING INCOMPLETE
    // If we are already at /onboarding, STOP. Do not redirect again.
    if (currentPath.startsWith('/onboarding')) {
        return NextResponse.next();
    }

    // Otherwise, send to onboarding
    console.log(`[MIDDLEWARE-${requestId}] ⚠️ No Role/Onboarding. Sending to /onboarding`);
    return NextResponse.redirect(new URL('/onboarding', req.url));
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
