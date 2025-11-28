import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/server/db";
import { redirect } from "next/navigation";
import WastageLog from "@/components/inventory/WastageLog";

export default async function WastagePage() {
    const { userId } = auth();
    if (!userId) redirect("/");

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: {
            outletId: true,
            role: true
        }
    });

    if (!user?.outletId || (user.role !== "OUTLET_MANAGER" && user.role !== "STAFF")) {
        redirect("/");
    }

    return <WastageLog outletId={user.outletId} />;
}
