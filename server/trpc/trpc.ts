import { initTRPC, TRPCError } from '@trpc/server';
import { type Context } from './context';
import superjson from 'superjson';
import { ZodError } from 'zod';

const t = initTRPC.context<Context>().create({
    transformer: superjson,
    errorFormatter({ shape, error }) {
        return {
            ...shape,
            data: {
                ...shape.data,
                zodError:
                    error.cause instanceof ZodError ? error.cause.flatten() : null,
            },
        };
    },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;
export const createCallerFactory = t.createCallerFactory;

// Auth middleware
const isAuthed = t.middleware(({ ctx, next }) => {
    if (!ctx.userId || !ctx.user) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    return next({
        ctx: {
            user: ctx.user,
            userId: ctx.userId,
        },
    });
});

export const protectedProcedure = t.procedure.use(isAuthed);

/**
 * RBAC Middleware
 * Usage: protectedProcedure.use(requireRole(['BRAND_ADMIN', 'SUPER']))
 */
export const requireRole = (allowedRoles: ('SUPER' | 'BRAND_ADMIN' | 'OUTLET_MANAGER' | 'STAFF')[]) =>
    t.middleware(({ ctx, next }) => {
        if (!ctx.user || !ctx.user.role) {
            throw new TRPCError({ code: 'UNAUTHORIZED' });
        }

        if (!allowedRoles.includes(ctx.user.role)) {
            throw new TRPCError({
                code: 'FORBIDDEN',
                message: `Role ${ctx.user.role} is not authorized for this action`
            });
        }

        return next({
            ctx: {
                user: ctx.user,
            },
        });
    });

export const requireSuper = protectedProcedure.use(({ ctx, next }) => {
    // Super Admin access controlled solely by role from database
    // No hardcoded bypasses - security enforced at DB level
    if (ctx.user.role !== 'SUPER') {
        throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only super admins can access this resource',
        });
    }
    return next();
});

// ============================================
// POS-SPECIFIC MIDDLEWARE (HMAC Token Auth)
// ============================================

import { verifyPosToken } from '@/lib/pos-auth';
import { getPosRateLimiter, checkRateLimit } from '@/lib/rate-limit';

/**
 * POS Rate Limiting Middleware
 * Limits requests per outlet to prevent abuse
 */
const posRateLimitMiddleware = t.middleware(async ({ ctx, next }) => {
    const outletId = ctx.posCredentials?.outletId || 'unknown';
    const limiter = getPosRateLimiter();

    await checkRateLimit(limiter, `outlet:${outletId}`, 'POS');

    return next();
});

/**
 * POS Authentication Middleware
 * Verifies HMAC-signed tokens - NO LEGACY FALLBACK
 * 
 * 🚨 SECURITY: All POS requests MUST use Bearer token authentication
 */
const posAuthMiddleware = t.middleware(async ({ ctx, next }) => {
    // Get Authorization header
    const authHeader = ctx.headers.get('authorization');

    // 🚨 SECURITY FIX: No fallback - require signed token
    if (!authHeader?.startsWith('Bearer ')) {
        throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Missing POS authentication token. Use Bearer token.',
        });
    }

    // Verify HMAC-signed token
    const token = authHeader.substring(7);
    const credentials = await verifyPosToken(token);

    if (!credentials) {
        throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid or expired POS token',
        });
    }

    // Double-check outlet status (handles revocation after token issued)
    const outlet = await ctx.prisma.outlet.findUnique({
        where: { id: credentials.outletId },
        select: { id: true, tenantId: true, isPosEnabled: true, status: true },
    });

    if (!outlet) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Outlet not found' });
    }

    if (outlet.tenantId !== credentials.tenantId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Tenant mismatch' });
    }

    if (!outlet.isPosEnabled || outlet.status !== 'ACTIVE') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'POS access disabled' });
    }

    return next({
        ctx: {
            ...ctx,
            posCredentials: {
                ...credentials,
                verified: true,
            },
        },
    });
});

/**
 * Secure POS Procedure
 * Combines rate limiting + HMAC token verification
 * Use this instead of publicProcedure for all POS endpoints
 */
export const posProcedure = t.procedure
    .use(posAuthMiddleware)
    .use(posRateLimitMiddleware);

/**
 * Legacy POS Procedure (header-based, for backward compatibility)
 * @deprecated Use posProcedure with signed tokens instead
 */
export const legacyPosProcedure = t.procedure.use(posAuthMiddleware);

