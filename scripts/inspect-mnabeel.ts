
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function inspect() {
    const email = 'mnabeelca123@gmail.com';
    console.log(`Inspecting ${email}...`);

    const user = await prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        include: { tenant: true }
    });

    if (!user) {
        console.log('User NOT FOUND in DB');
    } else {
        console.log('User Found:');
        console.log(`ID: ${user.id}`);
        console.log(`Role: ${user.role}`);
        console.log(`TenantId: ${user.tenantId}`);
        console.log(`OutletId: ${user.outletId}`);
        console.log(`ClerkId: ${user.clerkId}`);
    }
}

inspect()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
