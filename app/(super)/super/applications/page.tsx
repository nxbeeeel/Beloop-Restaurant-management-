
'use client';

import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Check, X, FileText, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy } from "lucide-react";
import { useState } from 'react';

export default function ApplicationsPage() {
    const utils = trpc.useContext();
    const { data: applications, isLoading } = trpc.brandApplication.list.useQuery();

    // Approval Success State
    const [approvedData, setApprovedData] = useState<{ tenant: any, invite?: any, actionTaken: string } | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const approveMutation = trpc.brandApplication.approve.useMutation({
        onSuccess: (data: any) => {
            toast.success('Application approved! Tenant created.');
            utils.brandApplication.list.invalidate();
            utils.super.listTenants.invalidate();
            setApprovedData({ tenant: data.tenant, invite: data.invite, actionTaken: data.actionTaken });
            setIsDialogOpen(true);
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

    const inviteLink = approvedData?.invite ? `${window.location.origin}/invite/brand?token=${approvedData.invite.token}` : '';

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">Brand Applications</h2>
                    <p className="text-stone-400">Review and manage incoming brand partnership requests.</p>
                </div>
            </div>

            <Card className="bg-stone-900 border-stone-800">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                        <FileText className="h-5 w-5 text-rose-500" />
                        Applications List
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-stone-800 hover:bg-transparent">
                                <TableHead className="text-stone-400">Date</TableHead>
                                <TableHead className="text-stone-400">Brand Name</TableHead>
                                <TableHead className="text-stone-400">Contact</TableHead>
                                <TableHead className="text-stone-400">Est. Outlets</TableHead>
                                <TableHead className="text-stone-400">Status</TableHead>
                                <TableHead className="text-right text-stone-400">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow className="border-stone-800">
                                    <TableCell colSpan={6} className="text-center py-8 text-stone-500">Loading...</TableCell>
                                </TableRow>
                            ) : applications?.length === 0 ? (
                                <TableRow className="border-stone-800">
                                    <TableCell colSpan={6} className="text-center py-8 text-stone-500">No applications found.</TableCell>
                                </TableRow>
                            ) : (
                                applications?.map((app) => (
                                    <TableRow key={app.id} className="border-stone-800 hover:bg-stone-800/50">
                                        <TableCell className="text-stone-300">{new Date(app.createdAt).toLocaleDateString()}</TableCell>
                                        <TableCell className="font-medium text-white">{app.brandName}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-stone-300">{app.contactName}</span>
                                                <span className="text-xs text-stone-500">{app.email}</span>
                                                <span className="text-xs text-stone-500">{app.phone}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-stone-300">{app.estimatedOutlets}</TableCell>
                                        <TableCell>
                                            <Badge variant={app.status === 'PENDING' ? 'outline' : app.status === 'APPROVED' ? 'default' : 'destructive'}
                                                className={app.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : app.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}>
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
                                            {app.status === 'APPROVED' && (
                                                <>
                                                    <ViewInviteAction appId={app.id} onInviteFound={(invite) => {
                                                        setApprovedData({
                                                            tenant: { name: app.brandName }, // Mock tenant name for display
                                                            invite: invite,
                                                            actionTaken: 'INVITED'
                                                        });
                                                        setIsDialogOpen(true);
                                                    }} />
                                                    <RevokeAction appId={app.id} onRevoked={() => utils.brandApplication.list.invalidate()} />
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

            {/* Approval Success Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Application Approved! 🎉</DialogTitle>
                        <DialogDescription>
                            The tenant <strong>{approvedData?.tenant.name}</strong> has been created.
                            <br />
                            {approvedData?.actionTaken === 'ASSIGNED' ? (
                                <span className="text-emerald-500 font-bold mt-2 block">
                                    User was already registered. They have been automatically assigned as Brand Admin.
                                </span>
                            ) : (
                                <span>Please share the following invitation link with the applicant.</span>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    {approvedData?.actionTaken === 'INVITED' || approvedData?.actionTaken === 'INVITE_GENERATED' && (
                        <div className="py-4 space-y-4">
                            <div className="p-4 bg-muted rounded-lg border">
                                <Label className="text-xs text-muted-foreground mb-1 block">
                                    {approvedData?.actionTaken === 'INVITE_GENERATED' ? 'Brand Activation Link' : 'Invitation Link'}
                                </Label>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 bg-background p-2 rounded border text-sm overflow-hidden text-ellipsis whitespace-nowrap">
                                        {inviteLink || approvedData?.invite?.link}
                                    </code>
                                    <Button size="icon" variant="outline" onClick={() => {
                                        navigator.clipboard.writeText(inviteLink || approvedData?.invite?.link);
                                        toast.success('Link copied to clipboard!');
                                    }}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                                <p><strong>Note:</strong> Share this link with the applicant. They will use it to activate their brand.</p>
                            </div>
                        </div>
                    )}


                    <DialogFooter>
                        <Button onClick={() => setIsDialogOpen(false)}>Done</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function ViewInviteAction({ appId, onInviteFound }: { appId: string, onInviteFound: (invite: any) => void }) {
    const [enabled, setEnabled] = useState(false);
    const { data: invite, isFetching } = trpc.brandApplication.getInvite.useQuery({ id: appId }, {
        enabled: enabled,
        retry: false
    });

    if (enabled && invite) {
        onInviteFound(invite);
        setEnabled(false); // Reset
    }

    // If enabled and finished fetching but no invite
    if (enabled && !isFetching && !invite && invite !== undefined) {
        toast.error('No pending invite found for this application.');
        setEnabled(false);
    }

    return (
        <Button size="icon" variant="ghost" title="Get Invite Link" onClick={() => setEnabled(true)} disabled={isFetching}>
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin text-stone-400" /> : <Copy className="h-4 w-4 text-stone-400" />}
        </Button>
    );
}

function RevokeAction({ appId, onRevoked }: { appId: string, onRevoked: () => void }) {
    const revokeMutation = trpc.brandApplication.revoke.useMutation({
        onSuccess: () => {
            toast.success('Application revoked and invitation cancelled.');
            onRevoked();
        },
        onError: (err) => toast.error(err.message)
    });

    const handleRevoke = () => {
        if (confirm('Are you sure? This will cancel the invitation and reject the application. The user will not be able to sign up with the old link.')) {
            revokeMutation.mutate({ id: appId });
        }
    };

    return (
        <Button size="icon" variant="ghost" title="Revoke Application" onClick={handleRevoke} disabled={revokeMutation.isPending} className="text-red-500 hover:text-red-700 hover:bg-red-50">
            {revokeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
        </Button>
    );
}
