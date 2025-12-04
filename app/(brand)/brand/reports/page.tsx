import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/server/db";
import { redirect } from "next/navigation";
import { MonthlyReportView } from "@/components/reports/MonthlyReportView";

export default async function BrandReportsPage() {
    const { userId } = await auth();
    if (!userId) redirect("/login");

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { tenantId: true, outletId: true, role: true }
    });

    if (!user?.tenantId) return <div>No tenant found</div>;

    // Get all outlets for the tenant
    const outlets = await prisma.outlet.findMany({
        where: { tenantId: user.tenantId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
    });

    if (outlets.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-96">
                <h3 className="text-lg font-semibold mb-2">No Outlets Found</h3>
                <p className="text-muted-foreground">Create an outlet to view reports.</p>
            </div>
        );
    }

    return <MonthlyReportView initialOutletId={outlets[0].id} outlets={outlets} />;
}
