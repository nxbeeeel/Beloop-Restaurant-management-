// Fixed Procurement Router with Race Condition Fixes
// Implements pessimistic locking for inventory updates

import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { enforceTenant } from "../middleware/roleCheck";
import { withIdempotency } from "../middleware/idempotency";
import { TRPCError } from "@trpc/server";

export const procurementRouter = router({
    // ... (keep existing createOrders, listOrders, markSent, createOrder, getOrder)

    // ✅ FIXED: Receive Order with Pessimistic Locking
    receiveOrder: protectedProcedure
        .use(enforceTenant)
        .use(withIdempotency) // Prevent duplicate receives
        .input(z.object({
            idempotencyKey: z.string().uuid(),
            orderId: z.string(),
            receivedItems: z.array(z.object({
                itemId: z.string(), // POItem ID
                receivedQty: z.number()
            }))
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.$transaction(async (tx) => {
                const po = await tx.purchaseOrder.findUnique({
                    where: { id: input.orderId },
                    include: { items: true }
                });
                if (!po) throw new TRPCError({ code: "NOT_FOUND" });

                // Verify authorization
                if (ctx.role !== "SUPER" && ctx.role !== "BRAND_ADMIN" && po.outletId !== ctx.outletId) {
                    throw new TRPCError({ code: "FORBIDDEN" });
                }

                for (const itemInput of input.receivedItems) {
                    const poItem = po.items.find(i => i.id === itemInput.itemId);
                    if (!poItem || !poItem.productId) continue;

                    // 🔒 CRITICAL FIX: Use SELECT FOR UPDATE to lock the row
                    // This prevents race conditions when multiple users receive items concurrently
                    const [product] = await tx.$queryRaw<any[]>`
                        SELECT * FROM "Product" 
                        WHERE id = ${poItem.productId}
                        FOR UPDATE
                    `;

                    if (!product) {
                        throw new TRPCError({
                            code: "NOT_FOUND",
                            message: `Product ${poItem.productId} not found`
                        });
                    }

                    // Now safe to update - row is locked until transaction commits
                    await tx.product.update({
                        where: { id: poItem.productId },
                        data: {
                            currentStock: {
                                increment: itemInput.receivedQty
                            }
                        }
                    });

                    // Record Stock Move
                    await tx.stockMove.create({
                        data: {
                            outletId: po.outletId,
                            productId: poItem.productId,
                            qty: itemInput.receivedQty,
                            type: 'PURCHASE',
                            date: new Date(),
                            notes: `Received PO ${po.id.slice(-6)}`
                        }
                    });
                }

                // Update PO status
                const totalReceivedQty = input.receivedItems.reduce((sum, item) => sum + item.receivedQty, 0);
                const totalOrderedQty = po.items.reduce((sum, item) => sum + item.qty, 0);
                const allReceived = totalReceivedQty >= totalOrderedQty;

                await tx.purchaseOrder.update({
                    where: { id: input.orderId },
                    data: {
                        status: allReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED'
                    }
                });

                return {
                    success: true,
                    status: allReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED'
                };
            }, {
                isolationLevel: 'Serializable', // Highest isolation level
                timeout: 10000 // 10 second timeout
            });
        })
});
