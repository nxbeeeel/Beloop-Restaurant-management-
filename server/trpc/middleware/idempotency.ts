// Idempotency Middleware for tRPC
// Prevents duplicate mutations from network retries, double-clicks, etc.
// 
// NOTE: This middleware is currently disabled because the IdempotencyKey model
// is not in the Prisma schema. To enable:
// 1. Add the IdempotencyKey model to prisma/schema.prisma
// 2. Run prisma migrate dev
// 3. Uncomment the code below

/*
import { middleware } from '../trpc';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export const withIdempotency = middleware(async ({ ctx, next, input, path }) => {
    const idempotencyKey = (input as any)?.idempotencyKey;

    if (!idempotencyKey) {
        throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Idempotency key is required for this operation'
        });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(idempotencyKey)) {
        throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Idempotency key must be a valid UUID'
        });
    }

    const existing = await ctx.prisma.idempotencyKey.findUnique({
        where: { key: idempotencyKey }
    });

    if (existing) {
        console.log(`[Idempotency] Returning cached response for key: ${idempotencyKey}`);
        return existing.response as any;
    }

    if (existing && existing.expiresAt < new Date()) {
        await ctx.prisma.idempotencyKey.delete({
            where: { key: idempotencyKey }
        });
    }

    const result = await next();

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    try {
        await ctx.prisma.idempotencyKey.create({
            data: {
                key: idempotencyKey,
                endpoint: path,
                tenantId: ctx.tenantId,
                response: result as any,
                expiresAt
            }
        });
    } catch (error) {
        const concurrent = await ctx.prisma.idempotencyKey.findUnique({
            where: { key: idempotencyKey }
        });

        if (concurrent) {
            console.log(`[Idempotency] Concurrent request detected for key: ${idempotencyKey}`);
            return concurrent.response as any;
        }

        console.error('[Idempotency] Failed to store result:', error);
    }

    return result;
});

export async function cleanupExpiredIdempotencyKeys(prisma: any) {
    const deleted = await prisma.idempotencyKey.deleteMany({
        where: {
            expiresAt: {
                lt: new Date()
            }
        }
    });

    console.log(`[Idempotency Cleanup] Removed ${deleted.count} expired keys`);
    return deleted.count;
}
*/

// Placeholder export to prevent import errors
export const withIdempotency = null;
export async function cleanupExpiredIdempotencyKeys() {
    return 0;
}
