import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * SIMPLE, STABLE MIDDLEWARE
 * - No complex branching that creates loops
 * - Each route type handled once
 * - Clear, predictable behavior
 */

// Routes that NEVER require authentication
const isPublicRoute = createRouteMatcher([
    '/',
    '/login(.*)',
    '/signup(.*)',
    '/onboarding(.*)',
    '/contact-admin',
    '/invite(.*)',
    '/accept-invite(.*)',
    '/brand/dashboard',
]);

// API routes - always allow (authentication handled by tRPC)
const isApiRoute = createRouteMatcher([
    '/api/(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
    const { userId, sessionClaims, orgSlug } = await auth();
    const path = req.nextUrl.pathname;

    // 1. API ROUTES - Always allow, let tRPC handle auth
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

    // 4. GET USER ROLE
    const metadata = sessionClaims?.metadata as { role?: string } | undefined;
    let role = metadata?.role;

    // Locked Super Admin
    if (userId === 'user_36YCfDC2SUMzvSvFyPhhtLE1Jmv') {
        role = 'SUPER';
    }

    // 5. ROUTE ACCESS BY ROLE

    // Super Admin - access everything
    if (role === 'SUPER') {
        if (path.startsWith('/super') || path.startsWith('/brand') || path.startsWith('/outlet')) {
            return NextResponse.next();
        }
        return NextResponse.redirect(new URL('/super/dashboard', req.url));
    }

    // Brand Admin - access /brand/*
    if (role === 'BRAND_ADMIN') {
        if (path.startsWith('/brand')) {
            return NextResponse.next();
        }
        return NextResponse.redirect(new URL('/brand/dashboard', req.url));
    }

    // Outlet Manager - access /outlet/*
    if (role === 'OUTLET_MANAGER') {
        if (path.startsWith('/outlet')) {
            return NextResponse.next();
        }
        return NextResponse.redirect(new URL('/outlet/dashboard', req.url));
    }

    // Staff - access /outlet/*
    if (role === 'STAFF') {
        if (path.startsWith('/outlet')) {
            return NextResponse.next();
        }
        return NextResponse.redirect(new URL('/outlet/orders', req.url));
    }

    // Has Clerk Organization - access /brand/{slug}/*
    if (orgSlug && path.startsWith('/brand')) {
        return NextResponse.next();
    }

    // 6. FALLBACK - Send to onboarding
    return NextResponse.redirect(new URL('/onboarding', req.url));
});

export const config = {
    matcher: [
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    ],
};
