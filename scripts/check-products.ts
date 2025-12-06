
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const OUTLET_ID = 'cm4bk1u8y0003cpeb37m3zgol'; // The one we found earlier

async function main() {
    const count = await prisma.product.count({
        where: {
            outletId: OUTLET_ID
        }
    });

    console.log(`Outlet ${OUTLET_ID} has ${count} products.`);

    const sample = await prisma.product.findFirst({
        where: { outletId: OUTLET_ID }
    });
    console.log('Sample Product:', sample ? sample.name : 'None');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
