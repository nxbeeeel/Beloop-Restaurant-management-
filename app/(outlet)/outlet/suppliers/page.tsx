"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus, Search, Phone, Mail, Edit, Trash2, Truck, Save, Download, IndianRupee } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { exportToCsv, formatCurrency, formatDate } from "@/lib/export";
import { SkeletonTable } from "@/components/ui/skeleton";

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

    // ⚡ OPTIMISTIC CREATE: Shows new supplier immediately
    const createMutation = trpc.suppliers.create.useMutation({
        onMutate: async (newSupplier) => {
            // Cancel outgoing queries
            await utils.suppliers.list.cancel();

            // Snapshot current state for rollback
            const previousSuppliers = utils.suppliers.list.getData();

            // Optimistically add the new supplier
            utils.suppliers.list.setData(undefined, (old) => {
                if (!old) return old;
                return [
                    {
                        id: `temp-${Date.now()}`,
                        ...newSupplier,
                        balance: 0,
                        lastPayment: null,
                        _count: { products: 0, ingredients: 0 },
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        tenantId: '',
                        address: null,
                    } as typeof old[0],
                    ...old
                ];
            });

            return { previousSuppliers };
        },
        onSuccess: () => {
            toast.success("Supplier created successfully");
            setIsCreateOpen(false);
            resetForm();
        },
        onError: (e, _newSupplier, context) => {
            // Rollback on error
            if (context?.previousSuppliers) {
                utils.suppliers.list.setData(undefined, context.previousSuppliers);
            }
            toast.error(e.message);
        },
        onSettled: () => {
            // Always refetch to ensure consistency
            utils.suppliers.list.invalidate();
        }
    });

    // ⚡ OPTIMISTIC UPDATE: Shows changes immediately
    const updateMutation = trpc.suppliers.update.useMutation({
        onMutate: async (updatedSupplier) => {
            await utils.suppliers.list.cancel();
            const previousSuppliers = utils.suppliers.list.getData();

            utils.suppliers.list.setData(undefined, (old) => {
                if (!old) return old;
                return old.map(s =>
                    s.id === updatedSupplier.id
                        ? { ...s, ...updatedSupplier, updatedAt: new Date() }
                        : s
                );
            });

            return { previousSuppliers };
        },
        onSuccess: () => {
            toast.success("Supplier updated successfully");
            setEditingSupplier(null);
            resetForm();
        },
        onError: (e, _updatedSupplier, context) => {
            if (context?.previousSuppliers) {
                utils.suppliers.list.setData(undefined, context.previousSuppliers);
            }
            toast.error(e.message);
        },
        onSettled: () => {
            utils.suppliers.list.invalidate();
        }
    });

    // ⚡ OPTIMISTIC DELETE: Removes supplier immediately
    const deleteMutation = trpc.suppliers.delete.useMutation({
        onMutate: async (supplierId) => {
            await utils.suppliers.list.cancel();
            const previousSuppliers = utils.suppliers.list.getData();

            utils.suppliers.list.setData(undefined, (old) => {
                if (!old) return old;
                return old.filter(s => s.id !== supplierId);
            });

            return { previousSuppliers };
        },
        onSuccess: () => {
            toast.success("Supplier deleted");
        },
        onError: (e, _supplierId, context) => {
            if (context?.previousSuppliers) {
                utils.suppliers.list.setData(undefined, context.previousSuppliers);
            }
            toast.error(e.message);
        },
        onSettled: () => {
            utils.suppliers.list.invalidate();
        }
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

    const handleExport = () => {
        if (!suppliers?.length) {
            toast.error("No suppliers to export");
            return;
        }
        exportToCsv(suppliers, [
            { header: "Name", accessor: "name" },
            { header: "Phone", accessor: "whatsappNumber" },
            { header: "Email", accessor: "email" },
            { header: "Payment Terms", accessor: "paymentTerms" },
            { header: "Balance (₹)", accessor: (r) => r.balance.toFixed(2) },
            { header: "Last Payment (₹)", accessor: (r) => r.lastPayment?.amount?.toFixed(2) || "-" },
            { header: "Last Payment Date", accessor: (r) => r.lastPayment ? formatDate(r.lastPayment.date) : "-" },
            { header: "Products", accessor: (r) => r._count.products },
            { header: "Ingredients", accessor: (r) => r._count.ingredients },
        ], "suppliers");
        toast.success("Exported to CSV");
    };

    const filteredSuppliers = suppliers?.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase())
    );

    // Calculate totals
    const totalBalance = suppliers?.reduce((sum, s) => sum + (s.balance || 0), 0) || 0;

    return (
        <div className="space-y-6 pb-20 md:pb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Supplier Management</h1>
                    <p className="text-gray-500 text-sm md:text-base">Manage your vendors and track balances</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                    <Button
                        onClick={() => {
                            setEditingSupplier(null);
                            resetForm();
                            setIsCreateOpen(true);
                        }}
                        className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Supplier
                    </Button>
                </div>
            </div>

            {/* Summary Card */}
            {totalBalance > 0 && (
                <Card className="bg-orange-50 border-orange-200">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                            <IndianRupee className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-sm text-orange-600 font-medium">Total Pending to Suppliers</p>
                            <p className="text-2xl font-bold text-orange-700">{formatCurrency(totalBalance)}</p>
                        </div>
                    </CardContent>
                </Card>
            )}

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

            {/* Suppliers Table */}
            {isLoading ? (
                <SkeletonTable />
            ) : filteredSuppliers?.length === 0 ? (
                <Card className="border-dashed bg-gray-50/50">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <Truck className="h-12 w-12 text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No suppliers found</h3>
                        <p className="text-gray-500 mb-4">Add your first supplier to start managing procurement.</p>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Supplier</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead className="text-right">Balance</TableHead>
                                <TableHead>Last Payment</TableHead>
                                <TableHead className="text-center">Items</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredSuppliers?.map((supplier) => (
                                <TableRow key={supplier.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm">
                                                {supplier.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">{supplier.name}</p>
                                                {supplier.paymentTerms && (
                                                    <Badge variant="secondary" className="text-xs mt-0.5">
                                                        {supplier.paymentTerms}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1 text-sm">
                                            {supplier.whatsappNumber && (
                                                <div className="flex items-center gap-1.5 text-gray-600">
                                                    <Phone className="h-3 w-3" />
                                                    {supplier.whatsappNumber}
                                                </div>
                                            )}
                                            {supplier.email && (
                                                <div className="flex items-center gap-1.5 text-gray-500">
                                                    <Mail className="h-3 w-3" />
                                                    {supplier.email}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {supplier.balance > 0 ? (
                                            <span className="font-semibold text-orange-600">
                                                {formatCurrency(supplier.balance)}
                                            </span>
                                        ) : (
                                            <span className="text-green-600">Paid</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {supplier.lastPayment ? (
                                            <div className="text-sm">
                                                <p className="font-medium text-gray-700">
                                                    {formatCurrency(supplier.lastPayment.amount)}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {formatDate(supplier.lastPayment.date)} • {supplier.lastPayment.method}
                                                </p>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 text-sm">No payments</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="text-sm text-gray-600">
                                            {supplier._count.products + supplier._count.ingredients}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex gap-1 justify-end">
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
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
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
