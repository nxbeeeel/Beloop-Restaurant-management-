
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
        console.log('TARGET_START');
        console.log(o.tenantId);
        console.log(o.id);
        console.log(o.name);
        console.log('TARGET_END');
    }
}

main()
    .finally(async () => {
        await prisma.$disconnect();
    });
