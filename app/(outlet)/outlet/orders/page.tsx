import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/server/db";
import { redirect } from "next/navigation";
import PurchaseOrderList from "@/components/procurement/PurchaseOrderList";

export default async function OrdersPage() {
    const { userId } = auth();
    if (!userId) redirect("/");

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { outletId: true, role: true }
    });

    if (!user || !user.outletId) {
        redirect("/");
    }

    // Ensure only authorized roles can access
    if (user.role !== "OUTLET_MANAGER" && user.role !== "STAFF") {
        redirect("/");
    }

    return <PurchaseOrderList outletId={user.outletId} />;
}
