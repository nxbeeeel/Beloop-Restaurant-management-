
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const EMAIL = 'beloopstore@gmail.com';


import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const EMAIL = 'beloopstore@gmail.com';

async function main() {
    const user = await prisma.user.findFirst({
        where: { email: { equals: EMAIL, mode: 'insensitive' } }
    });

    if (user) {
        console.log(`TARGET_USER=${user.email} ROLE=${user.role}`);
    }

    // Check for any BRAND_ADMINs
    const brandAdmins = await prisma.user.findMany({ where: { role: 'BRAND_ADMIN' }, take: 3 });
    brandAdmins.forEach(u => console.log(`EXISTING_BRAND_ADMIN=${u.email}`));
}

main()
    .finally(async () => {
        await prisma.$disconnect();
    });
