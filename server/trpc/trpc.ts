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
    if (ctx.user.role !== 'SUPER') {
        throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only super admins can access this resource',
        });
    }
    return next();
});
