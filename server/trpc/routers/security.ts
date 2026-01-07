import { router, protectedProcedure, requireRole } from "@/server/trpc/trpc";
import { enforceTenant } from "@/server/trpc/middleware/roleCheck";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import bcrypt from "bcryptjs";

/**
 * V2 Security Router - FULL IMPLEMENTATION
 * 
 * Features:
 * - PIN Management (set, verify, reset with bcrypt)
 * - Lockout mechanism (5 failed attempts = 15min lockout)
 * - Security Settings per outlet
 * - Action Logging to PINActionLog
 * - Manager Notifications
 */

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

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

// Action type mapping for logging
const ACTION_TYPE_MAP: Record<PinAction, string> = {
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

// =============================================================================
// SECURITY ROUTER
// =============================================================================

export const securityRouter = router({
    // =========================================================================
    // PIN MANAGEMENT
    // =========================================================================

    /**
     * Check if current user has a PIN set
     */
    hasPin: protectedProcedure.query(async ({ ctx }) => {
        const userPin = await ctx.prisma.userPIN.findUnique({
            where: { userId: ctx.userId },
            select: {
                lockedUntil: true,
                failedAttempts: true,
            },
        });

        if (!userPin) {
            return { hasPin: false, isLocked: false, failedAttempts: 0 };
        }

        const isLocked = userPin.lockedUntil
            ? userPin.lockedUntil > new Date()
            : false;

        return {
            hasPin: true,
            isLocked,
            failedAttempts: userPin.failedAttempts,
        };
    }),

    /**
     * Set or update user's PIN
     */
    setPin: protectedProcedure
        .input(z.object({
            newPin: z.string().length(4).regex(/^\d{4}$/, "PIN must be 4 digits"),
            currentPin: z.string().length(4).regex(/^\d{4}$/).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            // Check if user already has a PIN
            const existingPin = await ctx.prisma.userPIN.findUnique({
                where: { userId: ctx.userId },
            });

            // If PIN exists, verify current PIN first
            if (existingPin) {
                if (!input.currentPin) {
                    throw new TRPCError({
                        code: "BAD_REQUEST",
                        message: "Current PIN required to change PIN",
                    });
                }

                const isMatch = await bcrypt.compare(input.currentPin, existingPin.pinHash);
                if (!isMatch) {
                    throw new TRPCError({
                        code: "UNAUTHORIZED",
                        message: "Current PIN is incorrect",
                    });
                }
            }

            // Hash new PIN with bcrypt (cost factor 10)
            const pinHash = await bcrypt.hash(input.newPin, 10);

            // Upsert PIN
            await ctx.prisma.userPIN.upsert({
                where: { userId: ctx.userId },
                create: {
                    userId: ctx.userId,
                    pinHash,
                    failedAttempts: 0,
                    lockedUntil: null,
                },
                update: {
                    pinHash,
                    failedAttempts: 0,
                    lockedUntil: null,
                    updatedAt: new Date(),
                },
            });

            return { success: true, message: "PIN set successfully" };
        }),

    /**
     * Verify PIN for an action
     */
    verifyPin: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            pin: z.string().length(4).regex(/^\d{4}$/, "PIN must be 4 digits"),
            action: z.enum(PIN_ACTIONS),
            targetId: z.string().optional(),
            targetDetails: z.record(z.unknown()).optional(),
            reason: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const userPin = await ctx.prisma.userPIN.findUnique({
                where: { userId: ctx.userId },
            });

            // User has no PIN set
            if (!userPin) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "You must set a PIN before performing this action",
                });
            }

            // Check lockout
            if (userPin.lockedUntil && userPin.lockedUntil > new Date()) {
                const remainingMs = userPin.lockedUntil.getTime() - Date.now();
                const remainingMinutes = Math.ceil(remainingMs / 60000);

                // Log failed attempt (locked)
                await logPinAction(ctx.prisma, {
                    outletId: ctx.outletId || "",
                    userId: ctx.userId,
                    userName: ctx.user?.name || "Unknown",
                    action: input.action,
                    status: "DENIED",
                    targetId: input.targetId,
                    targetDetails: input.targetDetails,
                    reason: "Account locked",
                });

                return {
                    success: false,
                    verified: false,
                    locked: true,
                    lockedUntil: userPin.lockedUntil.toISOString(),
                    remainingMinutes,
                    remainingAttempts: 0,
                    error: `Account locked. Please wait ${remainingMinutes} minutes.`,
                };
            }

            // Verify PIN
            const isMatch = await bcrypt.compare(input.pin, userPin.pinHash);

            if (!isMatch) {
                // Increment failed attempts
                const newFailedAttempts = userPin.failedAttempts + 1;
                const shouldLock = newFailedAttempts >= MAX_FAILED_ATTEMPTS;
                const lockedUntil = shouldLock
                    ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
                    : null;

                await ctx.prisma.userPIN.update({
                    where: { userId: ctx.userId },
                    data: {
                        failedAttempts: newFailedAttempts,
                        lockedUntil,
                    },
                });

                // Log failed attempt
                await logPinAction(ctx.prisma, {
                    outletId: ctx.outletId || "",
                    userId: ctx.userId,
                    userName: ctx.user?.name || "Unknown",
                    action: input.action,
                    status: "FAILED",
                    targetId: input.targetId,
                    targetDetails: input.targetDetails,
                    reason: "Invalid PIN",
                });

                // Notify manager if locked
                if (shouldLock && ctx.outletId) {
                    await sendManagerNotification(ctx.prisma, {
                        outletId: ctx.outletId,
                        action: input.action,
                        actionBy: ctx.userId,
                        actionByName: ctx.user?.name || "Unknown",
                        type: "PIN_LOCKOUT",
                        priority: "HIGH",
                        title: "User Account Locked",
                        message: `${ctx.user?.name || "User"} has been locked out after ${MAX_FAILED_ATTEMPTS} failed PIN attempts.`,
                    });
                }

                const remainingAttempts = MAX_FAILED_ATTEMPTS - newFailedAttempts;

                return {
                    success: false,
                    verified: false,
                    locked: shouldLock,
                    lockedUntil: lockedUntil?.toISOString() || null,
                    remainingMinutes: shouldLock ? LOCKOUT_DURATION_MINUTES : 0,
                    remainingAttempts: Math.max(0, remainingAttempts),
                    error: shouldLock
                        ? `Too many failed attempts. Account locked for ${LOCKOUT_DURATION_MINUTES} minutes.`
                        : `Invalid PIN. ${remainingAttempts} attempt${remainingAttempts !== 1 ? "s" : ""} remaining.`,
                };
            }

            // PIN correct - reset failed attempts and update last used
            await ctx.prisma.userPIN.update({
                where: { userId: ctx.userId },
                data: {
                    failedAttempts: 0,
                    lockedUntil: null,
                    lastUsedAt: new Date(),
                },
            });

            // Log successful action
            await logPinAction(ctx.prisma, {
                outletId: ctx.outletId || "",
                userId: ctx.userId,
                userName: ctx.user?.name || "Unknown",
                action: input.action,
                status: "SUCCESS",
                targetId: input.targetId,
                targetDetails: input.targetDetails,
                reason: input.reason,
            });

            // Send manager notification if configured
            if (ctx.outletId) {
                const settings = await ctx.prisma.securitySettings.findUnique({
                    where: { outletId: ctx.outletId },
                });

                const shouldNotify = getNotifySettingForAction(settings, input.action);
                if (shouldNotify) {
                    await sendManagerNotification(ctx.prisma, {
                        outletId: ctx.outletId,
                        action: input.action,
                        actionBy: ctx.userId,
                        actionByName: ctx.user?.name || "Unknown",
                        targetId: input.targetId,
                        targetDetails: input.targetDetails,
                        title: getNotificationTitle(input.action),
                        message: `${ctx.user?.name || "User"} performed ${input.action.replace(/_/g, " ").toLowerCase()}`,
                    });
                }
            }

            return {
                success: true,
                verified: true,
                locked: false,
                lockedUntil: null,
                remainingMinutes: 0,
                remainingAttempts: MAX_FAILED_ATTEMPTS,
                error: null,
            };
        }),

    /**
     * Reset another user's PIN (admin only)
     */
    resetUserPin: protectedProcedure
        .use(enforceTenant)
        .use(requireRole(["BRAND_ADMIN", "OUTLET_MANAGER", "SUPER"]))
        .input(z.object({
            targetUserId: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            await ctx.prisma.userPIN.delete({
                where: { userId: input.targetUserId },
            }).catch(() => {
                // Ignore if PIN doesn't exist
            });

            return { success: true, message: "PIN reset successfully. User must set a new PIN." };
        }),

    // =========================================================================
    // SECURITY SETTINGS
    // =========================================================================

    /**
     * Get security settings for an outlet
     */
    getSettings: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string().optional(),
        }))
        .query(async ({ ctx, input }) => {
            const outletId = input.outletId || ctx.outletId;
            if (!outletId) return null;

            const settings = await ctx.prisma.securitySettings.findUnique({
                where: { outletId },
            });

            return settings;
        }),

    /**
     * Update security settings
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

            const settings = await ctx.prisma.securitySettings.upsert({
                where: { outletId },
                create: { outletId, ...data },
                update: data,
            });

            return settings;
        }),

    // =========================================================================
    // ACTION LOG & NOTIFICATIONS
    // =========================================================================

    /**
     * Get PIN action log
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
            const where = {
                outletId: input.outletId || ctx.outletId || undefined,
                action: input.action,
                status: input.status,
                createdAt: {
                    gte: input.startDate,
                    lte: input.endDate,
                },
            };

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
     * Get manager notifications
     */
    getNotifications: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            unreadOnly: z.boolean().default(true),
            limit: z.number().min(1).max(50).default(20),
        }))
        .query(async ({ ctx, input }) => {
            const where = {
                managerId: ctx.userId,
                isRead: input.unreadOnly ? false : undefined,
            };

            const [notifications, unreadCount] = await Promise.all([
                ctx.prisma.managerNotification.findMany({
                    where,
                    orderBy: { createdAt: "desc" },
                    take: input.limit,
                }),
                ctx.prisma.managerNotification.count({
                    where: { managerId: ctx.userId, isRead: false },
                }),
            ]);

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
                    where: { managerId: ctx.userId, isRead: false },
                    data: { isRead: true },
                });
            } else if (input.notificationIds?.length) {
                await ctx.prisma.managerNotification.updateMany({
                    where: {
                        id: { in: input.notificationIds },
                        managerId: ctx.userId,
                    },
                    data: { isRead: true },
                });
            }

            return { success: true };
        }),

    // =========================================================================
    // USERS WITH PIN STATUS
    // =========================================================================

    /**
     * Get users with their PIN status
     */
    getUsersWithPinStatus: protectedProcedure
        .use(enforceTenant)
        .use(requireRole(["BRAND_ADMIN", "OUTLET_MANAGER", "SUPER"]))
        .input(z.object({
            outletId: z.string().optional(),
        }))
        .query(async ({ ctx, input }) => {
            const users = await ctx.prisma.user.findMany({
                where: {
                    tenantId: ctx.tenantId,
                    outletId: input.outletId || undefined,
                    isActive: true,
                    deletedAt: null,
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    outletId: true,
                    outlet: { select: { name: true } },
                    userPIN: {
                        select: {
                            lastUsedAt: true,
                            lockedUntil: true,
                            failedAttempts: true,
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
                outletName: user.outlet?.name || null,
                hasPIN: !!user.userPIN,
                lastUsed: user.userPIN?.lastUsedAt || null,
                isLocked: user.userPIN?.lockedUntil
                    ? user.userPIN.lockedUntil > new Date()
                    : false,
                failedAttempts: user.userPIN?.failedAttempts || 0,
            }));
        }),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

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
    prisma: Parameters<typeof router>[0] extends { prisma: infer P } ? P : unknown,
    params: LogPinActionParams
): Promise<void> {
    try {
        // @ts-expect-error - Prisma type inference is complex
        await prisma.pINActionLog.create({
            data: {
                outletId: params.outletId,
                userId: params.userId,
                userName: params.userName,
                action: params.action,
                actionType: ACTION_TYPE_MAP[params.action],
                targetId: params.targetId,
                targetDetails: params.targetDetails,
                previousValue: params.previousValue,
                newValue: params.newValue,
                reason: params.reason,
                status: params.status,
            },
        });
    } catch (error) {
        console.error("[Security] Failed to log PIN action:", error);
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
    prisma: Parameters<typeof router>[0] extends { prisma: infer P } ? P : unknown,
    params: SendNotificationParams
): Promise<void> {
    try {
        // Get security settings to find managers to notify
        // @ts-expect-error - Prisma type inference is complex
        const settings = await prisma.securitySettings.findUnique({
            where: { outletId: params.outletId },
        });

        const managerIds = settings?.managerUserIds || [];
        const notificationMethods = settings?.notificationMethods || ["IN_APP"];

        // Create notification for each manager
        for (const managerId of managerIds) {
            // @ts-expect-error - Prisma type inference is complex
            await prisma.managerNotification.create({
                data: {
                    outletId: params.outletId,
                    managerId,
                    type: params.type || "PIN_ACTION",
                    priority: params.priority || "NORMAL",
                    title: params.title || getNotificationTitle(params.action),
                    message: params.message || `${params.actionByName} performed ${params.action}`,
                    actionBy: params.actionBy,
                    actionByName: params.actionByName,
                    amount: params.amount,
                    sentVia: notificationMethods,
                    metadata: {
                        action: params.action,
                        targetId: params.targetId,
                        ...params.targetDetails,
                        ...params.metadata,
                    },
                },
            });
        }

        // TODO: Send WhatsApp/Email notifications via external service
    } catch (error) {
        console.error("[Security] Failed to send manager notification:", error);
    }
}

function getNotificationTitle(action: PinAction): string {
    const titles: Record<PinAction, string> = {
        EDIT_ORDER: "Order Edited",
        VOID_ORDER: "Order Voided",
        WITHDRAWAL: "Cash Withdrawal",
        PRICE_OVERRIDE: "Price Override",
        STOCK_ADJUSTMENT: "Stock Adjustment",
        REFUND: "Refund Processed",
        MODIFY_CLOSING: "Daily Closing Modified",
        SUPPLIER_PAYMENT: "Supplier Payment",
        MANUAL_DISCOUNT: "Manual Discount Applied",
    };
    return titles[action];
}

function getNotifySettingForAction(
    settings: { notifyOnEdit?: boolean; notifyOnVoid?: boolean; notifyOnWithdrawal?: boolean } | null,
    action: PinAction
): boolean {
    if (!settings) return false;

    switch (action) {
        case "EDIT_ORDER":
        case "PRICE_OVERRIDE":
        case "MANUAL_DISCOUNT":
            return settings.notifyOnEdit ?? true;
        case "VOID_ORDER":
        case "REFUND":
            return settings.notifyOnVoid ?? true;
        case "WITHDRAWAL":
        case "SUPPLIER_PAYMENT":
        case "MODIFY_CLOSING":
            return settings.notifyOnWithdrawal ?? true;
        default:
            return true;
    }
}

// Export for use in pos.ts
export { logPinAction, sendManagerNotification, type SendNotificationParams };
