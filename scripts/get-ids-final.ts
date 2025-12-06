
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
        console.log(`TENANT=${o.tenantId}`);
        console.log(`OUTLET=${o.id}`);
        console.log(`NAME=${o.name}`);
    }
}

main()
    .finally(async () => {
        await prisma.$disconnect();
    });
