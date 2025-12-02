"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, CheckCircle, ArrowLeft, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function StockVerificationDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const { data: user } = trpc.dashboard.getUser.useQuery();
    const outletId = user?.outletId || "";

    const { data: verification, isLoading: isLoadingVerification } = trpc.stockVerification.getById.useQuery(id, {
        enabled: !!id
    });

    const { data: ingredients, isLoading: isLoadingIngredients } = trpc.ingredients.list.useQuery(
        { outletId },
        { enabled: !!outletId }
    );

    // Local state for counts
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Initialize counts from existing verification items or default to 0/system stock?
    // Usually we want to start blank or with system stock? Let's start blank to force counting.
    // But if we have saved items, load them.
    useEffect(() => {
        if (verification?.items) {
            const newCounts: Record<string, number> = {};
            const newNotes: Record<string, string> = {};
            verification.items.forEach(item => {
                if (item.ingredientId) {
                    newCounts[item.ingredientId] = item.actualStock;
                    if (item.notes) newNotes[item.ingredientId] = item.notes;
                }
            });
            setCounts(newCounts);
            setNotes(newNotes);
        }
    }, [verification]);

    const saveMutation = trpc.stockVerification.saveCounts.useMutation({
        onSuccess: () => {
            toast.success("Progress saved");
            setHasUnsavedChanges(false);
            // Refetch to ensure sync
        },
        onError: (err) => toast.error(err.message)
    });

    const completeMutation = trpc.stockVerification.complete.useMutation({
        onSuccess: () => {
            toast.success("Verification completed");
            router.push("/outlet/stock-verification");
        },
        onError: (err) => toast.error(err.message)
    });

    const handleCountChange = (ingredientId: string, value: string) => {
        setCounts(prev => ({
            ...prev,
            [ingredientId]: parseFloat(value) || 0
        }));
        setHasUnsavedChanges(true);
    };

    const handleSave = () => {
        if (!ingredients) return;

        const itemsToSave = Object.entries(counts).map(([ingredientId, actualStock]) => {
            const ingredient = ingredients.find(i => i.id === ingredientId);
            return {
                ingredientId,
                actualStock,
                systemStock: ingredient?.stock || 0,
                notes: notes[ingredientId]
            };
        });

        saveMutation.mutate({
            verificationId: id,
            items: itemsToSave
        });
    };

    const handleComplete = () => {
        // First save, then complete? Or just complete if saved.
        // For simplicity, let's require save first or save-and-complete.
        // Let's do save-and-complete logic manually or just call complete if no changes.

        if (hasUnsavedChanges) {
            toast.error("Please save your changes first");
            return;
        }

        if (confirm("Are you sure you want to complete this verification? This will finalize the stock counts.")) {
            completeMutation.mutate(id);
        }
    };

    if (isLoadingVerification || isLoadingIngredients) {
        return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }

    if (!verification) {
        return <div className="text-center py-12">Verification not found</div>;
    }

    const isCompleted = verification.status === "COMPLETED";

    return (
        <div className="space-y-6 pb-24 lg:pb-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sticky top-0 bg-gray-50/95 backdrop-blur z-10 py-4 border-b border-gray-200 -mx-6 px-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            {verification.type} Verification
                            <Badge variant={isCompleted ? "default" : "secondary"}>
                                {verification.status}
                            </Badge>
                        </h1>
                        <p className="text-xs text-gray-500">
                            {new Date(verification.date).toLocaleDateString()} • {verification.user.name}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {!isCompleted && (
                        <>
                            <Button
                                variant="outline"
                                onClick={handleSave}
                                disabled={saveMutation.isPending || !hasUnsavedChanges}
                            >
                                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                Save Draft
                            </Button>
                            <Button
                                onClick={handleComplete}
                                disabled={completeMutation.isPending || hasUnsavedChanges}
                                className={cn(hasUnsavedChanges ? "opacity-50 cursor-not-allowed" : "")}
                            >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Complete
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Content */}
            <Card>
                <CardHeader>
                    <CardTitle>Ingredient Stock</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100 uppercase tracking-wider text-xs">
                                <tr>
                                    <th className="p-4">Ingredient</th>
                                    <th className="p-4">System Stock</th>
                                    <th className="p-4 w-48">Actual Stock</th>
                                    <th className="p-4">Variance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {ingredients?.map(ingredient => {
                                    const actual = counts[ingredient.id] ?? "";
                                    const system = ingredient.stock;
                                    const variance = (typeof actual === 'number') ? actual - system : 0;
                                    const hasVariance = Math.abs(variance) > 0.001;

                                    return (
                                        <tr key={ingredient.id} className="hover:bg-gray-50/50">
                                            <td className="p-4 font-medium text-gray-900">
                                                {ingredient.name}
                                                <div className="text-xs text-gray-400 font-normal">{ingredient.purchaseUnit}</div>
                                            </td>
                                            <td className="p-4 text-gray-600">
                                                {system.toFixed(2)} {ingredient.purchaseUnit}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        value={actual}
                                                        onChange={(e) => handleCountChange(ingredient.id, e.target.value)}
                                                        disabled={isCompleted}
                                                        className={cn(
                                                            "w-32 text-right font-mono",
                                                            hasVariance && typeof actual === 'number' ? "border-yellow-300 bg-yellow-50" : ""
                                                        )}
                                                        placeholder="0.00"
                                                    />
                                                    <span className="text-xs text-gray-400">{ingredient.purchaseUnit}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                {typeof actual === 'number' && hasVariance && (
                                                    <div className={cn(
                                                        "flex items-center gap-1 text-xs font-bold",
                                                        variance < 0 ? "text-red-600" : "text-green-600"
                                                    )}>
                                                        {variance > 0 ? "+" : ""}{variance.toFixed(2)}
                                                        <AlertTriangle className="w-3 h-3" />
                                                    </div>
                                                )}
                                                {(!hasVariance && typeof actual === 'number') && (
                                                    <span className="text-green-600 text-xs flex items-center gap-1">
                                                        <CheckCircle className="w-3 h-3" /> Match
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
