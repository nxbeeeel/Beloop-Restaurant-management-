import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { ROLE_ROUTES, type UserRole } from '@/config/roles';

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
    const requestId = Math.random().toString(36).substring(7);
    const currentPath = req.nextUrl.pathname;

    try {
        console.log(`[MIDDLEWARE-${requestId}] ========== REQUEST START ==========`);
        console.log(`[MIDDLEWARE-${requestId}] Path: ${currentPath}`);
        console.log(`[MIDDLEWARE-${requestId}] Method: ${req.method}`);

        const { userId, sessionClaims, redirectToSignIn } = await auth();

        // If the user isn't signed in and the route is private, redirect to sign-in
        if (!userId && !isPublicRoute(req)) {
            console.log(`[MIDDLEWARE-${requestId}] ❌ Not authenticated, redirecting to sign-in`);
            return redirectToSignIn({ returnBackUrl: req.url });
        }

        // Skip middleware for public routes
        if (isPublicRoute(req)) {
            console.log(`[MIDDLEWARE-${requestId}] ✅ Public route, allowing access`);
            return NextResponse.next();
        }

        // ========================================
        // PRIORITY-BASED AUTHENTICATION FLOW
        // Priority 1: SUPER (1000)
        // Priority 2: BRAND_ADMIN (2000)
        // Priority 3: OUTLET_MANAGER (3000)
        // Priority 4: STAFF (4000)
        // ========================================

        if (userId) {
            console.log(`[MIDDLEWARE-${requestId}] User ID: ${userId}`);

            // Check Clerk metadata for role
            const metadataRole = sessionClaims?.metadata?.role as UserRole | undefined;
            const onboardingComplete = sessionClaims?.metadata?.onboardingComplete;

            console.log(`[MIDDLEWARE-${requestId}] Clerk Metadata Role: ${metadataRole || 'NONE'}`);
            console.log(`[MIDDLEWARE-${requestId}] Onboarding Complete: ${onboardingComplete}`);

            // PRIORITY 1: User has a role - enforce role-based routing
            if (metadataRole && metadataRole in ROLE_ROUTES) {
                const targetRoute = ROLE_ROUTES[metadataRole];
                console.log(`[MIDDLEWARE-${requestId}] Target route for ${metadataRole}: ${targetRoute}`);

                // STABLE LANDING ZONE: Always redirect from root or onboarding to dashboard
                if (currentPath === '/' || currentPath === '/onboarding') {
                    console.log(`[MIDDLEWARE-${requestId}] 🔄 REDIRECT: ${currentPath} → ${targetRoute} (Priority redirect)`);
                    return NextResponse.redirect(new URL(targetRoute, req.url));
                }

                // Check if user is in correct area
                const rolePrefix = targetRoute.split('/')[1]; // e.g., 'super', 'brand', 'outlet'
                const currentPrefix = currentPath.split('/')[1];

                console.log(`[MIDDLEWARE-${requestId}] Role prefix: ${rolePrefix}, Current prefix: ${currentPrefix}`);

                // STABLE LANDING ZONE: User is in their correct area
                if (currentPrefix === rolePrefix) {
                    console.log(`[MIDDLEWARE-${requestId}] ✅ User in correct area, allowing access`);
                    return NextResponse.next();
                }

                // User is in wrong area - redirect to their dashboard
                console.log(`[MIDDLEWARE-${requestId}] 🔄 REDIRECT: Wrong area (${currentPath}) → ${targetRoute}`);
                return NextResponse.redirect(new URL(targetRoute, req.url));
            }

            // PRIORITY 2: No role but onboarding complete - allow access
            const onboardingCookie = req.cookies.get('onboarding_complete');
            const isCookieSet = onboardingCookie?.value === 'true';

            if (onboardingComplete || isCookieSet) {
                console.log(`[MIDDLEWARE-${requestId}] ✅ Onboarding complete, allowing access`);
                return NextResponse.next();
            }

            // PRIORITY 3: No role and no onboarding - redirect to onboarding
            if (currentPath !== '/onboarding' && currentPath !== '/contact-admin') {
                console.log(`[MIDDLEWARE-${requestId}] 🔄 REDIRECT: No role/onboarding → /onboarding`);
                return NextResponse.redirect(new URL('/onboarding', req.url));
            }
        }

        console.log(`[MIDDLEWARE-${requestId}] ✅ Allowing access (fallthrough)`);
        return NextResponse.next();
    } catch (error) {
        console.error(`[MIDDLEWARE-${requestId}] ❌ CRITICAL ERROR:`, error);
        // Log but don't block - let the app handle it
        return NextResponse.next();
    } finally {
        console.log(`[MIDDLEWARE-${requestId}] ========== REQUEST END ==========`);
    }
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
