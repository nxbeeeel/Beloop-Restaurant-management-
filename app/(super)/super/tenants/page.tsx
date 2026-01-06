'use client';

import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { Plus, Search, Building2, MoreHorizontal, Loader2, CheckCircle, Ban, Trash2, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";

// Define Shape
type Tenant = {
    id: string;
    name: string;
    slug: string;
    status: 'ACTIVE' | 'SUSPENDED' | 'PENDING' | 'TRIAL' | 'PAST_DUE' | 'CANCELLED' | 'PAUSED';
    logoUrl?: string | null;
    _count?: { users: number; outlets: number };
    pricePerOutlet?: number;
};

export default function TenantManagementPage() {
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [inviteBrandName, setInviteBrandName] = useState('');
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteContactName, setInviteContactName] = useState('');

    const utils = trpc.useContext();
    const { data: tenants, isLoading } = trpc.superAdmin.tenants.list.useQuery();

    const [invitedData, setInvitedData] = useState<{ tenant: any, invite: any } | null>(null);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);

    // Optimistic Delete Mutation
    const deleteTenantMutation = trpc.superAdmin.tenants.delete.useMutation({
        onMutate: async ({ tenantId }) => {
            await utils.superAdmin.tenants.list.cancel();
            const previousTenants = utils.superAdmin.tenants.list.getData();

            // Optimistically update to remove the item
            utils.superAdmin.tenants.list.setData(undefined, (old) => {
                if (!old) return [];
                return old.filter((t: any) => t.id !== tenantId);
            });

            return { previousTenants };
        },
        onError: (err, newTodo, context) => {
            toast.error(err.message);
            utils.superAdmin.tenants.list.setData(undefined, context?.previousTenants);
        },
        onSuccess: () => {
            toast.success('Tenant deleted');
        },
        onSettled: () => {
            utils.superAdmin.tenants.list.invalidate();
        }
    });

    const updateStatusMutation = trpc.superAdmin.tenants.updateStatus.useMutation({
        onSuccess: () => {
            toast.success('Status updated');
            utils.superAdmin.tenants.list.invalidate();
        },
        onError: (err) => toast.error(err.message)
    });

    const inviteBrandMutation = trpc.superAdmin.tenants.invite.useMutation({
        onSuccess: (data: any) => {
            toast.success('Brand invited successfully');
            setIsInviteOpen(false);
            setInviteBrandName('');
            setInviteEmail('');
            setInviteContactName('');
            setInvitedData(data);
            setShowSuccessDialog(true);
            utils.superAdmin.tenants.list.invalidate();
        },
        onError: (err) => toast.error(err.message)
    });

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

    const inviteLink = invitedData?.invite ? `${window.location.origin}/invite/brand?token=${invitedData.invite.token}` : '';

    // Columns Definition
    const columns: ColumnDef<Tenant>[] = useMemo(() => [
        {
            accessorKey: "name",
            header: ({ column }) => {
                return (
                    <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                        Brand
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const tenant = row.original;
                return (
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-stone-800 border border-stone-700 flex items-center justify-center">
                            {tenant.logoUrl ? (
                                <img src={tenant.logoUrl} alt={tenant.name} className="w-6 h-6 object-contain" />
                            ) : (
                                <Building2 className="w-5 h-5 text-stone-500" />
                            )}
                        </div>
                        <div>
                            <div className="font-medium text-foreground">{tenant.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">{tenant.slug}</div>
                        </div>
                    </div>
                );
            }
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const status = row.getValue("status") as string;
                return (
                    <Badge variant="outline" className={`
                        ${status === 'ACTIVE' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500' : ''}
                        ${status === 'SUSPENDED' ? 'border-red-500/20 bg-red-500/10 text-red-500' : ''}
                        ${status === 'PENDING' ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-500' : ''}
                    `}>
                        {status}
                    </Badge>
                )
            }
        },
        {
            accessorKey: "_count.users",
            header: "Users",
            cell: ({ row }) => row.original._count?.users || 0
        },
        {
            accessorKey: "_count.outlets",
            header: "Outlets",
            cell: ({ row }) => row.original._count?.outlets || 0
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const tenant = row.original;
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-400 hover:text-white hover:bg-stone-800">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-stone-900 border-stone-800 text-stone-300">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-stone-800" />
                            {tenant.status !== 'ACTIVE' && (
                                <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ tenantId: tenant.id, status: 'ACTIVE' })} className="hover:bg-stone-800 cursor-pointer text-emerald-500">
                                    <CheckCircle className="w-4 h-4 mr-2" /> Activate
                                </DropdownMenuItem>
                            )}
                            {tenant.status === 'ACTIVE' && (
                                <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ tenantId: tenant.id, status: 'SUSPENDED' })} className="hover:bg-stone-800 cursor-pointer text-yellow-500">
                                    <Ban className="w-4 h-4 mr-2" /> Suspend
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator className="bg-stone-800" />
                            <DropdownMenuItem
                                onClick={() => {
                                    // Optimistic UI - No Confirmation or Custom Confirm?
                                    // User said "When a user clicks 'Delete', the row should fade out instantly"
                                    // We can skip confirm or do a quick custom one.
                                    // For safety, standard confirm is blocking.
                                    // Let's assume standard confirm is acceptable, but the fade out happens AFTER confirm click.
                                    if (confirm('Delete this tenant?')) {
                                        deleteTenantMutation.mutate({ tenantId: tenant.id });
                                    }
                                }}
                                className="hover:bg-stone-800 cursor-pointer text-red-500 focus:text-red-500"
                            >
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            }
        }
    ], [updateStatusMutation, deleteTenantMutation]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">Tenants</h2>
                    <p className="text-stone-400 mt-1">Manage all registered brands and restaurant chains.</p>
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
                        className="pl-9 bg-stone-950 border-stone-800 text-white placeholder:text-stone-600 focus-visible:ring-rose-500"
                    />
                </div>
            </div>

            {/* Tenant List */}
            <div className="grid gap-4">
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-20 w-full bg-stone-900 rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : (
                    tenants?.map((tenant) => (
                        <div key={tenant.id} className="bg-stone-900 border border-stone-800 rounded-xl hover:bg-stone-800/50 transition-colors group">
                            <div className="p-6 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-stone-800 border border-stone-700 flex items-center justify-center">
                                        {tenant.logoUrl ? (
                                            <img src={tenant.logoUrl} alt={tenant.name} className="w-8 h-8 object-contain" />
                                        ) : (
                                            <Building2 className="w-6 h-6 text-stone-500" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-base text-white">{tenant.name}</h3>
                                        <p className="text-sm text-stone-500 font-mono">{tenant.slug}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    {/* Stats */}
                                    <div className="hidden md:flex items-center gap-8 text-center">
                                        <div>
                                            <p className="text-lg font-bold text-white">{tenant._count?.users || 0}</p>
                                            <p className="text-xs text-stone-500">Users</p>
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-white">{tenant._count?.outlets || 0}</p>
                                            <p className="text-xs text-stone-500">Outlets</p>
                                        </div>
                                    </div>

                                    <Badge variant="outline" className={`
                                        ${tenant.status === 'ACTIVE' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500' : ''}
                                        ${tenant.status === 'SUSPENDED' ? 'border-red-500/20 bg-red-500/10 text-red-500' : ''}
                                        ${tenant.status === 'PENDING' ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-500' : ''}
                                        ${tenant.status === 'TRIAL' ? 'border-blue-500/20 bg-blue-500/10 text-blue-500' : ''}
                                    `}>
                                        {tenant.status}
                                    </Badge>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-400 hover:text-white hover:bg-stone-800">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="bg-stone-900 border-stone-800 text-stone-300">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuSeparator className="bg-stone-800" />
                                            {tenant.status !== 'ACTIVE' && (
                                                <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ tenantId: tenant.id, status: 'ACTIVE' })} className="hover:bg-stone-800 cursor-pointer text-emerald-500">
                                                    <CheckCircle className="w-4 h-4 mr-2" /> Activate
                                                </DropdownMenuItem>
                                            )}
                                            {tenant.status === 'ACTIVE' && (
                                                <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ tenantId: tenant.id, status: 'SUSPENDED' })} className="hover:bg-stone-800 cursor-pointer text-yellow-500">
                                                    <Ban className="w-4 h-4 mr-2" /> Suspend
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuSeparator className="bg-stone-800" />
                                            <DropdownMenuItem
                                                onClick={() => {
                                                    if (confirm('Delete this tenant and ALL its data?')) {
                                                        deleteTenantMutation.mutate({ tenantId: tenant.id });
                                                    }
                                                }}
                                                className="hover:bg-stone-800 cursor-pointer text-red-500 focus:text-red-500"
                                            >
                                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        </div>
                    ))
                )}

                {(!isLoading && (!tenants || tenants.length === 0)) && (
                    <div className="text-center py-20 bg-stone-900 rounded-xl border border-stone-800 border-dashed">
                        <Building2 className="w-12 h-12 text-stone-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">No Tenants Found</h3>
                        <p className="text-stone-500">Create your first tenant to get started.</p>
                    </div>
                )}
            </div>

            {/* Success Dialog */}
            <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Tenant Created Successfully! 🎉</DialogTitle>
                        <DialogDescription>
                            The tenant <strong>{invitedData?.tenant.name}</strong> has been initialized.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        <div className="p-4 bg-muted rounded-lg border">
                            <label className="text-xs text-muted-foreground mb-1 block">Brand Activation Link</label>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 bg-background p-2 rounded border text-sm overflow-hidden text-ellipsis whitespace-nowrap">
                                    {inviteLink}
                                </code>
                                <Button size="icon" variant="outline" onClick={() => {
                                    navigator.clipboard.writeText(inviteLink);
                                    toast.success('Link copied to clipboard!');
                                }}>
                                    <CheckCircle className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Share this link with <strong>{invitedData?.invite.email}</strong>. They will use it to set up their account and brand profile.
                        </p>
                    </div>

                    <div className="flex justify-end">
                        <Button onClick={() => setShowSuccessDialog(false)}>Done</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
