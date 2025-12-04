import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/server/db";
import { redirect } from "next/navigation";
import GoogleSheetsExport from "@/components/export/GoogleSheetsExport";

export default async function ExportPage() {
    const { userId } = await auth();
    if (!userId) redirect("/login");

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { tenantId: true, outletId: true, role: true }
    });

    if (!user?.tenantId) return <div>No tenant found</div>;

    // Get first outlet for demo (in real app, user would select)
    const outlet = await prisma.outlet.findFirst({
        where: { tenantId: user.tenantId },
        select: { id: true, name: true }
    });

    if (!outlet) {
        return (
            <div className="flex flex-col items-center justify-center h-96">
                <h3 className="text-lg font-semibold mb-2">No Outlets Found</h3>
                <p className="text-muted-foreground">Create an outlet to export data.</p>
            </div>
        );
    }

    return <GoogleSheetsExport outletId={outlet.id} />;
}
