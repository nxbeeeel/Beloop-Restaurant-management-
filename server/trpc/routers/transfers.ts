import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { enforceTenant } from "@/server/trpc/middleware/roleCheck";
import { TRPCError } from "@trpc/server";

/**
 * Stock Transfers Router
 * 
 * Enables stock transfers between outlets within the same tenant.
 * Workflow: REQUESTED → APPROVED → SHIPPED → RECEIVED
 */
export const transfersRouter = router({
    /**
     * Create a transfer request from current outlet to another
     */
    create: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            fromOutletId: z.string(),
            toOutletId: z.string(),
            items: z.array(z.object({
                productId: z.string(),
                productName: z.string(),
                qtyRequested: z.number().positive()
            })),
            notes: z.string().optional()
        }))
        .mutation(async ({ ctx, input }) => {
            const { user } = ctx;

            // Validate outlets belong to same tenant
            const [fromOutlet, toOutlet] = await Promise.all([
                ctx.prisma.outlet.findUnique({ where: { id: input.fromOutletId } }),
                ctx.prisma.outlet.findUnique({ where: { id: input.toOutletId } })
            ]);

            if (!fromOutlet || !toOutlet) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Outlet not found' });
            }

            if (fromOutlet.tenantId !== toOutlet.tenantId) {
                throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot transfer between different brands' });
            }

            if (fromOutlet.id === toOutlet.id) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot transfer to same outlet' });
            }

            // Create transfer
            const transfer = await ctx.prisma.stockTransfer.create({
                data: {
                    tenantId: fromOutlet.tenantId,
                    fromOutletId: input.fromOutletId,
                    toOutletId: input.toOutletId,
                    requestedBy: user.id,
                    notes: input.notes,
                    status: 'REQUESTED',
                    items: {
                        create: input.items.map(item => ({
                            productId: item.productId,
                            productName: item.productName,
                            qtyRequested: item.qtyRequested
                        }))
                    }
                },
                include: { items: true, fromOutlet: true, toOutlet: true }
            });

            return transfer;
        }),

    /**
     * List transfers for the current outlet (both sent and received)
     */
    list: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string(),
            direction: z.enum(['incoming', 'outgoing', 'all']).default('all'),
            status: z.enum(['REQUESTED', 'APPROVED', 'SHIPPED', 'RECEIVED', 'REJECTED', 'CANCELLED']).optional()
        }))
        .query(async ({ ctx, input }) => {
            const where: any = {};

            if (input.direction === 'incoming') {
                where.toOutletId = input.outletId;
            } else if (input.direction === 'outgoing') {
                where.fromOutletId = input.outletId;
            } else {
                where.OR = [
                    { fromOutletId: input.outletId },
                    { toOutletId: input.outletId }
                ];
            }

            if (input.status) {
                where.status = input.status;
            }

            return ctx.prisma.stockTransfer.findMany({
                where,
                include: {
                    items: true,
                    fromOutlet: { select: { id: true, name: true } },
                    toOutlet: { select: { id: true, name: true } }
                },
                orderBy: { createdAt: 'desc' }
            });
        }),

    /**
     * Get transfer details by ID
     */
    getById: protectedProcedure
        .use(enforceTenant)
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const transfer = await ctx.prisma.stockTransfer.findUnique({
                where: { id: input.id },
                include: {
                    items: { include: { product: true } },
                    fromOutlet: true,
                    toOutlet: true
                }
            });

            if (!transfer) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Transfer not found' });
            }

            return transfer;
        }),

    /**
     * Approve transfer (source outlet manager)
     */
    approve: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            transferId: z.string(),
            items: z.array(z.object({
                id: z.string(),
                qtyApproved: z.number().min(0)
            }))
        }))
        .mutation(async ({ ctx, input }) => {
            const { user } = ctx;

            return ctx.prisma.$transaction(async (tx) => {
                const transfer = await tx.stockTransfer.findUnique({
                    where: { id: input.transferId },
                    include: { items: true }
                });

                if (!transfer) {
                    throw new TRPCError({ code: 'NOT_FOUND', message: 'Transfer not found' });
                }

                if (transfer.status !== 'REQUESTED') {
                    throw new TRPCError({ code: 'BAD_REQUEST', message: `Cannot approve transfer in ${transfer.status} status` });
                }

                // Update approved quantities
                for (const item of input.items) {
                    await tx.stockTransferItem.update({
                        where: { id: item.id },
                        data: { qtyApproved: item.qtyApproved }
                    });
                }

                // Update transfer status
                return tx.stockTransfer.update({
                    where: { id: input.transferId },
                    data: {
                        status: 'APPROVED',
                        approvedBy: user.id
                    },
                    include: { items: true, fromOutlet: true, toOutlet: true }
                });
            });
        }),

    /**
     * Reject transfer (source outlet manager)
     */
    reject: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            transferId: z.string(),
            reason: z.string()
        }))
        .mutation(async ({ ctx, input }) => {
            const { user } = ctx;

            const transfer = await ctx.prisma.stockTransfer.findUnique({
                where: { id: input.transferId }
            });

            if (!transfer) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Transfer not found' });
            }

            if (transfer.status !== 'REQUESTED') {
                throw new TRPCError({ code: 'BAD_REQUEST', message: `Cannot reject transfer in ${transfer.status} status` });
            }

            return ctx.prisma.stockTransfer.update({
                where: { id: input.transferId },
                data: {
                    status: 'REJECTED',
                    rejectedBy: user.id,
                    rejectReason: input.reason
                }
            });
        }),

    /**
     * Mark transfer as shipped (source outlet)
     */
    markShipped: protectedProcedure
        .use(enforceTenant)
        .input(z.object({ transferId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.$transaction(async (tx) => {
                const transfer = await tx.stockTransfer.findUnique({
                    where: { id: input.transferId },
                    include: { items: true }
                });

                if (!transfer) {
                    throw new TRPCError({ code: 'NOT_FOUND', message: 'Transfer not found' });
                }

                if (transfer.status !== 'APPROVED') {
                    throw new TRPCError({ code: 'BAD_REQUEST', message: `Cannot ship transfer in ${transfer.status} status` });
                }

                // Deduct stock from source outlet
                for (const item of transfer.items) {
                    const qtyToDeduct = item.qtyApproved || 0;
                    if (qtyToDeduct > 0) {
                        await tx.product.update({
                            where: { id: item.productId },
                            data: {
                                currentStock: { decrement: qtyToDeduct },
                                version: { increment: 1 }
                            }
                        });

                        // Create stock movement record
                        await tx.stockMove.create({
                            data: {
                                outletId: transfer.fromOutletId,
                                productId: item.productId,
                                qty: qtyToDeduct,
                                type: 'ADJUSTMENT',
                                date: new Date(),
                                notes: `Transfer OUT to ${transfer.toOutletId} (Ref: ${transfer.id.slice(-6)})`
                            }
                        });
                    }
                }

                return tx.stockTransfer.update({
                    where: { id: input.transferId },
                    data: {
                        status: 'SHIPPED',
                        shippedAt: new Date()
                    }
                });
            });
        }),

    /**
     * Confirm receipt (destination outlet)
     */
    confirmReceipt: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            transferId: z.string(),
            items: z.array(z.object({
                id: z.string(),
                qtyReceived: z.number().min(0)
            }))
        }))
        .mutation(async ({ ctx, input }) => {
            const { user } = ctx;

            return ctx.prisma.$transaction(async (tx) => {
                const transfer = await tx.stockTransfer.findUnique({
                    where: { id: input.transferId },
                    include: { items: true }
                });

                if (!transfer) {
                    throw new TRPCError({ code: 'NOT_FOUND', message: 'Transfer not found' });
                }

                if (transfer.status !== 'SHIPPED') {
                    throw new TRPCError({ code: 'BAD_REQUEST', message: `Cannot confirm receipt for transfer in ${transfer.status} status` });
                }

                // Update received quantities and add stock to destination
                for (const itemInput of input.items) {
                    const item = transfer.items.find(i => i.id === itemInput.id);
                    if (!item) continue;

                    await tx.stockTransferItem.update({
                        where: { id: itemInput.id },
                        data: { qtyReceived: itemInput.qtyReceived }
                    });

                    if (itemInput.qtyReceived > 0) {
                        // Find or create product in destination outlet
                        // For now, we assume same SKU exists in both outlets
                        const sourceProduct = await tx.product.findUnique({
                            where: { id: item.productId }
                        });

                        if (sourceProduct) {
                            // Try to find matching product in destination outlet
                            const destProduct = await tx.product.findUnique({
                                where: {
                                    outletId_sku: {
                                        outletId: transfer.toOutletId,
                                        sku: sourceProduct.sku
                                    }
                                }
                            });

                            if (destProduct) {
                                await tx.product.update({
                                    where: { id: destProduct.id },
                                    data: {
                                        currentStock: { increment: itemInput.qtyReceived },
                                        version: { increment: 1 }
                                    }
                                });

                                await tx.stockMove.create({
                                    data: {
                                        outletId: transfer.toOutletId,
                                        productId: destProduct.id,
                                        qty: itemInput.qtyReceived,
                                        type: 'PURCHASE',
                                        date: new Date(),
                                        notes: `Transfer IN from ${transfer.fromOutletId} (Ref: ${transfer.id.slice(-6)})`
                                    }
                                });
                            }
                        }
                    }
                }

                return tx.stockTransfer.update({
                    where: { id: input.transferId },
                    data: {
                        status: 'RECEIVED',
                        receivedAt: new Date(),
                        receivedBy: user.id
                    }
                });
            });
        }),

    /**
     * Cancel transfer (requestor only, before approval)
     */
    cancel: protectedProcedure
        .use(enforceTenant)
        .input(z.object({ transferId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const { user } = ctx;

            const transfer = await ctx.prisma.stockTransfer.findUnique({
                where: { id: input.transferId }
            });

            if (!transfer) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Transfer not found' });
            }

            if (transfer.requestedBy !== user.id) {
                throw new TRPCError({ code: 'FORBIDDEN', message: 'Only the requestor can cancel' });
            }

            if (transfer.status !== 'REQUESTED') {
                throw new TRPCError({ code: 'BAD_REQUEST', message: `Cannot cancel transfer in ${transfer.status} status` });
            }

            return ctx.prisma.stockTransfer.update({
                where: { id: input.transferId },
                data: { status: 'CANCELLED' }
            });
        })
});
