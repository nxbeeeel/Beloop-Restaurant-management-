
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst({
        where: {
            email: { contains: 'beloppstore', mode: 'insensitive' }
        },
        include: {
            outlet: true
        }
    });

    if (user) {
        console.log('--- USER DEBUG ---');
        console.log(`User: ${user.email}`);
        console.log(`Assigned Outlet: ${user.outlet?.name || 'NONE'}`);
        console.log(`Assigned Outlet ID: ${user.outletId}`);

        const targetId = 'cmii7cpeb0008x2pj3m3zgol3'; // Oberon
        if (user.outletId === targetId) {
            console.log('✅ Matches Smoocho Oberon');
        } else {
            console.log('❌ MISMATCH: User is NOT linked to Smoocho Oberon');
            console.log(`(Should be: ${targetId})`);
        }
        console.log('------------------');
    } else {
        console.log('User not found');
    }
}

main()
    .finally(async () => {
        await prisma.$disconnect();
    });
