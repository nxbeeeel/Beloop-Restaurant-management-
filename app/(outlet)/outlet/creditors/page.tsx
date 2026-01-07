import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/server/db";
import { redirect } from "next/navigation";
import CreditorLedgerClient from "./CreditorLedgerClient";

export default async function CreditorsPage() {
    const { userId } = await auth();
    if (!userId) redirect("/");

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { outletId: true, role: true }
    });

    if (!user || !user.outletId) {
        redirect("/");
    }

    if (!["OUTLET_MANAGER", "STAFF", "BRAND_ADMIN", "SUPER"].includes(user.role)) {
        redirect("/unauthorized");
    }

    return (
        <div className="container mx-auto p-6 max-w-7xl">
            <CreditorLedgerClient outletId={user.outletId} userRole={user.role} />
        </div>
    );
}
