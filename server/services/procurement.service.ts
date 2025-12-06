import { PrismaClient, POStatus, PurchaseOrder } from '@prisma/client';
import { TRPCError } from '@trpc/server';

export class ProcurementService {

    // Bulk Create Orders (Auto-generated from Stock Check or Low Stock)
    static async createOrders(prisma: PrismaClient, params: {
        outletId: string;
        items: {
            productId?: string;
            ingredientId?: string;
            qty: number;
        }[];
    }) {
        // Group by Supplier
        const itemsBySupplier = new Map<string, typeof params.items>();

        // Pre-fetch all needed data to avoid N+1
        const productIds = params.items.filter(i => i.productId).map(i => i.productId!);
        const ingredientIds = params.items.filter(i => i.ingredientId).map(i => i.ingredientId!);

        const products = await prisma.product.findMany({
            where: { id: { in: productIds } },
            include: { supplier: true }
        });
        const ingredients = await prisma.ingredient.findMany({
            where: { id: { in: ingredientIds } },
            include: { supplier: true }
        });

        const productMap = new Map(products.map(p => [p.id, p]));
        const ingredientMap = new Map(ingredients.map(i => [i.id, i]));

        for (const item of params.items) {
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
        const createdPOs: PurchaseOrder[] = [];

        for (const [supplierId, items] of Array.from(itemsBySupplier.entries())) {
            const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });

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

            const po = await prisma.purchaseOrder.create({
                data: {
                    outletId: params.outletId,
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
    }

    // Single Manual Order Creation
    static async createOrder(prisma: PrismaClient, params: {
        outletId: string;
        supplierId: string;
        status: POStatus;
        items: {
            productId?: string;
            ingredientId?: string;
            qty: number;
            unitCost?: number;
        }[];
    }) {
        const supplier = await prisma.supplier.findUnique({ where: { id: params.supplierId } });
        if (!supplier) throw new TRPCError({ code: "NOT_FOUND", message: "Supplier not found" });

        // Calculate total
        const totalAmount = params.items.reduce((sum, item) => sum + (item.qty * (item.unitCost || 0)), 0);

        return prisma.purchaseOrder.create({
            data: {
                outletId: params.outletId,
                supplierId: params.supplierId,
                status: params.status,
                totalAmount,
                items: {
                    create: await Promise.all(params.items.map(async (item) => {
                        let name = "Unknown";
                        if (item.productId) {
                            const p = await prisma.product.findUnique({ where: { id: item.productId } });
                            name = p?.name || "Unknown";
                        } else if (item.ingredientId) {
                            const i = await prisma.ingredient.findUnique({ where: { id: item.ingredientId } });
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
    }

    // Receive Order (Transactions & Locking)
    static async receiveOrder(prisma: PrismaClient, params: {
        orderId: string;
        userId: string;
        userRole: string;
        userOutletId?: string | null;
        receivedItems: {
            itemId: string; // POItem ID
            receivedQty: number;
        }[];
    }) {
        return prisma.$transaction(async (tx) => {
            const po = await tx.purchaseOrder.findUnique({
                where: { id: params.orderId },
                include: { items: true }
            });
            if (!po) throw new TRPCError({ code: "NOT_FOUND" });

            // Verify authorization
            if (params.userRole !== "SUPER" && params.userRole !== "BRAND_ADMIN" && po.outletId !== params.userOutletId) {
                throw new TRPCError({ code: "FORBIDDEN" });
            }

            for (const itemInput of params.receivedItems) {
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
                        // Note: StockMove for ingredients not fully supported in schema yet
                    }
                }
            }

            // Check if fully received
            const anyReceived = params.receivedItems.length > 0;
            const totalReceivedQty = params.receivedItems.reduce((sum, item) => sum + item.receivedQty, 0);
            const totalOrderedQty = po.items.reduce((sum, item) => sum + item.qty, 0);
            // Relaxed check: if received >= ordered, create verified
            const allReceived = totalReceivedQty >= totalOrderedQty;

            await tx.purchaseOrder.update({
                where: { id: params.orderId },
                data: {
                    status: allReceived ? 'RECEIVED' : (anyReceived ? 'PARTIALLY_RECEIVED' : po.status)
                }
            });

            return { success: true };
        }, {
            isolationLevel: 'Serializable',
            timeout: 10000
        });
    }
}
