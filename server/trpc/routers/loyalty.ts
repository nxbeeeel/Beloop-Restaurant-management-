import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const loyaltyRouter = router({
    // 1. Check Customer Status & Reward Eligibility
    check: publicProcedure
        .input(z.object({ phoneNumber: z.string() }))
        .query(async ({ ctx, input }) => {
            const tenantId = ctx.headers.get('x-tenant-id');
            const outletId = ctx.headers.get('x-outlet-id');

            if (!tenantId || !outletId) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Missing SaaS Context' });
            }

            // Find Customer
            const customer = await ctx.prisma.customer.findUnique({
                where: { tenantId_phoneNumber: { tenantId, phoneNumber: input.phoneNumber } },
                include: {
                    loyalty: {
                        where: { outletId }
                    }
                }
            });

            if (!customer) {
                return { found: false };
            }

            // Get Outlet Rules
            const rule = await ctx.prisma.loyaltyRule.findUnique({
                where: { outletId }
            });

            const progress = customer.loyalty[0] || { stamps: 0, totalSpend: 0 };
            const stamps = progress.stamps;

            let rewardAvailable = false;
            let reward = null;

            if (rule && rule.isActive && stamps >= rule.visitsRequired) {
                rewardAvailable = true;
                reward = {
                    type: rule.rewardType,
                    value: rule.rewardValue
                };
            }

            return {
                found: true,
                customer: {
                    id: customer.id,
                    name: customer.name,
                    phoneNumber: customer.phoneNumber
                },
                progress: {
                    stamps,
                    visitsRequired: rule?.visitsRequired || 6,
                    rewardAvailable,
                    reward
                }
            };
        }),

    // 2. Register New Customer
    register: publicProcedure
        .input(z.object({ phoneNumber: z.string(), name: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const tenantId = ctx.headers.get('x-tenant-id');
            if (!tenantId) throw new TRPCError({ code: 'BAD_REQUEST' });

            const customer = await ctx.prisma.customer.create({
                data: {
                    tenantId,
                    phoneNumber: input.phoneNumber,
                    name: input.name
                }
            });

            return { success: true, customer };
        }),
});
