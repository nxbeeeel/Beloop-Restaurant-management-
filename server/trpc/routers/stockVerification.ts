import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { enforceTenant } from "../middleware/roleCheck";

export const stockVerificationRouter = router({
    create: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string(),
            type: z.enum(["OPENING", "CLOSING"]),
            notes: z.string().optional()
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.stockVerification.create({
                data: {
                    outletId: input.outletId,
                    type: input.type,
                    verifiedBy: ctx.user!.id,
                    notes: input.notes
                }
            });
        }),

    saveCounts: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            verificationId: z.string(),
            items: z.array(z.object({
                ingredientId: z.string().optional(),
                productId: z.string().optional(),
                actualStock: z.number(),
                systemStock: z.number(),
                notes: z.string().optional()
            }))
        }))
        .mutation(async ({ ctx, input }) => {
            // Transaction to handle bulk updates
            return ctx.prisma.$transaction(async (tx) => {
                // For each item, we want to upsert or replace. 
                // Since there's no unique constraint, we'll delete existing items for these ingredients/products in this verification and re-create.
                // This is a simple way to handle updates.

                for (const item of input.items) {
                    // Delete existing item for this ingredient/product in this verification
                    await tx.stockVerificationItem.deleteMany({
                        where: {
                            verificationId: input.verificationId,
                            OR: [
                                { ingredientId: item.ingredientId },
                                { productId: item.productId }
                            ]
                        }
                    });

                    // Create new item
                    const difference = item.actualStock - item.systemStock;
                    await tx.stockVerificationItem.create({
                        data: {
                            verificationId: input.verificationId,
                            ingredientId: item.ingredientId,
                            productId: item.productId,
                            actualStock: item.actualStock,
                            systemStock: item.systemStock,
                            difference,
                            totalUnits: item.actualStock, // Assuming totalUnits = actualStock for now
                            openedUnits: 0,
                            closedUnits: 0,
                            notes: item.notes
                        }
                    });
                }
                return { success: true };
            });
        }),

    complete: protectedProcedure
        .use(enforceTenant)
        .input(z.string())
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.stockVerification.update({
                where: { id: input },
                data: { status: "COMPLETED" }
            });
        }),

    list: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string(),
            limit: z.number().default(50)
        }))
        .query(async ({ ctx, input }) => {
            return ctx.prisma.stockVerification.findMany({
                where: { outletId: input.outletId },
                include: {
                    items: {
                        include: {
                            ingredient: true,
                            product: true
                        }
                    },
                    user: { select: { name: true } }
                },
                orderBy: { createdAt: "desc" },
                take: input.limit
            });
        }),

    getById: protectedProcedure
        .use(enforceTenant)
        .input(z.string())
        .query(async ({ ctx, input }) => {
            return ctx.prisma.stockVerification.findUnique({
                where: { id: input },
                include: {
                    items: {
                        include: {
                            ingredient: true,
                            product: true
                        }
                    },
                    user: { select: { name: true } }
                }
            });
        })
});
