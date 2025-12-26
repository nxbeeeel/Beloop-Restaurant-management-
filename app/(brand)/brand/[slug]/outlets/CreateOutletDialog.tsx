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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Store } from "lucide-react";

interface CreateOutletDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CreateOutletDialog({ open, onOpenChange }: CreateOutletDialogProps) {
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        address: '',
        phone: ''
    });

    const utils = trpc.useUtils();
    const createMutation = trpc.brand.createOutlet.useMutation({
        onSuccess: () => {
            utils.brand.listOutlets.invalidate();
            toast.success("Outlet created successfully!");
            onOpenChange(false);
            setFormData({ name: '', code: '', address: '', phone: '' });
        },
        onError: (e) => toast.error(e.message),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.code) {
            toast.error("Name and Code are required");
            return;
        }
        createMutation.mutate(formData);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Store className="h-5 w-5" />
                        Create New Outlet
                    </DialogTitle>
                    <DialogDescription>
                        Add a new location to your brand.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Outlet Name *</Label>
                            <Input
                                id="name"
                                placeholder="e.g. Downtown Branch"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="code">Outlet Code *</Label>
                            <Input
                                id="code"
                                placeholder="e.g. DT01"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                required
                                maxLength={10}
                            />
                            <p className="text-[10px] text-muted-foreground uppercase">Unique ID (Max 10)</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Textarea
                            id="address"
                            placeholder="Full address"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            className="min-h-[80px]"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                            id="phone"
                            placeholder="+91 98765 43210"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={createMutation.isPending}>
                            {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Create Outlet
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
