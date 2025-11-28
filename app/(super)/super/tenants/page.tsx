'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, Store, TrendingUp, Search, Loader2, CheckCircle, Ban, PlayCircle, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function SuperTenantsPage() {
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

    const utils = trpc.useContext();
    const { data: stats, isLoading: statsLoading } = trpc.super.getStats.useQuery();
    const { data: tenants, isLoading } = trpc.super.listTenants.useQuery();
    const { data: tenantDetails } = trpc.super.getTenantDetails.useQuery(
        { tenantId: selectedTenantId! },
        { enabled: !!selectedTenantId }
    );

    const updateStatusMutation = trpc.super.updateTenantStatus.useMutation({
        onSuccess: () => {
            toast.success('Tenant status updated successfully');
            utils.super.listTenants.invalidate();
        },
        onError: (error) => {
            toast.error(`Failed to update status: ${error.message}`);
        }
    });

    const deleteTenantMutation = trpc.super.deleteTenant.useMutation({
        onSuccess: () => {
            toast.success('Tenant deleted successfully');
            utils.super.listTenants.invalidate();
        },
        onError: (error) => {
            toast.error(`Failed to delete tenant: ${error.message}`);
        }
    });

    const requestPaymentMutation = trpc.super.requestPayment.useMutation({
        onSuccess: () => {
            toast.success('Payment requested successfully');
            utils.super.listTenants.invalidate();
        },
        onError: (error) => {
            toast.error(`Failed to request payment: ${error.message}`);
        }
    });

    const handleStatusUpdate = async (tenantId: string, newStatus: 'ACTIVE' | 'SUSPENDED' | 'PAUSED' | 'TRIAL') => {
        await updateStatusMutation.mutateAsync({ tenantId, status: newStatus });
    };

    const handleDelete = async (tenantId: string) => {
        if (confirm('Are you sure you want to delete this tenant? This action cannot be undone and will delete all associated data.')) {
            await deleteTenantMutation.mutateAsync({ tenantId });
        }
    };

    const handleRequestPayment = async (tenantId: string) => {
        await requestPaymentMutation.mutateAsync({ tenantId });
    };

    const filteredTenants = tenants?.filter((tenant: any) => {
        const matchesSearch = tenant.name.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = filterStatus === 'ALL' || tenant.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'default'; // primary/black
            case 'PENDING': return 'secondary'; // gray
            case 'SUSPENDED': return 'destructive'; // red
            case 'TRIAL': return 'outline';
            default: return 'secondary';
        }
    };

    if (statsLoading || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Tenant Management</h1>
                <p className="text-muted-foreground mt-2">Manage all brands and their outlets</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalTenants || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Outlets</CardTitle>
                        <Store className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalOutlets || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalSales || 0}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search tenants..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <div className="w-[200px]">
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filter by Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Statuses</SelectItem>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="PENDING">Pending</SelectItem>
                            <SelectItem value="SUSPENDED">Suspended</SelectItem>
                            <SelectItem value="TRIAL">Trial</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Tenants Table */}
            <Card>
                <CardHeader>
                    <CardTitle>All Tenants</CardTitle>
                    <CardDescription>Click on a tenant to view details</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Outlets</TableHead>
                                <TableHead>Users</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredTenants?.map((tenant: any) => (
                                <TableRow key={tenant.id} className="hover:bg-muted/50">
                                    <TableCell className="font-medium cursor-pointer" onClick={() => setSelectedTenantId(tenant.id)}>
                                        {tenant.name}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusBadgeVariant(tenant.status)}>
                                            {tenant.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{tenant._count.outlets}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{tenant._count.users}</Badge>
                                    </TableCell>
                                    <TableCell>{new Date(tenant.createdAt).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        {tenant.status === 'PENDING' && (
                                            <Button
                                                size="sm"
                                                className="bg-green-600 hover:bg-green-700 text-white"
                                                onClick={() => handleStatusUpdate(tenant.id, 'ACTIVE')}
                                            >
                                                <CheckCircle className="h-4 w-4 mr-1" /> Approve
                                            </Button>
                                        )}
                                        {tenant.status === 'ACTIVE' && (
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => handleStatusUpdate(tenant.id, 'SUSPENDED')}
                                            >
                                                <Ban className="h-4 w-4 mr-1" /> Suspend
                                            </Button>
                                        )}
                                        {tenant.status === 'SUSPENDED' && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-green-600 border-green-600 hover:bg-green-50"
                                                onClick={() => handleStatusUpdate(tenant.id, 'ACTIVE')}
                                            >
                                                <PlayCircle className="h-4 w-4 mr-1" /> Activate
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleDelete(tenant.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleRequestPayment(tenant.id)}
                                            disabled={tenant.isPaymentDue}
                                        >
                                            {tenant.isPaymentDue ? 'Payment Requested' : 'Request Payment'}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Tenant Details Dialog */}
            <Dialog open={!!selectedTenantId} onOpenChange={() => setSelectedTenantId(null)}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{tenantDetails?.name}</DialogTitle>
                        <DialogDescription>Tenant details and statistics</DialogDescription>
                    </DialogHeader>
                    {tenantDetails && (
                        <div className="space-y-6">
                            {/* Outlets */}
                            <div>
                                <h3 className="font-semibold mb-3">Outlets ({tenantDetails.outlets.length})</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {tenantDetails.outlets.map((outlet: any) => (
                                        <Card key={outlet.id}>
                                            <CardHeader>
                                                <CardTitle className="text-base">{outlet.name}</CardTitle>
                                            </CardHeader>
                                            <CardContent className="text-sm space-y-1">
                                                <p><strong>Address:</strong> {outlet.address}</p>
                                                <p><strong>Phone:</strong> {outlet.phone}</p>
                                                <p><strong>Sales:</strong> {outlet._count.sales}</p>
                                                <p><strong>Expenses:</strong> {outlet._count.expenses}</p>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>

                            {/* Users */}
                            <div>
                                <h3 className="font-semibold mb-3">Users ({tenantDetails.users.length})</h3>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Joined</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {tenantDetails.users.map((user: any) => (
                                            <TableRow key={user.id}>
                                                <TableCell>{user.name}</TableCell>
                                                <TableCell>{user.email}</TableCell>
                                                <TableCell>
                                                    <Badge>{user.role}</Badge>
                                                </TableCell>
                                                <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
