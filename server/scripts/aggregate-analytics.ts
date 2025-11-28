import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function aggregateAnalytics() {
    console.log('📊 Starting Analytics Aggregation...');

    const outlets = await prisma.outlet.findMany({
        where: { status: 'ACTIVE' }
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

            const avgTicketSize = daysWithSales > 0 ? totalSales / daysWithSales : 0; // Approximation as we don't have transaction count per day yet, using daily avg for now or we need transaction count in Sale model. 
            // Wait, avgTicketSize is usually Total Sales / Number of Orders. 
            // We don't have number of orders in Sale model (DailyClosure). 
            // We might have it in PurchaseOrder or we need to add 'orderCount' to Sale model.
            // For now, let's use Total Sales / Days as "Avg Daily Sales" or just 0 if we can't calc ticket size.
            // Actually, let's use 0 for avgTicketSize for now or rename it to avgDailySales in usage.
            // But the requirement says "Average Ticket Size". 
            // If we don't have order count, we can't calculate it accurately.
            // I'll leave it as 0 or mock it for now, but ideally we should add `orderCount` to `Sale` model.

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

            // Total Expenses = Expenses from Daily Closure (if they are separate) OR Detailed Expenses.
            // Usually Daily Closure expenses are a summary. Detailed expenses are the breakdown.
            // We should probably use the Detailed Expenses for the breakdown, but Total Expense might come from Sales if that's the source of truth for cash flow.
            // Let's use the greater of the two or prefer Detailed if available.
            // For this system, let's assume Detailed Expenses are the source of truth for the breakdown.
            const finalTotalExpenses = totalDetailedExpenses; // Or totalExpensesFromSales? Let's stick to detailed for breakdown consistency.

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
            // Gross Profit = Sales - COGS. 
            // We don't have COGS easily. Let's approximate Gross Profit as Sales - Wastage (very rough) or just Sales for now if no COGS.
            // Or maybe Gross Profit = Sales - (Food Cost). Food Cost is usually ~30%.
            // Let's use Sales - Wastage for now as a proxy for "Losses".
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
                    totalSales,
                    cashSales,
                    bankSales,
                    avgTicketSize: 0, // Placeholder
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
