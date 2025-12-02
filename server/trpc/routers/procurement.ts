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
                productId: z.string().optional(),
                ingredientId: z.string().optional(),
                qty: z.number().min(0.1)
            }))
        }))
        .mutation(async ({ ctx, input }) => {
            // Group by Supplier
            const itemsBySupplier = new Map<string, typeof input.items>();

            // Helper to get supplier ID
            const getSupplierId = async (item: typeof input.items[0]) => {
                if (item.productId) {
                    const p = await ctx.prisma.product.findUnique({ where: { id: item.productId } });
                    return p?.supplierId;
                } else if (item.ingredientId) {
                    const i = await ctx.prisma.ingredient.findUnique({ where: { id: item.ingredientId } });
                    return i?.supplierId;
                }
                return null;
            };

            // Pre-fetch all needed data to avoid N+1
            const productIds = input.items.filter(i => i.productId).map(i => i.productId!);
            const ingredientIds = input.items.filter(i => i.ingredientId).map(i => i.ingredientId!);

            const products = await ctx.prisma.product.findMany({
                where: { id: { in: productIds } },
                include: { supplier: true }
            });
            const ingredients = await ctx.prisma.ingredient.findMany({
                where: { id: { in: ingredientIds } },
                include: { supplier: true }
            });

            const productMap = new Map(products.map(p => [p.id, p]));
            const ingredientMap = new Map(ingredients.map(i => [i.id, i]));

            for (const item of input.items) {
                let supplierId: string | null | undefined = null;

                if (item.productId) {
                    supplierId = productMap.get(item.productId)?.supplierId;
                } else if (item.ingredientId) {
                    supplierId = ingredientMap.get(item.ingredientId)?.supplierId;
                }

                if (!supplierId) continue;

                if (!itemsBySupplier.has(supplierId)) {
                    itemsBySupplier.set(supplierId, []);
                }
                itemsBySupplier.get(supplierId)!.push(item);
            }

            // Create POs
            const createdPOs = [];

            for (const [supplierId, items] of Array.from(itemsBySupplier.entries())) {
                const supplier = await ctx.prisma.supplier.findUnique({ where: { id: supplierId } });

                // Generate WhatsApp Message
                let message = `*New Order for ${supplier?.name}*\n\n`;
                items.forEach(item => {
                    if (item.productId) {
                        const p = productMap.get(item.productId);
                        message += `- ${p?.name}: ${item.qty} ${p?.unit}\n`;
                    } else if (item.ingredientId) {
                        const i = ingredientMap.get(item.ingredientId);
                        message += `- ${i?.name}: ${item.qty} ${i?.purchaseUnit}\n`;
                    }
                });
                message += `\nDate: ${new Date().toLocaleDateString()}`;

                const po = await ctx.prisma.purchaseOrder.create({
                    data: {
                        outletId: input.outletId,
                        supplierId,
                        status: 'DRAFT',
                        whatsappMessage: message,
                        items: {
                            create: items.map(item => {
                                let name = "Unknown";
                                if (item.productId) name = productMap.get(item.productId)?.name || "Unknown";
                                else if (item.ingredientId) name = ingredientMap.get(item.ingredientId)?.name || "Unknown";

                                return {
                                    productId: item.productId,
                                    ingredientId: item.ingredientId,
                                    productName: name,
                                    qty: item.qty,
                                    unitCost: 0, // Unknown at order time
                                    total: 0
                                };
                            })
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
                    items: {
                        include: {
                            product: true,
                            ingredient: true
                        }
                    }
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
                productId: z.string().optional(),
                ingredientId: z.string().optional(),
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
                            let name = "Unknown";
                            if (item.productId) {
                                const p = await ctx.prisma.product.findUnique({ where: { id: item.productId } });
                                name = p?.name || "Unknown";
                            } else if (item.ingredientId) {
                                const i = await ctx.prisma.ingredient.findUnique({ where: { id: item.ingredientId } });
                                name = i?.name || "Unknown";
                            }

                            return {
                                productId: item.productId,
                                ingredientId: item.ingredientId,
                                productName: name,
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
                        include: {
                            product: true,
                            ingredient: true
                        }
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

                    // Update Stock
                    if (poItem.productId) {
                        // 🔒 Lock product
                        const [product] = await tx.$queryRaw<any[]>`
                            SELECT * FROM "Product" 
                            WHERE id = ${poItem.productId}
                            FOR UPDATE
                        `;

                        if (product) {
                            await tx.product.update({
                                where: { id: poItem.productId },
                                data: { currentStock: { increment: itemInput.receivedQty } }
                            });

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
                    } else if (poItem.ingredientId) {
                        // 🔒 Lock ingredient
                        const [ingredient] = await tx.$queryRaw<any[]>`
                            SELECT * FROM "Ingredient" 
                            WHERE id = ${poItem.ingredientId}
                            FOR UPDATE
                        `;

                        if (ingredient) {
                            await tx.ingredient.update({
                                where: { id: poItem.ingredientId },
                                data: { stock: { increment: itemInput.receivedQty } }
                            });

                            // Note: StockMove currently only supports productId. 
                            // We should probably update StockMove to support ingredientId too, 
                            // but for now we just update the stock.
                        }
                    }
                }

                // Check if fully received
                const anyReceived = input.receivedItems.length > 0;
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
                isolationLevel: 'Serializable',
                timeout: 10000
            });
        })
});
