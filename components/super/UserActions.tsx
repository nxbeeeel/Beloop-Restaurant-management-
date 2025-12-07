
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Shieldalert, ShieldCheck, Trash2, Ban } from "lucide-react"; // Note: Shieldalert might fail if not in lucide-react version, checking imports
import { Shield, CheckCircle } from "lucide-react"; // Safe imports
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface UserActionsProps {
    user: any;
}

export function UserActions({ user }: UserActionsProps) {
    const utils = trpc.useContext();
    const [isRoleOpen, setIsRoleOpen] = useState(false);
    const [newRole, setNewRole] = useState(user.role);

    const suspendMutation = trpc.super.suspendUser.useMutation({
        onSuccess: () => {
            toast.success("User suspended");
            utils.super.listAllUsers.invalidate();
        },
    });

    const activateMutation = trpc.super.activateUser.useMutation({
        onSuccess: () => {
            toast.success("User activated");
            utils.super.listAllUsers.invalidate();
        },
    });

    const deleteMutation = trpc.super.deleteUser.useMutation({
        onSuccess: () => {
            toast.success("User deleted");
            utils.super.listAllUsers.invalidate();
        },
    });

    const updateRoleMutation = trpc.super.updateUserRole.useMutation({
        onSuccess: () => {
            toast.success("Role updated");
            setIsRoleOpen(false);
            utils.super.listAllUsers.invalidate();
        },
        onError: (err) => toast.error(err.message)
    });

    const handleRoleUpdate = () => {
        updateRoleMutation.mutate({ userId: user.id, role: newRole });
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-stone-400 hover:text-white hover:bg-stone-800">
                        <MoreHorizontal className="w-5 h-5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-stone-900 border-stone-800 text-stone-300">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setIsRoleOpen(true)} className="hover:bg-stone-800 focus:bg-stone-800 cursor-pointer">
                        <Shield className="w-4 h-4 mr-2" /> Change Role
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="bg-stone-800" />

                    {user.isActive ? (
                        <DropdownMenuItem onClick={() => suspendMutation.mutate({ userId: user.id })} className="hover:bg-stone-800 focus:bg-stone-800 cursor-pointer text-yellow-500">
                            <Ban className="w-4 h-4 mr-2" /> Suspend Access
                        </DropdownMenuItem>
                    ) : (
                        <DropdownMenuItem onClick={() => activateMutation.mutate({ userId: user.id })} className="hover:bg-stone-800 focus:bg-stone-800 cursor-pointer text-emerald-500">
                            <CheckCircle className="w-4 h-4 mr-2" /> Activate Access
                        </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator className="bg-stone-800" />

                    <DropdownMenuItem
                        onClick={() => {
                            if (confirm('Are you sure you want to delete this user? This cannot be undone.')) {
                                deleteMutation.mutate({ userId: user.id });
                            }
                        }}
                        className="hover:bg-stone-800 focus:bg-stone-800 cursor-pointer text-red-500"
                    >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete Account
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Role Change Dialog */}
            <Dialog open={isRoleOpen} onOpenChange={setIsRoleOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Change User Role</DialogTitle>
                        <DialogDescription>
                            Update access level for {user.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Select value={newRole} onValueChange={setNewRole}>
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
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRoleOpen(false)}>Cancel</Button>
                        <Button onClick={handleRoleUpdate} disabled={updateRoleMutation.isPending}>
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
