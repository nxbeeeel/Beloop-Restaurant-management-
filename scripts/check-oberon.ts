
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const OBERON_ID = 'cmii7cpeb0008x2pj3m3zgol3';

async function main() {
    const o = await prisma.outlet.findUnique({
        where: { id: OBERON_ID },
        include: {
            _count: { select: { products: true } }
        }
    });

    if (o) {
        console.log(`Outlet: ${o.name}`);
        console.log(`Product Count: ${o._count.products}`);
    } else {
        console.log('Oberon Outlet NOT FOUND with ID: ' + OBERON_ID);
    }
}

main()
    .finally(async () => {
        await prisma.$disconnect();
    });
