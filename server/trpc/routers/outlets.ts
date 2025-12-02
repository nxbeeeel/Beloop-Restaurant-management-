import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

export const outletsRouter = router({
    // Get outlet settings
    getSettings: protectedProcedure
        .input(z.object({ outletId: z.string() }))
        .query(async ({ ctx, input }) => {
            const outlet = await ctx.prisma.outlet.findUnique({
                where: { id: input.outletId },
                select: {
                    id: true,
                    name: true,
                    googleSheetsUrl: true,
                    sheetExportUrl: true,
                    isPosEnabled: true,
                },
            });

            if (!outlet) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Outlet not found',
                });
            }

            // Verify user has access to this outlet
            if (ctx.user.outletId !== input.outletId && ctx.role !== 'BRAND_ADMIN' && ctx.role !== 'SUPER') {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'You do not have access to this outlet',
                });
            }

            return outlet;
        }),

    getById: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const outlet = await ctx.prisma.outlet.findUnique({
                where: { id: input.id },
                include: {
                    _count: { select: { users: true } }
                }
            });

            if (!outlet) throw new TRPCError({ code: 'NOT_FOUND' });

            // Verify access
            if (ctx.role !== 'SUPER' && ctx.role !== 'BRAND_ADMIN' && ctx.user.outletId !== input.id) {
                // Check if user belongs to the same tenant at least
                if (ctx.user.tenantId !== outlet.tenantId) {
                    throw new TRPCError({ code: 'FORBIDDEN' });
                }
            }

            return outlet;
        }),

    // Update outlet details
    update: protectedProcedure
        .input(z.object({
            id: z.string(),
            name: z.string().min(2).optional(),
            code: z.string().min(2).max(10).optional(),
            address: z.string().optional(),
            phone: z.string().optional(),
            status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
            isPosEnabled: z.boolean().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            // Verify user has permission (BRAND_ADMIN or SUPER)
            if (ctx.role !== 'BRAND_ADMIN' && ctx.role !== 'SUPER') {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'Only admins can update outlet details',
                });
            }

            // Verify access (redundant for BRAND_ADMIN but good practice)
            if (ctx.role === 'BRAND_ADMIN' && ctx.user.tenantId) {
                const outlet = await ctx.prisma.outlet.findFirst({
                    where: { id: input.id, tenantId: ctx.user.tenantId }
                });
                if (!outlet) {
                    throw new TRPCError({ code: 'NOT_FOUND', message: 'Outlet not found' });
                }
            }

            // Check code uniqueness if changing code
            if (input.code) {
                const existing = await ctx.prisma.outlet.findFirst({
                    where: {
                        tenantId: ctx.user.tenantId!,
                        code: input.code,
                        id: { not: input.id }
                    }
                });
                if (existing) {
                    throw new TRPCError({ code: 'CONFLICT', message: 'Outlet code already exists' });
                }
            }

            return ctx.prisma.outlet.update({
                where: { id: input.id },
                data: {
                    name: input.name,
                    code: input.code,
                    address: input.address,
                    phone: input.phone,
                    status: input.status,
                    isPosEnabled: input.isPosEnabled,
                }
            });
        }),

    // Update outlet settings (Google Sheets URL & POS Status)
    updateSettings: protectedProcedure
        .input(
            z.object({
                outletId: z.string(),
                googleSheetsUrl: z.string().url().optional().nullable(),
                isPosEnabled: z.boolean().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Verify user has permission (OUTLET_MANAGER, BRAND_ADMIN, or SUPER)
            if (ctx.role === 'STAFF') {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'Only managers can update outlet settings',
                });
            }

            // Verify user has access to this outlet
            if (ctx.user.outletId !== input.outletId && ctx.role !== 'BRAND_ADMIN' && ctx.role !== 'SUPER') {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'You do not have access to this outlet',
                });
            }

            const updated = await ctx.prisma.outlet.update({
                where: { id: input.outletId },
                data: {
                    googleSheetsUrl: input.googleSheetsUrl,
                    isPosEnabled: input.isPosEnabled,
                },
                select: {
                    id: true,
                    name: true,
                    googleSheetsUrl: true,
                    isPosEnabled: true,
                },
            });

            return updated;
        }),

    // Get data for export (Sales, Expenses, Inventory)
    getExportData: protectedProcedure
        .input(z.object({ outletId: z.string() }))
        .query(async ({ ctx, input }) => {
            // Verify access
            if (ctx.user.outletId !== input.outletId && ctx.role !== 'BRAND_ADMIN' && ctx.role !== 'SUPER') {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'You do not have access to this outlet',
                });
            }

            const [outlet, sales, expenses, inventory] = await Promise.all([
                ctx.prisma.outlet.findUnique({
                    where: { id: input.outletId },
                    select: { name: true, code: true }
                }),
                ctx.prisma.sale.findMany({
                    where: { outletId: input.outletId },
                    orderBy: { date: 'desc' },
                    take: 1000, // Limit to last 1000 entries for performance
                    include: { staff: { select: { name: true } } }
                }),
                ctx.prisma.expense.findMany({
                    where: { outletId: input.outletId },
                    orderBy: { date: 'desc' },
                    take: 1000,
                    include: { staff: { select: { name: true } } }
                }),
                ctx.prisma.product.findMany({
                    where: { outletId: input.outletId },
                    select: {
                        name: true,
                        currentStock: true,
                        unit: true,
                        minStock: true,
                        supplier: { select: { name: true } }
                    }
                })
            ]);

            return {
                outlet,
                sales,
                expenses,
                inventory
            };
        }),
    // List all outlets for the tenant
    list: protectedProcedure
        .query(async ({ ctx }) => {
            if (!ctx.user.tenantId) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'User does not belong to a tenant' });
            }

            const outlets = await ctx.prisma.outlet.findMany({
                where: {
                    tenantId: ctx.user.tenantId,
                },
                select: {
                    id: true,
                    name: true,
                },
                orderBy: {
                    name: 'asc',
                },
            });

            return outlets;
        }),
});
