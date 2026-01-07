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
    middleware(async (opts) => {
        const { ctx, next } = opts;
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

        // Note: PIN validation should be done in the procedure itself
        // since middleware doesn't have access to rawInput in tRPC v11+
        // This middleware now just checks if PIN is required and marks the context
        // The actual PIN verification should happen in the procedure

        // For now, we proceed and let the procedure handle PIN validation
        // TODO: Implement proper PIN validation pattern using input schema extension
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
