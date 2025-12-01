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

            // 3. Handle Stock Deduction (Server-Side)
            // We do this AFTER order creation to ensure order exists.
            // We iterate through items and deduct stock.
            for (const item of input.items) {
                if (item.productId) {
                    const product = await ctx.prisma.product.findUnique({
                        where: { id: item.productId },
                        include: { recipeItems: true }
                    });

                    if (product) {
                        if (product.recipeItems && product.recipeItems.length > 0) {
                            // Deduct Ingredients
                            for (const recipeItem of product.recipeItems) {
                                const qtyToDeduct = recipeItem.quantity * item.quantity;
                                await ctx.prisma.ingredient.update({
                                    where: { id: recipeItem.ingredientId },
                                    data: { stock: { decrement: qtyToDeduct } }
                                });
                                // Optional: Record Stock Move for Ingredient?
                            }
                        } else {
                            // Deduct Product Stock (Direct)
                            await ctx.prisma.product.update({
                                where: { id: product.id },
                                data: { currentStock: { decrement: item.quantity } }
                            });

                            // Record Stock Move
                            await ctx.prisma.stockMove.create({
                                data: {
                                    outletId,
                                    productId: product.id,
                                    qty: -1 * item.quantity,
                                    type: 'SALE',
                                    date: new Date(input.createdAt),
                                    notes: `Order: ${order.id}`
                                }
                            });
                        }
                    }
                }
            }

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

    // --- Reports ---

    getReportStats: publicProcedure
        .input(z.object({
            startDate: z.string(),
            endDate: z.string(),
        }))
        .query(async ({ ctx, input }) => {
            const tenantId = ctx.headers.get('x-tenant-id');
            const outletId = ctx.headers.get('x-outlet-id');
            if (!tenantId || !outletId) throw new TRPCError({ code: 'BAD_REQUEST' });

            const startDate = new Date(input.startDate);
            const endDate = new Date(input.endDate);

            const orderWhere: any = {
                outletId,
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
                status: 'COMPLETED',
            };

            const orders = await ctx.prisma.order.findMany({
                where: orderWhere,
                select: {
                    totalAmount: true,
                    customerId: true,
                }
            });

            const orderCount = orders.length;
            const uniqueCustomers = new Set(orders.map(o => o.customerId).filter(Boolean)).size;
            const orderSales = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

            return {
                sales: orderSales,
                orders: orderCount,
                customers: uniqueCustomers,
                avgOrderValue: orderCount > 0 ? orderSales / orderCount : 0,
            };
        }),

    getReportSalesTrend: publicProcedure
        .input(z.object({
            startDate: z.string(),
            endDate: z.string(),
        }))
        .query(async ({ ctx, input }) => {
            const outletId = ctx.headers.get('x-outlet-id');
            if (!outletId) throw new TRPCError({ code: 'BAD_REQUEST' });

            const startDate = new Date(input.startDate);
            const endDate = new Date(input.endDate);

            const orders = await ctx.prisma.order.findMany({
                where: {
                    outletId,
                    createdAt: { gte: startDate, lte: endDate },
                    status: 'COMPLETED',
                },
                orderBy: { createdAt: 'asc' },
                select: {
                    createdAt: true,
                    totalAmount: true,
                }
            });

            const aggregated: Record<string, number> = {};
            orders.forEach(o => {
                const d = o.createdAt.toISOString().split('T')[0];
                aggregated[d] = (aggregated[d] || 0) + Number(o.totalAmount);
            });

            return Object.entries(aggregated).map(([date, amount]) => ({ date, amount }));
        }),

    getReportTopItems: publicProcedure
        .input(z.object({
            startDate: z.string(),
            endDate: z.string(),
            limit: z.number().default(5),
        }))
        .query(async ({ ctx, input }) => {
            const outletId = ctx.headers.get('x-outlet-id');
            if (!outletId) throw new TRPCError({ code: 'BAD_REQUEST' });

            const startDate = new Date(input.startDate);
            const endDate = new Date(input.endDate);

            const items = await ctx.prisma.orderItem.groupBy({
                by: ['name'],
                where: {
                    order: {
                        outletId,
                        createdAt: { gte: startDate, lte: endDate },
                        status: 'COMPLETED',
                    }
                },
                _sum: {
                    quantity: true,
                    total: true,
                },
                orderBy: {
                    _sum: { total: 'desc' }
                },
                take: input.limit,
            });

            return items.map(i => ({
                name: i.name,
                orders: i._sum.quantity || 0,
                revenue: Number(i._sum.total || 0),
            }));
        }),

    // --- Customers ---

    getCustomers: publicProcedure
        .input(z.object({
            search: z.string().optional(),
        }))
        .query(async ({ ctx, input }) => {
            const tenantId = ctx.headers.get('x-tenant-id');
            if (!tenantId) throw new TRPCError({ code: 'BAD_REQUEST' });

            const where: any = { tenantId };

            if (input.search) {
                where.OR = [
                    { name: { contains: input.search, mode: 'insensitive' } },
                    { phoneNumber: { contains: input.search } },
                ];
            }

            const customers = await ctx.prisma.customer.findMany({
                where,
                include: {
                    orders: {
                        select: {
                            totalAmount: true,
                            createdAt: true,
                        }
                    },
                    loyalty: true
                },
                orderBy: { updatedAt: 'desc' },
                take: 50 // Limit for POS performance
            });

            return customers.map(c => {
                const totalSpent = c.orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
                const totalOrders = c.orders.length;
                const lastVisit = c.orders.length > 0 ? c.orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].createdAt : c.createdAt;

                return {
                    id: c.id,
                    name: c.name || 'Unknown',
                    phone: c.phoneNumber,
                    totalOrders,
                    totalSpent,
                    lastVisit: lastVisit.toISOString().split('T')[0],
                    loyaltyPoints: c.loyalty.reduce((sum, l) => sum + l.stamps, 0),
                };
            });
        }),

    getCustomerHistory: publicProcedure
        .input(z.object({
            customerId: z.string()
        }))
        .query(async ({ ctx, input }) => {
            const tenantId = ctx.headers.get('x-tenant-id');
            if (!tenantId) throw new TRPCError({ code: 'BAD_REQUEST' });

            const orders = await ctx.prisma.order.findMany({
                where: {
                    customerId: input.customerId,
                    outlet: { tenantId } // Ensure tenant isolation
                },
                include: {
                    items: true
                },
                orderBy: { createdAt: 'desc' },
                take: 20 // Limit history
            });

            return orders.map(order => ({
                id: order.id,
                date: order.createdAt.toISOString(),
                total: Number(order.totalAmount),
                status: order.status,
                items: order.items.map(item => ({
                    name: item.name,
                    quantity: item.quantity,
                    price: Number(item.price)
                }))
            }));
        }),

    createCustomer: publicProcedure
        .input(z.object({
            name: z.string(),
            phoneNumber: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            const tenantId = ctx.headers.get('x-tenant-id');
            if (!tenantId) throw new TRPCError({ code: 'BAD_REQUEST' });

            // Check if exists
            let customer = await ctx.prisma.customer.findUnique({
                where: { tenantId_phoneNumber: { tenantId, phoneNumber: input.phoneNumber } }
            });

            if (customer) {
                // If exists but name was missing/different, maybe update? 
                // For now, just return existing to avoid duplicates.
                return customer;
            }

            // Create new
            return ctx.prisma.customer.create({
                data: {
                    tenantId,
                    name: input.name,
                    phoneNumber: input.phoneNumber,
                    loyalty: {
                        create: [] // No loyalty progress initially
                    }
                }
            });
        }),


    // --- Products ---

    createProduct: publicProcedure
        .input(z.object({
            name: z.string(),
            sku: z.string(),
            price: z.number(),
            unit: z.string(),
            categoryId: z.string().optional(),
            description: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const outletId = ctx.headers.get('x-outlet-id');
            if (!outletId) throw new TRPCError({ code: 'BAD_REQUEST' });

            // Check for existing SKU in this outlet
            const existing = await ctx.prisma.product.findUnique({
                where: { outletId_sku: { outletId, sku: input.sku } }
            });

            if (existing) {
                throw new TRPCError({ code: 'CONFLICT', message: 'SKU already exists' });
            }

            return ctx.prisma.product.create({
                data: {
                    outletId,
                    name: input.name,
                    sku: input.sku,
                    price: input.price,
                    unit: input.unit,
                    categoryId: input.categoryId,
                    description: input.description,
                    currentStock: 0,
                    version: 1
                }
            });
        }),

    updateProduct: publicProcedure
        .input(z.object({
            id: z.string(),
            name: z.string().optional(),
            price: z.number().optional(),
            unit: z.string().optional(),
            description: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const outletId = ctx.headers.get('x-outlet-id');
            if (!outletId) throw new TRPCError({ code: 'BAD_REQUEST' });

            return ctx.prisma.product.update({
                where: { id: input.id },
                data: {
                    name: input.name,
                    price: input.price,
                    unit: input.unit,
                    description: input.description,
                    version: { increment: 1 }
                }
            });
        }),
});
