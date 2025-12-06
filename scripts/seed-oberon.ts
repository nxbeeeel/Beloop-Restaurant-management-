
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const OBERON_ID = 'cmii7cpeb0008x2pj3m3zgol3';

async function main() {
    // 1. Create Category
    const cat = await prisma.category.create({
        data: {
            outletId: OBERON_ID,
            name: 'Specials'
        }
    });

    // 2. Create Products
    await prisma.product.createMany({
        data: [
            {
                outletId: OBERON_ID,
                name: 'Double Cheese Burger',
                description: 'Two patties, extra cheese',
                price: 12.99,
                categoryId: cat.id,
                sku: 'OB-001',
                unit: 'item'
            },
            {
                outletId: OBERON_ID,
                name: 'Crispy Fries',
                description: 'Golden fries with sea salt',
                price: 4.50,
                categoryId: cat.id,
                sku: 'OB-002',
                unit: 'portion'
            },
            {
                outletId: OBERON_ID,
                name: 'Vanilla Shake',
                description: 'Creamy vanilla milkshake',
                price: 5.00,
                categoryId: cat.id,
                sku: 'OB-003',
                unit: 'item'
            }
        ]
    });

    console.log('✅ Created 3 Menu Items for Smoocho Oberon');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
