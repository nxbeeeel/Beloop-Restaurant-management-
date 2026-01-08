"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Receipt, AlertTriangle, History } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useOutlet } from "@/hooks/use-outlet";
import { format } from "date-fns";

export default function OrderHistoryPage() {
    const { outletId, isLoading: outletLoading } = useOutlet();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"ALL" | "COMPLETED" | "VOIDED" | "PENDING">("ALL");

    const { data, isLoading: dataLoading } = trpc.dailyRegister.getOrderHistory.useQuery(
        {
            outletId: outletId || "",
            status: statusFilter,
            limit: 100,
        },
        { enabled: !!outletId }
    );

    const isLoading = outletLoading || dataLoading;

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-10 w-64" />
                </div>
                <div className="flex gap-2">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-9 w-24" />
                    ))}
                </div>
                <Card>
                    <CardContent className="p-0">
                        <div className="divide-y">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                <div key={i} className="p-4 flex justify-between items-center">
                                    <div className="space-y-2">
                                        <Skeleton className="h-5 w-32" />
                                        <Skeleton className="h-4 w-48" />
                                    </div>
                                    <Skeleton className="h-8 w-24" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const filteredOrders = data?.orders?.filter((order) =>
        order.id.toLowerCase().includes(search.toLowerCase()) ||
        order.orderNumber?.toLowerCase().includes(search.toLowerCase())
    ) || [];

    const getStatusColor = (status: string) => {
        switch (status) {
            case "COMPLETED": return "bg-green-100 text-green-800";
            case "VOIDED": return "bg-red-100 text-red-800";
            case "PENDING": return "bg-yellow-100 text-yellow-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <History className="h-8 w-8 text-primary" />
                    <h1 className="text-2xl font-bold">Order History</h1>
                </div>
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search orders..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            <div className="flex gap-2">
                {(["ALL", "COMPLETED", "VOIDED", "PENDING"] as const).map((status) => (
                    <Button
                        key={status}
                        variant={statusFilter === status ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter(status)}
                    >
                        {status}
                    </Button>
                ))}
            </div>

            <Card>
                <CardContent className="p-0">
                    {filteredOrders.length > 0 ? (
                        <div className="divide-y">
                            {filteredOrders.map((order) => (
                                <div key={order.id} className="p-4 flex justify-between items-center hover:bg-muted/50 transition-colors">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Receipt className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-mono font-medium">#{order.orderNumber}</span>
                                            <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                                            {order.isVoided && order.voidReason && (
                                                <span className="text-xs text-red-600 flex items-center gap-1">
                                                    <AlertTriangle className="h-3 w-3" />
                                                    {order.voidReason}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {format(new Date(order.createdAt), "MMM d, yyyy h:mm a")} &bull; {order.paymentMethod || "N/A"}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-lg">₹{Number(order.totalAmount).toLocaleString()}</p>
                                        <p className="text-sm text-muted-foreground">{order.itemCount || 0} items</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-muted-foreground">
                            <Receipt className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>No orders found</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {data?.total && data.total > 0 && (
                <p className="text-sm text-muted-foreground text-center">
                    Showing {filteredOrders.length} of {data.total} orders
                </p>
            )}
        </div>
    );
}
