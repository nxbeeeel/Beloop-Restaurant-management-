import { TRPCError } from "@trpc/server";
import { middleware } from "@/server/trpc/trpc";
import { z } from "zod";
import bcrypt from "bcryptjs";

/**
 * PIN Action Types - must match security router
 */
export const PIN_ACTIONS = [
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

export type PinAction = typeof PIN_ACTIONS[number];

/**
 * Middleware to enforce PIN verification for sensitive operations
 * Checks SecuritySettings to determine if PIN is required
 *
 * Usage:
 *   voidOrder: protectedProcedure
 *     .use(requirePin("VOID_ORDER"))
 *     .input(z.object({ orderId: z.string(), pin: z.string().optional() }))
 *     .mutation(async ({ ctx, input }) => { ... })
 */
export const requirePin = (action: PinAction) =>
    middleware(async ({ ctx, next, rawInput }) => {
        const outletId = ctx.user?.outletId || (ctx as any).posCredentials?.outletId;

        if (!outletId) {
            throw new TRPCError({
                code: "BAD_REQUEST",
                message: "No outlet context available",
            });
        }

        // Check if SecuritySettings require PIN for this action
        const settingsKey = `${action.toLowerCase().replace(/_/g, "")}RequiresPIN` as keyof typeof settings;

        const settings = await ctx.prisma.securitySettings.findUnique({
            where: { outletId },
        });

        // Default to requiring PIN if no settings found (fail-safe)
        const requiresPIN = settings ? (settings[settingsKey] ?? true) : true;

        if (!requiresPIN) {
            // PIN not required for this action, proceed
            return next();
        }

        // PIN is required - validate it was provided
        const input = rawInput as any;
        const pin = input?.pin;

        if (!pin || typeof pin !== "string" || pin.length !== 4) {
            throw new TRPCError({
                code: "BAD_REQUEST",
                message: `PIN verification required for ${action}. Please provide a 4-digit PIN.`,
            });
        }

        // Verify the PIN
        const userPin = await ctx.prisma.userPIN.findUnique({
            where: { userId: ctx.user.id },
        });

        if (!userPin) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "PIN not set. Please set your PIN in settings before performing this action.",
            });
        }

        // Check if locked
        if (userPin.lockedUntil && userPin.lockedUntil > new Date()) {
            const minutesLeft = Math.ceil(
                (userPin.lockedUntil.getTime() - Date.now()) / 60000
            );

            throw new TRPCError({
                code: "FORBIDDEN",
                message: `Account locked. Try again in ${minutesLeft} minutes.`,
            });
        }

        // Verify PIN
        const isValid = await bcrypt.compare(pin, userPin.pinHash);

        if (!isValid) {
            const newFailedAttempts = userPin.failedAttempts + 1;
            const shouldLock = newFailedAttempts >= 5; // MAX_FAILED_ATTEMPTS

            // Update failed attempts
            await ctx.prisma.userPIN.update({
                where: { userId: ctx.user.id },
                data: {
                    failedAttempts: newFailedAttempts,
                    lockedUntil: shouldLock
                        ? new Date(Date.now() + 15 * 60000) // LOCKOUT_DURATION_MINUTES
                        : null,
                },
            });

            const attemptsLeft = 5 - newFailedAttempts;

            throw new TRPCError({
                code: "UNAUTHORIZED",
                message: shouldLock
                    ? "Too many failed attempts. Account locked for 15 minutes."
                    : `Invalid PIN. ${attemptsLeft} attempt${attemptsLeft !== 1 ? "s" : ""} remaining.`,
            });
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

        // PIN verified - proceed with operation
        return next();
    });

/**
 * Helper to check if PIN is required for a specific action based on settings
 * Used to show PIN prompt conditionally in UI
 */
export async function isPinRequired(
    prisma: any,
    outletId: string,
    action: PinAction
): Promise<boolean> {
    const settingsKey = `${action.toLowerCase().replace(/_/g, "")}RequiresPIN`;

    const settings = await prisma.securitySettings.findUnique({
        where: { outletId },
    });

    return settings ? (settings[settingsKey as keyof typeof settings] ?? true) : true;
}
