import { TRPCError } from '@trpc/server';
import { middleware } from '../trpc';

// Role checks - these assume they are used on a protectedProcedure
export const superOnly = middleware(({ ctx, next }) => {
    if (!ctx.user || ctx.user.role !== 'SUPER') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Super admin only' });
    }
    return next({ ctx });
});

export const brandAdminOnly = middleware(({ ctx, next }) => {
    if (!ctx.user || ctx.user.role !== 'BRAND_ADMIN') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Brand admin only' });
    }
    return next({ ctx });
});

export const outletManagerOnly = middleware(({ ctx, next }) => {
    if (!ctx.user || ctx.user.role !== 'OUTLET_MANAGER') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Outlet manager only' });
    }
    return next({ ctx });
});

export const staffOnly = middleware(({ ctx, next }) => {
    if (!ctx.user || ctx.user.role !== 'STAFF') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Staff only' });
    }
    return next({ ctx });
});

// Tenant isolation
// Note: This middleware enforces tenant isolation but doesn't validate outletId
// because input is not available at middleware stage. OutletId validation
// should be done in individual procedures after input is parsed.
export const enforceTenant = middleware(async ({ ctx, next }) => {
    // We assume this is used on protectedProcedure, so ctx.user exists
    if (!ctx.user) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    // Super admin can bypass tenant check if needed, but usually we want to scope it
    // For now, we enforce tenant for everyone except SUPER who might be impersonating

    if (!ctx.tenantId && ctx.user.role !== 'SUPER') {
        throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'User not associated with a tenant'
        });
    }

    return next({
        ctx: {
            tenantId: ctx.tenantId,
        }
    });
});
