import { z } from "zod";
import { router, posProcedure, protectedProcedure } from "@/server/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { InventoryService } from "@/server/services/inventory.service";
import { CacheService } from "@/server/services/cache.service";
import { inngest } from "@/lib/inngest";
import { signPosToken } from "@/lib/pos-auth";

/**
 * POS Router - Secure Endpoints for Point-of-Sale Application
 * 
 * 🚨 SECURITY: All endpoints use posProcedure (HMAC) EXCEPT 'authenticate'
 *    which uses protectedProcedure (Clerk session) to issue the token.
 */
export const posRouter = router({
    // ============================================
    // AUTHENTICATION (Clerk Session -> POS Token)
    // ============================================

    /**
     * Authenticate POS Session
     * Exchanges Clerk authentication for a focused POS HMAC token
     */
    authenticate: protectedProcedure
        .input(z.object({
            outletId: z.string()
        }))
        .mutation(async ({ ctx, input }) => {
            const { outletId } = input;
            const { user } = ctx;

            // 1. Verify Access
            // Staff/Manager must be assigned to this outlet
            if (user.role !== 'SUPER' && user.role !== 'BRAND_ADMIN') {
                if (user.outletId !== outletId) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: 'You are not assigned to this outlet'
                    });
                }
            }

            // Brand Admins check tenant ownership
            if (user.role === 'BRAND_ADMIN') {
                const outlet = await ctx.prisma.outlet.findUnique({
                    where: { id: outletId },
                    select: { tenantId: true }
                });
                if (!outlet || outlet.tenantId !== user.tenantId) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: 'Outlet does not belong to your brand'
                    });
                }
            }

            // 2. Check Outlet Status
            const outlet = await ctx.prisma.outlet.findUnique({
                where: { id: outletId },
                select: {
                    id: true,
                    tenantId: true,
                    status: true,
                    isPosEnabled: true,
                    name: true,
                    tenant: { select: { name: true, slug: true } }
                }
            });

            if (!outlet) throw new TRPCError({ code: 'NOT_FOUND', message: 'Outlet not found' });

            if (outlet.status !== 'ACTIVE') {
                throw new TRPCError({ code: 'FORBIDDEN', message: 'Outlet is not active' });
            }

            if (!outlet.isPosEnabled) {
                throw new TRPCError({ code: 'FORBIDDEN', message: 'POS access is disabled for this outlet' });
            }

            // 3. Generate Token
            const token = signPosToken({
                tenantId: outlet.tenantId,
                outletId: outlet.id,
                userId: user.id
            });

            console.log(`[POS Auth] Issued token for user ${user.email} at outlet ${outlet.name}`);

            return {
                token,
                outlet: {
                    id: outlet.id,
                    name: outlet.name,
                    tenantName: outlet.tenant.name
                },
                user: {
                    id: user.id,
                    name: user.name,
                    role: user.role
                }
            };
        }),

    /**
     * Legacy Login Alias (for compatibility)
     */
    login: protectedProcedure
        .input(z.object({
            outletId: z.string()
        }))
        .mutation(async ({ ctx, input }) => {
            // Forward to authenticate logic
            // (Re-implementing logic here since we can't easily call sibling procedures in tRPC router definition object)
            // Ideally we would extract the logic to a service function, but for now duplicate to ensure speed.

            const { outletId } = input;
            const { user } = ctx;

            if (user.role !== 'SUPER' && user.role !== 'BRAND_ADMIN') {
                if (user.outletId !== outletId) {
                    throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not assigned to this outlet' });
                }
            }

            if (user.role === 'BRAND_ADMIN') {
                const outlet = await ctx.prisma.outlet.findUnique({
                    where: { id: outletId },
                    select: { tenantId: true }
                });
                if (!outlet || outlet.tenantId !== user.tenantId) {
                    throw new TRPCError({ code: 'FORBIDDEN', message: 'Outlet does not belong to your brand' });
                }
            }

            const outlet = await ctx.prisma.outlet.findUnique({
                where: { id: outletId },
                select: {
                    id: true,
                    tenantId: true,
                    status: true,
                    isPosEnabled: true,
                    name: true,
                    tenant: { select: { name: true, slug: true } }
                }
            });

            if (!outlet) throw new TRPCError({ code: 'NOT_FOUND', message: 'Outlet not found' });
            if (outlet.status !== 'ACTIVE') throw new TRPCError({ code: 'FORBIDDEN', message: 'Outlet is not active' });
            if (!outlet.isPosEnabled) throw new TRPCError({ code: 'FORBIDDEN', message: 'POS access is disabled' });

            const token = signPosToken({
                tenantId: outlet.tenantId,
                outletId: outlet.id,
                userId: user.id
            });

            return {
                token,
                outlet: {
                    id: outlet.id,
                    name: outlet.name,
                    tenantName: outlet.tenant.name
                },
                user: {
                    id: user.id,
                    name: user.name,
                    role: user.role
                }
            };
        }),

    /**
     * Get Settings - Initial config for POS
     */
    getSettings: posProcedure
        .query(async ({ ctx }) => {
            const { outletId, tenantId } = ctx.posCredentials;
            const outlet = await ctx.prisma.outlet.findUnique({
                where: { id: outletId },
                select: {
                    id: true,
                    name: true,

                    address: true,
                    phone: true,
                    tenant: { select: { name: true, logoUrl: true, primaryColor: true, currency: true } }
                }
            });

            return outlet;
        }),

    // ============================================
    // READ OPERATIONS (Cached, Direct Response)
    // ============================================

    /**
     * Get Products - Pull product catalog with caching
     */
    getProducts: posProcedure
        .query(async ({ ctx }) => {
            const { tenantId, outletId } = ctx.posCredentials;

            // Fetch Products (Cached for 1 hour)
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

            // Get outlet info
            const outlet = await ctx.prisma.outlet.findUnique({
                where: { id: outletId },
                select: { id: true, name: true, address: true, phone: true, isPosEnabled: true }
            });

            return {
                data: products,
                outlet: outlet || { id: outletId, isPosEnabled: true, name: '', address: null, phone: null }
            };
        }),

    /**
     * Check Sync - Poll for product updates
     */
    checkSync: posProcedure
        .input(z.object({
            productsVersion: z.number().default(0)
        }))
        .query(async ({ ctx, input }) => {
            const { outletId } = ctx.posCredentials;

            const result = await ctx.prisma.product.aggregate({
                where: { outletId },
                _max: { version: true }
            });

            const serverVersion = result._max.version || 0;
            const hasChanges = serverVersion > input.productsVersion;

            return { hasChanges, serverVersion };
        }),

    // ============================================
    // WRITE OPERATIONS (Async via Inngest)
    // ============================================

    /**
     * Sync Sales - Queue order for async processing
     * 
     * 🚨 Returns immediately, order processed in background
     * 🔄 Idempotency handled by Inngest worker (processSale)
     */
    syncSales: posProcedure
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
            const { tenantId, outletId, userId } = ctx.posCredentials;

            // Generate idempotency key for deduplication
            const idempotencyKey = `${outletId}-${input.id}-${Date.now()}`;

            console.log(`[POS Sync] Queueing sale ${idempotencyKey} for outlet ${outletId}`);

            // 🚀 ASYNC: Queue event instead of blocking DB write
            await inngest.send({
                name: 'pos/sale.created',
                data: {
                    idempotencyKey,
                    tenantId,
                    outletId,
                    order: {
                        items: input.items.map(item => ({
                            productId: item.productId || item.id,
                            name: item.name,
                            quantity: item.quantity,
                            price: item.price,
                            totalPrice: item.totalPrice,
                        })),
                        total: input.total,
                        discount: input.discount,
                        paymentMethod: input.paymentMethod,
                        customerName: input.customerName,
                        customerPhone: input.customerPhone,
                    },
                    timestamp: Date.now(),
                },
            });

            return {
                success: true,
                status: 'queued',
                idempotencyKey,
                message: 'Sale queued for processing'
            };
        }),

    /**
     * Stock Move - Queue stock adjustment for async processing
     */
    stockMove: posProcedure
        .input(z.object({
            sku: z.string(),
            quantity: z.number(),
            type: z.enum(['SALE', 'WASTE', 'PURCHASE', 'ADJUSTMENT']),
            referenceId: z.string().optional(),
            createdAt: z.string()
        }))
        .mutation(async ({ ctx, input }) => {
            const { outletId } = ctx.posCredentials;

            // Lookup product by SKU
            const product = await ctx.prisma.product.findUnique({
                where: { outletId_sku: { outletId, sku: input.sku } }
            });

            if (!product) {
                console.warn(`[Stock Move] Product not found for SKU: ${input.sku}`);
                return { success: false, message: 'Product not found' };
            }

            // 🚀 ASYNC: Queue stock movement
            await inngest.send({
                name: 'pos/stock.moved',
                data: {
                    idempotencyKey: `stock-${outletId}-${input.sku}-${Date.now()}`,
                    outletId,
                    movements: [{
                        productId: product.id,
                        quantity: input.quantity,
                        type: input.type === 'WASTE' ? 'WASTAGE' : input.type === 'PURCHASE' ? 'STOCK_IN' : input.type,
                        reason: `POS: ${input.referenceId || 'Manual adjustment'}`
                    }]
                }
            });

            return { success: true, status: 'queued' };
        }),

    /**
     * Close Day - Record daily closure (sync - small write)
     */
    closeDay: posProcedure
        .input(z.object({
            date: z.string(),
            cashSales: z.number(),
            cardSales: z.number(),
            upiSales: z.number().optional(),
            totalSales: z.number(),
            ordersCount: z.number()
        }))
        .mutation(async ({ ctx, input }) => {
            const { tenantId, outletId } = ctx.posCredentials;

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

    // ============================================
    // REPORTS (Read-only, use posCredentials)
    // ============================================

    getReportStats: posProcedure
        .input(z.object({
            startDate: z.string(),
            endDate: z.string(),
        }))
        .query(async ({ ctx, input }) => {
            const { outletId } = ctx.posCredentials;
            const startDate = new Date(input.startDate);
            const endDate = new Date(input.endDate);

            const { AnalyticsService } = await import("../../services/analytics.service");
            return AnalyticsService.getReportStats(ctx.prisma, {
                outletId, startDate, endDate
            });
        }),

    getReportSalesTrend: posProcedure
        .input(z.object({
            startDate: z.string(),
            endDate: z.string(),
        }))
        .query(async ({ ctx, input }) => {
            const { outletId } = ctx.posCredentials;
            const startDate = new Date(input.startDate);
            const endDate = new Date(input.endDate);

            const { AnalyticsService } = await import("../../services/analytics.service");
            return AnalyticsService.getReportSalesTrend(ctx.prisma, {
                outletId, startDate, endDate
            });
        }),

    getReportTopItems: posProcedure
        .input(z.object({
            startDate: z.string(),
            endDate: z.string(),
            limit: z.number().default(5),
        }))
        .query(async ({ ctx, input }) => {
            const { outletId } = ctx.posCredentials;
            const startDate = new Date(input.startDate);
            const endDate = new Date(input.endDate);

            const { AnalyticsService } = await import("../../services/analytics.service");
            return AnalyticsService.getReportTopItems(ctx.prisma, {
                outletId, startDate, endDate, limit: input.limit
            });
        }),

    // ============================================
    // CUSTOMERS (Tenant-level queries)
    // ============================================

    getCustomers: posProcedure
        .input(z.object({
            search: z.string().optional(),
        }))
        .query(async ({ ctx, input }) => {
            const { tenantId } = ctx.posCredentials;

            const { CustomerService } = await import("../../services/customer.service");
            return CustomerService.getCustomers(ctx.prisma, {
                tenantId,
                search: input.search
            });
        }),

    getCustomerHistory: posProcedure
        .input(z.object({
            customerId: z.string()
        }))
        .query(async ({ ctx, input }) => {
            const { tenantId } = ctx.posCredentials;

            const { CustomerService } = await import("../../services/customer.service");
            return CustomerService.getHistory(ctx.prisma, {
                customerId: input.customerId,
                tenantId
            });
        }),

    createCustomer: posProcedure
        .input(z.object({
            name: z.string(),
            phoneNumber: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { tenantId } = ctx.posCredentials;

            const { CustomerService } = await import("../../services/customer.service");
            return CustomerService.create(ctx.prisma, {
                tenantId,
                name: input.name,
                phoneNumber: input.phoneNumber
            });
        }),

    // ============================================
    // PRODUCTS (Outlet-level mutations)
    // ============================================

    createProduct: posProcedure
        .input(z.object({
            name: z.string(),
            sku: z.string(),
            price: z.number(),
            unit: z.string(),
            categoryId: z.string().optional(),
            description: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { outletId } = ctx.posCredentials;

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

    updateProduct: posProcedure
        .input(z.object({
            id: z.string(),
            name: z.string().optional(),
            price: z.number().optional(),
            unit: z.string().optional(),
            description: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { outletId } = ctx.posCredentials;

            return InventoryService.updateProduct(ctx.prisma, {
                id: input.id,
                name: input.name,
                price: input.price,
                unit: input.unit,
                description: input.description
            });
        }),

    // ============================================
    // ORDERS & HISTORY (Expanded)
    // ============================================

    getOrders: posProcedure
        .input(z.object({
            limit: z.number().default(50),
            offset: z.number().default(0),
            status: z.enum(['COMPLETED', 'PENDING', 'CANCELLED']).optional()
        }))
        .query(async ({ ctx, input }) => {
            const { outletId } = ctx.posCredentials;

            const orders = await ctx.prisma.order.findMany({
                where: {
                    outletId,
                    status: input.status
                },
                include: { items: true },
                orderBy: { createdAt: 'desc' },
                take: input.limit,
                skip: input.offset
            });

            return orders;
        }),

    // ============================================
    // INVENTORY MANAGEMENT (Stock Count / PO)
    // ============================================

    createStockCount: posProcedure
        .input(z.object({
            notes: z.string().optional(),
            items: z.array(z.object({
                productId: z.string(),
                countedQty: z.number()
            }))
        }))
        .mutation(async ({ ctx, input }) => {
            const { outletId, userId } = ctx.posCredentials;

            // Run in transaction to ensure consistency
            return ctx.prisma.$transaction(async (tx) => {
                // 1. Create Header
                const stockCheck = await tx.stockCheck.create({
                    data: {
                        outletId,
                        performedBy: userId,
                        notes: input.notes,
                        status: 'COMPLETED'
                    }
                });

                // 2. Process Items
                for (const item of input.items) {
                    const product = await tx.product.findUnique({
                        where: { id: item.productId }
                    });

                    if (!product) continue;

                    const previousQty = product.currentStock;
                    const difference = item.countedQty - previousQty;

                    // Record Item
                    await tx.stockCheckItem.create({
                        data: {
                            stockCheckId: stockCheck.id,
                            productId: item.productId,
                            previousQty,
                            countedQty: item.countedQty,
                            difference
                        }
                    });

                    // Update Actual Stock if different
                    if (difference !== 0) {
                        await tx.product.update({
                            where: { id: item.productId },
                            data: {
                                currentStock: item.countedQty,
                                version: { increment: 1 }
                            }
                        });

                        // Log movement for audit
                        await tx.stockMove.create({
                            data: {
                                outletId,
                                productId: item.productId,
                                qty: difference, // + or -
                                type: 'ADJUSTMENT',
                                date: new Date(),
                                notes: `Stock Check #${stockCheck.id.slice(-6)}`
                            }
                        });
                    }
                }

                // Invalidate cache
                const { CacheService } = await import("@/server/services/cache.service");
                await CacheService.invalidate(CacheService.keys.fullMenu(outletId));

                return stockCheck;
            });
        }),

    createPurchaseOrder: posProcedure
        .input(z.object({
            supplierId: z.string().optional(),
            notes: z.string().optional(),
            items: z.array(z.object({
                productId: z.string(),
                qty: z.number(),
                unitCost: z.number().optional()
            }))
        }))
        .mutation(async ({ ctx, input }) => {
            const { outletId, userId } = ctx.posCredentials;

            // 1. Fetch products to get names
            const productIds = input.items.map(i => i.productId);
            const products = await ctx.prisma.product.findMany({
                where: { id: { in: productIds } },
                select: { id: true, name: true, costPrice: true }
            });
            const productMap = new Map(products.map(p => [p.id, p]));

            // 2. Create PO
            const po = await ctx.prisma.purchaseOrder.create({
                data: {
                    outletId,
                    supplierId: input.supplierId,
                    status: 'DRAFT',
                    createdBy: userId,
                    items: {
                        create: input.items.map(item => {
                            const product = productMap.get(item.productId);
                            const cost = item.unitCost || product?.costPrice || 0;
                            return {
                                productId: item.productId,
                                productName: product?.name || 'Unknown Product',
                                qty: item.qty,
                                unitCost: cost,
                                total: cost * item.qty
                            };
                        })
                    }
                }
            });

        }),
});
