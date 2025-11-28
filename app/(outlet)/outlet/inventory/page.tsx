"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, AlertTriangle, CheckCircle, Package, ClipboardList, Trash2, ArrowRight } from "lucide-react";
import Link from "next/link";

interface Supplier {
    id: string;
    name: string;
    whatsappNumber: string | null;
}

interface Product {
    id: string;
    name: string;
    currentStock: number;
    minStock: number;
    unit: string;
    supplierId: string | null;
    supplier: Supplier | null;
}

interface CartItem {
    product: Product;
    qty: number;
}

export default function InventoryOrderPage() {
    const [cart, setCart] = useState<Map<string, CartItem>>(new Map());
    const [showConfirm, setShowConfirm] = useState(false);

    const { data: user } = trpc.dashboard.getUser.useQuery();
    const outletId = user?.outletId || "";

    const { data: lowStockProducts } = trpc.inventory.getLowStock.useQuery(
        { outletId },
        { enabled: !!outletId }
    );

    const createOrdersMutation = trpc.procurement.createOrders.useMutation({
        onSuccess: (orders) => {
            setShowConfirm(false);
            setCart(new Map());
            // Show success with WhatsApp links
            alert(`${orders.length} order(s) created successfully!`);
        }
    });

    const addToCart = (product: Product, qty: number) => {
        const newCart = new Map(cart);
        if (qty > 0) {
            newCart.set(product.id, { product, qty });
        } else {
            newCart.delete(product.id);
        }
        setCart(newCart);
    };

    const handleCreateOrders = () => {
        const items = Array.from(cart.values()).map(({ product, qty }) => ({
            productId: product.id,
            qty
        }));

        createOrdersMutation.mutate({ outletId, items });
    };

    // Group cart by supplier for preview
    const cartBySupplier = new Map<string, { supplier: Supplier | null; items: CartItem[] }>();
    cart.forEach(({ product, qty }) => {
        const supplierId = product.supplierId || "no-supplier";

        if (!cartBySupplier.has(supplierId)) {
            cartBySupplier.set(supplierId, { supplier: product.supplier, items: [] });
        }
        cartBySupplier.get(supplierId)!.items.push({ product, qty });
    });

    return (
        <div className="space-y-6 pb-24 lg:pb-6">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">Inventory Management</h1>
                    <p className="text-gray-500 text-sm lg:text-base">Create orders, receive deliveries, and manage stock.</p>
                </div>
                <div className="grid grid-cols-3 gap-2 lg:flex">
                    <Link href="/outlet/orders" className="w-full">
                        <Button variant="outline" className="w-full h-auto py-3 flex-col lg:flex-row gap-2 bg-white hover:bg-gray-50 border-gray-200">
                            <Package className="h-5 w-5 text-blue-600" />
                            <span className="text-xs lg:text-sm">Receive</span>
                        </Button>
                    </Link>
                    <Link href="/outlet/inventory/count" className="w-full">
                        <Button variant="outline" className="w-full h-auto py-3 flex-col lg:flex-row gap-2 bg-white hover:bg-gray-50 border-gray-200">
                            <ClipboardList className="h-5 w-5 text-purple-600" />
                            <span className="text-xs lg:text-sm">Count</span>
                        </Button>
                    </Link>
                    <Link href="/outlet/inventory/wastage" className="w-full">
                        <Button variant="outline" className="w-full h-auto py-3 flex-col lg:flex-row gap-2 bg-white hover:bg-red-50 border-red-100 hover:border-red-200">
                            <Trash2 className="h-5 w-5 text-red-600" />
                            <span className="text-xs lg:text-sm text-red-700">Wastage</span>
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Low Stock Items */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        <h2>Low Stock Alerts</h2>
                    </div>

                    {lowStockProducts && lowStockProducts.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {lowStockProducts.map((product) => (
                                <div key={product.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="font-semibold text-gray-900 line-clamp-1">{product.name}</h3>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {product.supplier?.name || "No Supplier"}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-medium text-red-600">
                                                {product.currentStock} <span className="text-gray-400 text-xs">{product.unit}</span>
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                Min: {product.minStock}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1.5">
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="Order Qty"
                                            className="h-9 bg-white border-gray-200 focus:ring-primary/20"
                                            value={cart.get(product.id)?.qty || ""}
                                            onChange={(e) => addToCart(product, parseFloat(e.target.value) || 0)}
                                        />
                                        <span className="text-xs font-medium text-gray-500 px-2 w-12 text-center">
                                            {product.unit}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
                            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500/50" />
                            <p className="text-gray-500 font-medium">All items are well stocked!</p>
                        </div>
                    )}
                </div>

                {/* Desktop Cart Summary */}
                <div className="hidden lg:block">
                    <Card className="sticky top-6 border-0 shadow-lg ring-1 ring-gray-100">
                        <CardHeader className="pb-3 border-b border-gray-50">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <ShoppingCart className="w-5 h-5 text-primary" />
                                Order Cart ({cart.size})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            {cart.size > 0 ? (
                                <div className="space-y-4">
                                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                                        {Array.from(cart.values()).map(({ product, qty }) => (
                                            <div key={product.id} className="flex justify-between items-center text-sm group">
                                                <div>
                                                    <p className="font-medium text-gray-900">{product.name}</p>
                                                    <p className="text-xs text-gray-500">{product.supplier?.name}</p>
                                                </div>
                                                <div className="font-medium bg-gray-50 px-2 py-1 rounded text-gray-700">
                                                    {qty} {product.unit}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <Button
                                        className="w-full h-11 text-base shadow-lg shadow-primary/20"
                                        onClick={() => setShowConfirm(true)}
                                    >
                                        Review & Create Orders
                                    </Button>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500 text-center py-8">
                                    Add items from the list to create an order
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Mobile Sticky Cart Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-lg border-t border-gray-200 lg:hidden z-20">
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{cart.size} items in cart</p>
                        <p className="text-xs text-gray-500">Ready to order</p>
                    </div>
                    <Button
                        onClick={() => setShowConfirm(true)}
                        disabled={cart.size === 0}
                        className="shadow-lg shadow-primary/20"
                    >
                        Review Order
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-2xl bg-white shadow-2xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        <CardHeader className="border-b border-gray-100 pb-4">
                            <CardTitle className="text-xl">Confirm Purchase Orders</CardTitle>
                            <p className="text-sm text-gray-500">
                                Orders will be grouped by supplier. You&apos;ll receive WhatsApp message templates.
                            </p>
                        </CardHeader>
                        <CardContent className="overflow-y-auto p-4 md:p-6 space-y-6">
                            {Array.from(cartBySupplier.values()).map(({ supplier, items }, idx) => (
                                <div key={idx} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-semibold text-gray-900">
                                            {supplier?.name || "No Supplier Assigned"}
                                        </h3>
                                        {supplier?.whatsappNumber && (
                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
                                                📱 {supplier.whatsappNumber}
                                            </span>
                                        )}
                                    </div>
                                    <ul className="space-y-2">
                                        {items.map(({ product, qty }) => (
                                            <li key={product.id} className="flex justify-between text-sm border-b border-gray-200/50 last:border-0 pb-2 last:pb-0">
                                                <span className="text-gray-700">{product.name}</span>
                                                <span className="font-medium text-gray-900">{qty} {product.unit}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </CardContent>
                        <div className="p-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setShowConfirm(false)} className="bg-white">
                                Cancel
                            </Button>
                            <Button onClick={handleCreateOrders} disabled={createOrdersMutation.isPending} className="shadow-lg shadow-primary/20">
                                {createOrdersMutation.isPending ? "Creating..." : "Confirm & Create"}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
