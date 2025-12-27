import { PrismaClient } from '@prisma/client';

export class CustomerService {

    static async getCustomers(prisma: PrismaClient, params: {
        tenantId: string;
        search?: string;
    }) {
        const { tenantId, search } = params;
        const where: any = { tenantId };

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { phoneNumber: { contains: search } },
            ];
        }

        const customers = await prisma.customer.findMany({
            where,
            include: {
                orders: {
                    select: {
                        totalAmount: true,
                        createdAt: true,
                    }
                },
                loyalty: true
            },
            orderBy: { updatedAt: 'desc' },
            take: 50 // Limit for POS performance
        });

        return customers.map(c => {
            const totalSpent = c.orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
            const totalOrders = c.orders.length;
            const lastVisit = c.orders.length > 0 ? c.orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].createdAt : c.createdAt;

            return {
                id: c.id,
                name: c.name || 'Unknown',
                phone: c.phoneNumber,
                totalOrders,
                totalSpent,
                lastVisit: lastVisit.toISOString().split('T')[0],
                loyaltyPoints: c.loyalty.reduce((sum, l) => sum + l.stamps, 0),
            };
        });
    }

    static async getHistory(prisma: PrismaClient, params: {
        customerId: string;
        tenantId: string;
    }) {
        const { customerId, tenantId } = params;
        const orders = await prisma.order.findMany({
            where: {
                customerId,
                outlet: { tenantId } // Ensure tenant isolation
            },
            include: {
                items: true
            },
            orderBy: { createdAt: 'desc' },
            take: 20 // Limit history
        });

        return orders.map(order => ({
            id: order.id,
            date: order.createdAt.toISOString(),
            total: Number(order.totalAmount),
            status: order.status,
            items: order.items.map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: Number(item.price)
            }))
        }));
    }

    static async create(prisma: PrismaClient, params: {
        tenantId: string;
        name: string;
        phoneNumber: string;
    }) {
        const { tenantId, name, phoneNumber } = params;

        // Use upsert to handle race conditions and potential updates
        return prisma.customer.upsert({
            where: { tenantId_phoneNumber: { tenantId, phoneNumber } },
            update: { name }, // Update name if provided (re-registration)
            create: {
                tenantId,
                name,
                phoneNumber
            }
        });
    }
}
