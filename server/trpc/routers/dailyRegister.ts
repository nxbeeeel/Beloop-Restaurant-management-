import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { enforceTenant } from "@/server/trpc/middleware/roleCheck";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";

/**
 * Daily Register Router - V2 Cash Management System
 * Replaces VelocityRegister with comprehensive audit trail
 */

// Helper: Verify PIN for cash operations
async function verifyPinForCashOperation(
    prisma: any,
    userId: string,
    pin: string | undefined,
    outletId: string
): Promise<{ valid: boolean; error?: string }> {
    const settings = await prisma.securitySettings.findUnique({
        where: { outletId },
    });

    const requiresPIN = settings?.withdrawalRequiresPIN ?? true;

    if (!requiresPIN) {
        return { valid: true };
    }

    if (!pin || pin.length !== 4) {
        return { valid: false, error: "PIN required for cash operations" };
    }

    const userPin = await prisma.userPIN.findUnique({
        where: { userId },
    });

    if (!userPin) {
        return { valid: false, error: "PIN not set. Please set your PIN first." };
    }

    if (userPin.lockedUntil && userPin.lockedUntil > new Date()) {
        const minutesLeft = Math.ceil((userPin.lockedUntil.getTime() - Date.now()) / 60000);
        return { valid: false, error: `Account locked. Try again in ${minutesLeft} minutes.` };
    }

    const isValid = await bcrypt.compare(pin, userPin.pinHash);

    if (!isValid) {
        const newFailedAttempts = userPin.failedAttempts + 1;
        const shouldLock = newFailedAttempts >= 5;

        await prisma.userPIN.update({
            where: { userId },
            data: {
                failedAttempts: newFailedAttempts,
                lockedUntil: shouldLock ? new Date(Date.now() + 15 * 60000) : null,
            },
        });

        const attemptsLeft = 5 - newFailedAttempts;
        return {
            valid: false,
            error: shouldLock
                ? "Too many failed attempts. Account locked for 15 minutes."
                : `Invalid PIN. ${attemptsLeft} attempts remaining.`,
        };
    }

    await prisma.userPIN.update({
        where: { userId },
        data: { failedAttempts: 0, lockedUntil: null, lastUsedAt: new Date() },
    });

    return { valid: true };
}

