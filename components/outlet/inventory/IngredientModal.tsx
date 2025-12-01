import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { UNIT_CATEGORIES, calculateCostPerUnit, getBaseUnit, getConversionFactor } from "@/lib/units";

interface IngredientModalProps {
    isOpen: boolean;
    onClose: () => void;
    ingredient?: any;
    outletId: string;
}

export function IngredientModal({ isOpen, onClose, ingredient, outletId }: IngredientModalProps) {
    const utils = trpc.useContext();

    const [name, setName] = useState("");
    const [unit, setUnit] = useState("kg");
    const [purchaseQty, setPurchaseQty] = useState("");
    const [totalCost, setTotalCost] = useState("");
    const [stock, setStock] = useState("");
    const [minStock, setMinStock] = useState("");

    // Calculated cost per unit
    const costPerUnit = purchaseQty && totalCost
        ? calculateCostPerUnit(parseFloat(totalCost), parseFloat(purchaseQty))
        : 0;

    useEffect(() => {
        if (ingredient) {
            setName(ingredient.name);
            setUnit(ingredient.unit);
            setPurchaseQty(ingredient.purchaseQty?.toString() || "");
            setTotalCost(ingredient.totalCost?.toString() || "");
            setStock(ingredient.stock.toString());
            setMinStock(ingredient.minStock.toString());
        } else {
            setName("");
            setUnit("kg");
            setPurchaseQty("");
            setTotalCost("");
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
        if (!name || !unit) {
            toast.error("Name and Unit are required");
            return;
        }

        const data = {
            outletId,
            name,
            unit,
            baseUnit: getBaseUnit(unit),
            conversionFactor: getConversionFactor(unit),
            cost: costPerUnit,
            purchaseQty: purchaseQty ? parseFloat(purchaseQty) : undefined,
            totalCost: totalCost ? parseFloat(totalCost) : undefined,
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

                    {/* Unit Selection */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="unit" className="text-right">Unit</Label>
                        <Select value={unit} onValueChange={setUnit}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(UNIT_CATEGORIES).map(([key, category]) => (
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

                    {/* Purchase Details Section */}
                    <div className="col-span-4 border-t pt-4 mt-2">
                        <h4 className="text-sm font-semibold mb-3 text-gray-700">Purchase Details</h4>

                        <div className="grid grid-cols-4 items-center gap-4 mb-3">
                            <Label htmlFor="purchaseQty" className="text-right text-sm">Purchase Qty</Label>
                            <Input
                                id="purchaseQty"
                                type="number"
                                step="0.01"
                                value={purchaseQty}
                                onChange={(e) => setPurchaseQty(e.target.value)}
                                className="col-span-3"
                                placeholder={`e.g., 2.5 (in ${unit})`}
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4 mb-3">
                            <Label htmlFor="totalCost" className="text-right text-sm">Total Cost</Label>
                            <Input
                                id="totalCost"
                                type="number"
                                step="0.01"
                                value={totalCost}
                                onChange={(e) => setTotalCost(e.target.value)}
                                className="col-span-3"
                                placeholder="e.g., 3007.50"
                            />
                        </div>

                        {/* Calculated Cost Per Unit */}
                        {costPerUnit > 0 && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right text-sm font-semibold">Cost per {unit}</Label>
                                <div className="col-span-3 px-3 py-2 bg-green-50 border border-green-200 rounded-md">
                                    <span className="text-green-700 font-bold">₹{costPerUnit.toFixed(2)}/{unit}</span>
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
                            <Input
                                id="stock"
                                type="number"
                                step="0.01"
                                value={stock}
                                onChange={(e) => setStock(e.target.value)}
                                className="col-span-3"
                            />
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
