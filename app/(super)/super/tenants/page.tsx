'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Plus, Search, Building2, MoreHorizontal, Loader2, CheckCircle, Ban, Trash2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';

export default function TenantManagementPage() {
    // State
    const [search, setSearch] = useState('');
    const [isInviteOpen, setIsInviteOpen] = useState(false);

    // Invite Form State
    const [inviteBrandName, setInviteBrandName] = useState('');
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteContactName, setInviteContactName] = useState('');

    const utils = trpc.useContext();
    const { data: tenants, isLoading } = trpc.super.listTenants.useQuery();

    // Mutations
    const inviteBrandMutation = trpc.super.inviteBrand.useMutation({
        onSuccess: () => {
            toast.success('Brand invited successfully');
            setIsInviteOpen(false);
            setInviteBrandName('');
            setInviteEmail('');
            setInviteContactName('');
            utils.super.listTenants.invalidate();
        },
        onError: (err) => toast.error(err.message)
    });

    const updateStatusMutation = trpc.super.updateTenantStatus.useMutation({
        onSuccess: () => {
            toast.success('Status updated');
            utils.super.listTenants.invalidate();
        },
        onError: (err) => toast.error(err.message)
    });

    const deleteTenantMutation = trpc.super.deleteTenant.useMutation({
        onSuccess: () => {
            toast.success('Tenant deleted');
            utils.super.listTenants.invalidate();
        },
        onError: (err) => toast.error(err.message)
    });

    // Handlers
    const handleInviteBrand = () => {
        if (!inviteBrandName || !inviteEmail) {
            toast.error('Brand Name and Email are required');
            return;
        }
        inviteBrandMutation.mutate({
            brandName: inviteBrandName,
            email: inviteEmail,
            contactName: inviteContactName
        });
    };

    const handleStatusUpdate = (tenantId: string, status: 'ACTIVE' | 'SUSPENDED') => {
        updateStatusMutation.mutate({ tenantId, status });
    };

    const handleDelete = (tenantId: string) => {
        if (confirm('Are you sure? This will delete all data.')) {
            deleteTenantMutation.mutate({ tenantId });
        }
    };

    // Filter Logic
    const filteredTenants = tenants?.filter((t: any) =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.slug.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">Tenants</h2>
                    <p className="text-stone-400">Manage all registered brands and restaurant chains.</p>
                </div>

                <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-500/20">
                            <Plus className="w-4 h-4 mr-2" />
                            Create New Tenant
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Invite New Brand</DialogTitle>
                            <DialogDescription>
                                Create a new tenant instantly and send an invite to the owner.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Brand Name</label>
                                <Input value={inviteBrandName} onChange={e => setInviteBrandName(e.target.value)} placeholder="e.g. KFC" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Owner Name</label>
                                <Input value={inviteContactName} onChange={e => setInviteContactName(e.target.value)} placeholder="e.g. John Doe" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Owner Email</label>
                                <Input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="e.g. john@kfc.com" type="email" />
                            </div>
                        </div>
                        <Button className="w-full" onClick={handleInviteBrand} disabled={inviteBrandMutation.isPending}>
                            {inviteBrandMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Invitation'}
                        </Button>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-4 bg-stone-900 p-4 rounded-xl border border-stone-800">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                    <Input
                        placeholder="Search tenants..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 bg-stone-950 border-stone-800 text-white placeholder:text-stone-600 focus-visible:ring-rose-500"
                    />
                </div>
                {/* Status Filter could be added here similar to search */}
            </div>

            {/* Tenant List */}
            <div className="grid gap-4">
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-20 w-full bg-stone-900 rounded-xl" />
                        ))}
                    </div>
                ) : (
                    filteredTenants?.map((tenant: any) => (
                        <Card key={tenant.id} className="bg-stone-900 border-stone-800 hover:bg-stone-800/50 transition-colors group">
                            <div className="p-6 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center">
                                        {tenant.logoUrl ? (
                                            <img src={tenant.logoUrl} alt={tenant.name} className="w-8 h-8 object-contain" />
                                        ) : (
                                            <Building2 className="w-6 h-6 text-stone-500" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-white group-hover:text-rose-400 transition-colors">{tenant.name}</h3>
                                        <div className="flex items-center gap-2 text-sm text-stone-500">
                                            <span className="font-mono text-xs bg-stone-950 px-2 py-0.5 rounded text-stone-600">{tenant.slug}</span>
                                            <span>•</span>
                                            <span>{tenant._count?.users ?? 0} Users</span>
                                            <span>•</span>
                                            <span>{tenant._count?.outlets ?? 0} Outlets</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="text-right hidden md:block">
                                        <p className="text-sm font-medium text-stone-300">
                                            ₹{((tenant._count?.outlets || 0) * (tenant.pricePerOutlet || 250)).toLocaleString()}
                                        </p>
                                        <p className="text-xs text-stone-500">Est. Monthly Bill</p>
                                    </div>

                                    <Badge variant="outline" className={`
                                        ${tenant.status === 'ACTIVE' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500' : ''}
                                        ${tenant.status === 'SUSPENDED' ? 'border-red-500/20 bg-red-500/10 text-red-500' : ''}
                                        ${tenant.status === 'PENDING' ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-500' : ''}
                                    `}>
                                        {tenant.status}
                                    </Badge>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-stone-400 hover:text-white hover:bg-stone-800">
                                                <MoreHorizontal className="w-5 h-5" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="bg-stone-900 border-stone-800 text-stone-300">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuSeparator className="bg-stone-800" />
                                            {tenant.status !== 'ACTIVE' && (
                                                <DropdownMenuItem onClick={() => handleStatusUpdate(tenant.id, 'ACTIVE')} className="hover:bg-stone-800 focus:bg-stone-800 cursor-pointer text-emerald-500">
                                                    <CheckCircle className="w-4 h-4 mr-2" /> Activate
                                                </DropdownMenuItem>
                                            )}
                                            {tenant.status === 'ACTIVE' && (
                                                <DropdownMenuItem onClick={() => handleStatusUpdate(tenant.id, 'SUSPENDED')} className="hover:bg-stone-800 focus:bg-stone-800 cursor-pointer text-yellow-500">
                                                    <Ban className="w-4 h-4 mr-2" /> Suspend
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuItem onClick={() => handleDelete(tenant.id)} className="hover:bg-stone-800 focus:bg-stone-800 cursor-pointer text-red-500">
                                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        </Card>
                    ))
                )}

                {(!isLoading && (!filteredTenants || filteredTenants.length === 0)) && (
                    <div className="text-center py-20 bg-stone-900 rounded-xl border border-stone-800 border-dashed">
                        <Building2 className="w-12 h-12 text-stone-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">No Tenants Found</h3>
                        <p className="text-stone-500 max-w-sm mx-auto mb-6">Start by creating your first brand manually or invite a brand owner.</p>
                        <Button onClick={() => setIsInviteOpen(true)} className="bg-rose-600 hover:bg-rose-700 text-white">Create Tenant</Button>
                    </div>
                )}
            </div>
        </div>
    );
}
