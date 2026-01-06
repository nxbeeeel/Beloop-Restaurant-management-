import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { enforceTenant } from "@/server/trpc/middleware/roleCheck";

export const suppliersRouter = router({
    list: protectedProcedure
        .use(enforceTenant)
        .query(async ({ ctx }) => {
            // Fetch suppliers with payments and purchase orders for balance calculation
            const suppliers = await ctx.prisma.supplier.findMany({
                where: { tenantId: ctx.user.tenantId! },
                orderBy: { name: 'asc' },
                include: {
                    _count: {
                        select: { products: true, purchaseOrders: true, ingredients: true }
                    },
                    payments: {
                        orderBy: { date: 'desc' },
                        take: 1,
                        select: {
                            id: true,
                            amount: true,
                            date: true,
                            method: true
                        }
                    },
                    purchaseOrders: {
                        where: { status: 'RECEIVED' },
                        select: {
                            totalAmount: true
                        }
                    }
                }
            });

            // Calculate balance for each supplier
            return suppliers.map(supplier => {
                const totalOrders = supplier.purchaseOrders.reduce(
                    (sum, po) => sum + Number(po.totalAmount), 0
                );
                const totalPayments = supplier.payments.reduce(
                    (sum, p) => sum + Number(p.amount), 0
                );
                const balance = totalOrders - totalPayments;
                const lastPayment = supplier.payments[0] || null;

                return {
                    id: supplier.id,
                    name: supplier.name,
                    whatsappNumber: supplier.whatsappNumber,
                    email: supplier.email,
                    paymentTerms: supplier.paymentTerms,
                    createdAt: supplier.createdAt,
                    _count: supplier._count,
                    balance,
                    lastPayment: lastPayment ? {
                        amount: Number(lastPayment.amount),
                        date: lastPayment.date,
                        method: lastPayment.method
                    } : null
                };
            });
        }),

    create: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            name: z.string().min(1),
            whatsappNumber: z.string().optional(),
            email: z.string().email().optional().or(z.literal('')),
            paymentTerms: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.supplier.create({
                data: {
                    ...input,
                    tenantId: ctx.user.tenantId!,
                }
            });
        }),

    update: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            id: z.string(),
            name: z.string().min(1),
            whatsappNumber: z.string().optional(),
            email: z.string().email().optional().or(z.literal('')),
            paymentTerms: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            // Verify ownership
            const supplier = await ctx.prisma.supplier.findUnique({
                where: { id: input.id }
            });

            if (!supplier || supplier.tenantId !== ctx.user.tenantId) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Supplier not found' });
            }

            return ctx.prisma.supplier.update({
                where: { id: input.id },
                data: {
                    name: input.name,
                    whatsappNumber: input.whatsappNumber,
                    email: input.email,
                    paymentTerms: input.paymentTerms
                }
            });
        }),

    delete: protectedProcedure
        .use(enforceTenant)
        .input(z.string())
        .mutation(async ({ ctx, input }) => {
            const supplier = await ctx.prisma.supplier.findUnique({
                where: { id: input }
            });

            if (!supplier || supplier.tenantId !== ctx.user.tenantId) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Supplier not found' });
            }

            return ctx.prisma.supplier.delete({
                where: { id: input }
            });
        })
});
