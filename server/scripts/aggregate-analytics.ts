import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function aggregateAnalytics() {
    console.log('📊 Starting Analytics Aggregation...');

    const outlets = await prisma.outlet.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, tenantId: true, name: true }
    });

    console.log(`Found ${outlets.length} active outlets.`);

    const now = new Date();
    // Calculate for current month and previous month to ensure data consistency
    const monthsToProcess = [
        new Date(now.getFullYear(), now.getMonth(), 1), // Current Month
        new Date(now.getFullYear(), now.getMonth() - 1, 1) // Previous Month
    ];

    for (const monthDate of monthsToProcess) {
        const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
        console.log(`\nProcessing Month: ${monthKey}`);

        const startOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const endOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);

        for (const outlet of outlets) {
            // 1. Sales Aggregation
            const sales = await prisma.sale.findMany({
                where: {
                    outletId: outlet.id,
                    date: {
                        gte: startOfMonth,
                        lte: endOfMonth
                    }
                }
            });

            let totalSales = 0;
            let cashSales = 0;
            let bankSales = 0;
            let totalExpensesFromSales = 0; // Expenses recorded in daily closure
            let daysWithSales = sales.length;

            sales.forEach(sale => {
                totalSales += Number(sale.totalSale);
                cashSales += Number(sale.cashSale);
                bankSales += Number(sale.bankSale);
                totalExpensesFromSales += Number(sale.totalExpense);
            });

            // 2. Expenses Aggregation (Detailed Expenses)
            const expenses = await prisma.expense.findMany({
                where: {
                    outletId: outlet.id,
                    date: {
                        gte: startOfMonth,
                        lte: endOfMonth
                    }
                }
            });

            let totalDetailedExpenses = 0;
            const expenseBreakdown: Record<string, number> = {};

            expenses.forEach(exp => {
                const amount = Number(exp.amount);
                totalDetailedExpenses += amount;
                const category = exp.category;
                expenseBreakdown[category] = (expenseBreakdown[category] || 0) + amount;
            });

            const finalTotalExpenses = totalDetailedExpenses;

            // 3. Wastage Aggregation
            const wastages = await prisma.wastage.findMany({
                where: {
                    outletId: outlet.id,
                    date: {
                        gte: startOfMonth,
                        lte: endOfMonth
                    }
                }
            });

            let totalWastage = 0;
            wastages.forEach(w => {
                totalWastage += Number(w.cost);
            });

            const wastageRatio = totalSales > 0 ? (totalWastage / totalSales) * 100 : 0;

            // 4. Profitability
            const grossProfit = totalSales - totalWastage;
            const netProfit = totalSales - finalTotalExpenses;
            const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;
            const expenseRatio = totalSales > 0 ? (finalTotalExpenses / totalSales) * 100 : 0;

            // 5. Upsert MonthlySummary
            await prisma.monthlySummary.upsert({
                where: {
                    outletId_month: {
                        outletId: outlet.id,
                        month: monthKey
                    }
                },
                update: {
                    tenantId: outlet.tenantId, // Ensure tenantId is set
                    totalSales,
                    cashSales,
                    bankSales,
                    avgTicketSize: 0,
                    daysWithSales,
                    totalExpenses: finalTotalExpenses,
                    expenseBreakdown,
                    totalWastage,
                    wastageRatio,
                    grossProfit,
                    netProfit,
                    profitMargin,
                    expenseRatio,
                    lastRefreshed: new Date()
                },
                create: {
                    tenantId: outlet.tenantId || "UNKNOWN",
                    outletId: outlet.id,
                    month: monthKey,
                    totalSales,
                    cashSales,
                    bankSales,
                    avgTicketSize: 0,
                    daysWithSales,
                    totalExpenses: finalTotalExpenses,
                    expenseBreakdown,
                    totalWastage,
                    wastageRatio,
                    grossProfit,
                    netProfit,
                    profitMargin,
                    expenseRatio,
                    lastRefreshed: new Date()
                }
            });

            process.stdout.write(`.`);
        }
    }

    console.log('\n✅ Analytics Aggregation Complete!');
}

aggregateAnalytics()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
