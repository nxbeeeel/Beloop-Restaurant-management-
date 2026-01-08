"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Download, Calendar, TrendingUp, DollarSign, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useOutlet } from "@/hooks/use-outlet";

export default function ReportsPage() {
    const { outletId, isLoading: outletLoading } = useOutlet();

    const { data: closures, isLoading: closuresLoading } = trpc.dailyClosure.list.useQuery(
        { outletId: outletId || "" },
        { enabled: !!outletId }
    );

    const isLoading = outletLoading || closuresLoading;

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Card key={i}>
                            <CardHeader>
                                <Skeleton className="h-6 w-32" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-24 w-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    const reportTypes = [
        {
            title: "Daily Sales Report",
            description: "View day-by-day sales breakdown with payment methods",
            icon: Calendar,
            href: "/outlet/accounts/sales-register",
        },
        {
            title: "Cash Flow Statement",
            description: "Track cash inflows and outflows over time",
            icon: DollarSign,
            href: "/outlet/accounts/cash-flow",
        },
        {
            title: "Profit & Loss",
            description: "Revenue vs expenses with net profit analysis",
            icon: TrendingUp,
            href: "/outlet/accounts/profit-loss",
        },
        {
            title: "Order History",
            description: "Complete order history with status tracking",
            icon: FileText,
            href: "/outlet/orders/history",
        },
        {
            title: "Expense Report",
            description: "Detailed breakdown of expenses by category",
            icon: Package,
            href: "/outlet/accounts/expenses",
        },
        {
            title: "Analytics Dashboard",
            description: "Key performance metrics and insights",
            icon: TrendingUp,
            href: "/outlet/analytics",
        },
    ];

    const recentClosures = closures?.slice(0, 5) || [];

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold">Reports</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reportTypes.map((report) => (
                    <Card key={report.title} className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <report.icon className="h-5 w-5 text-primary" />
                                {report.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">{report.description}</p>
                            <Button variant="outline" size="sm" className="w-full" asChild>
                                <a href={report.href}>View Report</a>
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {recentClosures.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Daily Closures</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {recentClosures.map((closure) => (
                                <div key={closure.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                    <div>
                                        <p className="font-medium">{new Date(closure.date).toLocaleDateString()}</p>
                                        <p className="text-sm text-muted-foreground">
                                            Sales: ₹{Number(closure.totalSale || 0).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className={`font-bold ${Number(closure.profit || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                                        ₹{Number(closure.profit || 0).toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
