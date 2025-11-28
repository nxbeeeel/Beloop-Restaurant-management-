"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cancelInvitation, resendInvitation } from "@/server/actions/invitation";
import { toast } from "sonner";
import { Mail, Clock, CheckCircle, XCircle, RefreshCw, Copy } from "lucide-react";

type Invitation = {
    id: string;
    email: string | null;
    inviteRole: string;
    status: string;
    expiresAt: Date;
    createdAt: Date;
    token: string;
    outlet?: { name: string } | null;
};

export default function InvitationsManagementPage({ invitations }: { invitations: Invitation[] }) {
    const [localInvitations, setLocalInvitations] = useState(invitations);

    const handleCancel = async (id: string) => {
        if (!confirm("Are you sure you want to cancel this invitation?")) return;

        try {
            await cancelInvitation(id);
            setLocalInvitations(prev =>
                prev.map(inv => inv.id === id ? { ...inv, status: 'REVOKED' } : inv)
            );
            toast.success("Invitation cancelled successfully");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            toast.error(error.message || "Failed to cancel invitation");
        }
    };

    const handleResend = async (id: string) => {
        try {
            await resendInvitation(id);
            toast.success("Invitation extended by 7 days");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            toast.error(error.message || "Failed to resend invitation");
        }
    };

    const copyInviteLink = (token: string) => {
        const link = `${window.location.origin}/invite/${token}`;
        navigator.clipboard.writeText(link);
        toast.success("Invitation link copied to clipboard!");
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING':
                return <Badge className="bg-yellow-500">Pending</Badge>;
            case 'ACCEPTED':
                return <Badge className="bg-green-500">Accepted</Badge>;
            case 'EXPIRED':
                return <Badge className="bg-gray-500">Expired</Badge>;
            case 'REVOKED':
                return <Badge className="bg-red-500">Cancelled</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    };

    const isExpired = (date: Date) => new Date(date) < new Date();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Invitations</h1>
                    <p className="text-gray-500">Manage pending and sent invitations</p>
                </div>
            </div>

            <div className="grid gap-4">
                {localInvitations.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <Mail className="h-12 w-12 text-gray-400 mb-4" />
                            <p className="text-gray-500">No invitations yet</p>
                        </CardContent>
                    </Card>
                ) : (
                    localInvitations.map((invitation) => (
                        <Card key={invitation.id}>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Mail className="h-5 w-5" />
                                            {invitation.email || "No email"}
                                        </CardTitle>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Role: <span className="font-medium">{invitation.inviteRole}</span>
                                            {invitation.outlet && (
                                                <span> • Outlet: <span className="font-medium">{invitation.outlet.name}</span></span>
                                            )}
                                        </p>
                                    </div>
                                    {getStatusBadge(invitation.status)}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4 text-sm text-gray-600">
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-4 w-4" />
                                            <span>
                                                {isExpired(invitation.expiresAt) ? "Expired" : "Expires"}{" "}
                                                {new Date(invitation.expiresAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            Created {new Date(invitation.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        {invitation.status === 'PENDING' && (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => copyInviteLink(invitation.token)}
                                                >
                                                    <Copy className="h-4 w-4 mr-1" />
                                                    Copy Link
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleResend(invitation.id)}
                                                >
                                                    <RefreshCw className="h-4 w-4 mr-1" />
                                                    Extend
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleCancel(invitation.id)}
                                                >
                                                    <XCircle className="h-4 w-4 mr-1" />
                                                    Cancel
                                                </Button>
                                            </>
                                        )}
                                        {invitation.status === 'ACCEPTED' && (
                                            <div className="flex items-center gap-1 text-green-600 text-sm">
                                                <CheckCircle className="h-4 w-4" />
                                                Accepted
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
