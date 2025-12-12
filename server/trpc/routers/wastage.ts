import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { enforceTenant } from "@/server/trpc/middleware/roleCheck";
import { TRPCError } from "@trpc/server";

export const wastageRouter = router({
    // ✅ SECURITY FIX: Added pessimistic locking and stock validation
    create: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string(),
            productId: z.string(),
            qty: z.number().min(0.01),
            reason: z.string().min(1),
        }))
        .mutation(async ({ ctx, input }) => {
            return await ctx.prisma.$transaction(async (tx) => {
                // 🔒 CRITICAL FIX: Lock the product row before reading
                // This prevents race conditions in concurrent wastage records
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

                // ✅ VALIDATION: Check sufficient stock before recording wastage
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
                        cost: 0, // TODO: Add cost tracking to Product model to capture value here
                        staffId: ctx.user.id,
                    }
                });

                // Update Stock (row is locked, safe to update)
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
                isolationLevel: 'Serializable', // Highest isolation level
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
