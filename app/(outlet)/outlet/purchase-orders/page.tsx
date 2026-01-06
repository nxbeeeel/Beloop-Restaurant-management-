"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Truck, Package, Calendar, Lock } from "lucide-react";
import Link from "next/link";

export default function PurchaseOrdersPage() {
    const { data: user } = trpc.dashboard.getUser.useQuery();
    const outletId = user?.outletId || "";
    const isStaff = user?.role === "STAFF";
    const isManager = user?.role === "OUTLET_MANAGER" || user?.role === "BRAND_ADMIN" || user?.role === "SUPER";

    const { data: orders, isLoading } = trpc.procurement.listOrders.useQuery(
        { outletId },
        { enabled: !!outletId }
    );

    return (
        <div className="space-y-6 pb-24 lg:pb-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">Purchase Orders</h1>
                    <p className="text-gray-500 text-sm lg:text-base">
                        {isStaff ? "Receive supplier orders" : "Manage supplier orders and deliveries"}
                    </p>
                </div>
                {isManager && (
                    <Link href="/outlet/purchase-orders/create">
                        <Button className="bg-primary">
                            <Plus className="w-4 h-4 mr-2" />
                            Create Order
                        </Button>
                    </Link>
                )}
            </div>

            {isLoading ? (
                <div className="text-center py-12">Loading...</div>
            ) : (
                <div className="grid gap-4">
                    {orders?.map((order: any) => (
                        <Link key={order.id} href={`/outlet/purchase-orders/${order.id}/receive`}>
                            <Card className="hover:bg-gray-50 transition-colors cursor-pointer">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Truck className="w-5 h-5 text-gray-500" />
                                            {order.supplier?.name}
                                        </CardTitle>
                                        <Badge variant={
                                            order.status === "RECEIVED" ? "default" :
                                                order.status === "PARTIALLY_RECEIVED" ? "secondary" :
                                                    order.status === "SENT" ? "outline" : "destructive"
                                        }>
                                            {order.status}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex justify-between items-end">
                                        <div className="text-sm text-gray-600 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4" />
                                                {new Date(order.createdAt).toLocaleDateString()}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Package className="w-4 h-4" />
                                                {order.items.length} items
                                            </div>
                                            <div className="font-medium text-gray-900">
                                                Total: ₹{Number(order.totalAmount).toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                    {orders?.length === 0 && (
                        <div className="text-center py-12 text-gray-500 border-2 border-dashed rounded-lg">
                            No purchase orders found
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
