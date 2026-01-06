import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { enforceTenant } from "@/server/trpc/middleware/roleCheck";
import { TRPCError } from "@trpc/server";

/**
 * SMOOCHO VELOCITY ROUTER
 * Project Codename: "Velocity"
 * 
 * Blazing fast cash register & expense management for restaurants.
 * Implements optimistic UI patterns for zero-lag experience.
 */

export const velocityRouter = router({
    // ==========================================
    // REGISTER OPERATIONS
    // ==========================================

    /**
     * Get current register status for the outlet
     * Returns the open register or yesterday's closing for comparison
     */
    getCurrentRegister: protectedProcedure
        .use(enforceTenant)
        .input(z.object({ outletId: z.string() }))
        .query(async ({ ctx, input }) => {
            const { outletId } = input;

            // Authorization check
            if (ctx.role !== "SUPER" && ctx.role !== "BRAND_ADMIN" && ctx.outletId !== outletId) {
                throw new TRPCError({ code: "FORBIDDEN" });
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Check for open register today
            const currentRegister = await ctx.prisma.velocityRegister.findUnique({
                where: { outletId_date: { outletId, date: today } },
                include: {
                    transactions: {
                        include: { category: true },
                        orderBy: { createdAt: "desc" }
                    }
                }
            });

            // Get yesterday's closing for comparison
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            const yesterdayRegister = await ctx.prisma.velocityRegister.findUnique({
                where: { outletId_date: { outletId, date: yesterday } },
                select: { closingCash: true, actualCash: true, status: true }
            });

            return {
                current: currentRegister,
                yesterdayClosing: yesterdayRegister?.closingCash || yesterdayRegister?.actualCash || null,
                yesterdayStatus: yesterdayRegister?.status || null
            };
        }),

    /**
     * Open today's register with opening cash count
     */
    openRegister: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string(),
            openingCash: z.number().min(0)
        }))
        .mutation(async ({ ctx, input }) => {
            const { outletId, openingCash } = input;

            if (ctx.role !== "SUPER" && ctx.role !== "BRAND_ADMIN" && ctx.outletId !== outletId) {
                throw new TRPCError({ code: "FORBIDDEN" });
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Check for existing register
            const existing = await ctx.prisma.velocityRegister.findUnique({
                where: { outletId_date: { outletId, date: today } }
            });

            if (existing) {
                throw new TRPCError({
                    code: "CONFLICT",
                    message: "Register already opened for today"
                });
            }

            // Get yesterday's closing for variance check
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            const yesterdayRegister = await ctx.prisma.velocityRegister.findUnique({
                where: { outletId_date: { outletId, date: yesterday } },
                select: { actualCash: true, closingCash: true }
            });

            const expectedOpening = yesterdayRegister?.actualCash || yesterdayRegister?.closingCash || 0;
            const openingVariance = Math.abs(openingCash - Number(expectedOpening));

            return ctx.prisma.velocityRegister.create({
                data: {
                    outletId,
                    date: today,
                    openingCash,
                    openedBy: ctx.user.id,
                    status: "OPEN"
                },
                include: { transactions: true }
            });
        }),

    /**
     * Close today's register with sales breakdown and cash count
     */
    closeRegister: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            registerId: z.string(),
            cashSales: z.number().min(0),
            upiSales: z.number().min(0),
            zomatoSales: z.number().min(0),
            swiggySales: z.number().min(0).optional().default(0),
            actualCash: z.number().min(0),
            varianceNote: z.string().optional()
        }))
        .mutation(async ({ ctx, input }) => {
            const register = await ctx.prisma.velocityRegister.findUnique({
                where: { id: input.registerId },
                include: { transactions: true }
            });

            if (!register) {
                throw new TRPCError({ code: "NOT_FOUND" });
            }

            if (ctx.role !== "SUPER" && ctx.role !== "BRAND_ADMIN" && register.outletId !== ctx.outletId) {
                throw new TRPCError({ code: "FORBIDDEN" });
            }

            if (register.status === "CLOSED") {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Register is already closed"
                });
            }

            // Calculate expected cash
            const cashExpenses = register.transactions
                .filter(t => t.type === "EXPENSE" && t.paymentMode === "CASH")
                .reduce((sum, t) => sum + Number(t.amount), 0);

            const cashWithdrawals = register.transactions
                .filter(t => t.type === "WITHDRAWAL" && t.paymentMode === "CASH")
                .reduce((sum, t) => sum + Number(t.amount), 0);

            const expectedCash = Number(register.openingCash) + input.cashSales - cashExpenses - cashWithdrawals;
            const variance = input.actualCash - expectedCash;

            // Require variance note if variance exists
            if (Math.abs(variance) > 10 && !input.varianceNote) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Variance exceeds ₹10. Please provide a reason."
                });
            }

            return ctx.prisma.velocityRegister.update({
                where: { id: input.registerId },
                data: {
                    cashSales: input.cashSales,
                    upiSales: input.upiSales,
                    zomatoSales: input.zomatoSales,
                    swiggySales: input.swiggySales,
                    closingCash: expectedCash,
                    actualCash: input.actualCash,
                    variance,
                    varianceNote: input.varianceNote,
                    status: "CLOSED",
                    closedBy: ctx.user.id,
                    closedAt: new Date()
                }
            });
        }),

    // ==========================================
    // TRANSACTION OPERATIONS
    // ==========================================

    /**
     * Add a transaction (expense, withdrawal, etc.)
     */
    addTransaction: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            registerId: z.string(),
            amount: z.number().positive(),
            type: z.enum(["SALE", "EXPENSE", "TRANSFER", "WITHDRAWAL"]),
            paymentMode: z.enum(["CASH", "UPI", "BANK", "CREDIT"]),
            categoryId: z.string().optional(),
            description: z.string().optional(),
            proofImageUrl: z.string().optional(),
            orderId: z.string().optional(),
            customerName: z.string().optional()
        }))
        .mutation(async ({ ctx, input }) => {
            const register = await ctx.prisma.velocityRegister.findUnique({
                where: { id: input.registerId }
            });

            if (!register) {
                throw new TRPCError({ code: "NOT_FOUND" });
            }

            if (ctx.role !== "SUPER" && ctx.role !== "BRAND_ADMIN" && register.outletId !== ctx.outletId) {
                throw new TRPCError({ code: "FORBIDDEN" });
            }

            if (register.status === "CLOSED") {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Cannot add transactions to a closed register"
                });
            }

            // Check if category requires reference (e.g., Porter)
            if (input.categoryId) {
                const category = await ctx.prisma.velocityCategory.findUnique({
                    where: { id: input.categoryId }
                });

                if (category?.requiresRef && !input.orderId && !input.customerName) {
                    throw new TRPCError({
                        code: "BAD_REQUEST",
                        message: `Category "${category.name}" requires an Order ID or Customer Name`
                    });
                }
            }

            return ctx.prisma.velocityTransaction.create({
                data: {
                    registerId: input.registerId,
                    amount: input.amount,
                    type: input.type,
                    paymentMode: input.paymentMode,
                    categoryId: input.categoryId,
                    description: input.description,
                    proofImageUrl: input.proofImageUrl,
                    orderId: input.orderId,
                    customerName: input.customerName,
                    createdBy: ctx.user.id
                },
                include: { category: true }
            });
        }),

    /**
     * List transactions for a register
     */
    listTransactions: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            registerId: z.string(),
            type: z.enum(["SALE", "EXPENSE", "TRANSFER", "WITHDRAWAL"]).optional()
        }))
        .query(async ({ ctx, input }) => {
            const register = await ctx.prisma.velocityRegister.findUnique({
                where: { id: input.registerId },
                select: { outletId: true }
            });

            if (!register) {
                throw new TRPCError({ code: "NOT_FOUND" });
            }

            if (ctx.role !== "SUPER" && ctx.role !== "BRAND_ADMIN" && register.outletId !== ctx.outletId) {
                throw new TRPCError({ code: "FORBIDDEN" });
            }

            return ctx.prisma.velocityTransaction.findMany({
                where: {
                    registerId: input.registerId,
                    ...(input.type && { type: input.type })
                },
                include: { category: true },
                orderBy: { createdAt: "desc" }
            });
        }),

    // ==========================================
    // CATEGORY OPERATIONS
    // ==========================================

    /**
     * Get expense categories for the outlet
     */
    getCategories: protectedProcedure
        .use(enforceTenant)
        .input(z.object({ outletId: z.string() }))
        .query(async ({ ctx, input }) => {
            const { outletId } = input;

            if (ctx.role !== "SUPER" && ctx.role !== "BRAND_ADMIN" && ctx.outletId !== outletId) {
                throw new TRPCError({ code: "FORBIDDEN" });
            }

            return ctx.prisma.velocityCategory.findMany({
                where: { outletId, isActive: true },
                orderBy: { name: "asc" }
            });
        }),

    /**
     * Create a new expense category
     */
    createCategory: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string(),
            name: z.string().min(1),
            requiresRef: z.boolean().optional().default(false)
        }))
        .mutation(async ({ ctx, input }) => {
            // Only managers and above can create categories
            if (ctx.role === "STAFF") {
                throw new TRPCError({ code: "FORBIDDEN" });
            }

            return ctx.prisma.velocityCategory.create({
                data: {
                    outletId: input.outletId,
                    name: input.name,
                    requiresRef: input.requiresRef
                }
            });
        }),

    // ==========================================
    // DASHBOARD OPERATIONS (Manager/Owner Only)
    // ==========================================

    /**
     * Get Profit & Loss report (Accrual basis)
     */
    getPLReport: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string(),
            startDate: z.string(),
            endDate: z.string()
        }))
        .query(async ({ ctx, input }) => {
            if (ctx.role === "STAFF") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only managers can view financial reports"
                });
            }

            const { outletId, startDate, endDate } = input;

            const registers = await ctx.prisma.velocityRegister.findMany({
                where: {
                    outletId,
                    date: {
                        gte: new Date(startDate),
                        lte: new Date(endDate)
                    }
                },
                include: { transactions: true }
            });

            // Calculate totals
            const totalSales = registers.reduce((sum, r) =>
                sum + Number(r.cashSales) + Number(r.upiSales) + Number(r.zomatoSales) + Number(r.swiggySales), 0);

            const totalExpenses = registers.reduce((sum, r) =>
                sum + r.transactions
                    .filter(t => t.type === "EXPENSE")
                    .reduce((s, t) => s + Number(t.amount), 0), 0);

            return {
                totalSales,
                totalExpenses,
                netProfit: totalSales - totalExpenses,
                registerCount: registers.length,
                closedRegisters: registers.filter(r => r.status === "CLOSED").length
            };
        }),

    /**
     * Get Cash Flow report (Actual cash movements)
     */
    getCashFlowReport: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string(),
            startDate: z.string(),
            endDate: z.string()
        }))
        .query(async ({ ctx, input }) => {
            if (ctx.role === "STAFF") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only managers can view financial reports"
                });
            }

            const { outletId, startDate, endDate } = input;

            const registers = await ctx.prisma.velocityRegister.findMany({
                where: {
                    outletId,
                    date: {
                        gte: new Date(startDate),
                        lte: new Date(endDate)
                    },
                    status: "CLOSED"
                },
                include: { transactions: true }
            });

            // Cash in
            const cashIn = registers.reduce((sum, r) => sum + Number(r.cashSales), 0);

            // Cash out (cash expenses and withdrawals)
            const cashOut = registers.reduce((sum, r) =>
                sum + r.transactions
                    .filter(t => (t.type === "EXPENSE" || t.type === "WITHDRAWAL") && t.paymentMode === "CASH")
                    .reduce((s, t) => s + Number(t.amount), 0), 0);

            // Total variance
            const totalVariance = registers.reduce((sum, r) => sum + Number(r.variance || 0), 0);

            return {
                cashIn,
                cashOut,
                netCashFlow: cashIn - cashOut,
                totalVariance,
                registersWithVariance: registers.filter(r => Math.abs(Number(r.variance || 0)) > 10).length
            };
        }),

    /**
     * Get Payables (Suppliers owed money)
     * Uses existing Supplier model from beloop-tracker
     */
    getPayables: protectedProcedure
        .use(enforceTenant)
        .input(z.object({ outletId: z.string() }))
        .query(async ({ ctx, input }) => {
            if (ctx.role === "STAFF") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only managers can view payables"
                });
            }

            // Get outlet's tenant
            const outlet = await ctx.prisma.outlet.findUnique({
                where: { id: input.outletId },
                select: { tenantId: true }
            });

            if (!outlet) {
                throw new TRPCError({ code: "NOT_FOUND" });
            }

            // Get suppliers with unpaid POs
            const suppliersWithBalance = await ctx.prisma.supplier.findMany({
                where: { tenantId: outlet.tenantId },
                include: {
                    purchaseOrders: {
                        where: {
                            outletId: input.outletId,
                            status: "RECEIVED",
                            expense: null // Not yet linked to expense (unpaid)
                        },
                        select: { totalAmount: true }
                    },
                    payments: {
                        where: { outletId: input.outletId },
                        select: { amount: true }
                    }
                }
            });

            return suppliersWithBalance.map(s => ({
                id: s.id,
                name: s.name,
                whatsappNumber: s.whatsappNumber,
                totalOrdered: s.purchaseOrders.reduce((sum, po) => sum + Number(po.totalAmount), 0),
                totalPaid: s.payments.reduce((sum, p) => sum + Number(p.amount), 0),
                balance: s.purchaseOrders.reduce((sum, po) => sum + Number(po.totalAmount), 0) -
                    s.payments.reduce((sum, p) => sum + Number(p.amount), 0)
            })).filter(s => s.balance > 0);
        }),

    // ==========================================
    // PROCUREMENT OPERATIONS (Bill Manager)
    // ==========================================

    /**
     * Get suppliers for ordering
     */
    getSuppliers: protectedProcedure
        .use(enforceTenant)
        .input(z.object({ outletId: z.string() }))
        .query(async ({ ctx, input }) => {
            const outlet = await ctx.prisma.outlet.findUnique({
                where: { id: input.outletId },
                select: { tenantId: true }
            });

            if (!outlet) {
                throw new TRPCError({ code: "NOT_FOUND" });
            }

            return ctx.prisma.supplier.findMany({
                where: { tenantId: outlet.tenantId },
                orderBy: { name: "asc" }
            });
        }),

    /**
     * Get pending orders for the outlet
     */
    getPendingOrders: protectedProcedure
        .use(enforceTenant)
        .input(z.object({ outletId: z.string() }))
        .query(async ({ ctx, input }) => {
            return ctx.prisma.purchaseOrder.findMany({
                where: {
                    outletId: input.outletId,
                    status: { in: ["DRAFT", "SENT"] }
                },
                include: {
                    supplier: true,
                    items: {
                        include: { product: true, ingredient: true }
                    }
                },
                orderBy: { createdAt: "desc" }
            });
        }),

    /**
     * Create a quick order with WhatsApp link generation
     */
    createQuickOrder: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string(),
            supplierId: z.string(),
            items: z.array(z.object({
                name: z.string(),
                qty: z.number().positive(),
                unit: z.string().optional()
            })),
            notes: z.string().optional()
        }))
        .mutation(async ({ ctx, input }) => {
            const { outletId, supplierId, items, notes } = input;

            // Get supplier details for WhatsApp
            const supplier = await ctx.prisma.supplier.findUnique({
                where: { id: supplierId }
            });

            if (!supplier) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Supplier not found" });
            }

            // Create purchase order
            const order = await ctx.prisma.purchaseOrder.create({
                data: {
                    outletId,
                    supplierId,
                    status: "DRAFT",
                    totalAmount: 0, // Will be set when received
                    createdBy: ctx.user.id,
                    items: {
                        create: items.map(item => ({
                            productName: item.name,
                            qty: item.qty,
                            unitCost: 0, // Will be set when received
                            total: 0
                        }))
                    }
                },
                include: {
                    supplier: true,
                    items: true
                }
            });

            // Generate WhatsApp message
            const itemsList = items.map(i => `• ${i.name}: ${i.qty} ${i.unit || 'units'}`).join('\n');
            const message = encodeURIComponent(
                `🛒 *Order Request*\n\n${itemsList}\n\n${notes ? `Note: ${notes}` : ''}`.trim()
            );

            const whatsappLink = supplier.whatsappNumber
                ? `https://wa.me/${supplier.whatsappNumber.replace(/\D/g, '')}?text=${message}`
                : null;

            // Update order with WhatsApp message
            await ctx.prisma.purchaseOrder.update({
                where: { id: order.id },
                data: {
                    whatsappMessage: message,
                    status: "SENT",
                    sentAt: new Date()
                }
            });

            return {
                order,
                whatsappLink
            };
        }),

    /**
     * Mark order as received with bill amount
     */
    receiveOrder: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            orderId: z.string(),
            billAmount: z.number().positive(),
            paymentMethod: z.enum(["CASH", "CREDIT"]),
            billImageUrl: z.string().optional()
        }))
        .mutation(async ({ ctx, input }) => {
            const { orderId, billAmount, paymentMethod, billImageUrl } = input;

            const order = await ctx.prisma.purchaseOrder.findUnique({
                where: { id: orderId },
                include: { supplier: true }
            });

            if (!order) {
                throw new TRPCError({ code: "NOT_FOUND" });
            }

            if (ctx.role !== "SUPER" && ctx.role !== "BRAND_ADMIN" && order.outletId !== ctx.outletId) {
                throw new TRPCError({ code: "FORBIDDEN" });
            }

            // Update order status
            const updatedOrder = await ctx.prisma.purchaseOrder.update({
                where: { id: orderId },
                data: {
                    status: "RECEIVED",
                    totalAmount: billAmount,
                    billImageUrl,
                    billDate: new Date()
                },
                include: { supplier: true }
            });

            if (paymentMethod === "CASH") {
                // Get today's register and add as expense
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const register = await ctx.prisma.velocityRegister.findUnique({
                    where: { outletId_date: { outletId: order.outletId, date: today } }
                });

                if (register && register.status === "OPEN") {
                    // Add as cash expense to register
                    await ctx.prisma.velocityTransaction.create({
                        data: {
                            registerId: register.id,
                            amount: billAmount,
                            type: "EXPENSE",
                            paymentMode: "CASH",
                            description: `Purchase from ${order.supplier?.name || 'Supplier'}`,
                            createdBy: ctx.user.id
                        }
                    });
                }

                // Record supplier payment
                await ctx.prisma.supplierPayment.create({
                    data: {
                        outletId: order.outletId,
                        supplierId: order.supplierId!,
                        amount: billAmount,
                        method: "CASH",
                        notes: `PO #${order.id}`
                    }
                });

                return { ...updatedOrder, paymentStatus: "PAID" };
            } else {
                // Credit - supplier balance will be tracked via payables
                return { ...updatedOrder, paymentStatus: "CREDIT" };
            }
        }),

    /**
     * Pay a supplier (settle credit)
     */
    paySupplier: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string(),
            supplierId: z.string(),
            amount: z.number().positive(),
            method: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CHEQUE"]),
            reference: z.string().optional(),
            notes: z.string().optional()
        }))
        .mutation(async ({ ctx, input }) => {
            const { outletId, supplierId, amount, method, reference, notes } = input;

            if (ctx.role === "STAFF") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only managers can make supplier payments"
                });
            }

            // Record the payment
            const payment = await ctx.prisma.supplierPayment.create({
                data: {
                    outletId,
                    supplierId,
                    amount,
                    method,
                    reference,
                    notes
                }
            });

            // If paid by cash, also add to register
            if (method === "CASH") {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const register = await ctx.prisma.velocityRegister.findUnique({
                    where: { outletId_date: { outletId, date: today } }
                });

                if (register && register.status === "OPEN") {
                    const supplier = await ctx.prisma.supplier.findUnique({
                        where: { id: supplierId },
                        select: { name: true }
                    });

                    await ctx.prisma.velocityTransaction.create({
                        data: {
                            registerId: register.id,
                            amount,
                            type: "EXPENSE",
                            paymentMode: "CASH",
                            description: `Supplier payment: ${supplier?.name || 'Unknown'}`,
                            createdBy: ctx.user.id
                        }
                    });
                }
            }

            return payment;
        }),

    /**
     * Get payment history for a supplier
     */
    getSupplierPayments: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string(),
            supplierId: z.string()
        }))
        .query(async ({ ctx, input }) => {
            return ctx.prisma.supplierPayment.findMany({
                where: {
                    outletId: input.outletId,
                    supplierId: input.supplierId
                },
                orderBy: { createdAt: "desc" }
            });
        }),

    // ==========================================
    // WALLET OPERATIONS (Cash Drop Feature)
    // ==========================================

    /**
     * Get or create wallets for an outlet
     * Creates default REGISTER and MANAGER_SAFE wallets if they don't exist
     */
    getWallets: protectedProcedure
        .use(enforceTenant)
        .input(z.object({ outletId: z.string() }))
        .query(async ({ ctx, input }) => {
            const { outletId } = input;

            // Ensure default wallets exist
            const registerWallet = await ctx.prisma.velocityWallet.upsert({
                where: { outletId_type: { outletId, type: "REGISTER" } },
                update: {},
                create: {
                    outletId,
                    type: "REGISTER",
                    name: "Shop Register"
                }
            });

            const managerSafeWallet = await ctx.prisma.velocityWallet.upsert({
                where: { outletId_type: { outletId, type: "MANAGER_SAFE" } },
                update: {},
                create: {
                    outletId,
                    type: "MANAGER_SAFE",
                    name: "Manager Safe"
                }
            });

            // Calculate balances from transfers
            const calculateBalance = async (walletId: string) => {
                const incoming = await ctx.prisma.velocityTransfer.aggregate({
                    where: { destinationWalletId: walletId },
                    _sum: { amount: true }
                });
                const outgoing = await ctx.prisma.velocityTransfer.aggregate({
                    where: { sourceWalletId: walletId },
                    _sum: { amount: true }
                });
                return Number(incoming._sum.amount || 0) - Number(outgoing._sum.amount || 0);
            };

            return {
                register: {
                    ...registerWallet,
                    balance: await calculateBalance(registerWallet.id)
                },
                managerSafe: {
                    ...managerSafeWallet,
                    balance: await calculateBalance(managerSafeWallet.id)
                }
            };
        }),

    /**
     * Get Manager Safe balance (for dashboard card)
     */
    getManagerSafeBalance: protectedProcedure
        .use(enforceTenant)
        .input(z.object({ outletId: z.string() }))
        .query(async ({ ctx, input }) => {
            const wallet = await ctx.prisma.velocityWallet.findUnique({
                where: { outletId_type: { outletId: input.outletId, type: "MANAGER_SAFE" } }
            });

            if (!wallet) {
                return { balance: 0, hasPin: false };
            }

            // Calculate balance
            const incoming = await ctx.prisma.velocityTransfer.aggregate({
                where: { destinationWalletId: wallet.id },
                _sum: { amount: true }
            });
            const outgoing = await ctx.prisma.velocityTransfer.aggregate({
                where: { sourceWalletId: wallet.id },
                _sum: { amount: true }
            });

            return {
                balance: Number(incoming._sum.amount || 0) - Number(outgoing._sum.amount || 0),
                hasPin: !!wallet.managerPin
            };
        }),

    /**
     * Set Manager PIN for wallet authorization
     */
    setManagerPin: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string(),
            pin: z.string().length(4).regex(/^\d{4}$/, "PIN must be 4 digits")
        }))
        .mutation(async ({ ctx, input }) => {
            // Only managers and above can set PIN
            if (ctx.role === "STAFF") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only managers can set wallet PIN"
                });
            }

            // Hash the PIN (simple hash for demo, use bcrypt in production)
            const hashedPin = Buffer.from(input.pin).toString("base64");

            await ctx.prisma.velocityWallet.upsert({
                where: { outletId_type: { outletId: input.outletId, type: "MANAGER_SAFE" } },
                update: {
                    managerPin: hashedPin,
                    managerId: ctx.user.id
                },
                create: {
                    outletId: input.outletId,
                    type: "MANAGER_SAFE",
                    name: "Manager Safe",
                    managerPin: hashedPin,
                    managerId: ctx.user.id
                }
            });

            return { success: true };
        }),

    /**
     * Verify Manager PIN
     */
    verifyManagerPin: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string(),
            pin: z.string().length(4)
        }))
        .mutation(async ({ ctx, input }) => {
            const wallet = await ctx.prisma.velocityWallet.findUnique({
                where: { outletId_type: { outletId: input.outletId, type: "MANAGER_SAFE" } }
            });

            if (!wallet || !wallet.managerPin) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Manager PIN not set"
                });
            }

            const hashedInput = Buffer.from(input.pin).toString("base64");
            if (hashedInput !== wallet.managerPin) {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "Invalid PIN"
                });
            }

            return { valid: true, managerId: wallet.managerId };
        }),

    /**
     * Cash Drop: Transfer cash from Register to Manager Safe
     * Requires Manager PIN authorization
     */
    cashDrop: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string(),
            amount: z.number().positive(),
            pin: z.string().length(4),
            reason: z.string().optional()
        }))
        .mutation(async ({ ctx, input }) => {
            const { outletId, amount, pin, reason } = input;

            // Verify PIN first
            const managerSafe = await ctx.prisma.velocityWallet.findUnique({
                where: { outletId_type: { outletId, type: "MANAGER_SAFE" } }
            });

            if (!managerSafe || !managerSafe.managerPin) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Manager PIN not configured. Ask manager to set up PIN first."
                });
            }

            const hashedPin = Buffer.from(pin).toString("base64");
            if (hashedPin !== managerSafe.managerPin) {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "Invalid Manager PIN"
                });
            }

            // Get register wallet
            const registerWallet = await ctx.prisma.velocityWallet.findUnique({
                where: { outletId_type: { outletId, type: "REGISTER" } }
            });

            if (!registerWallet) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Register wallet not found"
                });
            }

            // Create the transfer
            const transfer = await ctx.prisma.velocityTransfer.create({
                data: {
                    outletId,
                    sourceWalletId: registerWallet.id,
                    destinationWalletId: managerSafe.id,
                    amount,
                    reason: reason || "Cash Drop",
                    authorizedBy: managerSafe.managerId || ctx.user.id,
                    initiatedBy: ctx.user.id
                }
            });

            return {
                transfer,
                message: `₹${amount.toLocaleString("en-IN")} transferred to Manager Safe`
            };
        }),

    /**
     * Cash Replenishment: Transfer cash from Manager Safe back to Register
     * Manager only
     */
    cashReplenish: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string(),
            amount: z.number().positive(),
            reason: z.string().optional()
        }))
        .mutation(async ({ ctx, input }) => {
            // Only managers can replenish
            if (ctx.role === "STAFF") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only managers can replenish register"
                });
            }

            const { outletId, amount, reason } = input;

            const registerWallet = await ctx.prisma.velocityWallet.findUnique({
                where: { outletId_type: { outletId, type: "REGISTER" } }
            });

            const managerSafe = await ctx.prisma.velocityWallet.findUnique({
                where: { outletId_type: { outletId, type: "MANAGER_SAFE" } }
            });

            if (!registerWallet || !managerSafe) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Wallets not found" });
            }

            // Create reverse transfer
            const transfer = await ctx.prisma.velocityTransfer.create({
                data: {
                    outletId,
                    sourceWalletId: managerSafe.id,
                    destinationWalletId: registerWallet.id,
                    amount,
                    reason: reason || "Cash Replenishment",
                    authorizedBy: ctx.user.id,
                    initiatedBy: ctx.user.id
                }
            });

            return { transfer };
        }),

    /**
     * Get transfer history
     */
    getTransfers: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string(),
            limit: z.number().optional().default(20)
        }))
        .query(async ({ ctx, input }) => {
            return ctx.prisma.velocityTransfer.findMany({
                where: { outletId: input.outletId },
                orderBy: { createdAt: "desc" },
                take: input.limit,
                include: {
                    sourceWallet: true,
                    destinationWallet: true
                }
            });
        })
});

