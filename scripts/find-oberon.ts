
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const o = await prisma.outlet.findFirst({
        where: {
            name: { contains: 'Oberon', mode: 'insensitive' }
        },
        select: { id: true, tenantId: true, name: true }
    });

    if (o) {
        console.log(`FOUND_OBERON`);
        console.log(`TENANT_ID: ${o.tenantId}`);
        console.log(`OUTLET_ID: ${o.id}`);
        console.log(`NAME: ${o.name}`);
    } else {
        console.log(`NO_OBERON_FOUND`);
    }
}

main()
    .finally(async () => {
        await prisma.$disconnect();
    });
