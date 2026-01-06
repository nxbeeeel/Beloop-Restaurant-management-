"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Plus, Search, Pencil, Trash2, Phone, Mail, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { PageTransition, FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/animations";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SuppliersPage() {
    const [search, setSearch] = useState("");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<any>(null);

    const utils = trpc.useContext();
    const { data: suppliers, isLoading } = trpc.suppliers.list.useQuery();

    // ⚡ OPTIMISTIC CREATE
    const createMutation = trpc.suppliers.create.useMutation({
        onMutate: async (newSupplier) => {
            await utils.suppliers.list.cancel();
            const previous = utils.suppliers.list.getData();
            utils.suppliers.list.setData(undefined, (old) => {
                if (!old) return old;
                return [{
                    id: `temp-${Date.now()}`,
                    ...newSupplier,
                    balance: 0,
                    lastPayment: null,
                    _count: { products: 0, purchaseOrders: 0, ingredients: 0 },
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    tenantId: '',
                    address: null,
                } as typeof old[0], ...old];
            });
            return { previous };
        },
        onSuccess: () => {
            toast.success("Supplier created successfully");
            setIsCreateOpen(false);
        },
        onError: (err, _, ctx) => {
            if (ctx?.previous) utils.suppliers.list.setData(undefined, ctx.previous);
            toast.error(err.message);
        },
        onSettled: () => utils.suppliers.list.invalidate(),
    });

    // ⚡ OPTIMISTIC UPDATE
    const updateMutation = trpc.suppliers.update.useMutation({
        onMutate: async (updated) => {
            await utils.suppliers.list.cancel();
            const previous = utils.suppliers.list.getData();
            utils.suppliers.list.setData(undefined, (old) => {
                if (!old) return old;
                return old.map(s => s.id === updated.id ? { ...s, ...updated } : s);
            });
            return { previous };
        },
        onSuccess: () => {
            toast.success("Supplier updated successfully");
            setEditingSupplier(null);
        },
        onError: (err, _, ctx) => {
            if (ctx?.previous) utils.suppliers.list.setData(undefined, ctx.previous);
            toast.error(err.message);
        },
        onSettled: () => utils.suppliers.list.invalidate(),
    });

    // ⚡ OPTIMISTIC DELETE
    const deleteMutation = trpc.suppliers.delete.useMutation({
        onMutate: async (id) => {
            await utils.suppliers.list.cancel();
            const previous = utils.suppliers.list.getData();
            utils.suppliers.list.setData(undefined, (old) => old?.filter(s => s.id !== id));
            return { previous };
        },
        onSuccess: () => toast.success("Supplier deleted successfully"),
        onError: (err, _, ctx) => {
            if (ctx?.previous) utils.suppliers.list.setData(undefined, ctx.previous);
            toast.error(err.message);
        },
        onSettled: () => utils.suppliers.list.invalidate(),
    });

    const filteredSuppliers = suppliers?.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase()) ||
        s.whatsappNumber?.includes(search)
    );

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            name: formData.get("name") as string,
            whatsappNumber: formData.get("whatsappNumber") as string,
            email: formData.get("email") as string,
            paymentTerms: formData.get("paymentTerms") as string,
        };

        if (editingSupplier) {
            updateMutation.mutate({ id: editingSupplier.id, ...data });
        } else {
            createMutation.mutate(data);
        }
    };

    return (
        <PageTransition>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Suppliers</h1>
                        <p className="text-muted-foreground">Manage your vendor relationships and procurement sources.</p>
                    </div>
                    <Button onClick={() => setIsCreateOpen(true)} className="bg-gray-900 hover:bg-gray-800 text-white shadow-lg shadow-gray-900/20 transition-all hover:scale-105 active:scale-95">
                        <Plus className="mr-2 h-4 w-4" /> Add Supplier
                    </Button>
                </div>

                {/* Search & Filter Bar */}
                <Card className="border-none shadow-sm bg-white/60 backdrop-blur-xl ring-1 ring-gray-200/50">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search suppliers by name, email, or phone..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 bg-white/50 border-gray-200 focus:bg-white transition-all"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Suppliers Grid */}
                {isLoading ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-40 bg-gray-100 animate-pulse rounded-xl" />
                        ))}
                    </div>
                ) : (
                    <StaggerContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" staggerDelay={0.05}>
                        {filteredSuppliers?.map((supplier) => (
                            <StaggerItem key={supplier.id}>
                                <Card className="group hover:shadow-md transition-all duration-300 border-none shadow-sm bg-white ring-1 ring-gray-200 hover:ring-gray-300">
                                    <CardContent className="p-5 space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-semibold text-lg text-gray-900">{supplier.name}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-200">
                                                        {supplier._count.products} Products
                                                    </Badge>
                                                    {supplier.paymentTerms && (
                                                        <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50">
                                                            {supplier.paymentTerms}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-blue-600" onClick={() => setEditingSupplier(supplier)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-red-600" onClick={() => {
                                                    if (confirm("Are you sure? This will delete the supplier.")) {
                                                        deleteMutation.mutate(supplier.id);
                                                    }
                                                }}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="space-y-2 text-sm text-gray-600">
                                            {supplier.whatsappNumber && (
                                                <div className="flex items-center gap-2">
                                                    <Phone className="h-3.5 w-3.5 text-gray-400" />
                                                    <span>{supplier.whatsappNumber}</span>
                                                </div>
                                            )}
                                            {supplier.email && (
                                                <div className="flex items-center gap-2">
                                                    <Mail className="h-3.5 w-3.5 text-gray-400" />
                                                    <span>{supplier.email}</span>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </StaggerItem>
                        ))}
                        {filteredSuppliers?.length === 0 && (
                            <div className="col-span-full text-center py-12 text-gray-500">
                                No suppliers found. Add one to get started.
                            </div>
                        )}
                    </StaggerContainer>
                )}

                {/* Create/Edit Dialog */}
                <Dialog open={isCreateOpen || !!editingSupplier} onOpenChange={(open) => {
                    if (!open) {
                        setIsCreateOpen(false);
                        setEditingSupplier(null);
                    }
                }}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>{editingSupplier ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
                            <DialogDescription>
                                {editingSupplier ? "Update supplier details." : "Add a new supplier to your list."}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input id="name" name="name" defaultValue={editingSupplier?.name} required placeholder="e.g. Metro Cash & Carry" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="whatsappNumber">Phone / WhatsApp</Label>
                                    <Input id="whatsappNumber" name="whatsappNumber" defaultValue={editingSupplier?.whatsappNumber} placeholder="+91..." />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="paymentTerms">Payment Terms</Label>
                                    <Input id="paymentTerms" name="paymentTerms" defaultValue={editingSupplier?.paymentTerms} placeholder="e.g. Net 30" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" name="email" type="email" defaultValue={editingSupplier?.email} placeholder="supplier@example.com" />
                            </div>
                            <DialogFooter className="pt-4">
                                <Button type="button" variant="outline" onClick={() => { setIsCreateOpen(false); setEditingSupplier(null); }}>Cancel</Button>
                                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Supplier"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </PageTransition>
    );
}
