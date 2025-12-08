'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface OutletData {
    id: string;
    name: string;
    code: string;
    staffCount: number;
    lastSale: number;
    lastSaleDate: Date | null;
    status: 'active' | 'inactive';
}

interface OutletPerformanceTableProps {
    outlets: OutletData[];
    loading?: boolean;
}

export function OutletPerformanceTable({ outlets, loading = false }: OutletPerformanceTableProps) {
    if (loading) {
        return (
            <Card className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex justify-between">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-4 w-24" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
                <CardTitle>Outlet Performance</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50">
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                    Outlet
                                </th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                    Staff
                                </th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                    Last Sale
                                </th>
                                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                                    Status
                                </th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {outlets.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-4 text-center text-muted-foreground">
                                        No outlets found.
                                    </td>
                                </tr>
                            ) : (
                                outlets.map((outlet) => (
                                    <tr
                                        key={outlet.id}
                                        className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                                    >
                                        <td className="p-4 align-middle font-medium">
                                            <div>
                                                <div className="font-medium">{outlet.name}</div>
                                                <div className="text-xs text-gray-500">{outlet.code}</div>
                                            </div>
                                        </td>
                                        <td className="p-4 align-middle">{outlet.staffCount}</td>
                                        <td className="p-4 align-middle">
                                            {outlet.lastSale > 0 ? (
                                                <div>
                                                    <div className="font-medium">₹{outlet.lastSale.toFixed(2)}</div>
                                                    {outlet.lastSaleDate && (
                                                        <div className="text-xs text-gray-500">
                                                            {new Date(outlet.lastSaleDate).toLocaleDateString()}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">No sales</span>
                                            )}
                                        </td>
                                        <td className="p-4 align-middle text-right">
                                            <Badge
                                                variant={outlet.status === 'active' ? 'default' : 'secondary'}
                                                className={
                                                    outlet.status === 'active'
                                                        ? 'bg-green-500/15 text-green-700 hover:bg-green-500/25'
                                                        : ''
                                                }
                                            >
                                                {outlet.status === 'active' ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}
