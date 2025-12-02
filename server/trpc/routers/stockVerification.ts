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

    addItem: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            verificationId: z.string(),
            ingredientId: z.string().optional(),
            productId: z.string().optional(),
            totalUnits: z.number(),
            openedUnits: z.number(),
            closedUnits: z.number(),
            systemStock: z.number(),
            actualStock: z.number(),
            notes: z.string().optional()
        }))
        .mutation(async ({ ctx, input }) => {
            const difference = input.actualStock - input.systemStock;
            return ctx.prisma.stockVerificationItem.create({
                data: {
                    ...input,
                    difference
                }
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
