import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/server/db";
import { redirect } from "next/navigation";
import OrderDetailsView from "@/components/procurement/OrderDetailsView";

export default async function OrderPage({ params }: { params: { id: string } }) {
    const { userId } = await auth();
    if (!userId) redirect("/");

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { outletId: true, role: true }
    });

    if (!user || !user.outletId) {
        redirect("/");
    }

    if (user.role !== "OUTLET_MANAGER" && user.role !== "STAFF") {
        redirect("/");
    }

    return <OrderDetailsView orderId={params.id} />;
}
