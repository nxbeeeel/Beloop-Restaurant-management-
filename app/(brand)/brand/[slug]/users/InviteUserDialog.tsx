'use client';

import { useState } from 'react';
import { trpc } from "@/lib/trpc";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Mail, Loader2 } from "lucide-react";

interface InviteUserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function InviteUserDialog({ open, onOpenChange }: InviteUserDialogProps) {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<'OUTLET_MANAGER' | 'STAFF'>('STAFF');
    const [outletId, setOutletId] = useState('');

    const utils = trpc.useUtils();
    const { data: outlets, isLoading: isLoadingOutlets } = trpc.brand.listOutlets.useQuery();

    const inviteMutation = trpc.brand.inviteUser.useMutation({
        onSuccess: () => {
            utils.brand.listUsers.invalidate();
            toast.success("Invitation sent!");
            onOpenChange(false);
            setEmail('');
            setRole('STAFF');
            setOutletId('');
        },
        onError: (e) => toast.error(e.message),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !outletId) {
            toast.error("Please fill all fields");
            return;
        }
        inviteMutation.mutate({ email, role, outletId });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Invite Team Member
                    </DialogTitle>
                    <DialogDescription>
                        Send an invitation to join your team. They'll receive an email with instructions.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="colleague@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Select value={role} onValueChange={(v) => setRole(v as any)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="OUTLET_MANAGER">Outlet Manager</SelectItem>
                                <SelectItem value="STAFF">Staff</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="outlet">
                            Assign to Outlet
                            {outlets && <span className="text-xs text-muted-foreground ml-2">({outlets.length} available)</span>}
                        </Label>
                        <Select value={outletId} onValueChange={setOutletId} disabled={isLoadingOutlets}>
                            <SelectTrigger>
                                <SelectValue placeholder={isLoadingOutlets ? "Loading..." : "Select outlet..."} />
                            </SelectTrigger>
                            <SelectContent>
                                {(outlets && outlets.length > 0) ? (
                                    outlets.map((outlet) => (
                                        <SelectItem key={outlet.id} value={outlet.id}>
                                            {outlet.name}
                                        </SelectItem>
                                    ))
                                ) : (
                                    <SelectItem value="none" disabled>
                                        No outlets found
                                    </SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>


                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={inviteMutation.isPending}>
                            {inviteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Send Invitation
                        </Button>
                    </DialogFooter>
                </form >
            </DialogContent >
        </Dialog >
    );
}
