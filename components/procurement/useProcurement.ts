import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export type OrderItem = {
    productId: string;
    productName: string;
    qty: number;
    unitCost: number;
};

export function useProcurement(outletId: string) {
    const router = useRouter();
    const [supplierId, setSupplierId] = useState<string>("");
    const [items, setItems] = useState<OrderItem[]>([]);
    const [expectedDate, setExpectedDate] = useState<string>("");

    // Fetch Suppliers
    const { data: suppliers, isLoading: isLoadingSuppliers } = trpc.suppliers.list.useQuery();

    // Fetch Products
    const { data: allProducts, isLoading: isLoadingProducts } = trpc.products.list.useQuery({ outletId });

    // Filter products by supplier if one is selected
    const products = supplierId
        ? allProducts?.filter(p => p.supplierId === supplierId)
        : allProducts;

    const createOrder = trpc.procurement.createOrder.useMutation({
        onSuccess: () => {
            toast.success("Purchase Order created successfully!");
            router.push("/outlet/orders");
        },
        onError: (e) => toast.error(e.message)
    });

    const addItem = () => {
        setItems([...items, { productId: "", productName: "", qty: 1, unitCost: 0 }]);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateItem = (index: number, field: keyof OrderItem, value: any) => {
        const newItems = [...items];

        if (field === 'productId') {
            const product = products?.find(p => p.id === value);
            if (product) {
                newItems[index].productId = value;
                newItems[index].productName = product.name;
                // Assuming product has a cost field, otherwise default to 0
                // newItems[index].unitCost = product.cost || 0; 
            }
        } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (newItems[index] as any)[field] = value;
        }

        setItems(newItems);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (item.qty * item.unitCost), 0);
    };

    const submitOrder = (status: 'DRAFT' | 'SENT') => {
        if (!supplierId) {
            toast.error("Please select a supplier");
            return;
        }
        if (items.length === 0) {
            toast.error("Please add at least one item");
            return;
        }
        if (items.some(i => !i.productId || i.qty <= 0)) {
            toast.error("Please fill in all item details");
            return;
        }

        createOrder.mutate({
            outletId,
            supplierId,
            status,
            items: items.map(i => ({
                productId: i.productId,
                qty: i.qty,
                unitCost: i.unitCost
            }))
        });
    };

    return {
        // State
        supplierId,
        setSupplierId,
        items,
        expectedDate,
        setExpectedDate,

        // Data
        suppliers,
        products,

        // Actions
        addItem,
        updateItem,
        removeItem,
        calculateTotal,
        submitOrder,

        // Status
        isLoading: isLoadingSuppliers || isLoadingProducts,
        isSubmitting: createOrder.isPending
    };
}
