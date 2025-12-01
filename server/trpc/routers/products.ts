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
                include: { supplier: true, category: true },
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
        }))
        .mutation(async ({ ctx, input }) => {
            // Check if SKU exists
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
                    ...input,
                    currentStock: 0
                }
            });
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
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.product.update({
                where: { id: input.id },
                data: {
                    name: input.name,
                    unit: input.unit,
                    minStock: input.minStock,
                    supplierId: input.supplierId,
                    price: input.price,
                    categoryId: input.categoryId,
                    description: input.description,
                    imageUrl: input.imageUrl
                }
            });
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
                        currentStock: { increment: input.qty }
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
