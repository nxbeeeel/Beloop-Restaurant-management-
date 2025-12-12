import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { enforceTenant } from "@/server/trpc/middleware/roleCheck";

export const auditRouter = router({
    getLogs: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            limit: z.number().min(1).max(100).default(50),
            cursor: z.string().nullish(), // For infinite query
            outletId: z.string().optional(),
            userId: z.string().optional(),
            action: z.string().optional(),
        }))
        .query(async ({ ctx, input }) => {
            const limit = input.limit ?? 50;
            const { cursor } = input;

            const items = await ctx.prisma.auditLog.findMany({
                take: limit + 1, // get an extra item at the end to know if there's more
                where: {
                    tenantId: ctx.tenantId,
                    ...(input.outletId && input.outletId !== 'ALL' ? { outletId: input.outletId } : {}),
                    ...(input.userId && input.userId !== 'ALL' ? { userId: input.userId } : {}),
                    ...(input.action && input.action !== 'ALL' ? { action: input.action } : {}),
                },
                cursor: cursor ? { id: cursor } : undefined,
                orderBy: {
                    timestamp: 'desc',
                },
                include: {
                    user: {
                        select: { name: true, email: true, role: true }
                    }
                }
            });

            let nextCursor: typeof cursor | undefined = undefined;
            if (items.length > limit) {
                const nextItem = items.pop();
                nextCursor = nextItem!.id;
            }

            return {
                items,
                nextCursor,
            };
        }),
});
