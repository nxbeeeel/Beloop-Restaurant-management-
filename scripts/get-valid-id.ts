
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const outlet = await prisma.outlet.findFirst({
        where: { status: 'ACTIVE' },
        select: { id: true, tenantId: true, name: true }
    });

    if (outlet) {
        console.log('--- FOUND ---');
        console.log(outlet.id); // Just the ID on one line
        console.log(outlet.tenantId); // Tenant ID on next
        console.log(outlet.name); // Name on next
    } else {
        console.log('--- NONE ---');
    }
}

main()
    .finally(async () => {
        await prisma.$disconnect();
    });
