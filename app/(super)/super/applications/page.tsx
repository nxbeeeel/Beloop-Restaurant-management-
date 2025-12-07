
'use client';

import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Check, X, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ApplicationsPage() {
    const utils = trpc.useContext();
    const { data: applications, isLoading } = trpc.brandApplication.list.useQuery();

    const approveMutation = trpc.brandApplication.approve.useMutation({
        onSuccess: () => {
            toast.success('Application approved! Tenant and Invite created.');
            utils.brandApplication.list.invalidate();
            utils.super.listTenants.invalidate();
        },
        onError: (err) => toast.error(err.message)
    });

    const rejectMutation = trpc.brandApplication.reject.useMutation({
        onSuccess: () => {
            toast.success('Application rejected.');
            utils.brandApplication.list.invalidate();
        },
        onError: (err) => toast.error(err.message)
    });

    const handleApprove = (id: string) => {
        if (confirm('Are you sure you want to approve this application? This will create a new tenant.')) {
            approveMutation.mutate({ id });
        }
    };

    const handleReject = (id: string) => {
        if (confirm('Are you sure you want to reject this application?')) {
            rejectMutation.mutate({ id });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Brand Applications</h2>
                    <p className="text-muted-foreground">Review and manage incoming brand partnership requests.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Applications List
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Brand Name</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Est. Outlets</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                                </TableRow>
                            ) : applications?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No applications found.</TableCell>
                                </TableRow>
                            ) : (
                                applications?.map((app) => (
                                    <TableRow key={app.id}>
                                        <TableCell>{new Date(app.createdAt).toLocaleDateString()}</TableCell>
                                        <TableCell className="font-medium">{app.brandName}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span>{app.contactName}</span>
                                                <span className="text-xs text-muted-foreground">{app.email}</span>
                                                <span className="text-xs text-muted-foreground">{app.phone}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{app.estimatedOutlets}</TableCell>
                                        <TableCell>
                                            <Badge variant={app.status === 'PENDING' ? 'outline' : app.status === 'APPROVED' ? 'default' : 'destructive'}
                                                className={app.status === 'APPROVED' ? 'bg-green-600' : ''}>
                                                {app.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            {app.status === 'PENDING' && (
                                                <>
                                                    <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                        onClick={() => handleApprove(app.id)} disabled={approveMutation.isPending}>
                                                        <Check className="h-4 w-4 mr-1" /> Approve
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => handleReject(app.id)} disabled={rejectMutation.isPending}>
                                                        <X className="h-4 w-4 mr-1" /> Reject
                                                    </Button>
                                                </>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
