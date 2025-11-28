import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface TenantStatusControlProps {
    tenantId: string;
    currentStatus: 'ACTIVE' | 'SUSPENDED' | 'PAUSED' | 'TRIAL';
    onUpdate?: () => void;
}

export function TenantStatusControl({
    tenantId,
    currentStatus,
    onUpdate,
}: TenantStatusControlProps) {
    const [status, setStatus] = useState(currentStatus);
    const [showConfirm, setShowConfirm] = useState(false);
    const [pendingStatus, setPendingStatus] = useState<typeof currentStatus | null>(null);

    const utils = trpc.useContext();
    const updateStatus = trpc.super.updateTenantStatus.useMutation({
        onSuccess: () => {
            utils.super.getTenantDetails.invalidate({ tenantId });
            if (onUpdate) onUpdate();
            setShowConfirm(false);
        },
    });

    const handleStatusChange = (newStatus: string) => {
        const s = newStatus as typeof currentStatus;
        if (s === 'SUSPENDED' || s === 'PAUSED') {
            setPendingStatus(s);
            setShowConfirm(true);
        } else {
            updateStatus.mutate({ tenantId, status: s });
            setStatus(s);
        }
    };

    const confirmChange = () => {
        if (pendingStatus) {
            updateStatus.mutate({ tenantId, status: pendingStatus });
            setStatus(pendingStatus);
        }
    };

    const getStatusColor = (s: string) => {
        switch (s) {
            case 'ACTIVE': return 'bg-green-500 hover:bg-green-600';
            case 'TRIAL': return 'bg-blue-500 hover:bg-blue-600';
            case 'PAUSED': return 'bg-yellow-500 hover:bg-yellow-600';
            case 'SUSPENDED': return 'bg-red-500 hover:bg-red-600';
            default: return 'bg-gray-500';
        }
    };

    return (
        <>
            <div className="flex items-center gap-2">
                <Badge className={getStatusColor(status)}>{status}</Badge>
                <Select value={status} onValueChange={handleStatusChange} disabled={updateStatus.isPending}>
                    <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="TRIAL">Trial</SelectItem>
                        <SelectItem value="PAUSED">Paused</SelectItem>
                        <SelectItem value="SUSPENDED">Suspended</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Status Change</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to change the status to {pendingStatus}?
                            {pendingStatus === 'SUSPENDED' && ' The tenant will lose access to the platform immediately.'}
                            {pendingStatus === 'PAUSED' && ' Billing will be paused, but data will be retained.'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
                        <Button
                            variant={pendingStatus === 'SUSPENDED' ? 'destructive' : 'default'}
                            onClick={confirmChange}
                            disabled={updateStatus.isLoading}
                        >
                            Confirm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
