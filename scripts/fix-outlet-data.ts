
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    const email = 'beloopstore@gmail.com';
    console.log(`Fixing data for user: ${email}`);

    const user = await prisma.user.findUnique({
        where: { email },
        include: { outlet: true }
    });

    if (!user || !user.outletId) {
        console.log('User or outlet not found.');
    } else {
        // 1. Enable POS
        console.log(`Enabling POS for outlet: ${user.outlet?.name} (${user.outletId})`);
        await prisma.outlet.update({
            where: { id: user.outletId },
            data: { isPosEnabled: true }
        });
        console.log('POS Enabled.');
    }

    // 2. Search for ANY products
    const allProductsCount = await prisma.product.count();
    console.log(`Total products in DB: ${allProductsCount}`);

    // 3. List all users
    const users = await prisma.user.findMany({
        select: { email: true, name: true, outlet: { select: { name: true, id: true } } }
    });

    const output = {
        targetUser: user ? { email: user.email, outletId: user.outletId } : null,
        totalProducts: allProductsCount,
        allUsers: users
    };

    fs.writeFileSync('user_list.json', JSON.stringify(output, null, 2));
    console.log('Output written to user_list.json');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
