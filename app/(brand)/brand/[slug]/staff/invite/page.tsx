import { prisma } from "@/server/db";
import { auth } from "@clerk/nextjs/server";
import { InviteUserForm } from "./InviteUserForm";

export default async function InviteUserPage() {
    const { userId } = await auth();
    if (!userId) return null;

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { tenantId: true }
    });

    if (!user?.tenantId) return <div>No tenant found</div>;

    const tenant = await prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: { primaryColor: true }
    });

    const outlets = await prisma.outlet.findMany({
        where: { tenantId: user.tenantId }
    });

    return (
        <div className="max-w-xl mx-auto mt-10">
            <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight">Invite New User</h1>
                <p className="text-muted-foreground">Send an email invitation to join your team.</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
                <InviteUserForm outlets={outlets} brandColor={tenant?.primaryColor || '#e11d48'} />
            </div>
        </div>
    );
}
