
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    const email = 'beloopstore@gmail.com';
    console.log(`Inspecting user: ${email}`);

    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            tenant: true,
            outlet: true,
        },
    });

    if (!user) {
        console.log('User not found in database.');
        fs.writeFileSync('user_inspection.json', JSON.stringify({ error: 'User not found' }, null, 2));
    } else {
        console.log('User found, checking products...');

        let productsCount = 0;
        if (user.outletId) {
            productsCount = await prisma.product.count({
                where: { outletId: user.outletId }
            });
        }

        const output = {
            user,
            productsCount
        };

        fs.writeFileSync('user_inspection.json', JSON.stringify(output, null, 2));
        console.log('Output written to user_inspection.json');
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
