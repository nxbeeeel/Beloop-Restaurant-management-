
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const OBERON_ID = 'cmii7cpeb0008x2pj3m3zgol3';
const EMAIL = 'beloopstore@gmail.com';

async function main() {
    const user = await prisma.user.findFirst({
        where: {
            email: { equals: EMAIL, mode: 'insensitive' }
        },
        include: {
            outlet: true
        }
    });

    if (user) {
        console.log('--- USER FOUND ---');
        console.log(`Email: ${user.email}`);
        console.log(`Outlet: ${user.outlet?.name || 'NONE'}`);
        console.log(`Outlet ID: ${user.outletId}`);

        if (user.outletId === OBERON_ID) {
            console.log('✅ Matches Smoocho Oberon');
        } else {
            console.log('❌ MISMATCH: User is linked to DIFFERENT outlet');
            console.log(`Should be: ${OBERON_ID} (Oberon)`);
        }

        if (user.outletId) {
            const productCount = await prisma.product.count({ where: { outletId: user.outletId } });
            console.log(`User's Outlet Product Count: ${productCount}`);
        }
    } else {
        console.log(`User not found: ${EMAIL}`);
    }
}

main()
    .finally(async () => {
        await prisma.$disconnect();
    });
