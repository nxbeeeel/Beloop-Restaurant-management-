import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { enforceTenant } from "../middleware/roleCheck";
import { TRPCError } from "@trpc/server";

export const productsRouter = router({
    list: protectedProcedure
        .use(enforceTenant)
        .input(z.object({ outletId: z.string() }))
        .query(async ({ ctx, input }) => {
            return ctx.prisma.product.findMany({
                where: { outletId: input.outletId },
                include: {
                    supplier: true,
                    category: true,
                    recipeItems: { include: { ingredient: true } }
                },
                orderBy: { name: 'asc' }
            });
        }),

    create: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string(),
            name: z.string().min(1),
            sku: z.string().min(1),
            unit: z.string().min(1),
            minStock: z.number().min(0).default(0),
            supplierId: z.string().optional(),
            price: z.number().min(0).default(0),
            categoryId: z.string().optional(),
            description: z.string().optional(),
            imageUrl: z.string().optional(),
            applyToAllOutlets: z.boolean().default(false),
            recipe: z.array(z.object({
                ingredientId: z.string(),
                quantity: z.number().min(0),
                unit: z.string().default("g")
            })).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { applyToAllOutlets, recipe, ...productData } = input;

            if (applyToAllOutlets) {
                // Fetch all outlets for this tenant
                const outlets = await ctx.prisma.outlet.findMany({
                    where: { tenantId: ctx.user!.tenantId! },
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

                return ctx.prisma.product.create({
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
            }
        }),

    update: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            id: z.string(),
            name: z.string().min(1).optional(),
            unit: z.string().min(1).optional(),
            minStock: z.number().min(0).optional(),
            supplierId: z.string().optional().nullable(),
            price: z.number().min(0).optional(),
            categoryId: z.string().optional().nullable(),
            description: z.string().optional(),
            imageUrl: z.string().optional(),
            applyToAllOutlets: z.boolean().default(false),
            recipe: z.array(z.object({
                ingredientId: z.string(),
                quantity: z.number().min(0),
                unit: z.string().default("g")
            })).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { applyToAllOutlets, id, recipe, ...updateData } = input;

            if (applyToAllOutlets) {
                // 1. Get the SKU of the product being updated
                const currentProduct = await ctx.prisma.product.findUnique({
                    where: { id },
                    select: { sku: true }
                });

                if (!currentProduct) {
                    throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' });
                }

                const outlets = await ctx.prisma.outlet.findMany({
                    where: { tenantId: ctx.user!.tenantId! },
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
                    // Find all product IDs to update recipes for
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

                return result;
            }
        }),

    delete: protectedProcedure
        .use(enforceTenant)
        .input(z.string())
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.product.delete({
                where: { id: input }
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
            date: z.date().default(() => new Date()),
        }))
        .mutation(async ({ ctx, input }) => {
            // Transaction to ensure consistency
            return ctx.prisma.$transaction(async (tx) => {
                // 1. Update Product Stock
                const product = await tx.product.update({
                    where: { id: input.productId },
                    data: {
                        currentStock: { increment: input.qty },
                        version: { increment: 1 }
                    }
                });

                // 2. Create Stock Move Record
                await tx.stockMove.create({
                    data: {
                        outletId: input.outletId,
                        productId: input.productId,
                        qty: input.qty,
                        type: input.type,
                        date: input.date,
                        notes: input.notes
                    }
                });

                return product;
            });
        })
});
