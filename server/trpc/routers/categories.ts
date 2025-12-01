import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { enforceTenant } from "../middleware/roleCheck";
import { TRPCError } from "@trpc/server";

export const categoriesRouter = router({
    list: protectedProcedure
        .use(enforceTenant)
        .input(z.object({ outletId: z.string() }))
        .query(async ({ ctx, input }) => {
            try {
                return await ctx.prisma.category.findMany({
                    where: { outletId: input.outletId },
                    orderBy: { name: 'asc' }
                });
            } catch (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to list categories",
                    cause: error,
                });
            }
        }),

    create: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string(),
            name: z.string().min(1),
        }))
        .mutation(async ({ ctx, input }) => {
            try {
                return await ctx.prisma.$transaction(async (tx) => {
                    return tx.category.create({
                        data: {
                            outletId: input.outletId,
                            name: input.name
                        }
                    });
                });
            } catch (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to create category",
                    cause: error,
                });
            }
        }),

    delete: protectedProcedure
        .use(enforceTenant)
        .input(z.string())
        .mutation(async ({ ctx, input }) => {
            try {
                return await ctx.prisma.$transaction(async (tx) => {
                    return tx.category.delete({
                        where: { id: input }
                    });
                });
            } catch (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to delete category",
                    cause: error,
                });
            }
        }),
});
