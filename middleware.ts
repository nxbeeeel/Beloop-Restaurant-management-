import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
    '/',
    '/login(.*)',
    '/signup(.*)',
    '/onboarding',
    '/contact-admin',
    '/api/webhooks(.*)',
    '/api/trpc(.*)', // Allow tRPC API access for POS
    '/api/onboarding', // Brand creation API - handles own auth
]);

export default clerkMiddleware(async (auth, req) => {
    try {
        const { userId, sessionClaims, redirectToSignIn } = await auth();

        // If the user isn't signed in and the route is private, redirect to sign-in
        if (!userId && !isPublicRoute(req)) {
            return redirectToSignIn({ returnBackUrl: req.url });
        }

        // Check if user has the onboarding cookie (immediate bypass)
        const onboardingCookie = req.cookies.get('onboarding_complete');
        const isCookieSet = onboardingCookie?.value === 'true';

        // Catch users who do not have `onboardingComplete: true` in their metadata AND no cookie
        // Redirect them to the /onboarding route to complete onboarding
        if (
            userId &&
            !sessionClaims?.metadata?.onboardingComplete &&
            !isCookieSet &&
            req.nextUrl.pathname !== '/onboarding' &&
            req.nextUrl.pathname !== '/contact-admin' &&
            !isPublicRoute(req)
        ) {
            console.log('Middleware Redirecting to /onboarding:', {
                userId,
                path: req.nextUrl.pathname,
                metadata: sessionClaims?.metadata,
                cookie: isCookieSet
            });
            const onboardingUrl = new URL('/onboarding', req.url);
            return NextResponse.redirect(onboardingUrl);
        }

        // If the user is logged in and the route is protected, let them view
        if (userId && !isPublicRoute(req)) {
            return NextResponse.next();
        }
    } catch (error) {
        console.error("Middleware Error:", error);
        // Return a generic error response or let it fail, but logging is key
        // We can't really return a 500 page from middleware easily, but logging helps debugging
        throw error;
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

