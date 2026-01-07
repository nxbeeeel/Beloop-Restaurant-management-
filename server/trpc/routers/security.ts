import { router, protectedProcedure, requireRole } from "@/server/trpc/trpc";
import { enforceTenant } from "@/server/trpc/middleware/roleCheck";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";

// PIN Action Types
const PIN_ACTIONS = [
    "EDIT_ORDER",
    "VOID_ORDER",
    "WITHDRAWAL",
    "PRICE_OVERRIDE",
    "STOCK_ADJUSTMENT",
    "REFUND",
    "MODIFY_CLOSING",
    "SUPPLIER_PAYMENT",
    "MANUAL_DISCOUNT",
] as const;

type PinAction = typeof PIN_ACTIONS[number];

// Constants
const PIN_LENGTH = 4;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;
const SALT_ROUNDS = 10;

export const securityRouter = router({
    // ============================================
    // PIN MANAGEMENT
    // ============================================

    /**
     * Check if current user has a PIN set
     */
    hasPin: protectedProcedure.query(async ({ ctx }) => {
        const userPin = await ctx.prisma.userPIN.findUnique({
            where: { userId: ctx.user.id },
            select: { id: true, lockedUntil: true, failedAttempts: true },
        });

        if (!userPin) {
            return { hasPin: false, isLocked: false };
        }

        const isLocked = userPin.lockedUntil && userPin.lockedUntil > new Date();

        return {
            hasPin: true,
            isLocked,
            failedAttempts: userPin.failedAttempts,
            lockedUntil: isLocked ? userPin.lockedUntil : null,
        };
    }),

    /**
     * Set or update user's PIN
     * Requires either no existing PIN or verification of old PIN
     */
    setPin: protectedProcedure
        .input(z.object({
            newPin: z.string().length(PIN_LENGTH).regex(/^\d{4}$/, "PIN must be 4 digits"),
            currentPin: z.string().length(PIN_LENGTH).regex(/^\d{4}$/).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            // Check if user already has a PIN
            const existingPin = await ctx.prisma.userPIN.findUnique({
                where: { userId: ctx.user.id },
            });

            if (existingPin) {
                // Verify current PIN if changing existing
                if (!input.currentPin) {
                    throw new TRPCError({
                        code: "BAD_REQUEST",
                        message: "Current PIN required to change PIN",
                    });
                }

                const isValid = await bcrypt.compare(input.currentPin, existingPin.pinHash);
                if (!isValid) {
                    throw new TRPCError({
                        code: "UNAUTHORIZED",
                        message: "Current PIN is incorrect",
                    });
                }
            }

            // Hash new PIN
            const pinHash = await bcrypt.hash(input.newPin, SALT_ROUNDS);

            // Upsert PIN
            await ctx.prisma.userPIN.upsert({
                where: { userId: ctx.user.id },
                create: {
                    userId: ctx.user.id,
                    pinHash,
                },
                update: {
                    pinHash,
                    failedAttempts: 0,
                    lockedUntil: null,
                },
            });

            return { success: true };
        }),

    /**
     * Verify a PIN for a specific action
     * Returns success/failure and logs the action
     */
    verifyPin: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            pin: z.string().length(PIN_LENGTH).regex(/^\d{4}$/, "PIN must be 4 digits"),
            action: z.enum(PIN_ACTIONS),
            targetId: z.string().optional(),
            targetDetails: z.record(z.unknown()).optional(),
            reason: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const outletId = ctx.outletId || ctx.user.outletId;

            if (!outletId) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "No outlet context available",
                });
            }

            // Get user's PIN
            const userPin = await ctx.prisma.userPIN.findUnique({
                where: { userId: ctx.user.id },
            });

            if (!userPin) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "PIN not set. Please set your PIN in settings.",
                });
            }

            // Check if locked
            if (userPin.lockedUntil && userPin.lockedUntil > new Date()) {
                const minutesLeft = Math.ceil(
                    (userPin.lockedUntil.getTime() - Date.now()) / 60000
                );

                // Log failed attempt
                await logPinAction(ctx.prisma, {
                    outletId,
                    userId: ctx.user.id,
                    userName: ctx.user.name,
                    action: input.action,
                    status: "DENIED",
                    targetId: input.targetId,
                    reason: `Account locked for ${minutesLeft} more minutes`,
                });

                return {
                    success: false,
                    locked: true,
                    lockedUntil: userPin.lockedUntil,
                    remainingMinutes: minutesLeft,
                    error: `Account locked. Try again in ${minutesLeft} minutes.`,
                };
            }

            // Verify PIN
            const isValid = await bcrypt.compare(input.pin, userPin.pinHash);

            if (!isValid) {
                const newFailedAttempts = userPin.failedAttempts + 1;
                const shouldLock = newFailedAttempts >= MAX_FAILED_ATTEMPTS;
                const lockoutTime = shouldLock
                    ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60000)
                    : null;

                // Update failed attempts
                await ctx.prisma.userPIN.update({
                    where: { userId: ctx.user.id },
                    data: {
                        failedAttempts: newFailedAttempts,
                        lockedUntil: lockoutTime,
                    },
                });

                // Log failed attempt
                await logPinAction(ctx.prisma, {
                    outletId,
                    userId: ctx.user.id,
                    userName: ctx.user.name,
                    action: input.action,
                    status: "FAILED",
                    targetId: input.targetId,
                    reason: `Invalid PIN - attempt ${newFailedAttempts}/${MAX_FAILED_ATTEMPTS}`,
                });

                const attemptsLeft = MAX_FAILED_ATTEMPTS - newFailedAttempts;

                return {
                    success: false,
                    locked: shouldLock,
                    lockedUntil: lockoutTime,
                    remainingMinutes: shouldLock ? LOCKOUT_DURATION_MINUTES : 0,
                    remainingAttempts: attemptsLeft,
                    error: shouldLock
                        ? `Account locked for ${LOCKOUT_DURATION_MINUTES} minutes due to too many failed attempts.`
                        : `Invalid PIN. ${attemptsLeft} attempt${attemptsLeft !== 1 ? "s" : ""} remaining.`,
                };
            }

            // Success! Reset failed attempts
            await ctx.prisma.userPIN.update({
                where: { userId: ctx.user.id },
                data: {
                    failedAttempts: 0,
                    lockedUntil: null,
                    lastUsedAt: new Date(),
                },
            });

            // Log successful action
            await logPinAction(ctx.prisma, {
                outletId,
                userId: ctx.user.id,
                userName: ctx.user.name,
                action: input.action,
                status: "SUCCESS",
                targetId: input.targetId,
                targetDetails: input.targetDetails,
                reason: input.reason,
            });

            // Send manager notification if configured
            await sendManagerNotification(ctx.prisma, {
                outletId,
                action: input.action,
                actionBy: ctx.user.id,
                actionByName: ctx.user.name,
                targetId: input.targetId,
                targetDetails: input.targetDetails,
            });

            return { success: true, verified: true };
        }),

    /**
     * Admin: Reset user's PIN (managers only)
     */
    resetUserPin: protectedProcedure
        .use(enforceTenant)
        .use(requireRole(["BRAND_ADMIN", "OUTLET_MANAGER", "SUPER"]))
        .input(z.object({
            targetUserId: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            // Verify target user belongs to same tenant/outlet
            const targetUser = await ctx.prisma.user.findUnique({
                where: { id: input.targetUserId },
                select: { id: true, tenantId: true, outletId: true, name: true },
            });

            if (!targetUser) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "User not found",
                });
            }

            // Check permissions
            if (ctx.user.role !== "SUPER") {
                if (targetUser.tenantId !== ctx.tenantId) {
                    throw new TRPCError({
                        code: "FORBIDDEN",
                        message: "Cannot reset PIN for user in different tenant",
                    });
                }

                if (ctx.user.role === "OUTLET_MANAGER" && targetUser.outletId !== ctx.user.outletId) {
                    throw new TRPCError({
                        code: "FORBIDDEN",
                        message: "Cannot reset PIN for user in different outlet",
                    });
                }
            }

            // Delete the user's PIN (they'll need to set a new one)
            await ctx.prisma.userPIN.deleteMany({
                where: { userId: input.targetUserId },
            });

            // Log the action
            const outletId = ctx.outletId || ctx.user.outletId || "";
            await logPinAction(ctx.prisma, {
                outletId,
                userId: ctx.user.id,
                userName: ctx.user.name,
                action: "STOCK_ADJUSTMENT", // Using as admin action
                status: "SUCCESS",
                targetId: input.targetUserId,
                reason: `PIN reset for user ${targetUser.name} by admin`,
            });

            return { success: true };
        }),

    // ============================================
    // SECURITY SETTINGS
    // ============================================

    /**
     * Get security settings for an outlet
     */
    getSettings: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string().optional(),
        }))
        .query(async ({ ctx, input }) => {
            const outletId = input.outletId || ctx.outletId || ctx.user.outletId;

            if (!outletId) {
                return null;
            }

            let settings = await ctx.prisma.securitySettings.findUnique({
                where: { outletId },
            });

            // Create default settings if not exist
            if (!settings) {
                settings = await ctx.prisma.securitySettings.create({
                    data: {
                        outletId,
                        managerUserIds: [],
                    },
                });
            }

            return settings;
        }),

    /**
     * Update security settings (managers only)
     */
    updateSettings: protectedProcedure
        .use(enforceTenant)
        .use(requireRole(["BRAND_ADMIN", "OUTLET_MANAGER", "SUPER"]))
        .input(z.object({
            outletId: z.string(),
            editOrderRequiresPIN: z.boolean().optional(),
            voidOrderRequiresPIN: z.boolean().optional(),
            withdrawalRequiresPIN: z.boolean().optional(),
            priceOverrideRequiresPIN: z.boolean().optional(),
            stockAdjustmentRequiresPIN: z.boolean().optional(),
            refundRequiresPIN: z.boolean().optional(),
            modifyClosingRequiresPIN: z.boolean().optional(),
            supplierPaymentRequiresPIN: z.boolean().optional(),
            manualDiscountRequiresPIN: z.boolean().optional(),
            manualDiscountThreshold: z.number().min(0).max(100).optional(),
            notifyOnEdit: z.boolean().optional(),
            notifyOnVoid: z.boolean().optional(),
            notifyOnWithdrawal: z.boolean().optional(),
            notifyOnVariance: z.boolean().optional(),
            varianceThreshold: z.number().min(0).optional(),
            notificationMethods: z.array(z.string()).optional(),
            managerUserIds: z.array(z.string()).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { outletId, ...data } = input;

            // Verify outlet belongs to tenant
            const outlet = await ctx.prisma.outlet.findFirst({
                where: {
                    id: outletId,
                    tenantId: ctx.tenantId!,
                },
            });

            if (!outlet) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Outlet not found",
                });
            }

            const settings = await ctx.prisma.securitySettings.upsert({
                where: { outletId },
                create: {
                    outletId,
                    ...data,
                },
                update: data,
            });

            return settings;
        }),

    // ============================================
    // PIN ACTION LOG & NOTIFICATIONS
    // ============================================

    /**
     * Get PIN action log for an outlet
     */
    getActionLog: protectedProcedure
        .use(enforceTenant)
        .use(requireRole(["BRAND_ADMIN", "OUTLET_MANAGER", "SUPER"]))
        .input(z.object({
            outletId: z.string().optional(),
            action: z.enum(PIN_ACTIONS).optional(),
            status: z.enum(["SUCCESS", "FAILED", "DENIED"]).optional(),
            startDate: z.date().optional(),
            endDate: z.date().optional(),
            limit: z.number().min(1).max(100).default(50),
            offset: z.number().min(0).default(0),
        }))
        .query(async ({ ctx, input }) => {
            const outletId = input.outletId || ctx.outletId || ctx.user.outletId;

            if (!outletId) {
                return { logs: [], total: 0 };
            }

            const where: Record<string, unknown> = { outletId };

            if (input.action) where.action = input.action;
            if (input.status) where.status = input.status;
            if (input.startDate || input.endDate) {
                where.createdAt = {};
                if (input.startDate) (where.createdAt as Record<string, Date>).gte = input.startDate;
                if (input.endDate) (where.createdAt as Record<string, Date>).lte = input.endDate;
            }

            const [logs, total] = await Promise.all([
                ctx.prisma.pINActionLog.findMany({
                    where,
                    orderBy: { createdAt: "desc" },
                    take: input.limit,
                    skip: input.offset,
                }),
                ctx.prisma.pINActionLog.count({ where }),
            ]);

            return { logs, total };
        }),

    /**
     * Get unread notifications for current user (manager)
     */
    getNotifications: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            unreadOnly: z.boolean().default(true),
            limit: z.number().min(1).max(50).default(20),
        }))
        .query(async ({ ctx, input }) => {
            const where: Record<string, unknown> = {
                managerId: ctx.user.id,
            };

            if (input.unreadOnly) {
                where.isRead = false;
            }

            const notifications = await ctx.prisma.managerNotification.findMany({
                where,
                orderBy: { createdAt: "desc" },
                take: input.limit,
            });

            const unreadCount = await ctx.prisma.managerNotification.count({
                where: {
                    managerId: ctx.user.id,
                    isRead: false,
                },
            });

            return { notifications, unreadCount };
        }),

    /**
     * Mark notifications as read
     */
    markNotificationsRead: protectedProcedure
        .input(z.object({
            notificationIds: z.array(z.string()).optional(),
            markAll: z.boolean().default(false),
        }))
        .mutation(async ({ ctx, input }) => {
            if (input.markAll) {
                await ctx.prisma.managerNotification.updateMany({
                    where: {
                        managerId: ctx.user.id,
                        isRead: false,
                    },
                    data: { isRead: true },
                });
            } else if (input.notificationIds?.length) {
                await ctx.prisma.managerNotification.updateMany({
                    where: {
                        id: { in: input.notificationIds },
                        managerId: ctx.user.id,
                    },
                    data: { isRead: true },
                });
            }

            return { success: true };
        }),

    // ============================================
    // USERS WITH PIN STATUS (for settings page)
    // ============================================

    /**
     * Get users with their PIN status (for PIN management page)
     */
    getUsersWithPinStatus: protectedProcedure
        .use(enforceTenant)
        .use(requireRole(["BRAND_ADMIN", "OUTLET_MANAGER", "SUPER"]))
        .input(z.object({
            outletId: z.string().optional(),
        }))
        .query(async ({ ctx, input }) => {
            const outletId = input.outletId || ctx.outletId || ctx.user.outletId;

            // Get users based on role
            const where: Record<string, unknown> = {
                tenantId: ctx.tenantId,
                isActive: true,
                deletedAt: null,
            };

            // Outlet managers can only see their outlet's users
            if (ctx.user.role === "OUTLET_MANAGER" && outletId) {
                where.outletId = outletId;
            }

            const users = await ctx.prisma.user.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    outletId: true,
                    outlet: {
                        select: { name: true },
                    },
                    userPIN: {
                        select: {
                            id: true,
                            lastUsedAt: true,
                            failedAttempts: true,
                            lockedUntil: true,
                        },
                    },
                },
                orderBy: [{ role: "asc" }, { name: "asc" }],
            });

            return users.map((user) => ({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                outletName: user.outlet?.name,
                hasPIN: !!user.userPIN,
                lastUsed: user.userPIN?.lastUsedAt,
                isLocked: user.userPIN?.lockedUntil && user.userPIN.lockedUntil > new Date(),
                failedAttempts: user.userPIN?.failedAttempts || 0,
            }));
        }),
});

