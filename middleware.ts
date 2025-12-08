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
