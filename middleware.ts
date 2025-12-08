import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/server/db';
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
    '/api/test-deployment', // Deployment verification
    '/api/admin/fix-super-admin', // One-time metadata fix
]);

export default clerkMiddleware(async (auth, req) => {
    try {
        const { userId, sessionClaims, redirectToSignIn } = await auth();

        // If the user isn't signed in and the route is private, redirect to sign-in
        if (!userId && !isPublicRoute(req)) {
            return redirectToSignIn({ returnBackUrl: req.url });
        }

        // Skip middleware for public routes
        if (isPublicRoute(req)) {
            return NextResponse.next();
        }

        // ========================================
        // PRIORITY-BASED AUTHENTICATION FLOW
        // ========================================

        if (userId) {
            // PRIORITY 1: Check Clerk metadata for role (fastest)
            const metadataRole = sessionClaims?.metadata?.role as UserRole | undefined;

            if (metadataRole && metadataRole in ROLE_ROUTES) {
                const targetRoute = ROLE_ROUTES[metadataRole];
                const currentPath = req.nextUrl.pathname;

                // If user is on /onboarding but has a role, redirect to their dashboard
                if (currentPath === '/onboarding') {
                    console.log(`[MIDDLEWARE-PRIORITY] ${metadataRole} user (metadata) → ${targetRoute}`);
                    return NextResponse.redirect(new URL(targetRoute, req.url));
                }

                // Allow access to their designated area
                return NextResponse.next();
            }

            // PRIORITY 2: Fallback to database check (if Clerk metadata missing)
            console.log('[MIDDLEWARE] No role in Clerk metadata, checking database...');

            try {
                const user = await prisma.user.findUnique({
                    where: { clerkId: userId },
                    select: { role: true }
                });

                if (user?.role && user.role in ROLE_ROUTES) {
                    const targetRoute = ROLE_ROUTES[user.role as UserRole];
                    const currentPath = req.nextUrl.pathname;

                    // If user is on /onboarding but has a role in DB, redirect to their dashboard
                    if (currentPath === '/onboarding') {
                        console.log(`[MIDDLEWARE-PRIORITY] ${user.role} user (database) → ${targetRoute}`);
                        return NextResponse.redirect(new URL(targetRoute, req.url));
                    }

                    // Allow access
                    return NextResponse.next();
                }
            } catch (dbError) {
                console.error('[MIDDLEWARE] Database check failed:', dbError);
                // Continue to onboarding check if DB fails
            }

            // PRIORITY 3: Check onboarding status
            const onboardingCookie = req.cookies.get('onboarding_complete');
            const isCookieSet = onboardingCookie?.value === 'true';
            const onboardingComplete = sessionClaims?.metadata?.onboardingComplete === true;

            // If user has completed onboarding (via cookie or metadata), allow access
            if (onboardingComplete || isCookieSet) {
                return NextResponse.next();
            }

            // PRIORITY 4: Redirect to onboarding if not complete
            if (req.nextUrl.pathname !== '/onboarding' && req.nextUrl.pathname !== '/contact-admin') {
                console.log('[MIDDLEWARE] User needs onboarding, redirecting...');
                return NextResponse.redirect(new URL('/onboarding', req.url));
            }
        }

        return NextResponse.next();
    } catch (error) {
        console.error('[MIDDLEWARE] Critical error:', error);
        // Log but don't block - let the app handle it
        return NextResponse.next();
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
