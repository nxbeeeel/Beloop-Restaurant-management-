import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { subDays, format } from 'date-fns';

// Middleware to require SUPER role
const requireSuper = protectedProcedure.use(async ({ ctx, next }) => {
    if (ctx.role !== 'SUPER') {
        throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only super admins can access this resource',
        });
    }
    return next();
});

export const superAnalyticsRouter = router({
    // Platform-wide statistics
    getPlatformStats: requireSuper.query(async ({ ctx }) => {
        const [totalTenants, totalUsers, totalOutlets, totalSales, activeTenants] = await Promise.all([
            ctx.prisma.tenant.count(),
            ctx.prisma.user.count(),
            ctx.prisma.outlet.count(),
            ctx.prisma.sale.count(),
            ctx.prisma.tenant.count({
                where: {
                    outlets: {
                        some: {
                            sales: {
                                some: {
                                    createdAt: {
                                        gte: subDays(new Date(), 30),
                                    },
                                },
                            },
                        },
                    },
                },
            }),
        ]);

        // Calculate total revenue
        const revenueData = await ctx.prisma.sale.aggregate({
            _sum: {
                totalSale: true,
            },
        });

        const totalRevenue = Number(revenueData._sum.totalSale || 0);

        // Calculate growth rate (compare last 30 days vs previous 30 days)
        const last30Days = await ctx.prisma.tenant.count({
            where: {
                createdAt: {
                    gte: subDays(new Date(), 30),
                },
            },
        });

        const previous30Days = await ctx.prisma.tenant.count({
            where: {
                createdAt: {
                    gte: subDays(new Date(), 60),
                    lt: subDays(new Date(), 30),
                },
            },
        });

        const growthRate = previous30Days > 0
            ? ((last30Days - previous30Days) / previous30Days) * 100
            : 0;

        return {
            totalRevenue,
            totalTenants,
            activeTenants,
            totalUsers,
            totalOutlets,
            totalSales,
            growthRate,
            newTenantsThisMonth: last30Days,
        };
    }),

    // Revenue trend over last 30 days
    getRevenueTrend: requireSuper
        .input(z.object({
            days: z.number().default(30),
        }))
        .query(async ({ ctx, input }) => {
            const startDate = subDays(new Date(), input.days);

            const sales = await ctx.prisma.sale.groupBy({
                by: ['date'],
                where: {
                    date: {
                        gte: startDate,
                    },
                },
                _sum: {
                    totalSale: true,
                },
                orderBy: {
                    date: 'asc',
                },
            });

            return sales.map(sale => ({
                date: format(new Date(sale.date), 'MMM dd'),
                revenue: Number(sale._sum.totalSale || 0),
            }));
        }),

    // Tenant health monitoring
    getTenantHealth: requireSuper.query(async ({ ctx }) => {
        const tenants = await ctx.prisma.tenant.findMany({
            include: {
                _count: {
                    select: {
                        outlets: true,
                        users: true,
                    },
                },
                outlets: {
                    include: {
                        sales: {
                            where: {
                                createdAt: {
                                    gte: subDays(new Date(), 30),
                                },
                            },
                            select: {
                                totalSale: true,
                                createdAt: true,
                            },
                            orderBy: {
                                createdAt: 'desc',
                            },
                            take: 1,
                        },
                    },
                },
            },
        });

        return tenants.map(tenant => {
            // Aggregate sales from all outlets
            let monthlyRevenue = 0;
            let lastActivity = tenant.createdAt;

            tenant.outlets.forEach(outlet => {
                outlet.sales.forEach(sale => {
                    monthlyRevenue += Number(sale.totalSale || 0);
                    if (new Date(sale.createdAt) > new Date(lastActivity)) {
                        lastActivity = sale.createdAt;
                    }
                });
            });

            const daysSinceActivity = Math.floor(
                (new Date().getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)
            );

            // Calculate health score (0-100)
            let healthScore = 100;
            if (daysSinceActivity > 7) healthScore -= 20;
            if (daysSinceActivity > 14) healthScore -= 20;
            if (tenant._count.users < 2) healthScore -= 15;
            if (tenant._count.outlets === 0) healthScore -= 25;
            if (monthlyRevenue === 0) healthScore -= 20;

            return {
                id: tenant.id,
                name: tenant.name,
                status: 'ACTIVE', // TODO: Add status field to Tenant model
                outlets: tenant._count.outlets,
                users: tenant._count.users,
                monthlyRevenue,
                lastActivity,
                healthScore: Math.max(0, healthScore),
            };
        });
    }),

    // Recent activity feed
    getRecentActivity: requireSuper
        .input(z.object({
            limit: z.number().default(20),
        }))
        .query(async ({ ctx, input }) => {
            const [recentTenants, recentUsers, recentSales] = await Promise.all([
                // Recent tenant signups
                ctx.prisma.tenant.findMany({
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        name: true,
                        createdAt: true,
                    },
                }),
                // Recent user registrations
                ctx.prisma.user.findMany({
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        createdAt: true,
                        tenant: {
                            select: { name: true },
                        },
                    },
                }),
                // Recent high-value sales
                ctx.prisma.sale.findMany({
                    take: 5,
                    where: {
                        totalSale: {
                            gte: 10000, // High-value threshold
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        totalSale: true,
                        createdAt: true,
                        outlet: {
                            select: {
                                name: true,
                                tenant: {
                                    select: { name: true },
                                },
                            },
                        },
                    },
                }),
            ]);

            // Combine and sort all activities
            const activities = [
                ...recentTenants.map(t => ({
                    id: t.id,
                    type: 'TENANT_CREATED' as const,
                    description: `New tenant: ${t.name}`,
                    timestamp: t.createdAt,
                    metadata: { tenantName: t.name },
                })),
                ...recentUsers.map(u => ({
                    id: u.id,
                    type: 'USER_REGISTERED' as const,
                    description: `New ${u.role} user: ${u.name} (${u.tenant?.name || 'No tenant'})`,
                    timestamp: u.createdAt,
                    metadata: { userName: u.name, role: u.role, tenantName: u.tenant?.name },
                })),
                ...recentSales.map(s => ({
                    id: s.id,
                    type: 'HIGH_VALUE_SALE' as const,
                    description: `High-value sale: ₹${s.totalSale} at ${s.outlet.name}`,
                    timestamp: s.createdAt,
                    metadata: {
                        amount: Number(s.totalSale),
                        outletName: s.outlet.name,
                        tenantName: s.outlet.tenant.name,
                    },
                })),
            ];

            return activities
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, input.limit);
        }),

    // Top performing tenants
    getTopTenants: requireSuper
        .input(z.object({
            metric: z.enum(['revenue', 'users', 'growth']).default('revenue'),
            limit: z.number().default(10),
        }))
        .query(async ({ ctx, input }) => {
            const tenants = await ctx.prisma.tenant.findMany({
                include: {
                    _count: {
                        select: { users: true, outlets: true },
                    },
                    outlets: {
                        include: {
                            sales: {
                                where: {
                                    createdAt: {
                                        gte: subDays(new Date(), 30),
                                    },
                                },
                                select: {
                                    totalSale: true,
                                },
                            },
                        },
                    },
                },
            });

            const tenantsWithMetrics = tenants.map(tenant => {
                const revenue = tenant.outlets.reduce((total, outlet) => {
                    return total + outlet.sales.reduce((sum, sale) => sum + Number(sale.totalSale || 0), 0);
                }, 0);

                return {
                    id: tenant.id,
                    name: tenant.name,
                    revenue,
                    users: tenant._count.users,
                    outlets: tenant._count.outlets,
                };
            });

            // Sort based on metric
            const sorted = tenantsWithMetrics.sort((a, b) => {
                if (input.metric === 'revenue') return b.revenue - a.revenue;
                if (input.metric === 'users') return b.users - a.users;
                return 0; // growth metric would need historical data
            });

            return sorted.slice(0, input.limit);
        }),

    // User growth over time
    getUserGrowth: requireSuper
        .input(z.object({
            days: z.number().default(30),
        }))
        .query(async ({ ctx, input }) => {
            const startDate = subDays(new Date(), input.days);

            const users = await ctx.prisma.user.groupBy({
                by: ['createdAt'],
                where: {
                    createdAt: {
                        gte: startDate,
                    },
                },
                _count: true,
            });

            // Group by date
            const dailyCounts: Record<string, number> = {};
            users.forEach(user => {
                const date = format(new Date(user.createdAt), 'MMM dd');
                dailyCounts[date] = (dailyCounts[date] || 0) + user._count;
            });

            return Object.entries(dailyCounts).map(([date, count]) => ({
                date,
                users: count,
            }));
        }),
});
