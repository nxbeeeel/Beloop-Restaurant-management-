import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/server/db";
import { redirect } from "next/navigation";
import PurchaseOrderList from "@/components/procurement/PurchaseOrderList";

export default async function OrdersPage() {
    const { userId } = await auth();
    if (!userId) return null;

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { outletId: true, role: true }
    });

    if (!user || !user.outletId) {
        return <div className="p-8 text-red-500">Outlet configuration missing</div>;
    }

    // Role check
    if (user.role !== "OUTLET_MANAGER" && user.role !== "STAFF") {
        return <div className="p-8 text-red-500">Unauthorized Access</div>;
    }

    return <PurchaseOrderList outletId={user.outletId} />;
}
