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
    '/api/trpc/pos(.*)', // Explicitly allow POS routes (HMAC Auth)
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

export default clerkMiddleware(
    async (auth, req) => {
        const { userId, sessionClaims, orgSlug } = await auth();
        const pathname = req.nextUrl.pathname;

        // 0. BYPASS TOKEN CHECK (Enterprise Fix)
        // If a valid bypass token is present OR a bypass cookie exists, we allow the request.
        const bypassToken = req.nextUrl.searchParams.get('t');
        const bypassCookie = req.cookies.get('__beloop_bypass')?.value;

        if (bypassToken && userId) {
            const verified = await verifyBypassToken(bypassToken);
            if (verified && verified.userId === userId) {
                console.log(`[Middleware] Valid Bypass Token for ${userId}. allowing access.`);
                const response = NextResponse.next();
                response.cookies.set('__beloop_bypass', bypassToken, {
                    path: '/',
                    secure: true,
                    sameSite: 'lax',
                    maxAge: 300
                });
                return response;
            }
        }

        if (bypassCookie && userId) {
            return NextResponse.next();
        }

        // 1. API ROUTES - Handle CORS & Pass Through
        // EXCEPTION: /api/pos/auth handles its own CORS to avoid duplicate headers
        const isPosAuthRoute = req.nextUrl.pathname === '/api/pos/auth';
        if (isApiRoute(req) && !isPosAuthRoute) {
            const allowedOrigins = [
                'https://pos.belooprms.app',
                'https://beloop-pos-managment.vercel.app',
                'http://localhost:3002',
                'http://localhost:3000'
            ];
            const origin = req.headers.get('origin') || '';
            const isAllowed = allowedOrigins.includes(origin);

            if (req.method === 'OPTIONS') {
                return new NextResponse(null, {
                    status: 200,
                    headers: {
                        'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
                        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-trpc-source, x-tenant-id, x-outlet-id',
                        'Access-Control-Allow-Credentials': 'true',
                    },
                });
            }

            const response = NextResponse.next();
            if (isAllowed) {
                response.headers.set('Access-Control-Allow-Origin', origin);
                response.headers.set('Access-Control-Allow-Credentials', 'true');
                response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
                response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-trpc-source, x-tenant-id, x-outlet-id');
            }
            return response;
        }

        // 2. PUBLIC ROUTES
        if (isPublicRoute(req)) {
            // If user is logged in and hits home/login, redirect to dashboard if provisioned
            if (userId && (pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/sign-in'))) {
                const metadata = (sessionClaims?.metadata || {}) as UserMetadata;
                if (metadata.is_provisioned) {
                    const role = metadata.app_role || metadata.role;
                    const slug = metadata.primary_org_slug || orgSlug || 'dashboard';

                    if (role === 'BRAND_ADMIN') return NextResponse.redirect(new URL(`/brand/${slug}/dashboard`, req.url));
                    if (role === 'OUTLET_MANAGER') return NextResponse.redirect(new URL('/outlet/dashboard', req.url));
                    if (role === 'STAFF') return NextResponse.redirect(new URL('/outlet/orders', req.url));
                }
            }
            return NextResponse.next();
        }

        // 3. AUTHENTICATION REQUIRED
        if (!userId) {
            return NextResponse.redirect(new URL('/login', req.url));
        }

        // 4. METADATA & PROVISIONING CHECK
        const metadata = (sessionClaims?.metadata || {}) as UserMetadata;
        const isProvisioned = metadata.is_provisioned === true; // Strict check
        const role = metadata.app_role || metadata.role;
        const slug = metadata.primary_org_slug || orgSlug;

        // Super Admin Bypass
        const SUPER_ADMIN_ID = process.env.SUPER_ADMIN_CLERK_ID;
        if (SUPER_ADMIN_ID && userId === SUPER_ADMIN_ID) {
            if (pathname.startsWith('/super/') || pathname === '/onboarding') return NextResponse.next();
            return NextResponse.redirect(new URL('/super/dashboard', req.url));
        }

        // A. ONBOARDING PAGE
        if (pathname.startsWith('/onboarding')) {
            // Loop Breaker: If provisioned, get out of here
            if (isProvisioned) {
                if (role === 'BRAND_ADMIN') return NextResponse.redirect(new URL(`/brand/${slug || 'dashboard'}/dashboard`, req.url));
                if (role === 'OUTLET_MANAGER') return NextResponse.redirect(new URL('/outlet/dashboard', req.url));
                if (role === 'STAFF') return NextResponse.redirect(new URL('/outlet/orders', req.url));
                return NextResponse.redirect(new URL('/', req.url)); // Fallback
            }
            // Not provisioned? Stay here.
            return NextResponse.next();
        }

        // B. PROTECTED APP PAGES
        // Any other page requires provisioning
        if (!isProvisioned) {
            // PROVISIONING DOUBLE-CHECK (Project Phoenix)
            // If JWT says NO, check Redis before redirecting.
            // This handles the race condition where Clerk metadata lags behind our DB mutation.
            let redisProvisioned = false;
            try {
                // We use a fetch-based Redis rest check to avoid heavyweight dependencies if possible,
                // but since we are in Next.js Middleware (Edge), we must use the REST API.
                const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
                const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

                if (redisUrl && redisToken) {
                    const res = await fetch(`${redisUrl}/get/user:${userId}:provisioned`, {
                        headers: { Authorization: `Bearer ${redisToken}` }
                    });
                    const data = await res.json();
                    if (data.result === 'true') {
                        redisProvisioned = true;
                        console.log(`[Middleware] Redis OVERRIDE: User ${userId} is provisioned despite stale JWT.`);
                    }
                }
            } catch (err) {
                console.error('[Middleware] Redis check failed:', err);
            }

            if (!redisProvisioned) {
                console.log(`[Middleware] User ${userId} not provisioned (JWT=false, Redis=false), redirecting to /onboarding`);
                return NextResponse.redirect(new URL('/onboarding', req.url));
            }
            // If redisProvisioned is true, we allow them through!
        }

        // C. ROLE ROUTING (Basic Guardrails)
        if (pathname.startsWith('/brand/') && role !== 'BRAND_ADMIN') {
            return NextResponse.redirect(new URL('/outlet/dashboard', req.url)); // Assume outlet user trying to access brand
        }
        if (pathname.startsWith('/outlet/') && role === 'BRAND_ADMIN') {
            // Optional: Allow brand admins to view outlet pages? Or strict separation?
            // For now, let's allow it or do nothing.
            // Usually Brand Admin CAN see outlet pages if they switch context, but URL structure is different.
            // We'll trust the page logic for deep access control.
        }

        return NextResponse.next();
    });

export const config = {
    matcher: [
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    ],
};
