
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const OUTLET_ID = 'cm4bk1u8y0003cpeb37m3zgol';
const TENANT_ID = 'cm4bk1u8x0001cpeb0008x2pj';

async function main() {
    // 1. Ensure a category exists
    let category = await prisma.category.findFirst({
        where: {
            tenantId: TENANT_ID,
            name: 'Burgers'
        }
    });

    if (!category) {
        category = await prisma.category.create({
            data: {
                tenantId: TENANT_ID,
                name: 'Burgers'
            }
        });
        console.log('Created Category: Burgers');
    }

    // 2. Create a Product
    const product = await prisma.product.create({
        data: {
            tenantId: TENANT_ID,
            outletId: OUTLET_ID,
            name: 'Classic Cheese Burger',
            description: 'Juicy beef patty with cheddar cheese',
            price: 15.00,
            categoryId: category.id,
            sku: 'TEST-BURGER-001',
            unit: 'item',
            minStock: 10,
            currentStock: 100
        }
    });

    console.log('Created Test Product:', product.name);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
