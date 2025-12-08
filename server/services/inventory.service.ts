
import { CacheService } from './cache.service';

import { PrismaClient, Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';



interface SaleItem {
    id: string; // Client side ID or Product ID? POS sends 'id', 'productId'
    productId?: string;
    name: string;
    quantity: number;
    price: number;
    totalPrice: number;
    modifiers?: any;
}

interface ProcessSaleParams {
    id: string;
    tenantId: string;
    outletId: string;
    items: SaleItem[];
    total: number;
    discount: number;
    paymentMethod: string;
    createdAt: Date;
    status: string;
    customerName?: string;
    customerPhone?: string;
    redeemedReward?: boolean;
    staffId?: string; // Optional override
}

export class InventoryService {
    /**
     * Processes a sale transaction atomically (ACID).
     * Handles: Customer creation/lookup, Loyalty, Order creation, Stock deduction, Daily/Monthly summaries.
     */
    static async processSale(prisma: PrismaClient, params: ProcessSaleParams) {
        const {
            tenantId,
            outletId,
            items,
            createdAt,
            paymentMethod,
            total,
            customerPhone,
            customerName,
            redeemedReward
        } = params;

        // Normalize dates
        const dateObj = new Date(createdAt);
        const startOfDay = new Date(dateObj);
        startOfDay.setHours(0, 0, 0, 0);
        const currentMonth = createdAt.toISOString().slice(0, 7); // YYYY-MM

        // Find staff if not provided (needed for Sale/Expense linkage)
        let staffId = params.staffId;
        if (!staffId) {
            const staff = await prisma.user.findFirst({
                where: { outletId },
                select: { id: true }
            });
            // Fallback to any tenant admin if no outlet staff
            if (!staff) {
                const admin = await prisma.user.findFirst({
                    where: { tenantId, role: { in: ['BRAND_ADMIN', 'SUPER'] } },
                    select: { id: true }
                });
                staffId = admin?.id;
            } else {
                staffId = staff.id;
            }
        }

        if (!staffId) {
            // If absolutely no user found, we might need a dummy or throw. 
            // For strictness, we'll throw, but for migration compatibility we might handle it.
            // We'll proceed but checks in schema might fail if staffId is required on Sale.
            // Sale model: staffId String @relation... REQUIRED.
            // So we MUST have a staffId.
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'No staff or admin user found to attribute sale to.' });
        }


        // Execute everything in a single transaction
        return prisma.$transaction(async (tx) => {
            let customerId: string | null = null;

            // 1. Customer & Loyalty Logic
            if (customerPhone) {
                // Upsert Customer to prevent race conditions (ACID)
                // If two POS terminals create the same customer simultaneously, upsert handles the lock/conflict gracefully.
                const customer = await tx.customer.upsert({
                    where: { tenantId_phoneNumber: { tenantId, phoneNumber: customerPhone } },
                    update: {
                        // Optionally update name if provided and significantly different?
                        // For now, keep existing data intact to avoid overwriting with "Guest".
                    },
                    create: {
                        tenantId,
                        phoneNumber: customerPhone,
                        name: customerName
                    }
                });

                if (customer) {
                    customerId = customer.id;

                    // Loyalty
                    const rule = await tx.loyaltyRule.findUnique({ where: { outletId } });
                    const minSpend = rule?.minSpendPerVisit ? Number(rule.minSpendPerVisit) : 0;
                    const isEligible = total >= minSpend;

                    if (redeemedReward) {
                        const required = rule?.visitsRequired || 6;
                        await tx.loyaltyProgress.upsert({
                            where: { customerId_outletId: { customerId: customer.id, outletId } },
                            create: { customerId: customer.id, outletId, stamps: 0, totalSpend: total },
                            update: {
                                stamps: { decrement: required },
                                totalSpend: { increment: total },
                                lastVisit: new Date()
                            }
                        });
                    } else if (isEligible) {
                        await tx.loyaltyProgress.upsert({
                            where: { customerId_outletId: { customerId: customer.id, outletId } },
                            create: { customerId: customer.id, outletId, stamps: 1, totalSpend: total },
                            update: {
                                stamps: { increment: 1 },
                                totalSpend: { increment: total },
                                lastVisit: new Date()
                            }
                        });
                    }
                }
            }

            // 2. Create Order
            const order = await tx.order.upsert({
                where: { id: params.id },
                update: {
                    status: params.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
                    totalAmount: total,
                    discount: params.discount,
                    paymentMethod: paymentMethod,
                },
                create: {
                    id: params.id,
                    outletId,
                    customerId,
                    customerName,
                    status: params.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
                    totalAmount: total,
                    discount: params.discount,
                    tax: 0,
                    paymentMethod: paymentMethod,
                    createdAt: dateObj,
                    items: {
                        create: items.map(item => ({
                            productId: item.productId,
                            name: item.name,
                            quantity: item.quantity,
                            price: item.price,
                            total: item.totalPrice,
                            modifiers: item.modifiers ? JSON.stringify(item.modifiers) : undefined
                        }))
                    }
                }
            });

            // 3. Stock Deduction (Bulk if possible, or loop inside TX)
            // Loops inside TX are fine for consistency.
            for (const item of items) {
                if (item.productId) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { currentStock: { decrement: item.quantity } }
                    });
                }
            }

            // 4. Update Daily Sale (Legacy/Dashboard)
            // Note: Sale model requires staffId.

            await tx.sale.upsert({
                where: {
                    outletId_date: {
                        outletId,
                        date: startOfDay
                    }
                },
                update: {
                    cashSale: { increment: paymentMethod === 'CASH' ? total : 0 },
                    bankSale: { increment: paymentMethod !== 'CASH' ? total : 0 },
                    totalSale: { increment: total },
                    profit: { increment: total },
                    // Assuming profit calculation simplified here as per original POS logic
                },
                create: {
                    outletId,
                    staffId: staffId!,
                    tenantId, // Now required/optional per schema update
                    date: startOfDay,
                    cashSale: paymentMethod === 'CASH' ? total : 0,
                    bankSale: paymentMethod !== 'CASH' ? total : 0,
                    totalSale: total,
                    totalExpense: 0,
                    profit: total
                }
            });

            // 5. Update Monthly Summary
            await tx.monthlySummary.upsert({
                where: {
                    outletId_month: {
                        outletId,
                        month: currentMonth
                    }
                },
                update: {
                    totalSales: { increment: total },
                    cashSales: { increment: paymentMethod === 'CASH' ? total : 0 },
                    bankSales: { increment: paymentMethod !== 'CASH' ? total : 0 },
                    grossProfit: { increment: total },
                    netProfit: { increment: total },
                },
                create: {
                    outletId,
                    month: currentMonth,
                    tenantId,
                    totalSales: total,
                    cashSales: paymentMethod === 'CASH' ? total : 0,
                    bankSales: paymentMethod !== 'CASH' ? total : 0,
                    grossProfit: total,
                    netProfit: total,
                    daysWithSales: 1
                }
            });

            return order;
        });
    }

    /**
     * Centralized stock adjustment with audit trail (StockMove).
     */
    static async adjustStock(prisma: PrismaClient, params: {
        productId: string;
        outletId: string;
        qty: number;
        type: 'PURCHASE' | 'SALE' | 'WASTE' | 'ADJUSTMENT';
        notes?: string;
        date?: Date;
    }) {
        return prisma.$transaction(async (tx) => {
            const product = await tx.product.update({
                where: { id: params.productId },
                data: {
                    currentStock: { increment: params.qty },
                    version: { increment: 1 }
                }
            });

            await tx.stockMove.create({
                data: {
                    outletId: params.outletId,
                    productId: params.productId,
                    qty: params.qty,
                    type: params.type,
                    date: params.date || new Date(),
                    notes: params.notes
                }
            });

            await CacheService.invalidate(CacheService.keys.fullMenu(params.outletId));
            return product;
        });
    }
    static async createProduct(prisma: PrismaClient, params: {
        outletId: string;
        name: string;
        sku: string;
        price: number;
        unit: string;
        categoryId?: string;
        description?: string;
    }) {
        // Check for existing SKU in this outlet
        const existing = await prisma.product.findUnique({
            where: { outletId_sku: { outletId: params.outletId, sku: params.sku } }
        });

        if (existing) {
            throw new TRPCError({ code: 'CONFLICT', message: 'SKU already exists' });
        }

        const product = await prisma.product.create({
            data: {
                outletId: params.outletId,
                name: params.name,
                sku: params.sku,
                price: params.price,
                unit: params.unit,
                categoryId: params.categoryId,
                description: params.description,
                currentStock: 0,
                version: 1
            }
        });
        await CacheService.invalidate(CacheService.keys.fullMenu(params.outletId));
        return product;
    }

    static async updateProduct(prisma: PrismaClient, params: {
        id: string;
        name?: string;
        price?: number;
        unit?: string;
        description?: string;
    }) {
        // Fetch outletId for cache invalidation before update
        const current = await prisma.product.findUnique({
            where: { id: params.id },
            select: { outletId: true }
        });

        const result = await prisma.product.update({
            where: { id: params.id },
            data: {
                name: params.name,
                price: params.price,
                unit: params.unit,
                description: params.description,
                version: { increment: 1 }
            }
        });

        if (current) {
            await CacheService.invalidate(CacheService.keys.fullMenu(current.outletId));
        }

        return result;
    }
}
