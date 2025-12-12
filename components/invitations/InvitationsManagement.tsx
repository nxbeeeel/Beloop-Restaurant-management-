"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { cancelInvitation, resendInvitation, createInvitation } from "@/server/actions/invitation";
import { toast } from "sonner";
import {
    Mail, Clock, CheckCircle, XCircle, RefreshCw, Copy,
    UserPlus, Users, Loader2, MoreHorizontal, Search
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

type Outlet = {
    id: string;
    name: string;
};

interface Props {
    invitations: Invitation[];
    outlets?: Outlet[];
}

export default function InvitationsManagement({ invitations, outlets = [] }: Props) {
    const [localInvitations, setLocalInvitations] = useState(invitations);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter invitations
    const filteredInvitations = localInvitations.filter(inv => {
        const matchesSearch = inv.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inv.inviteRole.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Stats
    const stats = {
        total: localInvitations.length,
        pending: localInvitations.filter(i => i.status === 'PENDING').length,
        accepted: localInvitations.filter(i => i.status === 'ACCEPTED').length,
    };

    const handleInvite = async (formData: FormData) => {
        setIsSubmitting(true);
        try {
            await createInvitation(formData);
            toast.success("Invitation sent successfully!");
            setIsInviteOpen(false);
            // Optimistically add to list
            window.location.reload();
        } catch (error: any) {
            toast.error(error.message || "Failed to send invitation");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = async (id: string) => {
        if (!confirm("Are you sure you want to cancel this invitation?")) return;
        try {
            await cancelInvitation(id);
            setLocalInvitations(prev =>
                prev.map(inv => inv.id === id ? { ...inv, status: 'REVOKED' } : inv)
            );
            toast.success("Invitation cancelled");
        } catch (error: any) {
            toast.error(error.message || "Failed to cancel invitation");
        }
    };

    const handleResend = async (id: string) => {
        try {
            await resendInvitation(id);
            toast.success("Invitation extended by 7 days");
        } catch (error: any) {
            toast.error(error.message || "Failed to extend invitation");
        }
    };

    const copyInviteLink = (token: string, role: string) => {
        const baseUrl = window.location.origin;
        const link = role === 'BRAND_ADMIN'
            ? `${baseUrl}/invite/brand?token=${token}`
            : `${baseUrl}/invite/user?token=${token}`;
        navigator.clipboard.writeText(link);
        toast.success("Link copied to clipboard!");
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            'PENDING': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
            'ACCEPTED': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
            'EXPIRED': 'bg-gray-500/10 text-gray-500 border-gray-500/20',
            'REVOKED': 'bg-red-500/10 text-red-500 border-red-500/20',
        };
        return (
            <Badge className={`${styles[status] || ''} border font-medium`}>
                {status}
            </Badge>
        );
    };

    const getRoleBadge = (role: string) => {
        const styles: Record<string, string> = {
            'OUTLET_MANAGER': 'bg-blue-500/10 text-blue-500',
            'STAFF': 'bg-purple-500/10 text-purple-500',
            'BRAND_ADMIN': 'bg-rose-500/10 text-rose-500',
        };
        return (
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${styles[role] || 'bg-gray-100 text-gray-600'}`}>
                {role.replace('_', ' ')}
            </span>
        );
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
                    <p className="text-gray-500 mt-1">Invite and manage your team members</p>
                </div>
                <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-500/20">
                            <UserPlus className="w-4 h-4 mr-2" />
                            Invite Team Member
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-rose-500" />
                                Invite New Team Member
                            </DialogTitle>
                        </DialogHeader>
                        <form action={handleInvite} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address *</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="colleague@example.com"
                                    required
                                    className="h-11"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="role">Role *</Label>
                                <Select name="role" required defaultValue="OUTLET_MANAGER">
                                    <SelectTrigger className="h-11">
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="OUTLET_MANAGER">Outlet Manager</SelectItem>
                                        <SelectItem value="STAFF">Staff</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {outlets.length > 0 && (
                                <div className="space-y-2">
                                    <Label htmlFor="outletId">Assign to Outlet</Label>
                                    <Select name="outletId">
                                        <SelectTrigger className="h-11">
                                            <SelectValue placeholder="Select outlet (optional)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {outlets.map(outlet => (
                                                <SelectItem key={outlet.id} value={outlet.id}>
                                                    {outlet.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <DialogFooter className="pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-rose-600 hover:bg-rose-700"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Mail className="w-4 h-4 mr-2" />
                                            Send Invitation
                                        </>
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl border p-5 shadow-sm"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Users className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{stats.total}</p>
                            <p className="text-sm text-gray-500">Total Invitations</p>
                        </div>
                    </div>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-xl border p-5 shadow-sm"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                            <Clock className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{stats.pending}</p>
                            <p className="text-sm text-gray-500">Pending</p>
                        </div>
                    </div>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-xl border p-5 shadow-sm"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{stats.accepted}</p>
                            <p className="text-sm text-gray-500">Accepted</p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Search by email or role..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-11"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-44 h-11">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="ACCEPTED">Accepted</SelectItem>
                        <SelectItem value="EXPIRED">Expired</SelectItem>
                        <SelectItem value="REVOKED">Cancelled</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Invitations List */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                {filteredInvitations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                            <Mail className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">No invitations found</h3>
                        <p className="text-gray-500 max-w-sm">
                            {searchQuery || statusFilter !== "all"
                                ? "Try adjusting your search or filters"
                                : "Get started by inviting your first team member"
                            }
                        </p>
                        {!searchQuery && statusFilter === "all" && (
                            <Button
                                className="mt-4 bg-rose-600 hover:bg-rose-700"
                                onClick={() => setIsInviteOpen(true)}
                            >
                                <UserPlus className="w-4 h-4 mr-2" />
                                Invite First Member
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="divide-y">
                        <AnimatePresence>
                            {filteredInvitations.map((invitation, index) => (
                                <motion.div
                                    key={invitation.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="p-4 hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="font-medium text-gray-900 truncate">
                                                    {invitation.email || "No email"}
                                                </p>
                                                {getRoleBadge(invitation.inviteRole)}
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                                {invitation.outlet && (
                                                    <span>📍 {invitation.outlet.name}</span>
                                                )}
                                                <span>
                                                    {new Date(invitation.expiresAt) < new Date()
                                                        ? "Expired"
                                                        : `Expires ${new Date(invitation.expiresAt).toLocaleDateString()}`
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {getStatusBadge(invitation.status)}
                                            {invitation.status === 'PENDING' && (
                                                <div className="flex gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => copyInviteLink(invitation.token, invitation.inviteRole)}
                                                        title="Copy invite link"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleResend(invitation.id)}
                                                        title="Extend invitation"
                                                    >
                                                        <RefreshCw className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleCancel(invitation.id)}
                                                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                        title="Cancel invitation"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}
