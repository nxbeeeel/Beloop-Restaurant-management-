import { prisma } from "@/server/db";
import { auth } from "@clerk/nextjs/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";
import { SaleDataTable } from "@/components/outlet/sales/SaleDataTable";

export default async function SalesHistoryPage() {
    const { userId } = await auth();
    if (!userId) return null;

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { outletId: true }
    });

    if (!user?.outletId) return <div>No outlet assigned</div>;

    const sales = await prisma.sale.findMany({
        where: { outletId: user.outletId, deletedAt: null },
        orderBy: { date: 'desc' },
        take: 30, // Last 30 entries
        select: {
            id: true,
            date: true,
            totalSale: true,
            profit: true,
            staff: {
                select: { name: true }
            }
        }
    });

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        Sales History
                    </h2>
                    <p className="text-muted-foreground">
                        Daily sales records for the last 30 days.
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CalendarDays className="w-5 h-5" /> Recent Entries
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <SaleDataTable data={sales} />
                </CardContent>
            </Card>
        </div>
    );
}
