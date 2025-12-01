import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const posRouter = router({
    // 1. Get Products (Pull)
    getProducts: publicProcedure
        .query(async ({ ctx }) => {
            const tenantId = ctx.headers.get('x-tenant-id');
            const outletId = ctx.headers.get('x-outlet-id');

            if (!tenantId || !outletId) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Missing SaaS Context Headers' });
            }

            // A. Check Outlet Status & POS Activation
            const outlet = await ctx.prisma.outlet.findUnique({
                where: { id: outletId },
                select: {
                    id: true,
                    status: true,
                    isPosEnabled: true,
                    tenantId: true,
                    name: true,
                    address: true,
                    phone: true
                }
            });

            if (!outlet) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Outlet not found' });
            }

            if (outlet.tenantId !== tenantId) {
                throw new TRPCError({ code: 'FORBIDDEN', message: 'Outlet does not belong to this tenant' });
            }

            if (outlet.status !== 'ACTIVE') {
                throw new TRPCError({ code: 'FORBIDDEN', message: 'Outlet is not active' });
            }

            if (!outlet.isPosEnabled) {
                throw new TRPCError({ code: 'FORBIDDEN', message: 'POS access is not enabled for this outlet' });
            }

            // B. Fetch Products
            const products = await ctx.prisma.product.findMany({
                where: { outletId },
                include: { supplier: true, category: true },
                orderBy: { name: 'asc' }
            });

            return {
                data: products,
                outlet: {
                    id: outlet.id,
                    isPosEnabled: outlet.isPosEnabled,
                    name: outlet.name,
                    address: outlet.address,
                    phone: outlet.phone
                }
            };
        }),

    // 2. Sync Sales (Push)
    syncSales: publicProcedure
        .input(z.object({
            id: z.string(),
            items: z.array(z.object({
                id: z.string(),
                name: z.string(),
                quantity: z.number(),
                price: z.number(),
                totalPrice: z.number(),
                productId: z.string().optional(),
                modifiers: z.any().optional()
            })),
            total: z.number(),
            discount: z.number(),
            paymentMethod: z.string(),
            createdAt: z.string(),
            status: z.string(),
            customerName: z.string().optional(),
            customerPhone: z.string().optional(),
            redeemedReward: z.boolean().optional()
        }))
        .mutation(async ({ ctx, input }) => {
            const tenantId = ctx.headers.get('x-tenant-id');
            const outletId = ctx.headers.get('x-outlet-id');

            if (!tenantId || !outletId) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Missing SaaS Context Headers' });
            }

            // Verify Outlet Access
            const outlet = await ctx.prisma.outlet.findUnique({ where: { id: outletId } });
            if (!outlet || !outlet.isPosEnabled) {
                throw new TRPCError({ code: 'FORBIDDEN', message: 'POS access denied' });
            }

            let customerId = null;

            // Handle Loyalty Logic
            if (input.customerPhone) {
                // Find or Create Customer (Implicit registration if name provided, else just find)
                let customer = await ctx.prisma.customer.findUnique({
                    where: { tenantId_phoneNumber: { tenantId, phoneNumber: input.customerPhone } }
                });

                if (!customer && input.customerName) {
                    customer = await ctx.prisma.customer.create({
                        data: {
                            tenantId,
                            phoneNumber: input.customerPhone,
                            name: input.customerName
                        }
                    });
                }

                if (customer) {
                    customerId = customer.id;

                    // Get Loyalty Rules
                    const rule = await ctx.prisma.loyaltyRule.findUnique({ where: { outletId } });

                    // Update Progress
                    // 1. Check if eligible for stamp
                    const minSpend = rule?.minSpendPerVisit ? Number(rule.minSpendPerVisit) : 0;
                    const isEligible = input.total >= minSpend;

                    // 2. Handle Redemption (Reset stamps) or Accrual (Add stamp)
                    if (input.redeemedReward) {
                        // Deduct stamps (reset to 0 or subtract required?)
                        // User said "buys 6 times... get reward". Usually resets cycle.
                        // We'll subtract the required amount to allow carry-over if they have excess?
                        // For simplicity, let's subtract 'visitsRequired'.
                        const required = rule?.visitsRequired || 6;

                        await ctx.prisma.loyaltyProgress.upsert({
                            where: { customerId_outletId: { customerId: customer.id, outletId } },
                            create: { customerId: customer.id, outletId, stamps: 0, totalSpend: input.total }, // Should not happen if redeeming
                            update: {
                                stamps: { decrement: required },
                                totalSpend: { increment: input.total },
                                lastVisit: new Date()
                            }
                        });
                    } else if (isEligible) {
                        await ctx.prisma.loyaltyProgress.upsert({
                            where: { customerId_outletId: { customerId: customer.id, outletId } },
                            create: { customerId: customer.id, outletId, stamps: 1, totalSpend: input.total },
                            update: {
                                stamps: { increment: 1 },
                                totalSpend: { increment: input.total },
                                lastVisit: new Date()
                            }
                        });
                    }
                }
            }

            // Create Order Record
            // We use upsert to handle potential re-syncs of the same order ID
            const order = await ctx.prisma.order.upsert({
                where: { id: input.id },
                update: {
                    status: input.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING', // Map status
                    totalAmount: input.total,
                    discount: input.discount,
                    paymentMethod: input.paymentMethod,
                },
                create: {
                    id: input.id, // Use POS-generated ID
                    outletId,
                    customerId, // Link to customer
                    customerName: input.customerName,
                    status: input.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
                    totalAmount: input.total,
                    discount: input.discount,
                    tax: 0, // Calculate if needed
                    paymentMethod: input.paymentMethod,
                    createdAt: new Date(input.createdAt),
                    items: {
                        create: input.items.map(item => ({
                            productId: item.productId, // Ensure this matches Tracker Product ID
                            name: item.name,
                            quantity: item.quantity,
                            price: item.price,
                            total: item.totalPrice,
                            modifiers: item.modifiers ? JSON.stringify(item.modifiers) : undefined
                        }))
                    }
                }
            });

            return { success: true, id: order.id };
        }),

    // 3. Stock Move (Push)
    stockMove: publicProcedure
        .input(z.object({
            sku: z.string(),
            quantity: z.number(),
            type: z.enum(['SALE', 'WASTE', 'PURCHASE', 'ADJUSTMENT']),
            referenceId: z.string().optional(),
            createdAt: z.string()
        }))
        .mutation(async ({ ctx, input }) => {
            const outletId = ctx.headers.get('x-outlet-id');
            if (!outletId) throw new TRPCError({ code: 'BAD_REQUEST' });

            // Find Product by SKU
            const product = await ctx.prisma.product.findUnique({
                where: { outletId_sku: { outletId, sku: input.sku } }
            });

            if (!product) {
                // Product might not exist in Tracker yet (if created locally? unlikely)
                // Or SKU mismatch.
                console.warn(`Product not found for SKU: ${input.sku}`);
                return { success: false, message: 'Product not found' };
            }

            // Update Stock
            await ctx.prisma.$transaction([
                ctx.prisma.product.update({
                    where: { id: product.id },
                    data: { currentStock: { increment: input.quantity } }
                }),
                ctx.prisma.stockMove.create({
                    data: {
                        outletId,
                        productId: product.id,
                        qty: input.quantity,
                        type: input.type as any,
                        date: new Date(input.createdAt),
                        notes: `POS Ref: ${input.referenceId}`
                    }
                })
            ]);

            return { success: true };
        }),

    // 4. Close Day (Push) - New Full Closure
    closeDay: publicProcedure
        .input(z.object({
            date: z.string(), // ISO Date String
            cashSales: z.number(),
            cardSales: z.number(), // Bank/Card
            upiSales: z.number().optional(), // Treat as Bank for now or separate
            totalSales: z.number(),
            ordersCount: z.number()
        }))
        .mutation(async ({ ctx, input }) => {
            const tenantId = ctx.headers.get('x-tenant-id');
            const outletId = ctx.headers.get('x-outlet-id');

            if (!tenantId || !outletId) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Missing SaaS Context Headers' });
            }

            // Parse date to start of day
            const dateObj = new Date(input.date);

            // Upsert DailyClosure (Detailed Record)
            await ctx.prisma.dailyClosure.upsert({
                where: {
                    outletId_date: {
                        outletId,
                        date: dateObj
                    }
                },
                update: {
                    cashSale: input.cashSales,
                    bankSale: input.cardSales + (input.upiSales || 0),
                    totalSale: input.totalSales,
                },
                create: {
                    outletId,
                    date: dateObj,
                    cashSale: input.cashSales,
                    bankSale: input.cardSales + (input.upiSales || 0),
                    totalSale: input.totalSales,
                    totalExpense: 0,
                    profit: input.totalSales
                }
            });

            // ALSO Upsert Sale (Legacy/Main Record for Tracker UI)
            await ctx.prisma.sale.upsert({
                where: {
                    outletId_date: {
                        outletId,
                        date: dateObj
                    }
                },
                update: {
                    cashSale: input.cashSales,
                    bankSale: input.cardSales + (input.upiSales || 0),
                    totalSale: input.totalSales,
                    // We don't overwrite expenses or other fields if they exist
                },
                create: {
                    outletId,
                    staffId: 'pos-system', // Placeholder
                    date: dateObj,
                    cashSale: input.cashSales,
                    bankSale: input.cardSales + (input.upiSales || 0),
                    totalSale: input.totalSales,
                    totalExpense: 0,
                    profit: input.totalSales
                }
            });

            return { success: true };
        }),

    // 5. Check Sync (Poll)
    checkSync: publicProcedure
        .input(z.object({
            productsVersion: z.number().default(0)
        }))
        .query(async ({ ctx, input }) => {
            const outletId = ctx.headers.get('x-outlet-id');
            if (!outletId) throw new TRPCError({ code: 'BAD_REQUEST' });

            // 1. Update Heartbeat
            await ctx.prisma.outlet.update({
                where: { id: outletId },
                data: { lastSyncAt: new Date() }
            });

            // 2. Check Products Version
            // We want the MAX version of any product in this outlet
            const result = await ctx.prisma.product.aggregate({
                where: { outletId },
                _max: { version: true }
            });

            const serverVersion = result._max.version || 0;
            const hasChanges = serverVersion > input.productsVersion;

            return {
                hasChanges,
                serverVersion
            };
        }),
});
