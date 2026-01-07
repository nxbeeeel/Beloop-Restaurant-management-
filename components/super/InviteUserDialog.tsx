
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
import { Loader2, Copy, CheckCircle2 } from "lucide-react";
import { Label } from "@/components/ui/label";

interface InviteUserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function InviteUserDialog({ open, onOpenChange }: InviteUserDialogProps) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<"SUPER" | "BRAND_ADMIN" | "OUTLET_MANAGER" | "STAFF">("BRAND_ADMIN");
    const [tenantId, setTenantId] = useState("");

    // Success State
    const [inviteLink, setInviteLink] = useState<string | null>(null);

    const utils = trpc.useContext();
    const { data: tenants } = trpc.superAdmin.tenants.list.useQuery();

    const inviteMutation = trpc.superAdmin.users.invite.useMutation({
        onSuccess: (data: { token?: string }) => {
            toast.success("Invitation generated successfully");
            utils.superAdmin.users.list.invalidate();
            // Generate Link
            if (data?.token) {
                setInviteLink(`${window.location.origin}/signup?token=${data.token}`);
            }
        },
        onError: (err: { message: string }) => toast.error(err.message),
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

    const handleClose = () => {
        onOpenChange(false);
        // Reset form after animation
        setTimeout(() => {
            setName("");
            setEmail("");
            setRole("BRAND_ADMIN");
            setTenantId("");
            setInviteLink(null);
        }, 300);
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{inviteLink ? "Invitation Ready! 🎉" : "Invite New User"}</DialogTitle>
                    <DialogDescription>
                        {inviteLink
                            ? "Share this link with the user to let them set up their account."
                            : "Send an email invitation to add a new user to the system."
                        }
                    </DialogDescription>
                </DialogHeader>

                {inviteLink ? (
                    <div className="space-y-6 py-4">
                        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 flex items-center gap-4">
                            <div className="bg-emerald-100 p-2 rounded-full">
                                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-emerald-800">User Invited</h4>
                                <p className="text-sm text-emerald-600 max-w-[250px] truncate">{email}</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs text-stone-500 font-semibold uppercase tracking-wider">Registration Link</Label>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 bg-stone-100 p-3 rounded-lg border border-stone-200 text-sm overflow-hidden text-ellipsis whitespace-nowrap font-mono text-stone-700">
                                    {inviteLink}
                                </code>
                                <Button size="icon" variant="outline" className="border-stone-300 hover:bg-stone-50" onClick={() => {
                                    navigator.clipboard.writeText(inviteLink);
                                    toast.success('Link copied to clipboard!');
                                }}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                            <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Invitation email sent automatically.
                            </p>
                        </div>

                        <Button className="w-full bg-stone-900 hover:bg-stone-800" onClick={handleClose}>
                            Done
                        </Button>
                    </div>
                ) : (
                    <>
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
                            Generate Invite Link
                        </Button>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
