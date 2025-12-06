
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const OUTLET_ID = 'cm4bk1u8y0003cpeb37m3zgol';
const TENANT_ID = 'cm4bk1u8x0001cpeb0008x2pj';

async function main() {
    // 1. Ensure a category exists (using outletId)
    let category = await prisma.category.findFirst({
        where: {
            outletId: OUTLET_ID,
            name: 'Burgers'
        }
    });

    if (!category) {
        category = await prisma.category.create({
            data: {
                outletId: OUTLET_ID,
                name: 'Burgers'
            }
        });
        console.log('Created Category: Burgers');
    }

    // 2. Create a Product
    const product = await prisma.product.create({
        data: {
            outletId: OUTLET_ID,
            name: 'Classic Cheese Burger',
            sku: 'TEST-BURGER-003',
            unit: 'item',
            categoryId: category.id,
            // Removed defaults
        }
    });

    await prisma.product.update({
        where: { id: product.id },
        data: { price: 15.0 }
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
