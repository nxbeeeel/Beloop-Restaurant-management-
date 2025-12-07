
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function seed() {
    console.log('🌱 Seeding Dummy Data...');

    // 1. Create Tenant
    console.log('Creating Tenant...');
    const tenant = await prisma.tenant.create({
        data: {
            name: 'Beloop Demo Brand',
            logoUrl: 'https://cdn-icons-png.flaticon.com/512/3170/3170733.png',
            website: 'https://demo.beloop.app',
            primaryColor: '#e11d48' // Rose-600
        }
    });

    // 2. Create Outlet
    console.log('Creating Outlet...');
    const outlet = await prisma.outlet.create({
        data: {
            name: 'Downtown Flagship',
            tenantId: tenant.id,
            address: '123 Main St, Tech City',
            phone: '555-0123',
            email: 'manager@beloop.demo',
            isPosEnabled: true
        }
    });

    // 3. Create Categories & Products
    console.log('Creating Menu...');
    const cat = await prisma.category.create({
        data: { name: 'Bestsellers', tenantId: tenant.id, outletId: outlet.id }
    });

    const p1 = await prisma.product.create({
        data: { name: 'Classic Burger', price: 12.99, categoryId: cat.id, tenantId: tenant.id, outletId: outlet.id, isActive: true }
    });
    const p2 = await prisma.product.create({
        data: { name: 'Crispy Fries', price: 4.99, categoryId: cat.id, tenantId: tenant.id, outletId: outlet.id, isActive: true }
    });

    // 4. Generate Sales (Last 30 Days)
    console.log('Generating Sales History...');
    const now = new Date();
    for (let i = 0; i < 30; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);

        // 5-15 sales per day
        const dailySales = Math.floor(Math.random() * 10) + 5;

        for (let j = 0; j < dailySales; j++) {
            const amount = (Math.random() * 50) + 10; // Random amount $10-$60
            await prisma.sale.create({
                data: {
                    tenantId: tenant.id,
                    outletId: outlet.id,
                    totalAmount: amount,
                    paymentMethod: Math.random() > 0.5 ? 'CARD' : 'CASH',
                    status: 'COMPLETED',
                    createdAt: date,
                    items: {
                        create: [
                            { productId: p1.id, quantity: 1, unitPrice: p1.price, totalPrice: p1.price, productName: p1.name },
                            { productId: p2.id, quantity: 2, unitPrice: p2.price, totalPrice: p2.price * 2, productName: p2.name }
                        ]
                    }
                }
            });
        }
    }

    // 5. Create a Dummy User (Brand Admin)
    console.log('Creating Dummy Admin...');
    await prisma.user.create({
        data: {
            email: 'admin@beloop.demo',
            name: 'Demo Admin',
            role: 'BRAND_ADMIN',
            tenantId: tenant.id,
            clerkId: 'dummy_clerk_id_' + Math.random() // Fake ID
        }
    });

    console.log('✅ Seeding Complete! Refresh your dashboard.');
}

seed()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