// ============================================
// HELPER FUNCTIONS
// ============================================

interface LogPinActionParams {
    outletId: string;
    userId: string;
    userName: string;
    action: PinAction;
    status: "SUCCESS" | "FAILED" | "DENIED";
    targetId?: string;
    targetDetails?: Record<string, unknown>;
    previousValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;
    reason?: string;
}

async function logPinAction(
    prisma: any,
    params: LogPinActionParams
): Promise<void> {
    try {
        const actionTypeMap: Record<PinAction, string> = {
            EDIT_ORDER: "ORDER",
            VOID_ORDER: "ORDER",
            WITHDRAWAL: "CASH",
            PRICE_OVERRIDE: "ORDER",
            STOCK_ADJUSTMENT: "STOCK",
            REFUND: "ORDER",
            MODIFY_CLOSING: "CASH",
            SUPPLIER_PAYMENT: "CASH",
            MANUAL_DISCOUNT: "ORDER",
        };

        await prisma.pINActionLog.create({
            data: {
                outletId: params.outletId,
                userId: params.userId,
                userName: params.userName,
                action: params.action,
                actionType: actionTypeMap[params.action],
                targetId: params.targetId,
                targetDetails: params.targetDetails,
                previousValue: params.previousValue,
                newValue: params.newValue,
                reason: params.reason,
                status: params.status,
            },
        });
    } catch (error) {
        // V2 model may not exist in production schema
        console.warn("[logPinAction] Failed to log action:", error);
    }
}

