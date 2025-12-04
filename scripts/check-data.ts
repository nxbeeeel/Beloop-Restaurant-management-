import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Database Inspection ---');

    // 1. Check Orders
    const orders = await prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { items: true }
    });
    console.log('\nRecent Orders:', JSON.stringify(orders, null, 2));

    // 2. Check Sales
    const sales = await prisma.sale.findMany({
        take: 5,
        orderBy: { date: 'desc' }
    });
    console.log('\nRecent Sales:', JSON.stringify(sales, null, 2));

    // 3. Check Monthly Summary
    const summaries = await prisma.monthlySummary.findMany({
        take: 5,
        orderBy: { month: 'desc' }
    });
    console.log('\nMonthly Summaries:', JSON.stringify(summaries, null, 2));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
