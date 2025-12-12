import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * ENTERPRISE MIDDLEWARE - Onboarding Loop Elimination Protocol
 * 
 * Contract:
 * - is_provisioned: true in JWT claims = user is ready to use dashboard
 * - Pre-Check Loop Breaker: if on /onboarding AND is_provisioned=true → immediate exit to dashboard
 * - All routing decisions based ONLY on Clerk JWT claims (no DB access in middleware)
 */

// Routes that NEVER require authentication
const isPublicRoute = createRouteMatcher([
    '/',
    '/login(.*)',
    '/signup(.*)',
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/contact-admin',
    '/invite(.*)',
    '/accept-invite(.*)',
]);

// API routes - always allow
const isApiRoute = createRouteMatcher([
    '/api/(.*)',
]);

// Metadata shape expected from Clerk JWT
interface UserMetadata {
    app_role?: string;
    role?: string;
    tenantId?: string;
    outletId?: string;
    primary_org_slug?: string;
    is_provisioned?: boolean;
    onboardingComplete?: boolean;
}

export default clerkMiddleware(async (auth, req) => {
    const { userId, sessionClaims, orgSlug } = await auth();
    const pathname = req.nextUrl.pathname;

    // 1. API ROUTES - Always allow
    if (isApiRoute(req)) {
        return NextResponse.next();
    }

    // 2. PUBLIC ROUTES (except onboarding) - Allow without auth
    if (isPublicRoute(req)) {
        return NextResponse.next();
    }

    // 3. NOT AUTHENTICATED - Send to login
    if (!userId) {
        return NextResponse.redirect(new URL('/login', req.url));
    }

    // 4. EXTRACT METADATA FROM JWT CLAIMS
    const metadata = (sessionClaims?.metadata || {}) as UserMetadata;
    const isProvisioned = metadata.is_provisioned === true || metadata.onboardingComplete === true;
    const role = metadata.app_role || metadata.role;
    const slug = metadata.primary_org_slug || orgSlug;

    // Locked Super Admin override
    const isSuperAdmin = userId === 'user_36YCfDC2SUMzvSvFyPhhtLE1Jmv';
    if (isSuperAdmin) {
        if (pathname.startsWith('/super/')) {
            return NextResponse.next();
        }
        return NextResponse.redirect(new URL('/super/dashboard', req.url));
    }

    // ============================================================
    // 5. PRE-CHECK LOOP BREAKER (Critical for Onboarding Loop)
    // If user is on /onboarding BUT is_provisioned=true → EXIT immediately
    // ============================================================
    if (pathname.startsWith('/onboarding')) {
        if (isProvisioned && role) {
            console.log(`[Middleware] Loop Breaker: User ${userId} is provisioned, exiting onboarding`);

            if (role === 'BRAND_ADMIN') {
                const targetSlug = slug || 'dashboard';
                return NextResponse.redirect(new URL(`/brand/${targetSlug}/dashboard`, req.url));
            }
            if (role === 'OUTLET_MANAGER') {
                return NextResponse.redirect(new URL('/outlet/dashboard', req.url));
            }
            if (role === 'STAFF') {
                return NextResponse.redirect(new URL('/outlet/orders', req.url));
            }
        }
        // User is on onboarding and NOT provisioned - let them stay
        return NextResponse.next();
    }

    // ============================================================
    // 6. DASHBOARD ACCESS CHECK - Verify user belongs on this dashboard
    // ============================================================

    // Super Admin on Super pages - OK (already handled above)

    // Brand Admin on Brand pages - OK if provisioned
    if (pathname.startsWith('/brand/')) {
        if (role === 'BRAND_ADMIN' && isProvisioned) {
            return NextResponse.next();
        }
        // Not a Brand Admin or not provisioned - redirect appropriately
        if (!isProvisioned) {
            return NextResponse.redirect(new URL('/onboarding', req.url));
        }
    }

    // Outlet Manager or Staff on Outlet pages - OK if provisioned
    if (pathname.startsWith('/outlet/')) {
        if ((role === 'OUTLET_MANAGER' || role === 'STAFF') && isProvisioned) {
            return NextResponse.next();
        }
        if (!isProvisioned) {
            return NextResponse.redirect(new URL('/onboarding', req.url));
        }
    }

    // ============================================================
    // 7. ROLE-BASED ENTRY REDIRECTS - First time entry to correct dashboard
    // ============================================================
    if (isProvisioned && role) {
        if (role === 'BRAND_ADMIN') {
            const targetSlug = slug || 'dashboard';
            return NextResponse.redirect(new URL(`/brand/${targetSlug}/dashboard`, req.url));
        }
        if (role === 'OUTLET_MANAGER') {
            return NextResponse.redirect(new URL('/outlet/dashboard', req.url));
        }
        if (role === 'STAFF') {
            return NextResponse.redirect(new URL('/outlet/orders', req.url));
        }
    }

    // 8. FALLBACK - User not provisioned, send to onboarding
    console.log(`[Middleware] User ${userId} not provisioned, sending to onboarding`);
    return NextResponse.redirect(new URL('/onboarding', req.url));
});

export const config = {
    matcher: [
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    ],
};

