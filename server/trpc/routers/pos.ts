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
            status: z.enum(['COMPLETED', 'PENDING', 'CANCELLED', 'VOIDED']).optional()
        }))
        .query(async ({ ctx, input }) => {
            const { outletId } = ctx.posCredentials;

            const orders = await ctx.prisma.order.findMany({
                where: {
                    outletId,
                    status: input.status as any
                },
                include: { items: true },
                orderBy: { createdAt: 'desc' },
                take: input.limit,
                skip: input.offset
            });

            return orders;
        }),

    voidOrder: posProcedure
        .input(z.object({
            orderId: z.string(),
            reason: z.string().optional()
        }))
        .mutation(async ({ ctx, input }) => {
            const { outletId, userId } = ctx.posCredentials;

            const order = await ctx.prisma.order.findUnique({
                where: { id: input.orderId }
            });

            if (!order || order.outletId !== outletId) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
            }

            if (order.status === 'VOIDED' || order.status === 'CANCELLED') {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Order is already voided/cancelled' });
            }

            // Update status to VOIDED
            // We cast status to any because Prisma enum might strict check, but typically pure string works if it matches
            const updated = await ctx.prisma.order.update({
                where: { id: input.orderId },
                data: {
                    status: 'VOIDED' as any,
                    // notes: input.reason ? `Voided: ${input.reason}` : undefined // If notes field exists
                }
            });

            console.log(`[POS] Order ${input.orderId} voided by user ${userId}`);
            return updated;
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
                select: { id: true, name: true, price: true }
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
                            const cost = item.unitCost || 0; // Cost not on product model yet
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

            return po;
        }),

    // ============================================
    // ENTERPRISE FEATURES (Void & Closing)
    // ============================================

    voidOrder: posProcedure
        .input(z.object({
            orderId: z.string(),
            reason: z.string(),
            pin: z.string().optional() // Can be used for supervisor authorization in future
        }))
        .mutation(async ({ ctx, input }) => {
            const { tenantId, outletId, userId } = ctx.posCredentials;

            // Fetch user for Audit Log
            const user = await ctx.prisma.user.findUnique({
                where: { id: userId },
                select: { name: true }
            });
            const userName = user?.name || 'Unknown Staff';

            return ctx.prisma.$transaction(async (tx) => {
                // 1. Verify Order
                const order = await tx.order.findUnique({
                    where: { id: input.orderId },
                    include: { items: true }
                });

                if (!order) throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
                if (order.outletId !== outletId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Order belongs to another outlet' });
                if (order.status === 'VOIDED') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Order is already voided' });

                // 2. Restore Inventory
                for (const item of order.items) {
                    if (item.productId) {
                        await tx.product.update({
                            where: { id: item.productId },
                            data: {
                                currentStock: { increment: item.quantity },
                                version: { increment: 1 }
                            }
                        });

                        // Log Stock Movement
                        await tx.stockMove.create({
                            data: {
                                outletId,
                                productId: item.productId,
                                qty: item.quantity,
                                type: 'ADJUSTMENT',
                                date: new Date(),
                                notes: `Voided Order #${order.id.slice(-6)}`
                            }
                        });
                    }
                }

                // 3. Update Order Status
                const updatedOrder = await tx.order.update({
                    where: { id: input.orderId },
                    data: {
                        status: 'VOIDED',
                        voidReason: input.reason,
                        voidedBy: userId,
                        voidedAt: new Date()
                    }
                });

                // 4. Audit Log
                await tx.auditLog.create({
                    data: {
                        tenantId,
                        outletId,
                        userId,
                        userName: userName,
                        action: 'VOID_ORDER',
                        tableName: 'Order',
                        recordId: order.id,
                        oldValue: { status: order.status },
                        newValue: { status: 'VOIDED', reason: input.reason },
                        timestamp: new Date()
                    }
                });

                // Invalidate Cache
                const { CacheService } = await import("@/server/services/cache.service");
                await CacheService.invalidate(CacheService.keys.fullMenu(outletId));

                return updatedOrder;
            });
        }),

    getDailyStats: posProcedure
        .input(z.object({
            date: z.string() // YYYY-MM-DD
        }))
        .query(async ({ ctx, input }) => {
            const { outletId } = ctx.posCredentials;
            const startOfDay = new Date(input.date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(input.date);
            endOfDay.setHours(23, 59, 59, 999);

            const orders = await ctx.prisma.order.findMany({
                where: {
                    outletId,
                    createdAt: { gte: startOfDay, lte: endOfDay },
                    status: 'COMPLETED'
                }
            });

            const stats = {
                systemCash: 0,
                systemCard: 0,
                systemUPI: 0,
                systemOther: 0,
                systemTotal: 0,
                orderCount: orders.length
            };

            for (const order of orders) {
                const total = Number(order.totalAmount);
                stats.systemTotal += total;
                if (order.paymentMethod === 'CASH') stats.systemCash += total;
                else if (order.paymentMethod === 'CARD') stats.systemCard += total;
                else if (order.paymentMethod === 'UPI') stats.systemUPI += total;
                else stats.systemOther += total;
            }

            return stats;
        }),



    // ============================================
    // PAYMENTS (Split Bill)
    // ============================================

    addPayment: posProcedure
        .input(z.object({
            orderId: z.string(),
            amount: z.number(),
            method: z.string(), // CASH, CARD, UPI, OTHER
            reference: z.string().optional()
        }))
        .mutation(async ({ ctx, input }) => {
            const { orderId, amount, method, reference } = input;
            const { prisma } = ctx;

            // 1. Validations
            const order = await prisma.order.findUnique({
                where: { id: orderId },
                include: { payments: true }
            });

            if (!order) throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
            if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
                throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Order is already finalized' });
            }

            // 2. Add Payment
            const payment = await prisma.orderPayment.create({
                data: {
                    orderId,
                    amount,
                    method,
                    reference
                }
            });

            // 3. Check Balance & Update Status
            const totalPaid = order.payments.reduce((sum, p) => sum + Number(p.amount), 0) + amount;
            const totalDue = Number(order.totalAmount);
            const remaining = totalDue - totalPaid;

            let newPaymentStatus = 'PARTIAL';
            if (remaining <= 0.01) newPaymentStatus = 'PAID'; // Floating point tolerance

            // Update Order
            const updatedOrder = await prisma.order.update({
                where: { id: orderId },
                data: {
                    paymentStatus: newPaymentStatus,
                    // If fully paid, we can technically mark as COMPLETED, but usually checkout() does that.
                    // For now, we update the primary paymentMethod if it's the first one, or set to "SPLIT"
                    paymentMethod: order.payments.length === 0 ? method : 'SPLIT'
                }
            });

            return { payment, order: updatedOrder, remaining };
        }),

    getOrderPayments: posProcedure
        .input(z.string())
        .query(async ({ ctx, input }) => {
            return await ctx.prisma.orderPayment.findMany({
                where: { orderId: input },
                orderBy: { createdAt: 'desc' }
            });
        }),

    submitDailyClose: posProcedure
        .input(z.object({
            date: z.string(),
            declaredCash: z.number(),
            declaredOnline: z.number(),
            denominations: z.any().optional(),
            notes: z.string().optional()
        }))
        .mutation(async ({ ctx, input }) => {
            const { tenantId, outletId, userId } = ctx.posCredentials;
            const targetDate = new Date(input.date);
            targetDate.setHours(0, 0, 0, 0); // Ensure midnight date

            // Fetch user for Audit Log
            const user = await ctx.prisma.user.findUnique({
                where: { id: userId },
                select: { name: true }
            });
            const userName = user?.name || 'Unknown Staff';

            // 1. Calculate Expected System Totals
            const startOfDay = new Date(input.date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(input.date);
            endOfDay.setHours(23, 59, 59, 999);

            const orders = await ctx.prisma.order.findMany({
                where: {
                    outletId,
                    createdAt: { gte: startOfDay, lte: endOfDay },
                    status: 'COMPLETED'
                }
            });

            let systemCash = 0;
            let systemOnline = 0;
            let systemTotal = 0;

            for (const order of orders) {
                const total = Number(order.totalAmount);
                systemTotal += total;
                if (order.paymentMethod === 'CASH') systemCash += total;
                else systemOnline += total;
            }

            const cashVariance = input.declaredCash - systemCash;

            // 2. Create Closure Record
            const closure = await ctx.prisma.dailyClosure.upsert({
                where: {
                    outletId_date: { outletId, date: targetDate }
                },
                update: {
                    cashSale: systemCash, // Standardizing to system calculated for consistency
                    totalSale: systemTotal,
                    declaredCash: input.declaredCash,
                    declaredOnline: input.declaredOnline,
                    cashVariance: cashVariance,
                    denominations: input.denominations ?? {},
                    notes: input.notes,
                    closedBy: userId,
                    updatedAt: new Date()
                },
                create: {
                    outletId,
                    date: targetDate,
                    cashSale: systemCash,
                    bankSale: systemOnline,
                    totalSale: systemTotal,
                    declaredCash: input.declaredCash,
                    declaredOnline: input.declaredOnline,
                    cashVariance: cashVariance,
                    denominations: input.denominations ?? {},
                    notes: input.notes,
                    closedBy: userId
                }
            });

            // 3. Audit Log
            await ctx.prisma.auditLog.create({
                data: {
                    tenantId,
                    outletId,
                    userId,
                    userName: userName,
                    action: 'DAILY_CLOSE',
                    tableName: 'DailyClosure',
                    recordId: closure.id,
                    newValue: {
                        date: input.date,
                        declaredCash: input.declaredCash,
                        variance: cashVariance
                    },
                    timestamp: new Date()
                }
            });

            return closure;
        }),

    // ============================================
    // ENTERPRISE: TABLE MANAGEMENT
    // ============================================

    /**
     * Open a new table for Dine-In
     */
    openTable: posProcedure
        .input(z.object({
            tableNumber: z.string(),
            customerName: z.string().optional(),
            customerId: z.string().optional()
        }))
        .mutation(async ({ ctx, input }) => {
            const { outletId, tenantId } = ctx.posCredentials;

            // Check if table is already occupied
            const existingOrder = await ctx.prisma.order.findFirst({
                where: {
                    outletId,
                    tableNumber: input.tableNumber,
                    isOpen: true
                }
            });

            if (existingOrder) {
                throw new TRPCError({
                    code: 'CONFLICT',
                    message: `Table ${input.tableNumber} is already occupied`
                });
            }

            const order = await ctx.prisma.order.create({
                data: {
                    outletId,
                    tenantId,
                    orderType: 'DINE_IN',
                    tableNumber: input.tableNumber,
                    isOpen: true,
                    openedAt: new Date(),
                    status: 'PENDING',
                    totalAmount: 0,
                    customerName: input.customerName,
                    customerId: input.customerId
                }
            });

            return order;
        }),

    /**
     * Add items to an open table order
     */
    addItemsToTable: posProcedure
        .input(z.object({
            orderId: z.string(),
            items: z.array(z.object({
                productId: z.string(),
                name: z.string(),
                quantity: z.number(),
                price: z.number(),
                notes: z.string().optional(),
                modifiers: z.any().optional()
            }))
        }))
        .mutation(async ({ ctx, input }) => {
            const { outletId } = ctx.posCredentials;

            // Verify order exists and is open
            const order = await ctx.prisma.order.findFirst({
                where: { id: input.orderId, outletId, isOpen: true }
            });

            if (!order) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Open order not found'
                });
            }

            // Add items
            const itemsToCreate = input.items.map(item => ({
                orderId: input.orderId,
                productId: item.productId,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                total: item.price * item.quantity,
                notes: item.notes,
                modifiers: item.modifiers
            }));

            await ctx.prisma.orderItem.createMany({
                data: itemsToCreate
            });

            // Update order total
            const allItems = await ctx.prisma.orderItem.findMany({
                where: { orderId: input.orderId }
            });

            const newTotal = allItems.reduce((sum, item) => sum + Number(item.total), 0);

            const updatedOrder = await ctx.prisma.order.update({
                where: { id: input.orderId },
                data: {
                    totalAmount: newTotal,
                    kitchenStatus: 'PREPARING',
                    prepStartedAt: order.prepStartedAt || new Date()
                },
                include: { items: true }
            });

            return updatedOrder;
        }),

    /**
     * Get all open tables
     */
    getOpenTables: posProcedure
        .query(async ({ ctx }) => {
            const { outletId } = ctx.posCredentials;

            const openOrders = await ctx.prisma.order.findMany({
                where: {
                    outletId,
                    isOpen: true,
                    orderType: 'DINE_IN'
                },
                include: { items: true },
                orderBy: { openedAt: 'asc' }
            });

            return openOrders;
        }),

    /**
     * Close table and process payment
     */
    closeTable: posProcedure
        .input(z.object({
            orderId: z.string(),
            paymentMethod: z.string(),
            discount: z.number().optional(),
            notes: z.string().optional()
        }))
        .mutation(async ({ ctx, input }) => {
            const { outletId, tenantId, userId } = ctx.posCredentials;

            const order = await ctx.prisma.order.findFirst({
                where: { id: input.orderId, outletId, isOpen: true },
                include: { items: true }
            });

            if (!order) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Open order not found'
                });
            }

            // Queue for processing (inventory deduction, etc.)
            const idempotencyKey = `${outletId}-${order.id}-${Date.now()}`;

            await inngest.send({
                name: 'pos/sale.created',
                data: {
                    idempotencyKey,
                    tenantId: tenantId || order.tenantId,
                    outletId,
                    order: {
                        items: order.items.map(item => ({
                            productId: item.productId || item.id,
                            name: item.name,
                            quantity: item.quantity,
                            price: Number(item.price),
                            totalPrice: Number(item.total)
                        })),
                        total: Number(order.totalAmount) - (input.discount || 0),
                        discount: input.discount || 0,
                        paymentMethod: input.paymentMethod,
                        customerName: order.customerName || undefined
                    },
                    timestamp: Date.now()
                }
            });

            // Close the order
            const closedOrder = await ctx.prisma.order.update({
                where: { id: input.orderId },
                data: {
                    isOpen: false,
                    closedAt: new Date(),
                    status: 'COMPLETED',
                    paymentMethod: input.paymentMethod,
                    discount: input.discount || 0,
                    notes: input.notes,
                    kitchenStatus: 'SERVED'
                },
                include: { items: true }
            });

            return closedOrder;
        }),

    // ============================================
    // ENTERPRISE: SHIFT MANAGEMENT
    // ============================================

    startShift: posProcedure
        .input(z.object({
            openingCash: z.number()
        }))
        .mutation(async ({ ctx, input }) => {
            const { outletId, userId } = ctx.posCredentials;

            // Check for existing open shift
            const existingShift = await ctx.prisma.shift.findFirst({
                where: { outletId, userId, endedAt: null }
            });

            if (existingShift) {
                throw new TRPCError({
                    code: 'CONFLICT',
                    message: 'You already have an open shift'
                });
            }

            const shift = await ctx.prisma.shift.create({
                data: {
                    outletId,
                    userId,
                    openingCash: input.openingCash
                }
            });

            return shift;
        }),

    endShift: posProcedure
        .input(z.object({
            shiftId: z.string(),
            closingCash: z.number(),
            notes: z.string().optional()
        }))
        .mutation(async ({ ctx, input }) => {
            const { outletId, userId } = ctx.posCredentials;

            const shift = await ctx.prisma.shift.findFirst({
                where: { id: input.shiftId, outletId, userId, endedAt: null }
            });

            if (!shift) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Active shift not found'
                });
            }

            // Calculate expected cash (simplified - just opening + cash orders)
            const orders = await ctx.prisma.order.findMany({
                where: {
                    outletId,
                    createdAt: { gte: shift.startedAt },
                    status: 'COMPLETED',
                    paymentMethod: 'CASH'
                }
            });

            const cashFromSales = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
            const expectedCash = Number(shift.openingCash) + cashFromSales;
            const variance = input.closingCash - expectedCash;

            const closedShift = await ctx.prisma.shift.update({
                where: { id: input.shiftId },
                data: {
                    endedAt: new Date(),
                    closingCash: input.closingCash,
                    expectedCash,
                    variance,
                    totalSales: cashFromSales,
                    orderCount: orders.length,
                    notes: input.notes
                }
            });

            return closedShift;
        }),

    getActiveShift: posProcedure
        .query(async ({ ctx }) => {
            const { outletId, userId } = ctx.posCredentials;

            const shift = await ctx.prisma.shift.findFirst({
                where: { outletId, userId, endedAt: null }
            });

            return shift;
        }),

    // ============================================
    // ENTERPRISE: KITCHEN DISPLAY
    // ============================================

    updateKitchenStatus: posProcedure
        .input(z.object({
            orderId: z.string(),
            status: z.enum(['NEW', 'PREPARING', 'READY', 'SERVED'])
        }))
        .mutation(async ({ ctx, input }) => {
            const { outletId } = ctx.posCredentials;

            const updateData: any = {
                kitchenStatus: input.status
            };

            if (input.status === 'PREPARING' && !updateData.prepStartedAt) {
                updateData.prepStartedAt = new Date();
            }
            if (input.status === 'READY') {
                updateData.prepCompletedAt = new Date();
            }

            const order = await ctx.prisma.order.update({
                where: { id: input.orderId },
                data: updateData,
                include: { items: true }
            });

            return order;
        }),

    getKitchenOrders: posProcedure
        .query(async ({ ctx }) => {
            const { outletId } = ctx.posCredentials;

            const orders = await ctx.prisma.order.findMany({
                where: {
                    outletId,
                    kitchenStatus: { in: ['NEW', 'PREPARING'] },
                    status: { in: ['PENDING', 'VOIDED'] } // Valid statuses
                },
                include: { items: true },
                orderBy: { createdAt: 'asc' }
            });

            return orders;
        }),

    // ============================================
    // ENTERPRISE: HOLD ORDERS
    // ============================================

    holdOrder: posProcedure
        .input(z.object({
            orderId: z.string(),
            reason: z.string().optional()
        }))
        .mutation(async ({ ctx, input }) => {
            const order = await ctx.prisma.order.update({
                where: { id: input.orderId },
                data: {
                    isHold: true,
                    holdReason: input.reason
                }
            });
            return order;
        }),

    resumeOrder: posProcedure
        .input(z.object({
            orderId: z.string()
        }))
        .mutation(async ({ ctx, input }) => {
            const order = await ctx.prisma.order.update({
                where: { id: input.orderId },
                data: {
                    isHold: false,
                    holdReason: null
                }
            });
            return order;
        }),

    getHeldOrders: posProcedure
        .query(async ({ ctx }) => {
            const { outletId } = ctx.posCredentials;

            const orders = await ctx.prisma.order.findMany({
                where: { outletId, isHold: true },
                include: { items: true },
                orderBy: { createdAt: 'desc' }
            });

            return orders;
        }),

    // ============================================
    // ENTERPRISE: CASH DRAWER
    // ============================================

    cashDrawerAction: posProcedure
        .input(z.object({
            type: z.enum(['FLOAT', 'DROP', 'PICKUP', 'PAY_IN', 'PAY_OUT']),
            amount: z.number(),
            reason: z.string().optional(),
            shiftId: z.string().optional()
        }))
        .mutation(async ({ ctx, input }) => {
            const { outletId, userId } = ctx.posCredentials;

            const transaction = await ctx.prisma.cashDrawerTransaction.create({
                data: {
                    outletId,
                    shiftId: input.shiftId,
                    type: input.type,
                    amount: input.amount,
                    reason: input.reason,
                    performedBy: userId
                }
            });

            return transaction;
        }),

    // ============================================
    // ENTERPRISE: DISCOUNTS & COUPONS
    // ============================================

    getCoupons: posProcedure
        .query(async ({ ctx }) => {
            const { outletId } = ctx.posCredentials;
            return await ctx.prisma.discount.findMany({
                where: { outletId, isActive: true },
                orderBy: { createdAt: 'desc' }
            });
        }),

    validateCoupon: posProcedure
        .input(z.object({
            code: z.string(),
            orderTotal: z.number()
        }))
        .mutation(async ({ ctx, input }) => {
            const { outletId } = ctx.posCredentials;
            const coupon = await ctx.prisma.discount.findUnique({
                where: { outletId_code: { outletId, code: input.code } }
            });

            if (!coupon || !coupon.isActive) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Invalid or expired coupon' });
            }

            // Check Validity
            const now = new Date();
            if (coupon.startDate && coupon.startDate > now) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Coupon not yet active' });
            if (coupon.endDate && coupon.endDate < now) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Coupon expired' });
            if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Coupon usage limit exceeded' });
            if (input.orderTotal < (Number(coupon.minOrderVal) || 0)) throw new TRPCError({ code: 'BAD_REQUEST', message: `Minimum order value of ${coupon.minOrderVal} required` });

            // Calculate Discount
            let discountAmount = 0;
            if (coupon.type === 'PERCENTAGE') {
                discountAmount = (input.orderTotal * Number(coupon.value)) / 100;
                if (coupon.maxDiscount && discountAmount > Number(coupon.maxDiscount)) {
                    discountAmount = Number(coupon.maxDiscount);
                }
            } else {
                discountAmount = Number(coupon.value);
            }

            // Ensure we don't discount more than total
            discountAmount = Math.min(discountAmount, input.orderTotal);

            return {
                ...coupon,
                calculatedDiscount: discountAmount
            };
        }),

    createCoupon: posProcedure
        .input(z.object({
            code: z.string().transform(v => v.toUpperCase()),
            type: z.enum(['PERCENTAGE', 'FIXED']),
            value: z.number(),
            minOrderVal: z.number().default(0),
            maxDiscount: z.number().optional(),
            endDate: z.date().optional()
        }))
        .mutation(async ({ ctx, input }) => {
            const { outletId } = ctx.posCredentials;
            return await ctx.prisma.discount.create({
                data: {
                    outletId,
                    ...input,
                }
            });
        }),
});

