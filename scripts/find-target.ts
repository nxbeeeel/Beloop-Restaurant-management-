
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const o = await prisma.outlet.findFirst({
        where: {
            name: { contains: 'Smoocho', mode: 'insensitive' }
        },
        select: { id: true, tenantId: true, name: true }
    });

    if (o) {
        console.log('--- TARGET FOUND ---');
        console.log(`OutletID: ${o.id}`);
        console.log(`TenantID: ${o.tenantId}`);
        console.log(`Name: ${o.name}`);
    } else {
        console.log('--- TARGET NOT FOUND ---');
    }
}

main()
    .finally(async () => {
        await prisma.$disconnect();
    });
