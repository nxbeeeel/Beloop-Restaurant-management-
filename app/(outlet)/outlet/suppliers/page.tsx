"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Phone, Mail, Edit, Trash2, Truck, Save } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function SupplierManagerPage() {
    const [search, setSearch] = useState("");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [editingSupplier, setEditingSupplier] = useState<any>(null);

    // Form States
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [paymentTerms, setPaymentTerms] = useState("");

    const utils = trpc.useUtils();

    const { data: suppliers, isLoading } = trpc.suppliers.list.useQuery();

    const createMutation = trpc.suppliers.create.useMutation({
        onSuccess: () => {
            toast.success("Supplier created successfully");
            setIsCreateOpen(false);
            resetForm();
            utils.suppliers.list.invalidate();
        },
        onError: (e) => toast.error(e.message)
    });

    const updateMutation = trpc.suppliers.update.useMutation({
        onSuccess: () => {
            toast.success("Supplier updated successfully");
            setEditingSupplier(null);
            resetForm();
            utils.suppliers.list.invalidate();
        },
        onError: (e) => toast.error(e.message)
    });

    const deleteMutation = trpc.suppliers.delete.useMutation({
        onSuccess: () => {
            toast.success("Supplier deleted");
            utils.suppliers.list.invalidate();
        },
        onError: (e) => toast.error(e.message)
    });

    const resetForm = () => {
        setName("");
        setPhone("");
        setEmail("");
        setPaymentTerms("");
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleEdit = (supplier: any) => {
        setEditingSupplier(supplier);
        setName(supplier.name);
        setPhone(supplier.whatsappNumber || "");
        setEmail(supplier.email || "");
        setPaymentTerms(supplier.paymentTerms || "");
        setIsCreateOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingSupplier) {
            updateMutation.mutate({
                id: editingSupplier.id,
                name,
                whatsappNumber: phone,
                email,
                paymentTerms
            });
        } else {
            createMutation.mutate({
                name,
                whatsappNumber: phone,
                email,
                paymentTerms
            });
        }
    };

    const filteredSuppliers = suppliers?.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6 pb-20 md:pb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Supplier Management</h1>
                    <p className="text-gray-500 text-sm md:text-base">Manage your vendors and contact details</p>
                </div>
                <Button
                    onClick={() => {
                        setEditingSupplier(null);
                        resetForm();
                        setIsCreateOpen(true);
                    }}
                    className="w-full md:w-auto bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Supplier
                </Button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                    placeholder="Search suppliers..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 bg-white"
                />
            </div>

            {/* Suppliers Grid */}
            {isLoading ? (
                <div className="text-center py-12 text-gray-500">Loading suppliers...</div>
            ) : filteredSuppliers?.length === 0 ? (
                <Card className="border-dashed bg-gray-50/50">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <Truck className="h-12 w-12 text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No suppliers found</h3>
                        <p className="text-gray-500 mb-4">Add your first supplier to start managing procurement.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSuppliers?.map((supplier) => (
                        <Card key={supplier.id} className="hover:shadow-md transition-shadow group">
                            <CardContent className="p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                                            {supplier.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{supplier.name}</h3>
                                            {supplier.paymentTerms && (
                                                <Badge variant="secondary" className="text-xs mt-1">
                                                    {supplier.paymentTerms}
                                                </Badge>
                                            )}
                                        </div>

                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(supplier)}>
                                            <Edit className="h-4 w-4 text-gray-500" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-red-600" onClick={() => {
                                            if (confirm('Are you sure you want to delete this supplier?')) {
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
                                            <Phone className="h-4 w-4 text-gray-400" />
                                            <span>{supplier.whatsappNumber}</span>
                                        </div>
                                    )}
                                    {supplier.email && (
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-4 w-4 text-gray-400" />
                                            <span>{supplier.email}</span>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Supplier Name</label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Fresh Farms Ltd."
                                required
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">WhatsApp / Phone</label>
                            <Input
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="+91 98765 43210"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Email (Optional)</label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="orders@supplier.com"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Payment Terms</label>
                            <Input
                                value={paymentTerms}
                                onChange={(e) => setPaymentTerms(e.target.value)}
                                placeholder="e.g. Net 30, COD"
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                            <Save className="h-4 w-4 mr-2" />
                            {editingSupplier ? 'Update Supplier' : 'Save Supplier'}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
