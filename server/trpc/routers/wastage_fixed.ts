// Fixed Wastage Router with Race Condition Fixes
// Implements pessimistic locking for inventory updates

import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { enforceTenant } from "../middleware/roleCheck";
import { withIdempotency } from "../middleware/idempotency";
import { TRPCError } from "@trpc/server";

export const wastageRouter = router({
    // ✅ FIXED: Create Wastage with Pessimistic Locking
    create: protectedProcedure
        .use(enforceTenant)
        .use(withIdempotency) // Prevent duplicate wastage records
        .input(z.object({
            idempotencyKey: z.string().uuid(),
            outletId: z.string(),
            productId: z.string(),
            qty: z.number().min(0.01),
            reason: z.string().min(1),
        }))
        .mutation(async ({ ctx, input }) => {
            return await ctx.prisma.$transaction(async (tx) => {
                // 🔒 CRITICAL FIX: Lock the product row before reading
                const [product] = await tx.$queryRaw<any[]>`
                    SELECT * FROM "Product" 
                    WHERE id = ${input.productId}
                    FOR UPDATE
                `;

                if (!product) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "Product not found"
                    });
                }

                // Verify sufficient stock
                if (product.currentStock < input.qty) {
                    throw new TRPCError({
                        code: "BAD_REQUEST",
                        message: `Insufficient stock. Available: ${product.currentStock}, Requested: ${input.qty}`
                    });
                }

                // Create Wastage Record
                const wastage = await tx.wastage.create({
                    data: {
                        outletId: input.outletId,
                        productId: input.productId,
                        qty: input.qty,
                        reason: input.reason,
                        date: new Date()
                    }
                });

                // Update Product Stock (row is locked, safe to update)
                await tx.product.update({
                    where: { id: input.productId },
                    data: {
                        currentStock: { decrement: input.qty }
                    }
                });

                // Record Stock Move
                await tx.stockMove.create({
                    data: {
                        outletId: input.outletId,
                        productId: input.productId,
                        qty: -input.qty, // Negative for reduction
                        type: 'WASTE',
                        date: new Date(),
                        notes: `Reason: ${input.reason}`
                    }
                });

                return wastage;
            }, {
                isolationLevel: 'Serializable',
                timeout: 5000 // 5 second timeout
            });
        }),

    list: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string(),
            limit: z.number().optional().default(50)
        }))
        .query(async ({ ctx, input }) => {
            return await ctx.prisma.wastage.findMany({
                where: { outletId: input.outletId },
                include: {
                    product: true
                },
                orderBy: { date: 'desc' },
                take: input.limit
            });
        })
});
