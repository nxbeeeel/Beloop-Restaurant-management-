
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SUPER_EMAIL = 'mnabeelca123@gmail.com';
const BRAND_EMAIL = 'beloopstore@gmail.com';

async function main() {
    console.log('--- UPDATING ROLES ---');

    // 1. Promote SUPER ADMIN
    const superUser = await prisma.user.findFirst({
        where: { email: { equals: SUPER_EMAIL, mode: 'insensitive' } }
    });

    if (superUser) {
        if (superUser.role !== 'SUPER') {
            await prisma.user.update({
                where: { id: superUser.id },
                data: { role: 'SUPER' }
            });
            console.log(`✅ Promoted ${SUPER_EMAIL} to SUPER.`);
        } else {
            console.log(`ℹ️ ${SUPER_EMAIL} is already SUPER.`);
        }
    } else {
        console.log(`❌ User not found: ${SUPER_EMAIL}`);
    }

    // 2. Ensure BRAND ADMIN
    const brandUser = await prisma.user.findFirst({
        where: { email: { equals: BRAND_EMAIL, mode: 'insensitive' } }
    });

    if (brandUser) {
        // If they are strictly a brand admin candidate (not super)
        if (brandUser.role !== 'BRAND_ADMIN' && brandUser.role !== 'SUPER') {
            // Only upgrade if they are STAFF or MANAGER
            await prisma.user.update({
                where: { id: brandUser.id },
                data: { role: 'BRAND_ADMIN' }
            });
            console.log(`✅ Promoted ${BRAND_EMAIL} to BRAND_ADMIN.`);
        } else {
            console.log(`ℹ️ ${BRAND_EMAIL} is already ${brandUser.role}.`);
        }
    } else {
        console.log(`❌ User not found: ${BRAND_EMAIL}`);
    }
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
