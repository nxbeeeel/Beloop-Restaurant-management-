import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";

interface OutletPerformance {
    id: string;
    name: string;
    sales: number;
    profit: number;
    margin: number;
    wastage: number;
}

interface OutletComparisonTableProps {
    data: OutletPerformance[];
}

export function OutletComparisonTable({ data }: OutletComparisonTableProps) {
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    const formatPercent = (val: number) =>
        `${val.toFixed(1)}%`;

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Outlet Name</TableHead>
                        <TableHead className="text-right">Total Sales</TableHead>
                        <TableHead className="text-right">Net Profit</TableHead>
                        <TableHead className="text-right">Margin</TableHead>
                        <TableHead className="text-right">Wastage Cost</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((outlet) => (
                        <TableRow key={outlet.id}>
                            <TableCell className="font-medium">{outlet.name}</TableCell>
                            <TableCell className="text-right">{formatCurrency(outlet.sales)}</TableCell>
                            <TableCell className={`text-right ${outlet.profit < 0 ? 'text-red-600 font-medium' : 'text-green-600'}`}>
                                {formatCurrency(outlet.profit)}
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                    {formatPercent(outlet.margin)}
                                    {outlet.margin > 20 ? (
                                        <ArrowUpIcon className="h-3 w-3 text-green-500" />
                                    ) : outlet.margin < 0 ? (
                                        <ArrowDownIcon className="h-3 w-3 text-red-500" />
                                    ) : null}
                                </div>
                            </TableCell>
                            <TableCell className="text-right text-gray-500">{formatCurrency(outlet.wastage)}</TableCell>
                            <TableCell className="text-center">
                                {outlet.profit < 0 ? (
                                    <Badge variant="destructive">Loss Making</Badge>
                                ) : outlet.margin > 25 ? (
                                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">High Perf</Badge>
                                ) : (
                                    <Badge variant="secondary">Stable</Badge>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
