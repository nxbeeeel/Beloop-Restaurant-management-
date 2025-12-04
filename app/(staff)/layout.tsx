import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { auth } from "@clerk/nextjs/server";

export default async function StaffLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { userId } = await auth();
    if (!userId) redirect("/login");

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        include: { outlet: true }
    });

    if (!user || user.role !== "STAFF") {
        redirect("/");
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
