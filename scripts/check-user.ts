
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PARTIAL_ID = 'user_35vuzcLyGC0xARo'; // From user message

async function main() {
    console.log('Searching for user starting with:', PARTIAL_ID);

    const users = await prisma.user.findMany({
        where: {
            clerkId: {
                contains: PARTIAL_ID
            }
        },
        include: {
            tenant: true,
            outlet: true
        }
    });

    if (users.length === 0) {
        console.log('No user found.');
        return;
    }

    for (const user of users) {
        console.log(`FOUND USER: ${user.name} (${user.email})`);
        console.log(`Role: ${user.role}`);
        console.log(`Tenant: ${user.tenantId}`);
        console.log(`Outlet: ${user.outletId}`);

        if (user.tenantId === 'cm4bk1u8x0001cpeb0008x2pj') {
            console.log('✅ Matches Key Tenant');
        } else {
            console.log('❌ Does NOT match Key Tenant (cm4bk1u8x0001cpeb0008x2pj)');
        }
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
