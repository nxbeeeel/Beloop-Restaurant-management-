'use client';

import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TenantStatusControl } from '@/components/admin/TenantStatusControl';
import { PaymentModal } from '@/components/admin/PaymentModal';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Users, Store, CreditCard, Calendar } from 'lucide-react';
import { UserActionMenu } from '@/components/admin/UserActionMenu';

export default function TenantDetailsPage({ params }: { params: { id: string } }) {
    const { data: tenant, isLoading } = trpc.superAdmin.tenants.getDetails.useQuery({
        tenantId: params.id,
    });

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Skeleton className="h-64" />
                    <Skeleton className="h-64" />
                </div>
            </div>
        );
    }

    if (!tenant) {
        return <div>Tenant not found</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{tenant.name}</h1>
                    <p className="text-muted-foreground">/{tenant.slug}</p>
                </div>
                <TenantStatusControl
                    tenantId={tenant.id}
                    currentStatus={tenant.status as any}
                />
            </div>

            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Outlets</CardTitle>
                        <Store className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{tenant.outlets.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{tenant.users.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Price/Outlet</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {tenant.currency} {tenant.pricePerOutlet}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Billed {tenant.billingCycle.toLowerCase()}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Next Billing</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {tenant.nextBillingDate
                                ? format(new Date(tenant.nextBillingDate), 'MMM d, yyyy')
                                : 'N/A'}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Payments */}
                <Card className="col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Recent Payments</CardTitle>
                        <PaymentModal tenantId={tenant.id} />
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Method</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tenant.payments.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center">
                                            No payments recorded
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    tenant.payments.map((payment) => (
                                        <TableRow key={payment.id}>
                                            <TableCell>
                                                {format(new Date(payment.createdAt), 'MMM d, yyyy')}
                                            </TableCell>
                                            <TableCell>
                                                {payment.currency} {payment.amount}
                                            </TableCell>
                                            <TableCell>{payment.method}</TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        payment.status === 'COMPLETED'
                                                            ? 'default'
                                                            : 'secondary'
                                                    }
                                                    className={
                                                        payment.status === 'COMPLETED'
                                                            ? 'bg-green-500'
                                                            : payment.status === 'FAILED'
                                                                ? 'bg-red-500'
                                                                : 'bg-yellow-500'
                                                    }
                                                >
                                                    {payment.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Outlets List (Simplified) */}
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Outlets</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead>Sales</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tenant.outlets.map((outlet) => (
                                    <TableRow key={outlet.id}>
                                        <TableCell className="font-medium">{outlet.name}</TableCell>
                                        <TableCell>{outlet.address || 'N/A'}</TableCell>
                                        <TableCell>{outlet._count.sales}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Users List */}
                <Card className="col-span-1 lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tenant.users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.name}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>{user.role}</TableCell>
                                        <TableCell>
                                            <Badge variant={user.isActive ? 'outline' : 'destructive'}>
                                                {user.isActive ? 'Active' : 'Suspended'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <UserActionMenu userId={user.id} isActive={user.isActive} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
