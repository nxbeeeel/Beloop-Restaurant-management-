import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { auth } from "@clerk/nextjs/server";

export default async function StaffLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Middleware guarantees authentication for this route group.
    // We trust valid session claims.
    const { userId } = await auth();

    if (!userId) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <div className="text-center p-8">
                    <h2 className="text-xl font-semibold text-gray-800">Session Expired</h2>
                    <p className="text-gray-500 mt-2">Please refresh the page.</p>
                </div>
            </div>
        );
    }

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        include: { outlet: true }
    });

    // Safety fallback: Should be caught by middleware, but if not, do NOT redirect.
    // Just show access denied to stop loops.
    if (!user || user.role !== "STAFF") {
        return (
            <div className="flex min-h-screen items-center justify-center bg-red-50">
                <div className="text-center p-8 bg-white rounded shadow-lg border border-red-100">
                    <h2 className="text-xl font-bold text-red-600">Access Denied</h2>
                    <p className="text-gray-600 mt-2">Account ({user?.role || 'Unknown'}) is not authorized for Staff Portal.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-gray-50 flex-col">
            <header className="bg-white border-b p-4 flex justify-between items-center">
                <div>
                    <h1 className="font-bold">{user.outlet?.name}</h1>
                    <p className="text-xs text-gray-500">Staff Portal</p>
                </div>
                <div className="text-sm">
                    {user.name}
                </div>
            </header>
            <main className="flex-1 p-4 max-w-md mx-auto w-full">
                {children}
            </main>
        </div>
    );
}
