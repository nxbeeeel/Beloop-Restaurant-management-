import { TRPCError } from "@trpc/server";
import { middleware } from "@/server/trpc/trpc";

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
 * 
 * NOTE: This is a V2 feature placeholder. The SecuritySettings model
 * needs to be added to the Prisma schema before this can be fully implemented.
 * 
 * For now, this middleware is a pass-through that always proceeds.
 * 
 * Usage:
 *   voidOrder: protectedProcedure
 *     .use(requirePin("VOID_ORDER"))
 *     .input(z.object({ orderId: z.string(), pin: z.string().optional() }))
 *     .mutation(async ({ ctx, input }) => { ... })
 */
export const requirePin = (_action: PinAction) =>
    middleware(async (opts) => {
        // V2 TODO: Implement PIN verification once SecuritySettings model exists
        // For now, just proceed with the operation
        return opts.next();
    });

/**
 * Helper to check if PIN is required for a specific action based on settings
 * V2 TODO: Implement once SecuritySettings model exists
 */
export async function isPinRequired(
    _prisma: unknown,
    _outletId: string,
    _action: PinAction
): Promise<boolean> {
    // V2 TODO: Check SecuritySettings model
    // For now, return false (PIN not required)
    return false;
}

