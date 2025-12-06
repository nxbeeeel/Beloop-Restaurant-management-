
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        include: { outlet: true }
    });

    console.log(`Total Users: ${users.length}`);
    for (const u of users) {
        console.log(`Email: ${u.email}`);
        console.log(`Outlet: ${u.outlet?.name || 'NONE'} (${u.outletId})`);
        console.log('---');
    }
}

main()
    .finally(async () => {
        await prisma.$disconnect();
    });
