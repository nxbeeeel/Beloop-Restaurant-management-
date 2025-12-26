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

export function OutletActionsMenu({ outletId, outletName, status }: OutletActionsMenuProps) {
    const router = useRouter();
    const utils = trpc.useUtils();

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
            toast.success("Outlet archived");
        },
        onError: (e) => toast.error(e.message),
    });

    return (
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
                        className="text-yellow-600"
                    >
                        <Power className="h-4 w-4 mr-2" />
                        Suspend Outlet
                    </DropdownMenuItem>
                ) : status === 'INACTIVE' ? (
                    <DropdownMenuItem
                        onClick={() => updateStatusMutation.mutate({ outletId, status: 'ACTIVE' })}
                        className="text-green-600"
                    >
                        <Power className="h-4 w-4 mr-2" />
                        Activate Outlet
                    </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onClick={() => {
                        if (confirm(`Are you sure you want to archive "${outletName}"?`)) {
                            deleteMutation.mutate({ outletId });
                        }
                    }}
                    className="text-red-600"
                >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Archive Outlet
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
