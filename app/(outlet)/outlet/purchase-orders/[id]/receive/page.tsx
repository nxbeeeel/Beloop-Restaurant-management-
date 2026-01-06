"use client";

import { useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, CheckCircle, Upload, Camera, FileImage, X } from "lucide-react";

export default function ReceiveOrderPage() {
    const params = useParams();
    const router = useRouter();
    const orderId = params.id as string;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data: order, isLoading } = trpc.procurement.getOrder.useQuery({ orderId });

    const [receivedQtys, setReceivedQtys] = useState<Record<string, number>>({});
    const [billFile, setBillFile] = useState<File | null>(null);
    const [billPreview, setBillPreview] = useState<string | null>(null);

    const receiveMutation = trpc.procurement.receiveOrder.useMutation({
        onSuccess: () => {
            toast.success("Order received successfully");
            router.push("/outlet/purchase-orders");
        },
        onError: (err) => toast.error(err.message)
    });

    const handleQtyChange = (itemId: string, qty: string) => {
        setReceivedQtys(prev => ({
            ...prev,
            [itemId]: parseFloat(qty) || 0
        }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error("File too large. Max 5MB");
                return;
            }
            setBillFile(file);
            // Create preview URL
            const reader = new FileReader();
            reader.onloadend = () => {
                setBillPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveBill = () => {
        setBillFile(null);
        setBillPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleReceive = async () => {
        const itemsToReceive = Object.entries(receivedQtys).map(([itemId, qty]) => ({
            itemId,
            receivedQty: qty
        })).filter(i => i.receivedQty > 0);

        if (itemsToReceive.length === 0) {
            toast.error("Please enter received quantities");
            return;
        }

        // TODO: Upload bill to cloud storage and get URL
        // For now, we'll just log it
        if (billFile) {
            console.log("Bill file to upload:", billFile.name);
            // In production: const billUrl = await uploadToCloudinary(billFile);
            // Then pass billUrl to the mutation
        }

        receiveMutation.mutate({
            orderId,
            receivedItems: itemsToReceive
        });
    };

    const handleReceiveAll = () => {
        if (!order) return;
        const allItems = order.items.map(item => ({
            itemId: item.id,
            receivedQty: item.qty
        }));

        receiveMutation.mutate({
            orderId,
            receivedItems: allItems
        });
    };

    if (isLoading) return <div className="text-center py-12">Loading...</div>;
    if (!order) return <div className="text-center py-12">Order not found</div>;

    return (
        <div className="space-y-6 pb-24 lg:pb-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Receive Order #{order.id.slice(-6)}</h1>
                    <p className="text-gray-500">Supplier: {order.supplier?.name}</p>
                </div>
                <Badge variant={order.status === "RECEIVED" ? "default" : "secondary"}>
                    {order.status}
                </Badge>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                {/* Items Card */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Items</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4">
                            {order.items.map((item: any) => (
                                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                                    <div>
                                        <p className="font-medium">{item.productName}</p>
                                        <p className="text-sm text-gray-500">
                                            Ordered: {item.qty} {item.product?.unit || item.ingredient?.purchaseUnit}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-32">
                                            <Input
                                                type="number"
                                                placeholder="Received Qty"
                                                value={receivedQtys[item.id] || ""}
                                                onChange={(e) => handleQtyChange(item.id, e.target.value)}
                                                disabled={order.status === "RECEIVED"}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Bill Upload Card */}
                {order.status !== "RECEIVED" && (
                    <Card className="lg:col-span-2 bg-blue-50 border-blue-200">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <FileImage className="h-5 w-5 text-blue-600" />
                                Upload Bill / Invoice
                            </CardTitle>
                            <CardDescription>
                                Take a photo or upload the supplier's bill for records
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleFileChange}
                                className="hidden"
                            />

                            {billPreview ? (
                                <div className="relative">
                                    <img
                                        src={billPreview}
                                        alt="Bill preview"
                                        className="max-h-48 rounded-lg border shadow-sm"
                                    />
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-2 right-2 h-8 w-8"
                                        onClick={handleRemoveBill}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                    <p className="text-sm text-gray-600 mt-2">
                                        {billFile?.name} ({(billFile?.size || 0 / 1024).toFixed(1)} KB)
                                    </p>
                                </div>
                            ) : (
                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex-1"
                                    >
                                        <Camera className="h-4 w-4 mr-2" />
                                        Take Photo
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex-1"
                                    >
                                        <Upload className="h-4 w-4 mr-2" />
                                        Upload File
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>

            {order.status !== "RECEIVED" && (
                <div className="flex justify-end gap-4 pt-4 border-t">
                    <Button variant="outline" onClick={handleReceiveAll} disabled={receiveMutation.isPending}>
                        Receive All
                    </Button>
                    <Button onClick={handleReceive} disabled={receiveMutation.isPending}>
                        {receiveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Confirm Receipt
                    </Button>
                </div>
            )}
        </div>
    );
}
