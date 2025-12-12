import { prisma } from "@/server/db";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import InvitationsManagement from "@/components/invitations/InvitationsManagement";

export default async function InvitationsPage() {
    const { userId } = await auth();
    if (!userId) redirect("/");

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { tenantId: true, role: true }
    });

    if (!user?.tenantId || (user.role !== 'BRAND_ADMIN' && user.role !== 'SUPER')) {
        redirect("/");
    }

    // Fetch invitations and outlets in parallel
    const [invitations, outlets] = await Promise.all([
        prisma.invitation.findMany({
            where: { tenantId: user.tenantId },
            include: {
                outlet: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        }),
        prisma.outlet.findMany({
            where: { tenantId: user.tenantId },
            select: { id: true, name: true },
            orderBy: { name: 'asc' }
        })
    ]);

    return <InvitationsManagement invitations={invitations} outlets={outlets} />;
}

