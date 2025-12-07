
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const EMAIL = 'mnabeelca123@gmail.com';

async function main() {
    const user = await prisma.user.findFirst({
        where: { email: { equals: EMAIL, mode: 'insensitive' } }
    });

    if (user) {
        console.log('--- DB USER RECORD ---');
        console.log(`ID: ${user.id}`);
        console.log(`Clerk ID: ${user.clerkId}`);
        console.log(`Tenant ID: ${user.tenantId}`);
        console.log(`Role: ${user.role}`);
    } else {
        console.log('❌ User NOT found in DB.');
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
