'use client';

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Store, StoreIcon as StoreOff, Trash2, Power } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface OutletActionsMenuProps {
    outletId: string;
    outletName: string;
    status: string;
}

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

export function OutletActionsMenu({ outletId, outletName, status }: OutletActionsMenuProps) {
    const router = useRouter();
    const utils = trpc.useUtils();
    const [showDeleteAlert, setShowDeleteAlert] = useState(false);

    const updateStatusMutation = trpc.brand.updateOutletStatus.useMutation({
        onSuccess: () => {
            utils.brand.listOutlets.invalidate();
            router.refresh();
            toast.success("Outlet status updated");
        },
        onError: (e) => toast.error(e.message),
    });

    const deleteMutation = trpc.brand.deleteOutlet.useMutation({
        onSuccess: () => {
            utils.brand.listOutlets.invalidate();
            router.refresh();
            toast.success("Outlet deleted");
            setShowDeleteAlert(false);
        },
        onError: (e) => toast.error(e.message),
    });

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {status === 'ACTIVE' ? (
                        <DropdownMenuItem
                            onClick={() => updateStatusMutation.mutate({ outletId, status: 'INACTIVE' })}
                            className="text-yellow-600 focus:text-yellow-700"
                        >
                            <Power className="h-4 w-4 mr-2" />
                            Suspend Outlet
                        </DropdownMenuItem>
                    ) : status === 'INACTIVE' ? (
                        <DropdownMenuItem
                            onClick={() => updateStatusMutation.mutate({ outletId, status: 'ACTIVE' })}
                            className="text-green-600 focus:text-green-700"
                        >
                            <Power className="h-4 w-4 mr-2" />
                            Activate Outlet
                        </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => setShowDeleteAlert(true)}
                        className="text-red-600 focus:text-red-700 focus:bg-red-50"
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Outlet
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete <strong>{outletName}</strong>. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                deleteMutation.mutate({ outletId });
                            }}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                            {deleteMutation.isPending ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
