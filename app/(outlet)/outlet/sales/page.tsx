import { prisma } from "@/server/db";
import { auth } from "@clerk/nextjs/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { CalendarDays } from "lucide-react";

export default async function SalesHistoryPage() {
    const { userId } = auth();
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
        include: { staff: { select: { name: true } } }
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
                    <div className="rounded-md border overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground font-medium">
                                <tr>
                                    <th className="p-4">Date</th>
                                    <th className="p-4 text-right">Total Sale</th>
                                    <th className="p-4 text-right">Expenses</th>
                                    <th className="p-4 text-right">Net Profit</th>
                                    <th className="p-4">Submitted By</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {sales.map((sale: any) => (
                                    <tr key={sale.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="p-4 font-medium">
                                            {format(new Date(sale.date), "MMM d, yyyy")}
                                        </td>
                                        <td className="p-4 text-right font-medium">
                                            ₹{Number(sale.totalSale).toFixed(2)}
                                        </td>
                                        <td className="p-4 text-right text-orange-600">
                                            ₹{Number(sale.totalExpense).toFixed(2)}
                                        </td>
                                        <td className="p-4 text-right font-bold text-green-600">
                                            ₹{Number(sale.profit).toFixed(2)}
                                        </td>
                                        <td className="p-4 text-muted-foreground">
                                            {sale.staff.name}
                                        </td>
                                    </tr>
                                ))}
                                {sales.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                            No sales records found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
