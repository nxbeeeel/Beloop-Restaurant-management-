"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, Star, Wallet, Search, Plus, Loader2, Calendar, ShoppingBag } from "lucide-react";
import { format } from "date-fns";

export default function CustomersPage() {
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", email: "" });
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

    const utils = trpc.useUtils();
    const { data: customers, isLoading } = trpc.customers.getAll.useQuery({
        search,
        status: status === "all" ? undefined : status
    });
    const { data: stats } = trpc.customers.getStats.useQuery();

    // Fetch history only when a customer is selected
    const { data: history, isLoading: historyLoading } = trpc.customers.getHistory.useQuery(
        { customerId: selectedCustomerId! },
        { enabled: !!selectedCustomerId }
    );

    const createMutation = trpc.customers.create.useMutation({
        onSuccess: () => {
            utils.customers.getAll.invalidate();
            utils.customers.getStats.invalidate();
            setIsAddOpen(false);
            setNewCustomer({ name: "", phone: "", email: "" });
        }
    });

    const handleCreate = () => {
        if (!newCustomer.name || !newCustomer.phone) return;
        createMutation.mutate(newCustomer);
    };

    const getTierColor = (spent: number) => {
        if (spent >= 15000) return "text-purple-600 bg-purple-100";
        if (spent >= 10000) return "text-yellow-600 bg-yellow-100";
        if (spent >= 5000) return "text-gray-600 bg-gray-100";
        return "text-orange-600 bg-orange-100";
    };

    const getTierName = (spent: number) => {
        if (spent >= 15000) return "Platinum";
        if (spent >= 10000) return "Gold";
        if (spent >= 5000) return "Silver";
        return "Bronze";
    };

    const selectedCustomer = customers?.find(c => c.id === selectedCustomerId);

    return (
        <div className="space-y-6 pb-24 lg:pb-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">Customers</h1>
                    <p className="text-gray-500 text-sm lg:text-base">Manage customer relationships and loyalty.</p>
                </div>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="w-4 h-4" /> Add Customer
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Customer</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Name</label>
                                <Input
                                    value={newCustomer.name}
                                    onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
                                    placeholder="John Doe"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Phone</label>
                                <Input
                                    value={newCustomer.phone}
                                    onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                                    placeholder="+91 98765 43210"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email (Optional)</label>
                                <Input
                                    value={newCustomer.email}
                                    onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })}
                                    placeholder="john@example.com"
                                />
                            </div>
                            <Button onClick={handleCreate} disabled={createMutation.isPending} className="w-full">
                                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Create Customer
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Customers</p>
                            <p className="text-2xl font-bold">{stats?.totalCustomers || 0}</p>
                        </div>
                        <Users className="w-8 h-8 text-blue-500 opacity-20" />
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Active</p>
                            <p className="text-2xl font-bold text-green-600">{stats?.activeCustomers || 0}</p>
                        </div>
                        <UserCheck className="w-8 h-8 text-green-500 opacity-20" />
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">VIP</p>
                            <p className="text-2xl font-bold text-purple-600">{stats?.vipCustomers || 0}</p>
                        </div>
                        <Star className="w-8 h-8 text-purple-500 opacity-20" />
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Avg. Spend</p>
                            <p className="text-2xl font-bold">₹{stats?.avgSpent || 0}</p>
                        </div>
                        <Wallet className="w-8 h-8 text-orange-500 opacity-20" />
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search by name, phone, or email..."
                            className="pl-9"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {/* Grid */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {customers?.map((customer) => {
                        const tierName = getTierName(customer.totalSpent);
                        const tierColor = getTierColor(customer.totalSpent);

                        return (
                            <Card key={customer.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedCustomerId(customer.id)}>
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                                                {customer.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-lg">{customer.name}</h3>
                                                <p className="text-sm text-gray-500">{customer.phone}</p>
                                                {customer.email && <p className="text-xs text-gray-400">{customer.email}</p>}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant={customer.status === 'active' ? 'default' : 'secondary'} className={customer.status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-200' : ''}>
                                                {customer.status}
                                            </Badge>
                                            <div className={`mt-2 text-xs font-bold px-2 py-1 rounded-full inline-block ${tierColor}`}>
                                                {tierName}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 py-4 border-t border-b border-gray-100">
                                        <div className="text-center">
                                            <p className="text-xs text-gray-500 mb-1">Orders</p>
                                            <p className="font-semibold">{customer.totalOrders}</p>
                                        </div>
                                        <div className="text-center border-l border-gray-100">
                                            <p className="text-xs text-gray-500 mb-1">Total Spent</p>
                                            <p className="font-semibold">₹{customer.totalSpent.toLocaleString()}</p>
                                        </div>
                                        <div className="text-center border-l border-gray-100">
                                            <p className="text-xs text-gray-500 mb-1">Points</p>
                                            <p className="font-semibold text-primary">{customer.loyaltyPoints}</p>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {customer.tags.map(tag => (
                                            <Badge key={tag} variant="outline" className="text-xs font-normal">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                    <div className="mt-4 text-center">
                                        <Button variant="ghost" size="sm" className="w-full text-primary hover:text-primary/80 hover:bg-primary/5">
                                            View Profile & History
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Customer Profile Dialog */}
            <Dialog open={!!selectedCustomerId} onOpenChange={(open) => !open && setSelectedCustomerId(null)}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Customer Profile</DialogTitle>
                    </DialogHeader>
                    {selectedCustomer && (
                        <div className="space-y-6">
                            {/* Profile Header */}
                            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl">
                                    {selectedCustomer.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">{selectedCustomer.name}</h2>
                                    <p className="text-gray-500">{selectedCustomer.phone}</p>
                                    <p className="text-sm text-gray-400">{selectedCustomer.email}</p>
                                </div>
                                <div className="ml-auto text-right">
                                    <div className="text-2xl font-bold text-primary">{selectedCustomer.loyaltyPoints}</div>
                                    <div className="text-xs text-gray-500">Loyalty Points</div>
                                </div>
                            </div>

                            {/* Order History */}
                            <div>
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <ShoppingBag className="w-5 h-5" /> Order History
                                </h3>
                                {historyLoading ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {history?.map((order) => (
                                            <div key={order.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <div className="font-medium flex items-center gap-2">
                                                            #{order.id.slice(-6).toUpperCase()}
                                                            <Badge variant={order.status === 'COMPLETED' ? 'default' : 'secondary'} className="text-[10px] h-5">
                                                                {order.status}
                                                            </Badge>
                                                        </div>
                                                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {format(new Date(order.date), 'PPP p')}
                                                        </div>
                                                    </div>
                                                    <div className="font-bold">
                                                        ₹{order.total.toLocaleString()}
                                                    </div>
                                                </div>
                                                <div className="text-sm text-gray-600 space-y-1">
                                                    {order.items.map((item, idx) => (
                                                        <div key={idx} className="flex justify-between">
                                                            <span>{item.quantity}x {item.name}</span>
                                                            <span className="text-gray-400">₹{item.price * item.quantity}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                        {history?.length === 0 && (
                                            <p className="text-center text-gray-500 py-8">No order history found.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
