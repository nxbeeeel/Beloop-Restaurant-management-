import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

interface UserActionMenuProps {
    userId: string;
    isActive: boolean;
    onUpdate?: () => void;
}

export function UserActionMenu({ userId, isActive, onUpdate }: UserActionMenuProps) {
    const [open, setOpen] = useState(false);
    const utils = trpc.useContext();

    const suspend = trpc.super.suspendUser.useMutation({
        onSuccess: () => {
            utils.super.getTenantDetails.invalidate();
            if (onUpdate) onUpdate();
            setOpen(false);
        },
    });

    const activate = trpc.super.activateUser.useMutation({
        onSuccess: () => {
            utils.super.getTenantDetails.invalidate();
            if (onUpdate) onUpdate();
            setOpen(false);
        },
    });

    const isLoading = suspend.isLoading || activate.isLoading;

    const handleAction = () => {
        if (isActive) {
            suspend.mutate({ userId });
        } else {
            activate.mutate({ userId });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant={isActive ? "destructive" : "outline"}
                    size="sm"
                    className={!isActive ? "text-green-600 border-green-600 hover:bg-green-50" : ""}
                >
                    {isActive ? 'Suspend' : 'Activate'}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isActive ? 'Suspend User' : 'Activate User'}</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to {isActive ? 'suspend' : 'activate'} this user?
                        {isActive && ' They will no longer be able to access the platform.'}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button
                        variant={isActive ? "destructive" : "default"}
                        onClick={handleAction}
                        disabled={isLoading}
                        className={!isActive ? "bg-green-600 hover:bg-green-700" : ""}
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isActive ? 'Suspend' : 'Activate'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
