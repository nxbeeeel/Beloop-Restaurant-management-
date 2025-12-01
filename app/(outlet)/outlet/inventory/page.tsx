"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, AlertTriangle, Search, Plus, Minus, Loader2, DollarSign, Filter, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface Product {
    id: string;
    name: string;
    currentStock: number;
    minStock: number;
    unit: string;
    price: number;
    sku: string;
}

export default function InventoryPage() {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    const { data: user } = trpc.dashboard.getUser.useQuery();
    const outletId = user?.outletId || "";

    const utils = trpc.useUtils();
    const { data: products, isLoading } = trpc.products.list.useQuery(
        { outletId },
        { enabled: !!outletId }
    );

    const adjustMutation = trpc.inventory.adjustStock.useMutation({
        onSuccess: () => {
            utils.products.list.invalidate();
            toast.success("Stock updated");
        },
        onError: (err) => toast.error(err.message)
    });

    const handleAdjust = (product: Product, qty: number) => {
        adjustMutation.mutate({
            productId: product.id,
            outletId,
            qty,
            type: 'ADJUSTMENT',
            notes: 'Quick adjustment from inventory list'
        });
    };

    const filteredProducts = products?.map(p => ({
        ...p,
        price: Number(p.price)
    })).filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.sku.toLowerCase().includes(search.toLowerCase());

        let matchesStatus = true;
        if (statusFilter === "low") matchesStatus = p.currentStock <= p.minStock && p.currentStock > 0;
        if (statusFilter === "out") matchesStatus = p.currentStock === 0;
        if (statusFilter === "in") matchesStatus = p.currentStock > p.minStock;

        return matchesSearch && matchesStatus;
    });

    // Stats Calculation
    const totalItems = products?.length || 0;
    const lowStockItems = products?.filter(p => p.currentStock <= p.minStock && p.currentStock > 0).length || 0;
    const outOfStockItems = products?.filter(p => p.currentStock === 0).length || 0;
    const totalValue = products?.reduce((sum, p) => sum + (p.currentStock * Number(p.price)), 0) || 0;

    return (
        <div className="space-y-6 pb-24 lg:pb-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">Stock Inventory</h1>
                    <p className="text-gray-500 text-sm lg:text-base">Monitor stock levels and value. Manage products in the <Link href="/outlet/menu" className="text-violet-600 hover:underline">Menu page</Link>.</p>
                </div>
                <div className="flex gap-3">
                    {/* Placeholder for future "Stocktake" or "Receive Stock" buttons */}
                    <Button variant="outline" className="text-gray-600">
                        <ArrowDownRight className="w-4 h-4 mr-2" /> Stock In
                    </Button>
                    <Button variant="outline" className="text-gray-600">
                        <ArrowUpRight className="w-4 h-4 mr-2" /> Stock Out
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="border-none shadow-sm bg-white ring-1 ring-gray-100">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Items</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{totalItems}</p>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-xl">
                            <Package className="w-5 h-5 text-blue-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-white ring-1 ring-gray-100">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Low Stock</p>
                            <p className="text-2xl font-bold text-yellow-600 mt-1">{lowStockItems}</p>
                        </div>
                        <div className="p-3 bg-yellow-50 rounded-xl">
                            <AlertTriangle className="w-5 h-5 text-yellow-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-white ring-1 ring-gray-100">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Out of Stock</p>
                            <p className="text-2xl font-bold text-red-600 mt-1">{outOfStockItems}</p>
                        </div>
                        <div className="p-3 bg-red-50 rounded-xl">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-white ring-1 ring-gray-100">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Stock Value</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">₹{totalValue.toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-xl">
                            <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters & Table */}
            <Card className="border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/50">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search by name or SKU..."
                            className="pl-9 bg-white border-gray-200 focus:border-violet-500 focus:ring-violet-500"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px] bg-white">
                                <SelectValue placeholder="Filter by Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="in">In Stock</SelectItem>
                                <SelectItem value="low">Low Stock</SelectItem>
                                <SelectItem value="out">Out of Stock</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100 uppercase tracking-wider text-xs">
                            <tr>
                                <th className="p-4">Product</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Current Stock</th>
                                <th className="p-4">Value</th>
                                <th className="p-4 text-right">Quick Adjust</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-violet-500" />
                                    </td>
                                </tr>
                            ) : filteredProducts?.map(product => (
                                <tr key={product.id} className="hover:bg-gray-50/80 transition-colors">
                                    <td className="p-4">
                                        <div className="font-bold text-gray-900">{product.name}</div>
                                        <div className="text-xs text-gray-500 font-mono mt-0.5">{product.sku}</div>
                                    </td>
                                    <td className="p-4">
                                        {product.currentStock === 0 ? (
                                            <Badge variant="destructive" className="bg-red-50 text-red-700 hover:bg-red-100 border-red-100">Out of Stock</Badge>
                                        ) : product.currentStock <= product.minStock ? (
                                            <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border-yellow-100">Low Stock</Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">In Stock</Badge>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold text-gray-900 text-lg">
                                            {product.currentStock} <span className="text-gray-400 text-xs font-normal">{product.unit}</span>
                                        </div>
                                        <div className="text-xs text-gray-400">Min: {product.minStock}</div>
                                    </td>
                                    <td className="p-4 text-gray-600 font-medium">
                                        ₹{(product.currentStock * product.price).toLocaleString()}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8 text-red-600 border-red-100 hover:bg-red-50 hover:text-red-700"
                                                onClick={() => handleAdjust(product, -1)}
                                                disabled={adjustMutation.isPending}
                                            >
                                                <Minus className="w-3 h-3" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8 text-green-600 border-green-100 hover:bg-green-50 hover:text-green-700"
                                                onClick={() => handleAdjust(product, 1)}
                                                disabled={adjustMutation.isPending}
                                            >
                                                <Plus className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredProducts?.length === 0 && !isLoading && (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-gray-500">
                                        <Package className="w-12 h-12 mx-auto text-gray-200 mb-3" />
                                        <p className="font-medium">No stock items found</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
