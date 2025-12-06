
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const admins = await prisma.user.findMany({
        where: {
            role: 'SUPER'
        }
    });

    if (admins.length === 0) {
        console.log('No SUPER admins found.');
    } else {
        console.log('--- SUPER ADMINS ---');
        admins.forEach(admin => {
            console.log(`Name: ${admin.name}`);
            console.log(`Email: ${admin.email}`);
            console.log(`Clerk ID: ${admin.clerkId}`);
            console.log('---');
        });
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