interface SendNotificationParams {
    outletId: string;
    action: PinAction;
    actionBy: string;
    actionByName: string;
    targetId?: string;
    targetDetails?: Record<string, unknown>;
    type?: string;
    priority?: string;
    title?: string;
    message?: string;
    amount?: number;
    metadata?: Record<string, unknown>;
}

async function sendManagerNotification(
    prisma: any,
    params: SendNotificationParams
): Promise<void> {
    try {
        // Get security settings
        const settings = await prisma.securitySettings.findUnique({
            where: { outletId: params.outletId },
        });

        if (!settings) return;

        // Check if notification is enabled for this action
        const shouldNotify =
            (params.action === "EDIT_ORDER" && settings.notifyOnEdit) ||
            (params.action === "VOID_ORDER" && settings.notifyOnVoid) ||
            (params.action === "WITHDRAWAL" && settings.notifyOnWithdrawal) ||
            (params.action === "REFUND" && settings.notifyOnVoid);

        if (!shouldNotify || !settings.managerUserIds?.length) return;

        // Create notification title and message
        const actionLabels: Record<PinAction, string> = {
            EDIT_ORDER: "Order Edited",
            VOID_ORDER: "Order Voided",
            WITHDRAWAL: "Cash Withdrawal",
            PRICE_OVERRIDE: "Price Override",
            STOCK_ADJUSTMENT: "Stock Adjusted",
            REFUND: "Order Refunded",
            MODIFY_CLOSING: "Daily Closing Modified",
            SUPPLIER_PAYMENT: "Supplier Payment",
            MANUAL_DISCOUNT: "Manual Discount Applied",
        };

        const title = params.title || actionLabels[params.action];
        const message = params.message || `${params.actionByName} performed: ${title}${params.targetId ? ` (ID: ${params.targetId})` : ""
            }`;

        // Create notifications for all managers
        const notifications = settings.managerUserIds.map((managerId: string) => ({
            outletId: params.outletId,
            managerId,
            type: params.type || "PIN_ACTION",
            priority: params.priority || (params.action === "VOID_ORDER" || params.action === "WITHDRAWAL" ? "HIGH" : "NORMAL"),
            title,
            message,
            actionBy: params.actionBy,
            actionByName: params.actionByName,
            amount: params.amount,
            sentVia: settings.notificationMethods || ["IN_APP"],
            metadata: params.metadata || {
                action: params.action,
                targetId: params.targetId,
                ...params.targetDetails,
            },
        }));

        await prisma.managerNotification.createMany({
            data: notifications,
        });
    } catch (error) {
        // V2 model may not exist in production schema
        console.warn("[sendManagerNotification] Failed:", error);
    }
}

// Export for use in pos.ts
export { logPinAction, sendManagerNotification, type SendNotificationParams };
