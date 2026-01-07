import { router, protectedProcedure, requireRole } from "@/server/trpc/trpc";
import { enforceTenant } from "@/server/trpc/middleware/roleCheck";
import { z } from "zod";

/**
 * V2 Security Router - STUB
 * 
 * This router is a placeholder. The following Prisma models need to be added to the schema:
 * - UserPIN
 * - SecuritySettings
 * - PINActionLog
 * - ManagerNotification
 * 
 * Once these models are added, regenerate Prisma client and implement full functionality.
 */

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

export const securityRouter = router({
    // ============================================
    // PIN MANAGEMENT (STUB)
    // ============================================

    hasPin: protectedProcedure.query(async () => {
        // V2 TODO: Check UserPIN model
        return { hasPin: false, isLocked: false };
    }),

    setPin: protectedProcedure
        .input(z.object({
            newPin: z.string().length(4).regex(/^\d{4}$/, "PIN must be 4 digits"),
            currentPin: z.string().length(4).regex(/^\d{4}$/).optional(),
        }))
        .mutation(async () => {
            // V2 TODO: Create/update UserPIN
            console.warn("[Security] setPin called but UserPIN model not in schema");
            return { success: false, message: "PIN feature not yet implemented" };
        }),

    verifyPin: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            pin: z.string().length(4).regex(/^\d{4}$/, "PIN must be 4 digits"),
            action: z.enum(PIN_ACTIONS),
            targetId: z.string().optional(),
            targetDetails: z.record(z.unknown()).optional(),
            reason: z.string().optional(),
        }))
        .mutation(async () => {
            // V2 TODO: Verify PIN against UserPIN model
            console.warn("[Security] verifyPin called but UserPIN model not in schema");
            return { success: true, verified: true }; // Allow by default until implemented
        }),

    resetUserPin: protectedProcedure
        .use(enforceTenant)
        .use(requireRole(["BRAND_ADMIN", "OUTLET_MANAGER", "SUPER"]))
        .input(z.object({
            targetUserId: z.string(),
        }))
        .mutation(async () => {
            // V2 TODO: Delete UserPIN
            console.warn("[Security] resetUserPin called but UserPIN model not in schema");
            return { success: false, message: "PIN feature not yet implemented" };
        }),

    // ============================================
    // SECURITY SETTINGS (STUB)
    // ============================================

    getSettings: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string().optional(),
        }))
        .query(async () => {
            // V2 TODO: Fetch SecuritySettings
            return null;
        }),

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
        .mutation(async () => {
            // V2 TODO: Upsert SecuritySettings
            console.warn("[Security] updateSettings called but SecuritySettings model not in schema");
            return null;
        }),

    // ============================================
    // PIN ACTION LOG & NOTIFICATIONS (STUB)
    // ============================================

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
        .query(async () => {
            // V2 TODO: Fetch PINActionLog
            return { logs: [], total: 0 };
        }),

    getNotifications: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            unreadOnly: z.boolean().default(true),
            limit: z.number().min(1).max(50).default(20),
        }))
        .query(async () => {
            // V2 TODO: Fetch ManagerNotification
            return { notifications: [], unreadCount: 0 };
        }),

    markNotificationsRead: protectedProcedure
        .input(z.object({
            notificationIds: z.array(z.string()).optional(),
            markAll: z.boolean().default(false),
        }))
        .mutation(async () => {
            // V2 TODO: Update ManagerNotification
            return { success: true };
        }),

    // ============================================
    // USERS WITH PIN STATUS (STUB)
    // ============================================

    getUsersWithPinStatus: protectedProcedure
        .use(enforceTenant)
        .use(requireRole(["BRAND_ADMIN", "OUTLET_MANAGER", "SUPER"]))
        .input(z.object({
            outletId: z.string().optional(),
        }))
        .query(async ({ ctx }) => {
            // Return users without PIN status (V2 feature)
            const users = await ctx.prisma.user.findMany({
                where: {
                    tenantId: ctx.tenantId,
                    isActive: true,
                    deletedAt: null,
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    outletId: true,
                },
                orderBy: [{ role: "asc" }, { name: "asc" }],
            });

            return users.map((user) => ({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                outletName: null, // V2: Would come from included outlet
                hasPIN: false, // V2: Would check UserPIN relation
                lastUsed: null,
                isLocked: false,
                failedAttempts: 0,
            }));
        }),
});

// ============================================
// HELPER FUNCTIONS (STUB)
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
    _prisma: unknown,
    _params: LogPinActionParams
): Promise<void> {
    // V2 TODO: Log to PINActionLog model
    console.warn("[Security] logPinAction called but PINActionLog model not in schema");
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
    _prisma: unknown,
    _params: SendNotificationParams
): Promise<void> {
    // V2 TODO: Create ManagerNotification records
    console.warn("[Security] sendManagerNotification called but ManagerNotification model not in schema");
}

// Export for use in pos.ts
export { logPinAction, sendManagerNotification, type SendNotificationParams };
