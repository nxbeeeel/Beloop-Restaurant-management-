'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Loader2, Ban, PlayCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type Role = 'SUPER' | 'BRAND_ADMIN' | 'OUTLET_MANAGER' | 'STAFF';

export default function SuperUsersPage() {
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<Role | 'ALL'>('ALL');
    const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; currentRole: Role } | null>(null);
    const [newRole, setNewRole] = useState<Role>('STAFF');

    const utils = trpc.useContext();
    const { data: users, isLoading, refetch } = trpc.super.listAllUsers.useQuery({
        role: roleFilter === 'ALL' ? undefined : roleFilter,
        search: search || undefined,
    });

    const updateRole = trpc.super.updateUserRole.useMutation({
        onSuccess: () => {
            toast.success('User role updated successfully');
            setSelectedUser(null);
            refetch();
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message || 'Failed to update user role');
        },
    });

    const suspendUser = trpc.super.suspendUser.useMutation({
        onSuccess: () => {
            toast.success('User suspended successfully');
            utils.super.listAllUsers.invalidate();
        },
        onError: (error) => {
            toast.error(`Failed to suspend user: ${error.message}`);
        }
    });

    const activateUser = trpc.super.activateUser.useMutation({
        onSuccess: () => {
            toast.success('User activated successfully');
            utils.super.listAllUsers.invalidate();
        },
        onError: (error) => {
            toast.error(`Failed to activate user: ${error.message}`);
        }
    });

    const deleteUser = trpc.super.deleteUser.useMutation({
        onSuccess: () => {
            toast.success('User deleted successfully');
            utils.super.listAllUsers.invalidate();
        },
        onError: (error) => {
            toast.error(`Failed to delete user: ${error.message}`);
        }
    });

    const handleRoleChange = () => {
        if (selectedUser) {
            updateRole.mutate({
                userId: selectedUser.id,
                role: newRole,
            });
        }
    };

    const handleSuspend = async (userId: string) => {
        if (confirm('Are you sure you want to suspend this user?')) {
            await suspendUser.mutateAsync({ userId });
        }
    };

    const handleActivate = async (userId: string) => {
        await activateUser.mutateAsync({ userId });
    };

    const handleDelete = async (userId: string) => {
        if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            await deleteUser.mutateAsync({ userId });
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">User Management</h1>
                <p className="text-muted-foreground mt-2">Manage all users across all tenants</p>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as Role | 'ALL')}>
                    <SelectTrigger>
                        <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Roles</SelectItem>
                        <SelectItem value="SUPER">Super Admin</SelectItem>
                        <SelectItem value="BRAND_ADMIN">Brand Admin</SelectItem>
                        <SelectItem value="OUTLET_MANAGER">Outlet Manager</SelectItem>
                        <SelectItem value="STAFF">Staff</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Users Table */}
            <Card>
                <CardHeader>
                    <CardTitle>All Users ({users?.length || 0})</CardTitle>
                    <CardDescription>Click on a user to change their role</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Tenant</TableHead>
                                <TableHead>Outlet</TableHead>
                                <TableHead>Joined</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users?.map((user: any) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.name}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                user.role === 'SUPER'
                                                    ? 'destructive'
                                                    : user.role === 'BRAND_ADMIN'
                                                        ? 'default'
                                                        : 'secondary'
                                            }
                                        >
                                            {user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={user.isActive ? 'outline' : 'destructive'}>
                                            {user.isActive ? 'Active' : 'Suspended'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{user.tenant?.name || '-'}</TableCell>
                                    <TableCell>{user.outlet?.name || '-'}</TableCell>
                                    <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        {user.isActive ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleSuspend(user.id)}
                                            >
                                                <Ban className="h-4 w-4 mr-1" /> Suspend
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                onClick={() => handleActivate(user.id)}
                                            >
                                                <PlayCircle className="h-4 w-4 mr-1" /> Activate
                                            </Button>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setSelectedUser({
                                                    id: user.id,
                                                    name: user.name,
                                                    currentRole: user.role as Role,
                                                });
                                                setNewRole(user.role as Role);
                                            }}
                                        >
                                            Change Role
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleDelete(user.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Role Change Dialog */}
            <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Change User Role</DialogTitle>
                        <DialogDescription>
                            Change role for {selectedUser?.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Current Role</label>
                            <div>
                                <Badge>{selectedUser?.currentRole}</Badge>
                            </div>
                        </div>
                        <div className="space-y-2 mt-4">
                            <label className="text-sm font-medium">New Role</label>
                            <Select value={newRole} onValueChange={(value) => setNewRole(value as Role)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="SUPER">Super Admin</SelectItem>
                                    <SelectItem value="BRAND_ADMIN">Brand Admin</SelectItem>
                                    <SelectItem value="OUTLET_MANAGER">Outlet Manager</SelectItem>
                                    <SelectItem value="STAFF">Staff</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedUser(null)}>Cancel</Button>
                        <Button onClick={handleRoleChange} disabled={updateRole.isPending}>
                            {updateRole.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Updating...
                                </>
                            ) : (
                                'Update Role'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
