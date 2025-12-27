
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
    console.log('--- Outlets ---');
    const outlets = await prisma.outlet.findMany({
        select: { id: true, name: true, code: true, tenant: { select: { slug: true } } }
    });
    console.table(outlets);

    console.log('\n--- Users with Assignments ---');
    const users = await prisma.user.findMany({
        where: { outletId: { not: null } },
        select: { id: true, name: true, email: true, role: true, outletId: true, tenantId: true },
        take: 10
    });
    console.table(users);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
