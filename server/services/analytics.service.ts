import { PrismaClient } from '@prisma/client';
import { subDays, format } from 'date-fns';
import { CacheService } from './cache.service';

export class AnalyticsService {

    static async getPlatformStats(prisma: PrismaClient) {
        return CacheService.getOrSet('super:stats:platform', async () => {
            const [totalTenants, totalUsers, totalOutlets, totalSales, activeTenants] = await Promise.all([
                prisma.tenant.count(),
                prisma.user.count(),
                prisma.outlet.count(),
                prisma.sale.count(),
                prisma.tenant.count({
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
            const revenueData = await prisma.sale.aggregate({
                _sum: {
                    totalSale: true,
                },
            });

            const totalRevenue = Number(revenueData._sum.totalSale || 0);

            // Calculate growth rate (compare last 30 days vs previous 30 days)
            const last30Days = await prisma.tenant.count({
                where: {
                    createdAt: {
                        gte: subDays(new Date(), 30),
                    },
                },
            });

            const previous30Days = await prisma.tenant.count({
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
        }, 60); // 60s cache
    }

    static async getRevenueTrend(prisma: PrismaClient, days: number = 30) {
        return CacheService.getOrSet(`super:revenue:trend:${days}`, async () => {
            const startDate = subDays(new Date(), days);

            const sales = await prisma.sale.groupBy({
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
        }, 3600);
    }

    static async getTenantHealth(prisma: PrismaClient) {
        return CacheService.getOrSet('super:tenant:health', async () => {
            const tenants = await prisma.tenant.findMany({
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
                    status: 'ACTIVE',
                    outlets: tenant._count.outlets,
                    users: tenant._count.users,
                    monthlyRevenue,
                    lastActivity,
                    healthScore: Math.max(0, healthScore),
                };
            });
        }, 60); // Reduced to 60s for development
    }

    static async getRecentActivity(prisma: PrismaClient, limit: number = 20) {
        // Recent activity is highly dynamic, maybe short cache or no cache?
        // User goal "Universal Speed". 
        // Queries are heavy-ish (3 queries combined).
        return CacheService.getOrSet('super:recent:activity', async () => {
            const [recentTenants, recentUsers, recentSales] = await Promise.all([
                // Recent tenant signups
                prisma.tenant.findMany({
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        name: true,
                        createdAt: true,
                    },
                }),
                // Recent user registrations
                prisma.user.findMany({
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
                prisma.sale.findMany({
                    take: 5,
                    where: {
                        totalSale: { gte: 10000 },
                    },
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        totalSale: true,
                        createdAt: true,
                        outlet: {
                            select: {
                                name: true,
                                tenant: { select: { name: true } },
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
                .slice(0, limit);
        }, 10); // Very short cache (10s) just to debounce concurrent dashboard loads
    }

    static async getTopTenants(prisma: PrismaClient, metric: 'revenue' | 'users' | 'growth' = 'revenue', limit: number = 10) {
        return CacheService.getOrSet(`super:top:tenants:${metric}`, async () => {
            const tenants = await prisma.tenant.findMany({
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
                if (metric === 'revenue') return b.revenue - a.revenue;
                if (metric === 'users') return b.users - a.users;
                return 0;
            });

            return sorted.slice(0, limit);
        }, 300);
    }

    static async getUserGrowth(prisma: PrismaClient, days: number = 30) {
        return CacheService.getOrSet(`super:user:growth:${days}`, async () => {
            const startDate = subDays(new Date(), days);

            const users = await prisma.user.groupBy({
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
        }, 3600);
    }

    // --- Brand/Outlet Reports (Cached) ---

    static async getReportStats(prisma: PrismaClient, params: {
        outletId: string;
        startDate: Date;
        endDate: Date;
    }) {
        const key = `report:stats:${params.outletId}:${params.startDate.toISOString()}:${params.endDate.toISOString()}`;
        return CacheService.getOrSet(key, async () => {
            const { outletId, startDate, endDate } = params;
            const orderWhere: any = {
                outletId,
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
                status: 'COMPLETED',
            };

            const orders = await prisma.order.findMany({
                where: orderWhere,
                select: {
                    totalAmount: true,
                    customerId: true,
                }
            });

            const orderCount = orders.length;
            const uniqueCustomers = new Set(orders.map(o => o.customerId).filter(Boolean)).size;
            const orderSales = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

            return {
                sales: orderSales,
                orders: orderCount,
                customers: uniqueCustomers,
                avgOrderValue: orderCount > 0 ? orderSales / orderCount : 0,
            };
        }, 300); // 5 min cache
    }

    static async getReportSalesTrend(prisma: PrismaClient, params: {
        outletId: string;
        startDate: Date;
        endDate: Date;
    }) {
        const key = `report:trend:${params.outletId}:${params.startDate.toISOString()}:${params.endDate.toISOString()}`;
        return CacheService.getOrSet(key, async () => {
            const { outletId, startDate, endDate } = params;
            const orders = await prisma.order.findMany({
                where: {
                    outletId,
                    createdAt: { gte: startDate, lte: endDate },
                    status: 'COMPLETED',
                },
                orderBy: { createdAt: 'asc' },
                select: {
                    createdAt: true,
                    totalAmount: true,
                }
            });

            const aggregated: Record<string, number> = {};
            orders.forEach(o => {
                const d = o.createdAt.toISOString().split('T')[0];
                aggregated[d] = (aggregated[d] || 0) + Number(o.totalAmount);
            });

            return Object.entries(aggregated).map(([date, amount]) => ({ date, amount }));
        }, 300);
    }

    static async getReportTopItems(prisma: PrismaClient, params: {
        outletId: string;
        startDate: Date;
        endDate: Date;
        limit: number;
    }) {
        const key = `report:top:${params.outletId}:${params.startDate.toISOString()}:${params.endDate.toISOString()}:${params.limit}`;
        return CacheService.getOrSet(key, async () => {
            const { outletId, startDate, endDate, limit } = params;
            const items = await prisma.orderItem.groupBy({
                by: ['name'],
                where: {
                    order: {
                        outletId,
                        createdAt: { gte: startDate, lte: endDate },
                        status: 'COMPLETED',
                    }
                },
                _sum: {
                    quantity: true,
                    total: true,
                },
                orderBy: {
                    _sum: { total: 'desc' }
                },
                take: limit,
            });

            return items.map(i => ({
                name: i.name,
                orders: i._sum.quantity || 0,
                revenue: Number(i._sum.total || 0),
            }));
        }, 300);
    }
}
