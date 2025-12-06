
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const product = await prisma.product.findFirst({
        include: {
            outlet: true
        }
    });

    if (product) {
        console.log('--- FOUND PRODUCT ---');
        console.log(`Product Name: ${product.name}`);
        console.log(`Outlet Name: ${product.outlet.name}`);
        console.log(`Outlet ID: ${product.outletId}`);
        console.log('--- END ---');
    } else {
        console.log('--- NO PRODUCTS FOUND IN ENTIRE DATABASE ---');
    }
}

main()
    .finally(async () => {
        await prisma.$disconnect();
    });
