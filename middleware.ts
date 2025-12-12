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
    '/api/inngest',
    '/api/create-super-admin',
    '/api/emergency-fix-super-admin',
    '/invite(.*)',
    '/accept-invite(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
    const { userId, sessionClaims, orgId, orgSlug } = await auth();
    const currentPath = req.nextUrl.pathname;

    // 1. PUBLIC ROUTES - Allow all
    if (isPublicRoute(req)) {
        // Redirect authenticated users away from login/signup
        if (userId && (currentPath === '/' || currentPath.startsWith('/login') || currentPath.startsWith('/signup'))) {
            // Let middleware decide where to send them
        } else {
            return NextResponse.next();
        }
    }

    // 2. NOT AUTHENTICATED - Redirect to login
    if (!userId) {
        const signInUrl = new URL('/login', req.url);
        signInUrl.searchParams.set('redirect_url', req.url);
        return NextResponse.redirect(signInUrl);
    }

    // 3. EXTRACT ROLE FROM METADATA
    const metadata = sessionClaims?.metadata as { role?: string; tenantId?: string; outletId?: string } | undefined;
    let role = metadata?.role;

    // 🔒 LOCKED SUPER ADMIN (mnabeelca123@gmail.com)
    if (userId === 'user_36YCfDC2SUMzvSvFyPhhtLE1Jmv') {
        role = 'SUPER';
    }

    // Universal routes (support, etc.)
    if (currentPath.startsWith('/support')) return NextResponse.next();

    // ============================================================
    // 4. ROLE-BASED ROUTING (Zero-Trust, No Loops)
    // ============================================================

    // A. SUPER ADMIN
    if (role === 'SUPER') {
        // Allow access to all admin areas
        if (currentPath.startsWith('/super') || currentPath.startsWith('/brand') || currentPath.startsWith('/outlet')) {
            return NextResponse.next();
        }
        // Redirect to super dashboard
        return NextResponse.redirect(new URL('/super/dashboard', req.url));
    }

    // B. OUTLET MANAGER
    if (role === 'OUTLET_MANAGER') {
        if (currentPath.startsWith('/outlet')) {
            return NextResponse.next();
        }
        return NextResponse.redirect(new URL('/outlet/dashboard', req.url));
    }

    // C. STAFF
    if (role === 'STAFF') {
        if (currentPath.startsWith('/outlet')) {
            return NextResponse.next();
        }
        return NextResponse.redirect(new URL('/outlet/orders', req.url));
    }

    // D. BRAND ADMIN (with or without Clerk org context)
    if (role === 'BRAND_ADMIN') {
        // Allow all /brand routes
        if (currentPath.startsWith('/brand')) {
            return NextResponse.next();
        }
        // Redirect to brand dashboard resolver
        return NextResponse.redirect(new URL('/brand/dashboard', req.url));
    }

    // E. HAS CLERK ORG CONTEXT (Generic org member)
    if (orgId && orgSlug) {
        if (currentPath.startsWith('/brand/')) {
            const pathSlug = currentPath.split('/')[2];
            if (pathSlug === orgSlug) {
                return NextResponse.next();
            }
            // Redirect to correct org
            return NextResponse.redirect(new URL(`/brand/${orgSlug}/dashboard`, req.url));
        }
        if (currentPath === '/' || currentPath.startsWith('/onboarding')) {
            return NextResponse.redirect(new URL(`/brand/${orgSlug}/dashboard`, req.url));
        }
    }

    // F. NO ROLE / PENDING - Allow onboarding
    if (currentPath.startsWith('/onboarding')) {
        return NextResponse.next();
    }

    // G. FALLBACK - Redirect to onboarding
    return NextResponse.redirect(new URL('/onboarding', req.url));
});

export const config = {
    matcher: [
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        '/(api|trpc)(.*)',
    ],
};
