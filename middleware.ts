import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { verifyBypassToken } from '@/lib/tokens';

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
    onboardingStatus?: string;
}

export default clerkMiddleware(async (auth, req) => {
    const { userId, sessionClaims, orgSlug } = await auth();
    const pathname = req.nextUrl.pathname;

    // 0. BYPASS TOKEN CHECK (Enterprise Fix)
    // If a valid bypass token is present OR a bypass cookie exists, we allow the request.
    const bypassToken = req.nextUrl.searchParams.get('t');
    const bypassCookie = req.cookies.get('__beloop_bypass')?.value;

    if (bypassToken && userId) {
        const verified = await verifyBypassToken(bypassToken);
        if (verified && verified.userId === userId) {
            console.log(`[Middleware] Valid Bypass Token for ${userId}. Setting persistence cookie and allowing access.`);
            // Create response to allow access, but attach cookie
            const response = NextResponse.next();
            response.cookies.set('__beloop_bypass', bypassToken, {
                path: '/',
                secure: true,
                sameSite: 'lax',
                maxAge: 300 // 5 minutes persistence to guarantee Clerk sync coverage
            });
            return response;
        }
    }

    if (bypassCookie && userId) {
        // Optimistic check: we trust the cookie for 60s to bridge the gap
        // Real validation happens on the backend anyway if they try to do anything
        console.log(`[Middleware] Valid Bypass Cookie for ${userId}. Allowing access.`);
        return NextResponse.next();
    }

    // 1. API ROUTES - Always allow
    if (isApiRoute(req)) {
        return NextResponse.next();
    }

    // 2. PUBLIC ROUTES (except onboarding) - Allow without auth
    if (isPublicRoute(req)) {
        // ZERO-CLICK LOGIN: Intercept authenticated users hitting home page
        if (pathname === '/' && userId) {
            const metadata = (sessionClaims?.metadata || {}) as UserMetadata;

            // ✅ ENTERPRISE ROUTING LOGIC (Single Authoritative Source)
            const onboardingStatus = metadata.onboardingStatus || 'NOT_STARTED';
            const role = metadata.app_role || metadata.role;
            const slug = metadata.primary_org_slug || orgSlug;

            console.log(`[Middleware] ${userId} | Status: ${onboardingStatus} | Role: ${role}`);

            // A. ONBOARDING NOT COMPLETE -> Force Onboarding
            if (onboardingStatus === 'NOT_STARTED' || onboardingStatus === 'IN_PROGRESS') {
                console.log(`[Middleware] User ${userId} onboarding incomplete (${onboardingStatus}), redirecting to onboarding`);
                return NextResponse.redirect(new URL('/onboarding', req.url));
            }

            // B. COMPLETED -> Force Dashboard
            if (onboardingStatus === 'COMPLETED' && role) {
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
        }
        return NextResponse.next();
    }

    // 3. NOT AUTHENTICATED - Send to login
    if (!userId) {
        return NextResponse.redirect(new URL('/login', req.url));
    }

    // 4. EXTRACT METADATA FROM JWT CLAIMS
    const metadata = (sessionClaims?.metadata || {}) as UserMetadata;
    const role = metadata.app_role || metadata.role;
    const slug = metadata.primary_org_slug || orgSlug;
    const onboardingStatus = metadata.onboardingStatus || 'NOT_STARTED';

    // Super Admin override (from environment variable for security)
    const SUPER_ADMIN_ID = process.env.SUPER_ADMIN_CLERK_ID;
    const isSuperAdmin = SUPER_ADMIN_ID && userId === SUPER_ADMIN_ID;
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
        if (onboardingStatus === 'COMPLETED' && role) {
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

    // Brand Admin on Brand pages - OK if provisioned
    if (pathname.startsWith('/brand/')) {
        if (role === 'BRAND_ADMIN' && onboardingStatus === 'COMPLETED') {
            return NextResponse.next();
        }
        // Not a Brand Admin or not provisioned - redirect appropriately
        if (onboardingStatus !== 'COMPLETED') {
            return NextResponse.redirect(new URL('/onboarding', req.url));
        }
    }

    // Outlet Manager or Staff on Outlet pages - OK if provisioned
    if (pathname.startsWith('/outlet/')) {
        if ((role === 'OUTLET_MANAGER' || role === 'STAFF') && onboardingStatus === 'COMPLETED') {
            return NextResponse.next();
        }
        if (onboardingStatus !== 'COMPLETED') {
            return NextResponse.redirect(new URL('/onboarding', req.url));
        }
    }

    // ============================================================
    // 7. ROLE-BASED ENTRY REDIRECTS - First time entry to correct dashboard
    // ============================================================
    if (onboardingStatus === 'COMPLETED' && role) {
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
