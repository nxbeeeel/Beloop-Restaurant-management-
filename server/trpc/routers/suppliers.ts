import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { enforceTenant } from "../middleware/roleCheck";

export const suppliersRouter = router({
    list: protectedProcedure
        .use(enforceTenant)
        .query(async ({ ctx }) => {
            // User is already validated by enforceTenant to have tenantId
            return ctx.prisma.supplier.findMany({
                where: { tenantId: ctx.user.tenantId! },
                orderBy: { name: 'asc' },
                include: {
                    _count: {
                        select: { products: true, purchaseOrders: true }
                    }
                }
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
