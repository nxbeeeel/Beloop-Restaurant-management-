"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Plus } from "lucide-react";
import { toast } from "sonner";

export default function StockVerificationPage() {
    const [type, setType] = useState<"OPENING" | "CLOSING">("OPENING");

    const { data: user } = trpc.dashboard.getUser.useQuery();
    const outletId = user?.outletId || "";

    const { data: verifications, isLoading } = trpc.stockVerification.list.useQuery(
        { outletId, limit: 20 },
        { enabled: !!outletId }
    );

    const router = useRouter();

    const createMutation = trpc.stockVerification.create.useMutation({
        onSuccess: (data) => {
            toast.success("Stock verification started");
            router.push(`/outlet/stock-verification/${data.id}`);
        },
        onError: (err) => toast.error(err.message)
    });

    const handleCreate = () => {
        if (!outletId) return;
        createMutation.mutate({ outletId, type });
    };

    return (
        <div className="space-y-6 pb-24 lg:pb-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">Stock Verification</h1>
                    <p className="text-gray-500 text-sm lg:text-base">Track opening and closing stock counts</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={type === "OPENING" ? "default" : "outline"}
                        onClick={() => setType("OPENING")}
                    >
                        Opening
                    </Button>
                    <Button
                        variant={type === "CLOSING" ? "default" : "outline"}
                        onClick={() => setType("CLOSING")}
                    >
                        Closing
                    </Button>
                    <Button onClick={handleCreate} className="bg-primary">
                        <Plus className="w-4 h-4 mr-2" />
                        Start {type}
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-12">Loading...</div>
            ) : (
                <div className="grid gap-4">
                    {verifications?.map((v) => (
                        <Card key={v.id}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <ClipboardCheck className="w-5 h-5" />
                                        {v.type} - {new Date(v.date).toLocaleDateString()}
                                    </CardTitle>
                                    <Badge variant={v.status === "COMPLETED" ? "default" : "secondary"}>
                                        {v.status}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm text-gray-600">
                                    <p>Verified by: {v.user.name}</p>
                                    <p>Items: {v.items.length}</p>
                                    {v.notes && <p>Notes: {v.notes}</p>}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
