import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    DialogTrigger,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';

interface PaymentModalProps {
    tenantId: string;
    onSuccess?: () => void;
}

export function PaymentModal({ tenantId, onSuccess }: PaymentModalProps) {
    const [open, setOpen] = useState(false);
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('CASH');
    const [reference, setReference] = useState('');
    const [notes, setNotes] = useState('');

    const utils = trpc.useContext();
    const recordPayment = trpc.payment.recordPayment.useMutation({
        onSuccess: () => {
            utils.super.getTenantDetails.invalidate({ tenantId });
            setOpen(false);
            setAmount('');
            setReference('');
            setNotes('');
            if (onSuccess) onSuccess();
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        recordPayment.mutate({
            tenantId,
            amount: Number(amount),
            method: method as any,
            reference,
            notes,
            status: 'COMPLETED',
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Record Payment
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Record Payment</DialogTitle>
                        <DialogDescription>
                            Manually record a payment for this tenant.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="amount" className="text-right">
                                Amount
                            </Label>
                            <Input
                                id="amount"
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="col-span-3"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="method" className="text-right">
                                Method
                            </Label>
                            <Select value={method} onValueChange={setMethod}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select method" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CASH">Cash</SelectItem>
                                    <SelectItem value="UPI">UPI</SelectItem>
                                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="reference" className="text-right">
                                Reference
                            </Label>
                            <Input
                                id="reference"
                                value={reference}
                                onChange={(e) => setReference(e.target.value)}
                                className="col-span-3"
                                placeholder="Transaction ID / Receipt No"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="notes" className="text-right">
                                Notes
                            </Label>
                            <Input
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={recordPayment.isLoading}>
                            {recordPayment.isLoading ? 'Recording...' : 'Record Payment'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
