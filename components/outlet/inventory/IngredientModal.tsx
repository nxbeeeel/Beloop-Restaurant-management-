import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/utils/trpc";
import { useToast } from "@/components/ui/use-toast";

interface IngredientModalProps {
    isOpen: boolean;
    onClose: () => void;
    ingredient?: any; // Type properly if possible
    outletId: string;
}

export function IngredientModal({ isOpen, onClose, ingredient, outletId }: IngredientModalProps) {
    const { toast } = useToast();
    const utils = trpc.useContext();

    const [name, setName] = useState("");
    const [unit, setUnit] = useState("");
    const [cost, setCost] = useState("");
    const [stock, setStock] = useState("");
    const [minStock, setMinStock] = useState("");

    useEffect(() => {
        if (ingredient) {
            setName(ingredient.name);
            setUnit(ingredient.unit);
            setCost(ingredient.cost.toString());
            setStock(ingredient.stock.toString());
            setMinStock(ingredient.minStock.toString());
        } else {
            setName("");
            setUnit("");
            setCost("");
            setStock("0");
            setMinStock("0");
        }
    }, [ingredient, isOpen]);

    const createMutation = trpc.ingredients.create.useMutation({
        onSuccess: () => {
            utils.ingredients.list.invalidate();
            toast({ title: "Success", description: "Ingredient created successfully" });
            onClose();
        },
        onError: (err) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    const updateMutation = trpc.ingredients.update.useMutation({
        onSuccess: () => {
            utils.ingredients.list.invalidate();
            toast({ title: "Success", description: "Ingredient updated successfully" });
            onClose();
        },
        onError: (err) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    const handleSubmit = () => {
        if (!name || !unit) {
            toast({ title: "Error", description: "Name and Unit are required", variant: "destructive" });
            return;
        }

        const data = {
            outletId,
            name,
            unit,
            cost: parseFloat(cost) || 0,
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
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{ingredient ? "Edit Ingredient" : "Add Ingredient"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="unit" className="text-right">Unit</Label>
                        <Input id="unit" value={unit} onChange={(e) => setUnit(e.target.value)} className="col-span-3" placeholder="kg, l, pcs" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="cost" className="text-right">Cost / Unit</Label>
                        <Input id="cost" type="number" value={cost} onChange={(e) => setCost(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="stock" className="text-right">Current Stock</Label>
                        <Input id="stock" type="number" value={stock} onChange={(e) => setStock(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="minStock" className="text-right">Min Stock</Label>
                        <Input id="minStock" type="number" value={minStock} onChange={(e) => setMinStock(e.target.value)} className="col-span-3" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={createMutation.isLoading || updateMutation.isLoading}>
                        {ingredient ? "Update" : "Create"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
