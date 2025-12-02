import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
    PURCHASE_UNITS,
    USAGE_UNITS,
    calculateCostPerUsageUnit,
    convertStockToUsageUnits,
    getBaseUnit,
    getConversionFactor
} from "@/lib/units";

import { cn } from "@/lib/utils";

interface IngredientModalProps {
    isOpen: boolean;
    onClose: () => void;
    ingredient?: any;
    outletId: string;
}

export function IngredientModal({ isOpen, onClose, ingredient, outletId }: IngredientModalProps) {
    const utils = trpc.useContext();

    const [name, setName] = useState("");
    const [purchaseUnit, setPurchaseUnit] = useState("tub");
    const [qtyPerUnit, setQtyPerUnit] = useState("");
    const [usageUnit, setUsageUnit] = useState("kg");
    const [costPerPurchaseUnit, setCostPerPurchaseUnit] = useState("");
    const [stock, setStock] = useState("");
    const [minStock, setMinStock] = useState("");
    const [conversionMode, setConversionMode] = useState<'standard' | 'inverse'>('standard');

    // Calculated values
    const costPerUsage = qtyPerUnit && costPerPurchaseUnit
        ? calculateCostPerUsageUnit(parseFloat(costPerPurchaseUnit), parseFloat(qtyPerUnit))
        : 0;

    const stockInUsageUnits = stock && qtyPerUnit
        ? convertStockToUsageUnits(parseFloat(stock), parseFloat(qtyPerUnit))
        : 0;

    useEffect(() => {
        if (ingredient) {
            setName(ingredient.name);
            setPurchaseUnit(ingredient.purchaseUnit);
            setQtyPerUnit(ingredient.qtyPerUnit?.toString() || "");
            setUsageUnit(ingredient.usageUnit);
            setCostPerPurchaseUnit(ingredient.costPerPurchaseUnit?.toString() || "");
            setStock(ingredient.stock.toString());
            setMinStock(ingredient.minStock.toString());
        } else {
            setName("");
            setPurchaseUnit("tub");
            setQtyPerUnit("");
            setUsageUnit("kg");
            setCostPerPurchaseUnit("");
            setStock("0");
            setMinStock("0");
        }
    }, [ingredient, isOpen]);

    const createMutation = trpc.ingredients.create.useMutation({
        onSuccess: () => {
            utils.ingredients.list.invalidate();
            toast.success("Ingredient created successfully");
            onClose();
        },
        onError: (err) => {
            toast.error(err.message);
        }
    });

    const updateMutation = trpc.ingredients.update.useMutation({
        onSuccess: () => {
            utils.ingredients.list.invalidate();
            toast.success("Ingredient updated successfully");
            onClose();
        },
        onError: (err) => {
            toast.error(err.message);
        }
    });

    const handleSubmit = () => {
        if (!name || !purchaseUnit || !usageUnit || !qtyPerUnit) {
            toast.error("Name, Purchase Unit, Usage Unit, and Qty per Unit are required");
            return;
        }

        const data = {
            outletId,
            name,
            purchaseUnit,
            qtyPerUnit: parseFloat(qtyPerUnit),
            usageUnit,
            baseUnit: getBaseUnit(usageUnit),
            conversionFactor: getConversionFactor(usageUnit),
            costPerPurchaseUnit: parseFloat(costPerPurchaseUnit) || 0,
            costPerUsageUnit: costPerUsage,
            stock: parseFloat(stock) || 0,
            minStock: parseFloat(minStock) || 0,
        };

        if (ingredient) {
            updateMutation.mutate({ id: ingredient.id, ...data });
        } else {
            createMutation.mutate(data);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{ingredient ? "Edit Ingredient" : "Add Ingredient"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {/* Name */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="col-span-3"
                            placeholder="e.g., Hazelnut Chocolate"
                        />
                    </div>

                    {/* Purchase/Stock Unit Section */}
                    <div className="col-span-4 border-t pt-4 mt-2">
                        <h4 className="text-sm font-semibold mb-3 text-gray-700">Purchase/Stock Unit (Physical Counting)</h4>
                        <p className="text-xs text-gray-500 mb-3">How staff counts this item in inventory</p>

                        <div className="grid grid-cols-4 items-center gap-4 mb-3">
                            <Label htmlFor="purchaseUnit" className="text-right">Unit</Label>
                            <Select value={purchaseUnit} onValueChange={setPurchaseUnit}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select purchase unit" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(PURCHASE_UNITS).map(([key, category]) => (
                                        <SelectGroup key={key}>
                                            <SelectLabel>{category.label}</SelectLabel>
                                            {category.units.map((u) => (
                                                <SelectItem key={u.value} value={u.value}>
                                                    {u.label}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="qtyPerUnit" className="text-right">Content per {purchaseUnit}</Label>
                            <div className="col-span-3 space-y-3">
                                {/* Conversion Mode Toggle */}
                                <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg w-fit">
                                    <button
                                        type="button"
                                        onClick={() => setConversionMode('standard')}
                                        className={cn(
                                            "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                            conversionMode === 'standard'
                                                ? "bg-white text-primary shadow-sm"
                                                : "text-gray-500 hover:text-gray-900"
                                        )}
                                    >
                                        Standard (1 {purchaseUnit} = X {usageUnit})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setConversionMode('inverse')}
                                        className={cn(
                                            "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                            conversionMode === 'inverse'
                                                ? "bg-white text-primary shadow-sm"
                                                : "text-gray-500 hover:text-gray-900"
                                        )}
                                    >
                                        Inverse (1 {usageUnit} = Y {purchaseUnit})
                                    </button>
                                </div>

                                <div className="flex gap-2">
                                    <Input
                                        id="qtyPerUnit"
                                        type="number"
                                        step="0.01"
                                        value={conversionMode === 'standard' ? qtyPerUnit : (qtyPerUnit ? (1 / parseFloat(qtyPerUnit)).toString() : "")}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            if (!val) {
                                                setQtyPerUnit("");
                                                return;
                                            }
                                            if (conversionMode === 'standard') {
                                                setQtyPerUnit(val.toString());
                                            } else {
                                                setQtyPerUnit((1 / val).toString());
                                            }
                                        }}
                                        className="flex-1"
                                        placeholder={conversionMode === 'standard' ? "e.g., 50 (scoops)" : "e.g., 2 (kg)"}
                                    />
                                    <span className="flex items-center text-sm text-gray-500">
                                        {conversionMode === 'standard' ? usageUnit : purchaseUnit}
                                    </span>
                                </div>

                                {qtyPerUnit && (
                                    <div className="p-2 bg-blue-50 text-blue-700 rounded text-xs border border-blue-100">
                                        <span className="font-semibold">Logic:</span>
                                        {conversionMode === 'standard'
                                            ? ` 1 ${purchaseUnit} contains ${qtyPerUnit} ${usageUnit}`
                                            : ` 1 ${usageUnit} is equal to ${(1 / parseFloat(qtyPerUnit)).toFixed(2)} ${purchaseUnit}`
                                        }
                                        <br />
                                        <span className="opacity-75">
                                            (System stores: 1 {purchaseUnit} = {parseFloat(qtyPerUnit).toFixed(4)} {usageUnit})
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Usage Unit Section */}
                    <div className="col-span-4 border-t pt-4 mt-2">
                        <h4 className="text-sm font-semibold mb-3 text-gray-700">Usage Unit (Recipes)</h4>
                        <p className="text-xs text-gray-500 mb-3">How this item is used in recipes</p>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="usageUnit" className="text-right">Unit</Label>
                            <Select value={usageUnit} onValueChange={setUsageUnit}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select usage unit" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(USAGE_UNITS).map(([key, category]) => (
                                        <SelectGroup key={key}>
                                            <SelectLabel>{category.label}</SelectLabel>
                                            {category.units.map((u) => (
                                                <SelectItem key={u.value} value={u.value}>
                                                    {u.label}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Cost Section */}
                    <div className="col-span-4 border-t pt-4 mt-2">
                        <h4 className="text-sm font-semibold mb-3 text-gray-700">Cost Details</h4>

                        <div className="grid grid-cols-4 items-center gap-4 mb-3">
                            <Label htmlFor="costPerPurchaseUnit" className="text-right">Cost per {purchaseUnit}</Label>
                            <Input
                                id="costPerPurchaseUnit"
                                type="number"
                                step="0.01"
                                value={costPerPurchaseUnit}
                                onChange={(e) => setCostPerPurchaseUnit(e.target.value)}
                                className="col-span-3"
                                placeholder="e.g., 3007.50"
                            />
                        </div>

                        {/* Calculated Cost Per Usage Unit */}
                        {costPerUsage > 0 && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right text-sm font-semibold">Cost per {usageUnit}</Label>
                                <div className="col-span-3 px-3 py-2 bg-green-50 border border-green-200 rounded-md">
                                    <span className="text-green-700 font-bold">₹{costPerUsage.toFixed(2)}/{usageUnit}</span>
                                    <span className="text-xs text-green-600 ml-2">(auto-calculated)</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Stock Section */}
                    <div className="col-span-4 border-t pt-4 mt-2">
                        <h4 className="text-sm font-semibold mb-3 text-gray-700">Stock Management</h4>

                        <div className="grid grid-cols-4 items-center gap-4 mb-3">
                            <Label htmlFor="stock" className="text-right">Current Stock</Label>
                            <div className="col-span-3">
                                <Input
                                    id="stock"
                                    type="number"
                                    step="0.01"
                                    value={stock}
                                    onChange={(e) => setStock(e.target.value)}
                                    placeholder={`in ${purchaseUnit}`}
                                />
                                {stockInUsageUnits > 0 && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        {stock} {purchaseUnit} = {stockInUsageUnits.toFixed(2)} {usageUnit}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="minStock" className="text-right">Min Stock</Label>
                            <Input
                                id="minStock"
                                type="number"
                                step="0.01"
                                value={minStock}
                                onChange={(e) => setMinStock(e.target.value)}
                                className="col-span-3"
                                placeholder={`in ${purchaseUnit}`}
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                        {ingredient ? "Update" : "Create"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
