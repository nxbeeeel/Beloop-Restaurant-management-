
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface InviteUserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function InviteUserDialog({ open, onOpenChange }: InviteUserDialogProps) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<"SUPER" | "BRAND_ADMIN" | "OUTLET_MANAGER" | "STAFF">("BRAND_ADMIN");
    const [tenantId, setTenantId] = useState("");

    const utils = trpc.useContext();
    const { data: tenants } = trpc.super.listTenants.useQuery();

    const inviteMutation = trpc.super.inviteUser.useMutation({
        onSuccess: () => {
            toast.success("Invitation sent successfully");
            onOpenChange(false);
            setName("");
            setEmail("");
            setRole("BRAND_ADMIN");
            setTenantId("");
            utils.super.listAllUsers.invalidate();
        },
        onError: (err) => toast.error(err.message),
    });

    const handleSubmit = () => {
        if (!name || !email) {
            toast.error("Name and Email are required");
            return;
        }
        if (role !== "SUPER" && !tenantId) {
            toast.error("Please select a tenant for this user");
            return;
        }

        inviteMutation.mutate({
            name,
            email,
            role,
            tenantId: role === "SUPER" ? undefined : tenantId,
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Invite New User</DialogTitle>
                    <DialogDescription>
                        Send an email invitation to add a new user to the system.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Full Name</label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Email Address</label>
                        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" type="email" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Role</label>
                        <Select value={role} onValueChange={(v: any) => setRole(v)}>
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

                    {role !== 'SUPER' && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Assign to Tenant</label>
                            <Select value={tenantId} onValueChange={setTenantId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a tenant" />
                                </SelectTrigger>
                                <SelectContent>
                                    {tenants?.map((t) => (
                                        <SelectItem key={t.id} value={t.id}>
                                            {t.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                <Button className="w-full bg-rose-600 hover:bg-rose-700" onClick={handleSubmit} disabled={inviteMutation.isPending}>
                    {inviteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Invitation
                </Button>
            </DialogContent>
        </Dialog>
    );
}
