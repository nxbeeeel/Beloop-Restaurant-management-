import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { enforceTenant } from "@/server/trpc/middleware/roleCheck";
import { TRPCError } from "@trpc/server";
import { CacheService } from "@/server/services/cache.service";
import { createProductSchema, updateProductSchema, adjustStockSchema } from "@/lib/validations/product";

export const productsRouter = router({
    list: protectedProcedure
        .use(enforceTenant)
        .input(z.object({ outletId: z.string() }))
        .query(async ({ ctx, input }) => {
            // Zero Trust: Verify outlet belongs to the user's tenant
            if (ctx.role !== 'SUPER') {
                if (!ctx.user.tenantId) {
                    throw new TRPCError({ code: 'FORBIDDEN', message: "No tenant found for user" });
                }

                const count = await ctx.prisma.outlet.count({
                    where: {
                        id: input.outletId,
                        tenantId: ctx.user.tenantId
                    }
                });
                if (count === 0) {
                    throw new TRPCError({ code: 'FORBIDDEN', message: "You do not have access to this outlet" });
                }
            }

            return CacheService.getOrSet(
                CacheService.keys.inventoryList(input.outletId),
                async () => {
                    return ctx.prisma.product.findMany({
                        where: { outletId: input.outletId },
                        select: {
                            id: true,
                            name: true,
                            sku: true,
                            unit: true,
                            price: true,
                            currentStock: true,
                            minStock: true,
                            imageUrl: true,
                            description: true,
                            outletId: true,

                            supplier: { select: { id: true, name: true } },
                            category: { select: { id: true, name: true } },
                            supplierId: true,
                            _count: { select: { recipeItems: true } },
                            recipeItems: {
                                select: {
                                    id: true,
                                    quantity: true,
                                    unit: true,
                                    ingredient: { select: { id: true, name: true, usageUnit: true, costPerUsageUnit: true } }
                                }
                            }
                        },
                        orderBy: { name: 'asc' }
                    });
                },
                300 // 5 minutes TTL
            );
        }),

    create: protectedProcedure
        .use(enforceTenant)
        .input(createProductSchema)
        .mutation(async ({ ctx, input }) => {
            const { inngest } = await import("@/lib/inngest");
            const { applyToAllOutlets, recipe, ...productData } = input;

            if (applyToAllOutlets) {
                if (!ctx.user.tenantId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'No tenant found' });

                // Fetch all outlets for this tenant
                const outlets = await ctx.prisma.outlet.findMany({
                    where: { tenantId: ctx.user.tenantId },
                    select: { id: true }
                });

                // Create product for each outlet (skipping if SKU exists)
                const results = await Promise.all(outlets.map(async (outlet) => {
                    const existing = await ctx.prisma.product.findUnique({
                        where: {
                            outletId_sku: {
                                outletId: outlet.id,
                                sku: input.sku
                            }
                        }
                    });

                    if (existing) return null; // Skip duplicates

                    return ctx.prisma.product.create({
                        data: {
                            ...productData,
                            outletId: outlet.id,
                            currentStock: 0,
                            version: 1,
                            recipeItems: recipe ? {
                                create: recipe.map(r => ({
                                    ingredientId: r.ingredientId,
                                    quantity: r.quantity,
                                    unit: r.unit || "g"
                                }))
                            } : undefined
                        }
                    });
                }));



                // 🚀 ASYNC INVALIDATION
                const keysToInvalidate: string[] = [];
                for (const outlet of outlets) {
                    keysToInvalidate.push(CacheService.keys.inventoryList(outlet.id));
                    keysToInvalidate.push(CacheService.keys.fullMenu(outlet.id));
                    keysToInvalidate.push(CacheService.keys.lowStock(outlet.id));
                }

                await inngest.send({
                    name: 'cache/invalidate',
                    data: { keys: keysToInvalidate }
                });

                return results.find(r => r !== null) || results[0]; // Return one of them
            } else {
                // Single Outlet Create
                const existing = await ctx.prisma.product.findUnique({
                    where: {
                        outletId_sku: {
                            outletId: input.outletId,
                            sku: input.sku
                        }
                    }
                });

                if (existing) {
                    throw new TRPCError({ code: 'CONFLICT', message: 'SKU already exists in this outlet' });
                }

                const result = await ctx.prisma.product.create({
                    data: {
                        ...productData,
                        currentStock: 0,
                        version: 1,
                        recipeItems: recipe ? {
                            create: recipe.map(r => ({
                                ingredientId: r.ingredientId,
                                quantity: r.quantity,
                                unit: r.unit || "g"
                            }))
                        } : undefined
                    }
                });

                // 🚀 ASYNC INVALIDATION
                await inngest.send({
                    name: 'cache/invalidate',
                    data: {
                        keys: [
                            CacheService.keys.inventoryList(input.outletId),
                            CacheService.keys.fullMenu(input.outletId),
                            CacheService.keys.lowStock(input.outletId)
                        ]
                    }
                });

                return result;
            }
        }),

    update: protectedProcedure
        .use(enforceTenant)
        .input(updateProductSchema)
        .mutation(async ({ ctx, input }) => {
            const { inngest } = await import("@/lib/inngest");
            const { applyToAllOutlets, id, recipe, ...updateData } = input;

            if (applyToAllOutlets) {
                // ... (Existing logic same)
                const currentProduct = await ctx.prisma.product.findUnique({
                    where: { id },
                    select: { sku: true }
                });

                if (!currentProduct) {
                    throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' });
                }

                if (!ctx.user.tenantId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'No tenant found' });

                const outlets = await ctx.prisma.outlet.findMany({
                    where: { tenantId: ctx.user.tenantId },
                    select: { id: true }
                });

                const outletIds = outlets.map(o => o.id);

                // Update products
                await ctx.prisma.product.updateMany({
                    where: {
                        sku: currentProduct.sku,
                        outletId: { in: outletIds }
                    },
                    data: {
                        ...updateData,
                        version: { increment: 1 }
                    }
                });

                // Update recipes if provided
                if (recipe) {
                    const products = await ctx.prisma.product.findMany({
                        where: {
                            sku: currentProduct.sku,
                            outletId: { in: outletIds }
                        },
                        select: { id: true }
                    });

                    for (const p of products) {
                        await ctx.prisma.recipeItem.deleteMany({ where: { productId: p.id } });
                        if (recipe.length > 0) {
                            await ctx.prisma.recipeItem.createMany({
                                data: recipe.map(r => ({
                                    productId: p.id,
                                    ingredientId: r.ingredientId,
                                    quantity: r.quantity,
                                    unit: r.unit || "g"
                                }))
                            });
                        }
                    }
                }

                // 🚀 ASYNC INVALIDATION
                const keysToInvalidate: string[] = [];
                for (const outlet of outlets) {
                    keysToInvalidate.push(CacheService.keys.inventoryList(outlet.id));
                    keysToInvalidate.push(CacheService.keys.fullMenu(outlet.id));
                }

                // Fire and forget (awaiting send is fast)
                await inngest.send({
                    name: 'cache/invalidate',
                    data: { keys: keysToInvalidate }
                });

                return { success: true };
            } else {
                // Single Update
                const result = await ctx.prisma.product.update({
                    where: { id: input.id },
                    data: {
                        ...updateData,
                        version: { increment: 1 }
                    }
                });

                if (recipe) {
                    await ctx.prisma.recipeItem.deleteMany({ where: { productId: input.id } });
                    if (recipe.length > 0) {
                        await ctx.prisma.recipeItem.createMany({
                            data: recipe.map(r => ({
                                productId: input.id,
                                ingredientId: r.ingredientId,
                                quantity: r.quantity,
                                unit: r.unit || "g"
                            }))
                        });
                    }
                }

                // 🚀 ASYNC INVALIDATION
                await inngest.send({
                    name: 'cache/invalidate',
                    data: {
                        keys: [
                            CacheService.keys.inventoryList(result.outletId),
                            CacheService.keys.fullMenu(result.outletId),
                            CacheService.keys.menuItem(result.id)
                        ]
                    }
                });

                return result;
            }
        }),

    delete: protectedProcedure
        .use(enforceTenant)
        .input(z.string())
        .mutation(async ({ ctx, input }) => {
            const product = await ctx.prisma.product.findUnique({ where: { id: input } });
            if (!product) throw new TRPCError({ code: 'NOT_FOUND' });

            await ctx.prisma.product.delete({ where: { id: input } });

            // 🚀 ASYNC INVALIDATION
            const { inngest } = await import("@/lib/inngest");
            await inngest.send({
                name: 'cache/invalidate',
                data: {
                    keys: [
                        CacheService.keys.inventoryList(product.outletId),
                        CacheService.keys.fullMenu(product.outletId),
                        CacheService.keys.menuItem(product.id)
                    ]
                }
            });

            return { success: true };
        }),

    adjustStock: protectedProcedure
        .use(enforceTenant)
        .input(adjustStockSchema)
        .mutation(async ({ ctx, input }) => {
            const { InventoryService } = await import("../../services/inventory.service");
            return InventoryService.adjustStock(ctx.prisma, input);
        })
});
