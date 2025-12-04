import { prisma } from "@/server/db";
import { auth } from "@clerk/nextjs/server";
import { DailySubmissionForm } from "@/components/forms/DailySubmissionForm";

export default async function SubmitPage() {
    const { userId } = await auth();
    if (!userId) return null;

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { outletId: true, outlet: true }
    });

    if (!user?.outletId) {
        return (
            <div className="text-center py-12">
                <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
                <p className="text-muted-foreground">You are not assigned to any outlet.</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-8">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold tracking-tight mb-2">Daily Report</h1>
                <p className="text-muted-foreground">
                    Submitting for <span className="font-semibold text-foreground">{user.outlet?.name}</span>
                </p>
            </div>

            <DailySubmissionForm outletId={user.outletId} />
        </div>
    );
}
