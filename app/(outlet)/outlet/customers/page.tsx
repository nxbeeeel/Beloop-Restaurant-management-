"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Search,
    Users,
    TrendingUp,
    Star,
    Download,
    Plus,
    Save,
    Phone,
    Mail
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { exportToCsv, formatCurrency, formatDate } from "@/lib/export";
import { Skeleton, SkeletonTable } from "@/components/ui/skeleton-loaders";
import { Label } from "@/components/ui/label";

export default function CustomersPage() {
    const [search, setSearch] = useState("");
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    // Form state
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");

    const utils = trpc.useUtils();

    // Fetch customers
    const { data: customers, isLoading } = trpc.customers.getAll.useQuery(
        { search: search.length > 2 ? search : undefined },
        { staleTime: 30000 }
    );

    // Fetch stats
    const { data: stats } = trpc.customers.getStats.useQuery(undefined, { staleTime: 60000 });

    // Create mutation
    const createMutation = trpc.customers.create.useMutation({
        onSuccess: () => {
            toast.success("Customer added successfully");
            setIsCreateOpen(false);
            resetForm();
            utils.customers.getAll.invalidate();
            utils.customers.getStats.invalidate();
        },
        onError: (e) => toast.error(e.message)
    });

    const resetForm = () => {
        setName("");
        setPhone("");
        setEmail("");
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !phone.trim()) {
            toast.error("Name and phone are required");
            return;
        }
        createMutation.mutate({
            name: name.trim(),
            phone: phone.trim(),
            email: email.trim() || undefined
        });
    };

    const handleExport = () => {
        if (!customers?.length) {
            toast.error("No customers to export");
            return;
        }
        exportToCsv(customers, [
            { header: "Name", accessor: "name" },
            { header: "Phone", accessor: "phone" },
            { header: "Email", accessor: "email" },
            { header: "Total Orders", accessor: "totalOrders" },
            { header: "Total Spent (₹)", accessor: (r) => r.totalSpent.toFixed(2) },
            { header: "Last Visit", accessor: "lastVisit" },
            { header: "Loyalty Points", accessor: "loyaltyPoints" },
            { header: "Status", accessor: "status" },
            { header: "Tags", accessor: (r) => r.tags.join(", ") },
        ], "customers");
        toast.success("Exported to CSV");
    };

    if (isLoading) {
        return (
            <div className="space-y-6 pb-20">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-10 w-40" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                </div>
                <SkeletonTable rows={8} cols={6} />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20 md:pb-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Customers</h1>
                    <p className="text-gray-500 text-sm">View and manage your customer base from POS</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                    <Button
                        className="bg-primary hover:bg-primary/90"
                        onClick={() => setIsCreateOpen(true)}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Customer
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-none shadow-sm bg-white ring-1 ring-gray-100">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-gray-500">Total Customers</p>
                            <Users className="h-4 w-4 text-blue-500" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{stats?.totalCustomers || 0}</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-white ring-1 ring-gray-100">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-gray-500">Active Customers</p>
                            <TrendingUp className="h-4 w-4 text-green-500" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{stats?.activeCustomers || 0}</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-white ring-1 ring-gray-100">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-gray-500">VIP Customers</p>
                            <Star className="h-4 w-4 text-yellow-500" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{stats?.vipCustomers || 0}</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-white ring-1 ring-gray-100">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-gray-500">Avg. Spend</p>
                            <TrendingUp className="h-4 w-4 text-purple-500" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.avgSpent || 0)}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                    placeholder="Search customers by name, email, or phone..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 bg-white"
                />
            </div>

            {/* Customers Table */}
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead className="text-center">Orders</TableHead>
                            <TableHead className="text-right">Total Spent</TableHead>
                            <TableHead>Last Visit</TableHead>
                            <TableHead>Tags</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {customers?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                    <p>No customers found</p>
                                    <p className="text-sm">Customers will appear here when created from POS</p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            customers?.map((customer) => (
                                <TableRow key={customer.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm">
                                                {customer.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">{customer.name}</p>
                                                <Badge
                                                    variant="secondary"
                                                    className={customer.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}
                                                >
                                                    {customer.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1 text-sm">
                                            <div className="flex items-center gap-1.5 text-gray-600">
                                                <Phone className="h-3 w-3" />
                                                {customer.phone}
                                            </div>
                                            {customer.email && (
                                                <div className="flex items-center gap-1.5 text-gray-500">
                                                    <Mail className="h-3 w-3" />
                                                    {customer.email}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className="font-medium">{customer.totalOrders}</span>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        {formatCurrency(customer.totalSpent)}
                                    </TableCell>
                                    <TableCell className="text-gray-500">
                                        {formatDate(customer.lastVisit)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {customer.tags.map((tag, i) => (
                                                <Badge
                                                    key={i}
                                                    variant="secondary"
                                                    className={
                                                        tag === 'VIP' ? 'bg-yellow-100 text-yellow-700' :
                                                            tag === 'Regular' ? 'bg-blue-100 text-blue-700' :
                                                                'bg-green-100 text-green-700'
                                                    }
                                                >
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Add Customer Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Customer</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Customer Name *</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. John Sharma"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number *</Label>
                            <Input
                                id="phone"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="+91 98765 43210"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email (Optional)</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="john@example.com"
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                            <Save className="h-4 w-4 mr-2" />
                            {createMutation.isPending ? "Saving..." : "Save Customer"}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
