import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { enforceTenant } from "@/server/trpc/middleware/roleCheck";
import bcrypt from "bcryptjs";

/**
 * Creditor Ledger Router (V2)
 *
 * Manages supplier account ledgers with:
 * - Real-time running balance tracking
 * - PIN verification for payments
 * - Full audit trail
 * - Manager notifications for large payments
 */
export const creditorLedgerRouter = router({
    /**
     * Get ledger entries for a supplier
     */
    getLedger: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            supplierId: z.string(),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
            limit: z.number().min(1).max(100).default(50),
            offset: z.number().min(0).default(0),
        }))
        .query(async ({ ctx, input }) => {
            const { prisma, user } = ctx;
            const outletId = user?.outletId;

            if (!outletId) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "No outlet context" });
            }

            // Build date filter
            const dateFilter: { gte?: Date; lte?: Date } = {};
            if (input.startDate) dateFilter.gte = new Date(input.startDate);
            if (input.endDate) dateFilter.lte = new Date(input.endDate + "T23:59:59");

            const [entries, total, supplier] = await Promise.all([
                prisma.creditorLedger.findMany({
                    where: {
                        supplierId: input.supplierId,
                        outletId,
                        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
                    },
                    orderBy: { date: "desc" },
                    take: input.limit,
                    skip: input.offset,
                }),
                prisma.creditorLedger.count({
                    where: {
                        supplierId: input.supplierId,
                        outletId,
                        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
                    },
                }),
                prisma.supplier.findUnique({
                    where: { id: input.supplierId },
                    select: { id: true, name: true, whatsappNumber: true },
                }),
            ]);

            // Get current balance (most recent entry)
            const latestEntry = await prisma.creditorLedger.findFirst({
                where: { supplierId: input.supplierId, outletId },
                orderBy: { createdAt: "desc" },
                select: { balance: true },
            });

            return {
                supplier,
                entries: entries.map(e => ({
                    ...e,
                    debit: Number(e.debit),
                    credit: Number(e.credit),
                    balance: Number(e.balance),
                })),
                currentBalance: latestEntry ? Number(latestEntry.balance) : 0,
                total,
                hasMore: input.offset + entries.length < total,
            };
        }),

    /**
     * Record a purchase (increases amount owed)
     */
    recordPurchase: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            supplierId: z.string(),
            amount: z.number().positive(),
            particulars: z.string().min(1),
            referenceType: z.enum(["PURCHASE_ORDER", "DIRECT_PURCHASE"]).optional(),
            referenceId: z.string().optional(),
            notes: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { prisma, user } = ctx;
            const outletId = user?.outletId;
            const userId = user?.id;
            const userName = user?.name || "Unknown";

            if (!outletId || !userId) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "No outlet context" });
            }

            // Get current balance
            const latestEntry = await prisma.creditorLedger.findFirst({
                where: { supplierId: input.supplierId, outletId },
                orderBy: { createdAt: "desc" },
                select: { balance: true },
            });

            const currentBalance = latestEntry ? Number(latestEntry.balance) : 0;
            const newBalance = currentBalance + input.amount;

            // Create ledger entry (credit = money owed)
            const entry = await prisma.creditorLedger.create({
                data: {
                    outletId,
                    supplierId: input.supplierId,
                    date: new Date(),
                    particulars: input.particulars,
                    referenceType: input.referenceType,
                    referenceId: input.referenceId,
                    debit: 0,
                    credit: input.amount,
                    balance: newBalance,
                    notes: input.notes,
                },
            });

            return {
                ...entry,
                debit: Number(entry.debit),
                credit: Number(entry.credit),
                balance: Number(entry.balance),
            };
        }),

    /**
     * Record a payment (reduces amount owed)
     * Requires PIN verification for security
     */
    recordPayment: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            supplierId: z.string(),
            amount: z.number().positive(),
            paymentMethod: z.enum(["CASH", "UPI", "BANK", "CHEQUE"]),
            pin: z.string().length(4),
            notes: z.string().optional(),
            referenceId: z.string().optional(), // Cheque number, UTR, etc.
        }))
        .mutation(async ({ ctx, input }) => {
            const { prisma, user } = ctx;
            const outletId = user?.outletId;
            const userId = user?.id;
            const userName = user?.name || "Unknown";

            if (!outletId || !userId) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "No outlet context" });
            }

            // 1. Verify PIN
            const userPin = await prisma.userPIN.findUnique({
                where: { userId },
            });

            if (!userPin) {
                throw new TRPCError({
                    code: "PRECONDITION_FAILED",
                    message: "PIN not set. Please set your PIN in settings first.",
                });
            }

            // Check lockout
            if (userPin.lockedUntil && userPin.lockedUntil > new Date()) {
                const minutesLeft = Math.ceil((userPin.lockedUntil.getTime() - Date.now()) / 60000);
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: `Account locked. Try again in ${minutesLeft} minutes.`,
                });
            }

            const isValidPin = await bcrypt.compare(input.pin, userPin.pinHash);

            if (!isValidPin) {
                const newFailedAttempts = userPin.failedAttempts + 1;
                const shouldLock = newFailedAttempts >= 5;

                await prisma.userPIN.update({
                    where: { userId },
                    data: {
                        failedAttempts: newFailedAttempts,
                        lockedUntil: shouldLock ? new Date(Date.now() + 15 * 60000) : null,
                    },
                });

                // Log failed attempt
                await prisma.pINActionLog.create({
                    data: {
                        outletId,
                        userId,
                        userName,
                        action: "SUPPLIER_PAYMENT",
                        actionType: "CASH",
                        status: "FAILED",
                        targetDetails: { supplierId: input.supplierId, amount: input.amount },
                    },
                });

                const attemptsLeft = 5 - newFailedAttempts;
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: shouldLock
                        ? "Too many failed attempts. Account locked for 15 minutes."
                        : `Invalid PIN. ${attemptsLeft} attempts remaining.`,
                });
            }

            // Reset failed attempts on success
            await prisma.userPIN.update({
                where: { userId },
                data: { failedAttempts: 0, lockedUntil: null, lastUsedAt: new Date() },
            });

            // 2. Get current balance
            const latestEntry = await prisma.creditorLedger.findFirst({
                where: { supplierId: input.supplierId, outletId },
                orderBy: { createdAt: "desc" },
                select: { balance: true },
            });

            const currentBalance = latestEntry ? Number(latestEntry.balance) : 0;

            if (input.amount > currentBalance) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: `Payment amount (₹${input.amount}) exceeds outstanding balance (₹${currentBalance})`,
                });
            }

            const newBalance = currentBalance - input.amount;

            // 3. Get supplier info for notifications
            const supplier = await prisma.supplier.findUnique({
                where: { id: input.supplierId },
                select: { name: true },
            });

            // 4. Create ledger entry (debit = payment made)
            const entry = await prisma.creditorLedger.create({
                data: {
                    outletId,
                    supplierId: input.supplierId,
                    date: new Date(),
                    particulars: `Payment - ${input.paymentMethod}`,
                    referenceType: "PAYMENT",
                    referenceId: input.referenceId,
                    debit: input.amount,
                    credit: 0,
                    balance: newBalance,
                    paymentMethod: input.paymentMethod,
                    paidBy: userId,
                    paidByName: userName,
                    pinVerified: true,
                    notes: input.notes,
                },
            });

            // 5. Log PIN action
            await prisma.pINActionLog.create({
                data: {
                    outletId,
                    userId,
                    userName,
                    action: "SUPPLIER_PAYMENT",
                    actionType: "CASH",
                    status: "SUCCESS",
                    targetId: entry.id,
                    targetDetails: {
                        supplierId: input.supplierId,
                        supplierName: supplier?.name,
                        amount: input.amount,
                        method: input.paymentMethod,
                        newBalance,
                    },
                },
            });

            // 6. Send manager notification for large payments (>5000)
            if (input.amount >= 5000) {
                const settings = await prisma.securitySettings.findUnique({
                    where: { outletId },
                });

                if (settings?.notifyOnWithdrawal && settings.managerUserIds?.length) {
                    await prisma.managerNotification.createMany({
                        data: (settings.managerUserIds as string[]).map(mgrId => ({
                            outletId,
                            managerId: mgrId,
                            type: "SUPPLIER_PAYMENT",
                            priority: input.amount >= 10000 ? "HIGH" : "MEDIUM",
                            title: "Supplier Payment Made",
                            message: `${userName} paid ₹${input.amount} to ${supplier?.name || "supplier"} via ${input.paymentMethod}. New balance: ₹${newBalance}`,
                            actionBy: userId,
                            actionByName: userName,
                            amount: input.amount,
                            metadata: {
                                supplierId: input.supplierId,
                                ledgerEntryId: entry.id,
                                paymentMethod: input.paymentMethod,
                            },
                        })),
                    });
                }
            }

            return {
                ...entry,
                debit: Number(entry.debit),
                credit: Number(entry.credit),
                balance: Number(entry.balance),
            };
        }),

    /**
     * Get summary of all supplier balances
     */
    getBalanceSummary: protectedProcedure
        .use(enforceTenant)
        .query(async ({ ctx }) => {
            const { prisma, user } = ctx;
            const outletId = user?.outletId;
            const tenantId = user?.tenantId;

            if (!outletId || !tenantId) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "No outlet context" });
            }

            // Get all suppliers for this tenant
            const suppliers = await prisma.supplier.findMany({
                where: { tenantId },
                select: { id: true, name: true },
            });

            // Get latest balance for each supplier
            const balances = await Promise.all(
                suppliers.map(async (supplier) => {
                    const latest = await prisma.creditorLedger.findFirst({
                        where: { supplierId: supplier.id, outletId },
                        orderBy: { createdAt: "desc" },
                        select: { balance: true, date: true },
                    });

                    return {
                        supplierId: supplier.id,
                        supplierName: supplier.name,
                        balance: latest ? Number(latest.balance) : 0,
                        lastActivity: latest?.date || null,
                    };
                })
            );

            // Filter out zero balances and sort by balance descending
            const activeBalances = balances
                .filter(b => b.balance !== 0)
                .sort((a, b) => b.balance - a.balance);

            const totalOwed = activeBalances.reduce((sum, b) => sum + b.balance, 0);

            return {
                suppliers: activeBalances,
                totalOwed,
                supplierCount: activeBalances.length,
            };
        }),

    /**
     * Export ledger to CSV format
     */
    exportLedger: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            supplierId: z.string(),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
        }))
        .query(async ({ ctx, input }) => {
            const { prisma, user } = ctx;
            const outletId = user?.outletId;

            if (!outletId) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "No outlet context" });
            }

            const dateFilter: { gte?: Date; lte?: Date } = {};
            if (input.startDate) dateFilter.gte = new Date(input.startDate);
            if (input.endDate) dateFilter.lte = new Date(input.endDate + "T23:59:59");

            const [entries, supplier] = await Promise.all([
                prisma.creditorLedger.findMany({
                    where: {
                        supplierId: input.supplierId,
                        outletId,
                        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
                    },
                    orderBy: { date: "asc" },
                }),
                prisma.supplier.findUnique({
                    where: { id: input.supplierId },
                    select: { name: true },
                }),
            ]);

            // Generate CSV
            const headers = ["Date", "Particulars", "Debit", "Credit", "Balance", "Payment Method", "Paid By", "Notes"];
            const rows = entries.map(e => [
                e.date.toISOString().split("T")[0],
                e.particulars,
                Number(e.debit).toFixed(2),
                Number(e.credit).toFixed(2),
                Number(e.balance).toFixed(2),
                e.paymentMethod || "",
                e.paidByName || "",
                e.notes || "",
            ]);

            const csv = [
                `Supplier Ledger: ${supplier?.name || "Unknown"}`,
                `Generated: ${new Date().toISOString()}`,
                "",
                headers.join(","),
                ...rows.map(r => r.join(",")),
            ].join("\n");

            return {
                csv,
                filename: `ledger_${supplier?.name?.replace(/\s+/g, "_") || input.supplierId}_${new Date().toISOString().split("T")[0]}.csv`,
            };
        }),
});
