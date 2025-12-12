import { z } from "zod";
import { router, publicProcedure } from "@/server/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { InventoryService } from "@/server/services/inventory.service";
import { CacheService } from "@/server/services/cache.service";

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

            // B. Fetch Products (Cached)
            const products = await CacheService.getOrSet(
                CacheService.keys.fullMenu(outletId),
                async () => {
                    return ctx.prisma.product.findMany({
                        where: { outletId },
                        include: { supplier: true, category: true },
                        orderBy: { name: 'asc' }
                    });
                },
                3600 // 1 hour TTL
            );

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

            console.log(`[POS Sync] Received syncSales request for Outlet: ${outletId}, Tenant: ${tenantId}`);
            console.log(`[POS Sync] Payload:`, JSON.stringify(input, null, 2));

            if (!tenantId || !outletId) {
                console.error('[POS Sync] Missing headers');
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Missing SaaS Context Headers' });
            }

            // Verify Outlet Access
            const outlet = await ctx.prisma.outlet.findUnique({ where: { id: outletId } });
            if (!outlet) {
                console.error(`[POS Sync] Outlet not found: ${outletId}`);
                throw new TRPCError({ code: 'FORBIDDEN', message: 'Outlet not found' });
            }
            if (!outlet.isPosEnabled) {
                console.error(`[POS Sync] POS not enabled for outlet: ${outletId}`);
                throw new TRPCError({ code: 'FORBIDDEN', message: 'POS access denied' });
            }
            console.log(`[POS Sync] Outlet verified: ${outlet.name}`);

            // Delegate to InventoryService for ACID transaction
            const order = await InventoryService.processSale(ctx.prisma, {
                id: input.id,
                tenantId,
                outletId,
                items: input.items,
                total: input.total,
                discount: input.discount,
                paymentMethod: input.paymentMethod,
                createdAt: new Date(input.createdAt),
                status: input.status,
                customerName: input.customerName,
                customerPhone: input.customerPhone,
                redeemedReward: input.redeemedReward
            });

            console.log(`[POS Sync] Successfully processed Order ID: ${order.id}`);
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

            const product = await ctx.prisma.product.findUnique({
                where: { outletId_sku: { outletId, sku: input.sku } }
            });

            if (!product) {
                console.warn(`Product not found for SKU: ${input.sku}`);
                return { success: false, message: 'Product not found' };
            }

            await InventoryService.adjustStock(ctx.prisma, {
                productId: product.id,
                outletId,
                qty: input.quantity,
                type: input.type as any,
                date: new Date(input.createdAt),
                notes: `POS Ref: ${input.referenceId}`
            });

            return { success: true };
        }),

    // 4. Close Day (Push)
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

            const { SaleService } = await import("../../services/sale.service");
            return SaleService.recordDailyClosure(ctx.prisma, {
                tenantId,
                outletId,
                date: new Date(input.date),
                cashSales: input.cashSales,
                cardSales: input.cardSales,
                upiSales: input.upiSales,
                totalSales: input.totalSales
            });
        }),

    // 5. Check Sync (Poll)
    checkSync: publicProcedure
        .input(z.object({
            productsVersion: z.number().default(0)
        }))
        .query(async ({ ctx, input }) => {
            const outletId = ctx.headers.get('x-outlet-id');
            if (!outletId) throw new TRPCError({ code: 'BAD_REQUEST' });

            // 2. Check Products Version
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
            const outletId = ctx.headers.get('x-outlet-id');
            if (!outletId) throw new TRPCError({ code: 'BAD_REQUEST' });

            const startDate = new Date(input.startDate);
            const endDate = new Date(input.endDate);

            const { AnalyticsService } = await import("../../services/analytics.service");
            return AnalyticsService.getReportStats(ctx.prisma, {
                outletId, startDate, endDate
            });
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

            const { AnalyticsService } = await import("../../services/analytics.service");
            return AnalyticsService.getReportSalesTrend(ctx.prisma, {
                outletId, startDate, endDate
            });
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

            const { AnalyticsService } = await import("../../services/analytics.service");
            return AnalyticsService.getReportTopItems(ctx.prisma, {
                outletId, startDate, endDate, limit: input.limit
            });
        }),

    // --- Customers ---

    getCustomers: publicProcedure
        .input(z.object({
            search: z.string().optional(),
        }))
        .query(async ({ ctx, input }) => {
            const tenantId = ctx.headers.get('x-tenant-id');
            if (!tenantId) throw new TRPCError({ code: 'BAD_REQUEST' });

            const { CustomerService } = await import("../../services/customer.service");
            return CustomerService.getCustomers(ctx.prisma, {
                tenantId,
                search: input.search
            });
        }),

    getCustomerHistory: publicProcedure
        .input(z.object({
            customerId: z.string()
        }))
        .query(async ({ ctx, input }) => {
            const tenantId = ctx.headers.get('x-tenant-id');
            if (!tenantId) throw new TRPCError({ code: 'BAD_REQUEST' });

            const { CustomerService } = await import("../../services/customer.service");
            return CustomerService.getHistory(ctx.prisma, {
                customerId: input.customerId,
                tenantId
            });
        }),

    createCustomer: publicProcedure
        .input(z.object({
            name: z.string(),
            phoneNumber: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            const tenantId = ctx.headers.get('x-tenant-id');
            if (!tenantId) throw new TRPCError({ code: 'BAD_REQUEST' });

            const { CustomerService } = await import("../../services/customer.service");
            return CustomerService.create(ctx.prisma, {
                tenantId,
                name: input.name,
                phoneNumber: input.phoneNumber
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

            return InventoryService.createProduct(ctx.prisma, {
                outletId,
                name: input.name,
                sku: input.sku,
                price: input.price,
                unit: input.unit,
                categoryId: input.categoryId,
                description: input.description
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

            return InventoryService.updateProduct(ctx.prisma, {
                id: input.id,
                name: input.name,
                price: input.price,
                unit: input.unit,
                description: input.description
            });
        }),
});
