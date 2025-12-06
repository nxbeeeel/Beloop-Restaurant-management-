import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { enforceTenant } from "../middleware/roleCheck";
import { TRPCError } from "@trpc/server";

export const procurementRouter = router({
    createOrders: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string(),
            items: z.array(z.object({
                productId: z.string().optional(),
                ingredientId: z.string().optional(),
                qty: z.number().min(0.1)
            }))
        }))
        .mutation(async ({ ctx, input }) => {
            const { ProcurementService } = await import("../../services/procurement.service");
            return ProcurementService.createOrders(ctx.prisma, input);
        }),

    listOrders: protectedProcedure
        .use(enforceTenant)
        .input(z.object({ outletId: z.string(), status: z.string().optional() }))
        .query(async ({ ctx, input }) => {
            return ctx.prisma.purchaseOrder.findMany({
                where: {
                    outletId: input.outletId,
                    status: input.status ? (input.status as any) : undefined
                },
                include: {
                    supplier: true,
                    items: {
                        include: {
                            product: true,
                            ingredient: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
        }),

    markSent: protectedProcedure
        .use(enforceTenant)
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.purchaseOrder.update({
                where: { id: input.id },
                data: {
                    status: 'SENT',
                    sentAt: new Date()
                }
            });
        }),

    // ---------- SINGLE ORDER CREATION ----------
    createOrder: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string(),
            supplierId: z.string(),
            status: z.enum(['DRAFT', 'SENT']),
            items: z.array(z.object({
                productId: z.string().optional(),
                ingredientId: z.string().optional(),
                qty: z.number().min(0.1),
                unitCost: z.number().optional()
            }))
        }))
        .mutation(async ({ ctx, input }) => {
            const { ProcurementService } = await import("../../services/procurement.service");
            // Cast enum to string if needed, or ensure service accepts POStatus
            return ProcurementService.createOrder(ctx.prisma, input);
        }),

    // ---------- GET SINGLE ORDER ----------
    getOrder: protectedProcedure
        .use(enforceTenant)
        .input(z.object({ orderId: z.string() }))
        .query(async ({ ctx, input }) => {
            const order = await ctx.prisma.purchaseOrder.findUnique({
                where: { id: input.orderId },
                include: {
                    supplier: true,
                    items: {
                        include: {
                            product: true,
                            ingredient: true
                        }
                    }
                }
            });

            if (!order) throw new TRPCError({ code: "NOT_FOUND" });
            if (ctx.role !== "SUPER" && ctx.role !== "BRAND_ADMIN" && order.outletId !== ctx.outletId) {
                throw new TRPCError({ code: "FORBIDDEN" });
            }

            return order;
        }),

    // ---------- RECEIVE ORDER (PARTIAL OR FULL) ----------
    receiveOrder: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            orderId: z.string(),
            receivedItems: z.array(z.object({
                itemId: z.string(), // POItem ID
                receivedQty: z.number()
            }))
        }))
        .mutation(async ({ ctx, input }) => {
            const { ProcurementService } = await import("../../services/procurement.service");
            return ProcurementService.receiveOrder(ctx.prisma, {
                orderId: input.orderId,
                receivedItems: input.receivedItems,
                userId: ctx.user.id,
                userRole: ctx.user.role || 'STAFF',
                userOutletId: ctx.user.outletId
            });
        })
});
