
const { PrismaClient } = require('@prisma/client');

async function main() {
    console.log('Initializing Prisma...');
    const prisma = new PrismaClient();
    console.log('Prisma initialized');
    await prisma.$disconnect();
}

main().catch(console.error);
