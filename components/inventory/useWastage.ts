import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function useWastage(outletId: string) {
    const [productId, setProductId] = useState("");
    const [qty, setQty] = useState("");
    const [reason, setReason] = useState("");

    const utils = trpc.useUtils();

    const { data: products, isLoading: isLoadingProducts } = trpc.products.list.useQuery({ outletId });
    const { data: wastageHistory, isLoading: isLoadingHistory } = trpc.wastage.list.useQuery({ outletId });

    const createWastage = trpc.wastage.create.useMutation({
        onSuccess: () => {
            toast.success("Wastage recorded successfully");
            utils.wastage.list.invalidate();
            utils.inventory.getLowStock.invalidate(); // Stock changed
            setProductId("");
            setQty("");
            setReason("");
        },
        onError: (e) => toast.error(e.message)
    });

    const submitWastage = (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!productId || !qty || !reason) {
            toast.error("Please fill all fields");
            return;
        }

        createWastage.mutate({
            outletId,
            productId,
            qty: parseFloat(qty),
            reason
        });
    };

    return {
        // State
        productId,
        setProductId,
        qty,
        setQty,
        reason,
        setReason,

        // Data
        products,
        wastageHistory,
        isLoading: isLoadingProducts || isLoadingHistory,

        // Actions
        submitWastage,
        isSubmitting: createWastage.isPending
    };
}