export const dailyRegisterRouter = router({
    // ============================================
    // REGISTER OPERATIONS
    // ============================================

    /**
     * Open daily register for the day
     */
    openRegister: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string(),
            date: z.string(), // YYYY-MM-DD
            expectedOpening: z.number(),
            actualOpening: z.number(),
            openingNote: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const dateObj = new Date(input.date);
            dateObj.setHours(0, 0, 0, 0);

            // Check if register already exists
            const existing = await ctx.prisma.dailyRegister.findUnique({
                where: {
                    outletId_date: {
                        outletId: input.outletId,
                        date: dateObj,
                    },
                },
            });

            if (existing) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Register already exists for this date",
                });
            }

            const variance = input.actualOpening - input.expectedOpening;

            return ctx.prisma.dailyRegister.create({
                data: {
                    outletId: input.outletId,
                    date: dateObj,
                    status: "OPEN",
                    expectedOpening: input.expectedOpening,
                    actualOpening: input.actualOpening,
                    openingVariance: variance,
                    openingNote: input.openingNote,
                    openedBy: ctx.user.id,
                    openedByName: ctx.user.name,
                    openedAt: new Date(),
                },
            });
        }),

    /**
     * Get register for specific date
     */
    getRegister: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string(),
            date: z.string(), // YYYY-MM-DD
        }))
        .query(async ({ ctx, input }) => {
            const dateObj = new Date(input.date);
            dateObj.setHours(0, 0, 0, 0);

            const register = await ctx.prisma.dailyRegister.findUnique({
                where: {
                    outletId_date: {
                        outletId: input.outletId,
                        date: dateObj,
                    },
                },
                include: {
                    transactions: {
                        orderBy: { createdAt: "desc" },
                    },
                    withdrawals: {
                        orderBy: { createdAt: "desc" },
                    },
                },
            });

            return register;
        }),

    /**
     * Add transaction to register
     */
    addTransaction: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            registerId: z.string(),
            type: z.enum(["SALE", "EXPENSE", "WITHDRAWAL", "PAYOUT", "MANUAL"]),
            category: z.string().optional(),
            amount: z.number(),
            isInflow: z.boolean(),
            paymentMode: z.enum(["CASH", "UPI", "CARD", "ONLINE"]),
            description: z.string(),
            referenceId: z.string().optional(),
            referenceType: z.string().optional(),
            vendorName: z.string().optional(),
            proofImageUrl: z.string().optional(),
            handedTo: z.string().optional(),
            purpose: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const register = await ctx.prisma.dailyRegister.findUnique({
                where: { id: input.registerId },
            });

            if (!register) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Register not found" });
            }

            if (register.status === "CLOSED") {
                throw new TRPCError({ code: "BAD_REQUEST", message: "Register is closed" });
            }

            // Create transaction
            const transaction = await ctx.prisma.registerTransaction.create({
                data: {
                    registerId: input.registerId,
                    outletId: register.outletId,
                    type: input.type,
                    category: input.category,
                    amount: input.amount,
                    isInflow: input.isInflow,
                    paymentMode: input.paymentMode,
                    description: input.description,
                    referenceId: input.referenceId,
                    referenceType: input.referenceType,
                    vendorName: input.vendorName,
                    proofImageUrl: input.proofImageUrl,
                    handedTo: input.handedTo,
                    purpose: input.purpose,
                    createdBy: ctx.user.id,
                    createdByName: ctx.user.name,
                },
            });

            // Update running totals on register
            const updateData: any = {};
            if (input.paymentMode === "CASH") {
                if (input.isInflow) {
                    updateData.totalCashIn = { increment: input.amount };
                } else {
                    updateData.totalCashOut = { increment: input.amount };
                }
            } else if (input.paymentMode === "UPI") {
                updateData.totalUPI = { increment: input.amount };
            } else if (input.paymentMode === "CARD") {
                updateData.totalCard = { increment: input.amount };
            }

            if (Object.keys(updateData).length > 0) {
                await ctx.prisma.dailyRegister.update({
                    where: { id: input.registerId },
                    data: updateData,
                });
            }

            return transaction;
        }),

    /**
     * Record cash withdrawal (requires PIN)
     */
    recordWithdrawal: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            registerId: z.string(),
            amount: z.number(),
            purpose: z.enum(["BANK_DEPOSIT", "OWNER_WITHDRAWAL", "EMERGENCY", "PETTY_CASH"]),
            handedTo: z.string(),
            handedToName: z.string().optional(),
            notes: z.string().optional(),
            pin: z.string(), // Required for withdrawals
        }))
        .mutation(async ({ ctx, input }) => {
            const register = await ctx.prisma.dailyRegister.findUnique({
                where: { id: input.registerId },
            });

            if (!register) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Register not found" });
            }

            if (register.status === "CLOSED") {
                throw new TRPCError({ code: "BAD_REQUEST", message: "Register is closed" });
            }

            // Verify PIN
            const pinResult = await verifyPinForCashOperation(
                ctx.prisma,
                ctx.user.id,
                input.pin,
                register.outletId
            );

            if (!pinResult.valid) {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: pinResult.error || "PIN verification failed",
                });
            }

            // Create withdrawal record
            const withdrawal = await ctx.prisma.cashWithdrawal.create({
                data: {
                    outletId: register.outletId,
                    registerId: input.registerId,
                    amount: input.amount,
                    purpose: input.purpose,
                    handedTo: input.handedTo,
                    handedToName: input.handedToName,
                    notes: input.notes,
                    authorizedBy: ctx.user.id,
                    authorizedByName: ctx.user.name,
                    pinVerified: true,
                },
            });

            // Also create a transaction for the register
            await ctx.prisma.registerTransaction.create({
                data: {
                    registerId: input.registerId,
                    outletId: register.outletId,
                    type: "WITHDRAWAL",
                    amount: input.amount,
                    isInflow: false,
                    paymentMode: "CASH",
                    description: `Cash ${input.purpose}: ${input.notes || "No notes"}`,
                    handedTo: input.handedTo,
                    purpose: input.purpose,
                    createdBy: ctx.user.id,
                    createdByName: ctx.user.name,
                    pinVerified: true,
                },
            });

            // Update register totals
            await ctx.prisma.dailyRegister.update({
                where: { id: input.registerId },
                data: {
                    totalCashOut: { increment: input.amount },
                },
            });

            // Log PIN action
            await ctx.prisma.pINActionLog.create({
                data: {
                    outletId: register.outletId,
                    userId: ctx.user.id,
                    userName: ctx.user.name,
                    action: "WITHDRAWAL",
                    actionType: "CASH",
                    targetId: withdrawal.id,
                    targetDetails: { amount: input.amount, purpose: input.purpose },
                    status: "SUCCESS",
                },
            });

            // Send manager notification
            const settings = await ctx.prisma.securitySettings.findUnique({
                where: { outletId: register.outletId },
            });

            if (settings?.managerUserIds?.length) {
                for (const managerId of settings.managerUserIds) {
                    await ctx.prisma.managerNotification.create({
                        data: {
                            outletId: register.outletId,
                            managerId,
                            type: "CASH_WITHDRAWAL",
                            priority: "CRITICAL",
                            title: "Cash Withdrawal",
                            message: `${ctx.user.name} withdrew ₹${input.amount} for ${input.purpose}. Handed to: ${input.handedTo}`,
                            actionBy: ctx.user.id,
                            actionByName: ctx.user.name,
                            amount: input.amount,
                            metadata: { withdrawalId: withdrawal.id, purpose: input.purpose },
                            sentVia: ["IN_APP"],
                        },
                    });
                }
            }

            return withdrawal;
        }),

    /**
     * Close register for the day (calculate variance)
     */
    closeRegister: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            registerId: z.string(),
            physicalCash: z.number(),
            denominations: z.record(z.number()).optional(), // { "2000": 5, "500": 10 }
            varianceReason: z.string().optional(),
            pin: z.string().optional(), // Required if variance > threshold
        }))
        .mutation(async ({ ctx, input }) => {
            const register = await ctx.prisma.dailyRegister.findUnique({
                where: { id: input.registerId },
            });

            if (!register) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Register not found" });
            }

            if (register.status === "CLOSED") {
                throw new TRPCError({ code: "BAD_REQUEST", message: "Register already closed" });
            }

            // Calculate expected cash
            const expectedCash =
                Number(register.actualOpening) +
                Number(register.totalCashIn) -
                Number(register.totalCashOut);

            const variance = input.physicalCash - expectedCash;
            const absVariance = Math.abs(variance);

            // Check if PIN required for variance
            const settings = await ctx.prisma.securitySettings.findUnique({
                where: { outletId: register.outletId },
            });

            const varianceThreshold = Number(settings?.varianceThreshold) || 10;
            const requiresPIN = absVariance > varianceThreshold;

            if (requiresPIN) {
                const pinResult = await verifyPinForCashOperation(
                    ctx.prisma,
                    ctx.user.id,
                    input.pin,
                    register.outletId
                );

                if (!pinResult.valid) {
                    throw new TRPCError({
                        code: "UNAUTHORIZED",
                        message: pinResult.error || `Variance of ₹${absVariance} requires PIN verification`,
                    });
                }
            }

            // Update register with closing data
            const closedRegister = await ctx.prisma.dailyRegister.update({
                where: { id: input.registerId },
                data: {
                    status: "CLOSED",
                    systemCash: expectedCash,
                    physicalCash: input.physicalCash,
                    closingVariance: variance,
                    varianceReason: input.varianceReason,
                    denominations: input.denominations,
                    closedBy: ctx.user.id,
                    closedByName: ctx.user.name,
                    closedAt: new Date(),
                    pinVerified: requiresPIN,
                },
            });

            // Update DailySalesRegisterV2 (aggregated data)
            await ctx.prisma.dailySalesRegisterV2.upsert({
                where: {
                    outletId_date: {
                        outletId: register.outletId,
                        date: register.date,
                    },
                },
                create: {
                    outletId: register.outletId,
                    date: register.date,
                    cashSales: register.totalCashIn,
                    upiSales: register.totalUPI,
                    cardSales: register.totalCard,
                    totalSales: Number(register.totalCashIn) + Number(register.totalUPI) + Number(register.totalCard),
                    openingCash: register.actualOpening,
                    closingCash: input.physicalCash,
                    variance: variance,
                },
                update: {
                    cashSales: register.totalCashIn,
                    upiSales: register.totalUPI,
                    cardSales: register.totalCard,
                    totalSales: Number(register.totalCashIn) + Number(register.totalUPI) + Number(register.totalCard),
                    openingCash: register.actualOpening,
                    closingCash: input.physicalCash,
                    variance: variance,
                    lastUpdated: new Date(),
                },
            });

            // Notify managers if variance exceeds threshold
            if (absVariance > varianceThreshold && settings?.managerUserIds?.length) {
                for (const managerId of settings.managerUserIds) {
                    await ctx.prisma.managerNotification.create({
                        data: {
                            outletId: register.outletId,
                            managerId,
                            type: "VARIANCE",
                            priority: absVariance > 100 ? "CRITICAL" : "HIGH",
                            title: "Cash Variance Alert",
                            message: `Daily closing has ₹${variance} variance. Expected: ₹${expectedCash}, Actual: ₹${input.physicalCash}. ${input.varianceReason || "No reason provided."}`,
                            actionBy: ctx.user.id,
                            actionByName: ctx.user.name,
                            amount: variance,
                            metadata: { registerId: register.id, date: register.date },
                            sentVia: ["IN_APP"],
                        },
                    });
                }
            }

            return closedRegister;
        }),

    /**
     * Get register history for date range
     */
    getHistory: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string(),
            startDate: z.string(),
            endDate: z.string(),
        }))
        .query(async ({ ctx, input }) => {
            const start = new Date(input.startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(input.endDate);
            end.setHours(23, 59, 59, 999);

            return ctx.prisma.dailyRegister.findMany({
                where: {
                    outletId: input.outletId,
                    date: {
                        gte: start,
                        lte: end,
                    },
                },
                orderBy: { date: "desc" },
                include: {
                    _count: {
                        select: { transactions: true, withdrawals: true },
                    },
                },
            });
        }),

    /**
     * Get transactions for a register
     */
    getTransactions: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            registerId: z.string(),
            type: z.enum(["SALE", "EXPENSE", "WITHDRAWAL", "PAYOUT", "MANUAL"]).optional(),
            paymentMode: z.enum(["CASH", "UPI", "CARD", "ONLINE"]).optional(),
        }))
        .query(async ({ ctx, input }) => {
            return ctx.prisma.registerTransaction.findMany({
                where: {
                    registerId: input.registerId,
                    ...(input.type && { type: input.type }),
                    ...(input.paymentMode && { paymentMode: input.paymentMode }),
                },
                orderBy: { createdAt: "desc" },
            });
        }),

    /**
     * Get withdrawals for a register
     */
    getWithdrawals: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            registerId: z.string(),
        }))
        .query(async ({ ctx, input }) => {
            return ctx.prisma.cashWithdrawal.findMany({
                where: { registerId: input.registerId },
                orderBy: { createdAt: "desc" },
            });
        }),
});
