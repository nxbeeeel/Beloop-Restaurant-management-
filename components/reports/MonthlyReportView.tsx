// TEMPORARILY DISABLED - Reports router is disabled
// TODO: Re-enable when reports router is fixed

export function MonthlyReportView() {
    return (
        <div className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Monthly Reports Temporarily Unavailable</h2>
            <p className="text-muted-foreground">
                This feature is currently being updated. Please check back later.
            </p>
        </div>
    );
}

/*
// Original code - will be restored after reports router is fixed
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export function MonthlyReportView() {
    const [selectedOutletId, setSelectedOutletId] = useState<string>("ALL");
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);

    // Fetch monthly report
    const { data: monthlyReport, isLoading } = trpc.reports.getMonthlyReport.useQuery({
        outletId: selectedOutletId,
        year: selectedYear,
        month: selectedMonth,
    });

    if (isLoading) {
        return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div>
            <Card>
                <CardHeader>
                    <CardTitle>Monthly Report</CardTitle>
                    <CardDescription>View detailed monthly performance</CardDescription>
                </CardHeader>
                <CardContent>
                    {monthlyReport && (
                        <div>
                            <p>Outlet: {monthlyReport.outlet.name}</p>
                            <p>Total Sales: ${monthlyReport.summary?.totalSales || 0}</p>
                            <p>Total Expenses: ${monthlyReport.summary?.totalExpenses || 0}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
*/
