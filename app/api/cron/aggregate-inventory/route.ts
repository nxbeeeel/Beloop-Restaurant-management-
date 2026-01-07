import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request) {
    try {
        const authHeader = req.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const outlets = await prisma.outlet.findMany({ select: { id: true } });
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        const endOfYesterday = new Date(yesterday);
        endOfYesterday.setHours(23, 59, 59, 999);

        const results = [];

        for (const outlet of outlets) {
            // Aggregate StockMoves for the day
            const moves = await prisma.stockMove.groupBy({
                by: ['type'],
                where: {
                    outletId: outlet.id,
                    date: {
                        gte: yesterday,
                        lte: endOfYesterday
                    }
                },
                _sum: {
                    qty: true
                }
            });

            // Calculate values
            // Note: This is an approximation if we don't have historical cost. 
            // Ideally we'd join with Product/Ingredient cost at that time.
            // For now, valid for magnitude tracking.

            // We need row-level access for value calculation if strictly required, 
            // but for speed we might accept counts or doing a heavier join once a night is fine.

            // Let's do a more detailed aggregation for values:
            const detailedMoves = await prisma.stockMove.findMany({
                where: {
                    outletId: outlet.id,
                    date: { gte: yesterday, lte: endOfYesterday }
                },
                include: {
                    product: {
                        select: { price: true } // Using selling price as proxy for value if cost missing
                    }
                }
            });

            let totalPurchase = 0;
            let totalWaste = 0;
            let totalUsage = 0; // Sales
            let totalAdjustment = 0;

            for (const move of detailedMoves) {
                const value = Math.abs(move.qty * Number(move.product?.price || 0));

                switch (move.type) {
                    case 'PURCHASE':
                        totalPurchase += value;
                        break;
                    case 'WASTE':
                        totalWaste += value;
                        break;
                    case 'SALE':
                        totalUsage += value;
                        break;
                    case 'ADJUSTMENT':
                        totalAdjustment += value;
                        break;
                }
            }

            // Calculate Closing Stock Value (Snapshot)
            // This is expensive (sum of all current stock * price). 
            // Might be better to just take current snapshot since it runs nightly.
            const products = await prisma.product.findMany({
                where: { outletId: outlet.id },
                select: { currentStock: true, price: true }
            });

            const closingValue = products.reduce((acc, p) => acc + (p.currentStock * Number(p.price)), 0);

            await prisma.historicalInventorySummary.upsert({
                where: {
                    outletId_date: {
                        outletId: outlet.id,
                        date: yesterday
                    }
                },
                update: {
                    totalPurchase,
                    totalWaste,
                    totalUsage,
                    closingValue
                },
                create: {
                    outletId: outlet.id,
                    date: yesterday,
                    totalPurchase,
                    totalWaste,
                    totalUsage,
                    closingValue
                }
            });

            results.push({ outletId: outlet.id, status: 'synced' });
        }

        return NextResponse.json({ success: true, results });
    } catch (error) {
        console.error('Aggregation Error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
