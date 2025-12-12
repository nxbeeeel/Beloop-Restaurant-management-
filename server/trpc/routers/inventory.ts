import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { enforceTenant } from "@/server/trpc/middleware/roleCheck";
import { TRPCError } from "@trpc/server";
import { InventoryService } from "@/server/services/inventory.service";
import { CacheService } from "@/server/services/cache.service";

export const inventoryRouter = router({
    getLowStock: protectedProcedure
        .use(enforceTenant)
        .input(z.object({ outletId: z.string() }))
        .query(async ({ ctx, input }) => {
            return CacheService.getOrSet(
                CacheService.keys.lowStock(input.outletId),
                async () => {
                    const products = await ctx.prisma.product.findMany({
                        where: { outletId: input.outletId },
                        include: { supplier: true }
                    });
                    // Filter in memory 
                    return products.filter(p => p.currentStock <= p.minStock);
                },
                300 // 5 minutes TTL
            );
        }),

    submitCheck: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string(),
            items: z.array(z.object({
                productId: z.string(),
                countedQty: z.number()
            })),
            notes: z.string().optional()
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.$transaction(async (tx) => {
                // 1. Create StockCheck record
                const check = await tx.stockCheck.create({
                    data: {
                        outletId: input.outletId,
                        performedBy: ctx.user.id,
                        date: new Date(),
                        status: 'COMPLETED',
                        notes: input.notes
                    }
                });

                // 2. Process items
                for (const item of input.items) {
                    const product = await tx.product.findUnique({ where: { id: item.productId } });
                    if (!product) continue;

                    const difference = item.countedQty - product.currentStock;

                    // Create Check Item
                    await tx.stockCheckItem.create({
                        data: {
                            stockCheckId: check.id,
                            productId: item.productId,
                            countedQty: item.countedQty,
                            previousQty: product.currentStock,
                            difference
                        }
                    });

                    // Update Product Stock
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { currentStock: item.countedQty }
                    });

                    // Create Stock Move (Adjustment)
                    if (difference !== 0) {
                        await tx.stockMove.create({
                            data: {
                                outletId: input.outletId,
                                productId: item.productId,
                                qty: difference,
                                type: 'ADJUSTMENT',
                                date: new Date(),
                                notes: `Stock Check Adjustment (Check #${check.id.slice(-4)})`
                            }
                        });
                    }
                }

                return check;
            });
        }),

    adjustStock: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            productId: z.string(),
            outletId: z.string(),
            qty: z.number(), // Positive for add, negative for remove
            type: z.enum(['PURCHASE', 'SALE', 'WASTE', 'ADJUSTMENT']),
            notes: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            return InventoryService.adjustStock(ctx.prisma, {
                productId: input.productId,
                outletId: input.outletId,
                qty: input.qty,
                type: input.type,
                notes: input.notes
            });
        })
});
