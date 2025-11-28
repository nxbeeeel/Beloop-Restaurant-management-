// Idempotency Middleware for tRPC
// Prevents duplicate mutations from network retries, double-clicks, etc.

import { middleware } from '../trpc';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

/**
 * Idempotency middleware that prevents duplicate mutations
 * 
 * Usage:
 * ```typescript
 * myMutation: protectedProcedure
 *   .use(withIdempotency)
 *   .input(z.object({
 *     idempotencyKey: z.string().uuid(),
 *     // ... other fields
 *   }))
 *   .mutation(async ({ ctx, input }) => {
 *     // Your mutation logic
 *   })
 * ```
 */
export const withIdempotency = middleware(async ({ ctx, next, input, path }) => {
    // Extract idempotency key from input
    const idempotencyKey = (input as any)?.idempotencyKey;

    if (!idempotencyKey) {
        throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Idempotency key is required for this operation'
        });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(idempotencyKey)) {
        throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Idempotency key must be a valid UUID'
        });
    }

    // Check if this request was already processed
    const existing = await ctx.prisma.idempotencyKey.findUnique({
        where: { key: idempotencyKey }
    });

    if (existing) {
        // Request already processed - return cached response
        console.log(`[Idempotency] Returning cached response for key: ${idempotencyKey}`);
        return existing.response as any;
    }

    // Check if key has expired (shouldn't happen, but defensive)
    if (existing && existing.expiresAt < new Date()) {
        // Clean up expired key
        await ctx.prisma.idempotencyKey.delete({
            where: { key: idempotencyKey }
        });
    }

    // Process the request
    const result = await next();

    // Store the result with 24-hour expiration
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
        // If creation fails (race condition), it means another request
        // with the same key succeeded. Fetch and return that result.
        const concurrent = await ctx.prisma.idempotencyKey.findUnique({
            where: { key: idempotencyKey }
        });

        if (concurrent) {
            console.log(`[Idempotency] Concurrent request detected for key: ${idempotencyKey}`);
            return concurrent.response as any;
        }

        // If still not found, log error but return our result
        console.error('[Idempotency] Failed to store result:', error);
    }

    return result;
});

/**
 * Cleanup job to remove expired idempotency keys
 * Should be run daily via cron job
 */
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

/**
 * Helper to generate idempotency key on client side
 * 
 * Usage in React component:
 * ```typescript
 * import { v4 as uuidv4 } from 'uuid';
 * 
 * const handleSubmit = async () => {
 *   const idempotencyKey = uuidv4();
 *   await trpc.sales.create.mutate({
 *     idempotencyKey,
 *     // ... other data
 *   });
 * };
 * ```
 */
