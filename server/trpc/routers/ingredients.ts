import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { enforceTenant } from "../middleware/roleCheck";

export const ingredientsRouter = router({
    list: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string(),
            search: z.string().optional(),
        }))
        .query(async ({ ctx, input }) => {
            return await ctx.prisma.ingredient.findMany({
                where: {
                    outletId: input.outletId,
                    name: {
                        contains: input.search,
                        mode: 'insensitive'
                    }
                },
                orderBy: { name: 'asc' }
            });
        }),

    create: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string(),
            name: z.string(),
            purchaseUnit: z.string(),
            qtyPerUnit: z.number(),
            usageUnit: z.string(),
            baseUnit: z.string(),
            conversionFactor: z.number(),
            costPerPurchaseUnit: z.number().min(0),
            costPerUsageUnit: z.number().min(0),
            stock: z.number().min(0),
            minStock: z.number().min(0),
        }))
        .mutation(async ({ ctx, input }) => {
            return await ctx.prisma.ingredient.create({
                data: {
                    outletId: input.outletId,
                    name: input.name,
                    purchaseUnit: input.purchaseUnit,
                    qtyPerUnit: input.qtyPerUnit,
                    usageUnit: input.usageUnit,
                    baseUnit: input.baseUnit,
                    conversionFactor: input.conversionFactor,
                    costPerPurchaseUnit: input.costPerPurchaseUnit,
                    costPerUsageUnit: input.costPerUsageUnit,
                    stock: input.stock,
                    minStock: input.minStock,
                }
            });
        }),

    update: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            id: z.string(),
            name: z.string(),
            purchaseUnit: z.string(),
            qtyPerUnit: z.number(),
            usageUnit: z.string(),
            baseUnit: z.string(),
            conversionFactor: z.number(),
            costPerPurchaseUnit: z.number().min(0),
            costPerUsageUnit: z.number().min(0),
            stock: z.number().min(0),
            minStock: z.number().min(0),
        }))
        .mutation(async ({ ctx, input }) => {
            return await ctx.prisma.ingredient.update({
                where: { id: input.id },
                data: {
                    name: input.name,
                    purchaseUnit: input.purchaseUnit,
                    qtyPerUnit: input.qtyPerUnit,
                    usageUnit: input.usageUnit,
                    baseUnit: input.baseUnit,
                    conversionFactor: input.conversionFactor,
                    costPerPurchaseUnit: input.costPerPurchaseUnit,
                    costPerUsageUnit: input.costPerUsageUnit,
                    stock: input.stock,
                    minStock: input.minStock,
                }
            });
        }),

    delete: protectedProcedure
        .use(enforceTenant)
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            return await ctx.prisma.ingredient.delete({
                where: { id: input.id }
            });
        }),
});
