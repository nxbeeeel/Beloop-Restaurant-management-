
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    console.log('Checking User Role for mnabeelca123@gmail.com...');
    const user = await prisma.user.findUnique({
        where: { email: 'mnabeelca123@gmail.com' }
    });

    if (!user) {
        console.log('❌ User NOT FOUND.');
    } else {
        console.log(`✅ Found User: ${user.name}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   TenantId: ${user.tenantId}`);

        if (user.role !== 'SUPER') {
            console.log('⚠️  User is NOT SUPER. Updating...');
            await prisma.user.update({
                where: { id: user.id },
                data: { role: 'SUPER' }
            });
            console.log('✅ User updated to SUPER.');
        } else {
            console.log('✅ User is already SUPER.');
        }
    }
}

check()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
