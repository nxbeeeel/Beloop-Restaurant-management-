
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    console.log('Checking recent approval actions...');

    // 1. Check Applications
    const apps = await prisma.brandApplication.findMany({
        orderBy: { createdAt: 'desc' },
        take: 1
    });
    console.log('Recent Application:', apps[0]);

    if (apps[0]?.status === 'APPROVED') {
        const tenantName = apps[0].brandName;
        // 2. Check Tenant
        const tenant = await prisma.tenant.findUnique({
            where: { name: tenantName } // Technically slug might differ but name should match input
        });

        // Try finding by fuzzy search if exact name match fails (due to slug logic)
        const tenantFuzzy = await prisma.tenant.findFirst({
            where: { name: { contains: tenantName } },
            orderBy: { createdAt: 'desc' }
        });

        console.log('Created Tenant:', tenantFuzzy);

        if (tenantFuzzy) {
            // 3. Check Invite
            const invite = await prisma.invitation.findFirst({
                where: { tenantId: tenantFuzzy.id, email: apps[0].email },
                orderBy: { createdAt: 'desc' }
            });
            console.log('Invite Token:', invite?.token);
            console.log('Invite Link:', `http://localhost:3000/signup?token=${invite?.token}`);
        }
    }
}

check()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
