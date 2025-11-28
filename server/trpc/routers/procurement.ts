import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { enforceTenant } from "../middleware/roleCheck";
import { TRPCError } from "@trpc/server";

export const procurementRouter = router({
    createOrders: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string(),
            items: z.array(z.object({
                productId: z.string(),
                qty: z.number().min(0.1)
            }))
        }))
        .mutation(async ({ ctx, input }) => {
            // Group by Supplier
            const itemsBySupplier = new Map<string, typeof input.items>();

            // Fetch products to get supplier IDs
            const productIds = input.items.map(i => i.productId);
            const products = await ctx.prisma.product.findMany({
                where: { id: { in: productIds } },
                include: { supplier: true }
            });

            const productMap = new Map(products.map(p => [p.id, p]));

            for (const item of input.items) {
                const product = productMap.get(item.productId);
                if (!product || !product.supplierId) {
                    continue;
                }

                const supplierId = product.supplierId;
                if (!itemsBySupplier.has(supplierId)) {
                    itemsBySupplier.set(supplierId, []);
                }
                itemsBySupplier.get(supplierId)!.push(item);
            }

            // Create POs
            const createdPOs = [];

            // Use Array.from to iterate safely
            for (const [supplierId, items] of Array.from(itemsBySupplier.entries())) {
                const supplier = await ctx.prisma.supplier.findUnique({ where: { id: supplierId } });

                // Generate WhatsApp Message
                let message = `*New Order for ${supplier?.name}*\n\n`;
                items.forEach(item => {
                    const p = productMap.get(item.productId);
                    message += `- ${p?.name}: ${item.qty} ${p?.unit}\n`;
                });
                message += `\nDate: ${new Date().toLocaleDateString()}`;

                const po = await ctx.prisma.purchaseOrder.create({
                    data: {
                        outletId: input.outletId,
                        supplierId,
                        status: 'DRAFT',
                        whatsappMessage: message,
                        items: {
                            create: items.map(item => ({
                                productId: item.productId,
                                productName: productMap.get(item.productId)!.name,
                                qty: item.qty,
                                unitCost: 0, // Unknown at order time
                                total: 0
                            }))
                        }
                    }
                });
                createdPOs.push(po);
            }

            return createdPOs;
        }),

    listOrders: protectedProcedure
        .use(enforceTenant)
        .input(z.object({ outletId: z.string(), status: z.string().optional() }))
        .query(async ({ ctx, input }) => {
            return ctx.prisma.purchaseOrder.findMany({
                where: {
                    outletId: input.outletId,
                    status: input.status ? (input.status as any) : undefined
                },
                include: {
                    supplier: true,
                    items: true
                },
                orderBy: { createdAt: 'desc' }
            });
        }),

    markSent: protectedProcedure
        .use(enforceTenant)
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.purchaseOrder.update({
                where: { id: input.id },
                data: {
                    status: 'SENT',
                    sentAt: new Date()
                }
            });
        }),

    // ---------- SINGLE ORDER CREATION ----------
    createOrder: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string(),
            supplierId: z.string(),
            status: z.enum(['DRAFT', 'SENT']),
            items: z.array(z.object({
                productId: z.string(),
                qty: z.number().min(0.1),
                unitCost: z.number().optional()
            }))
        }))
        .mutation(async ({ ctx, input }) => {
            const supplier = await ctx.prisma.supplier.findUnique({ where: { id: input.supplierId } });
            if (!supplier) throw new TRPCError({ code: "NOT_FOUND", message: "Supplier not found" });

            // Calculate total
            const totalAmount = input.items.reduce((sum, item) => sum + (item.qty * (item.unitCost || 0)), 0);

            return ctx.prisma.purchaseOrder.create({
                data: {
                    outletId: input.outletId,
                    supplierId: input.supplierId,
                    status: input.status,
                    totalAmount,
                    items: {
                        create: await Promise.all(input.items.map(async (item) => {
                            const product = await ctx.prisma.product.findUnique({ where: { id: item.productId } });
                            return {
                                productId: item.productId,
                                productName: product?.name || "Unknown Product",
                                qty: item.qty,
                                unitCost: item.unitCost || 0,
                                total: item.qty * (item.unitCost || 0)
                            };
                        }))
                    }
                }
            });
        }),

    // ---------- GET SINGLE ORDER ----------
    getOrder: protectedProcedure
        .use(enforceTenant)
        .input(z.object({ orderId: z.string() }))
        .query(async ({ ctx, input }) => {
            const order = await ctx.prisma.purchaseOrder.findUnique({
                where: { id: input.orderId },
                include: {
                    supplier: true,
                    items: {
                        include: { product: true }
                    }
                }
            });

            if (!order) throw new TRPCError({ code: "NOT_FOUND" });
            if (ctx.role !== "SUPER" && ctx.role !== "BRAND_ADMIN" && order.outletId !== ctx.outletId) {
                throw new TRPCError({ code: "FORBIDDEN" });
            }

            return order;
        }),

    // ---------- RECEIVE ORDER (PARTIAL OR FULL) ----------
    // ✅ SECURITY FIX: Added pessimistic locking to prevent race conditions
    receiveOrder: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
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
                    if (!poItem) continue;

                    // Note: receivedQty tracking not implemented in schema
                    // For now, we'll just update stock without tracking received quantities per item

                    // Add to Stock
                    if (poItem.productId) {
                        // 🔒 CRITICAL FIX: Lock the product row to prevent race conditions
                        // This ensures concurrent receives don't cause lost updates
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
                            data: { currentStock: { increment: itemInput.receivedQty } }
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
                }

                // Check if fully received
                // Note: Since receivedQty is not in schema, we'll mark as RECEIVED if any items were received
                // In a full implementation, you'd need to add receivedQty to POItem schema
                const anyReceived = input.receivedItems.length > 0;
                // For now, mark as PARTIALLY_RECEIVED if items were received, or RECEIVED if all items match
                const totalReceivedQty = input.receivedItems.reduce((sum, item) => sum + item.receivedQty, 0);
                const totalOrderedQty = po.items.reduce((sum, item) => sum + item.qty, 0);
                const allReceived = totalReceivedQty >= totalOrderedQty;

                await tx.purchaseOrder.update({
                    where: { id: input.orderId },
                    data: {
                        status: allReceived ? 'RECEIVED' : (anyReceived ? 'PARTIALLY_RECEIVED' : po.status)
                    }
                });

                return { success: true };
            }, {
                isolationLevel: 'Serializable', // Highest isolation level for data integrity
                timeout: 10000 // 10 second timeout to prevent long-running locks
            });
        })
});
