
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const outlets = await prisma.outlet.findMany({
        include: {
            _count: {
                select: { products: true }
            }
        }
    });

    console.log('--- ALL OUTLETS ---');
    for (const o of outlets) {
        console.log(`Name: "${o.name}"`);
        console.log(`ID: ${o.id}`);
        console.log(`Tenant: ${o.tenantId}`);
        console.log(`Products: ${o._count.products}`);
        console.log('-------------------');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
