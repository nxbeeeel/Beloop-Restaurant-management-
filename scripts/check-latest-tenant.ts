
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function findLatestTenant() {
    const tenants = await prisma.tenant.findMany({
        orderBy: { createdAt: 'desc' },
        take: 1
    });

    if (tenants.length > 0) {
        console.log('Latest Tenant Found:');
        console.log(tenants[0]);
    } else {
        console.log('No tenants found.');
    }
}

findLatestTenant()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
