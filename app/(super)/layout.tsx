import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { SuperSidebar } from "@/components/admin/SuperSidebar";
import { MobileSidebar } from "@/components/admin/MobileSidebar"; // Keep mobile sidebar if improved later

export default async function SuperLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    try {
        const { userId } = await auth();
        // Middleware handles protection. No secondary redirect here.

        return (
            <div className="flex min-h-screen bg-stone-950 text-white">
                {/* Desktop Sidebar (Fixed) */}
                <div className="hidden md:block fixed inset-y-0 left-0 z-50">
                    <SuperSidebar />
                </div>

                {/* Mobile Header (Visible only on small screens) */}
                <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b z-40 flex items-center justify-between px-4">
                    <span className="font-bold text-lg">Beloop Admin</span>
                    <MobileSidebar />
                </div>

                {/* Main Content Area */}
                <main className="flex-1 md:pl-72 w-full min-h-screen transition-all duration-300">
                    <div className="p-4 md:p-8 pt-20 md:pt-8 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {children}
                    </div>
                </main>
            </div>
        );
    } catch (error) {
        console.error("SuperLayout Critical Error:", error);
        return (
            <div className="min-h-screen bg-transparent p-10 flex flex-col items-center justify-center text-red-500">
                <h1 className="text-2xl font-bold mb-4">Layout Rendering Failed</h1>
                <div className="bg-stone-900 p-6 rounded-lg font-mono text-sm border border-red-900/50 max-w-2xl overflow-auto">
                    {String(error)}
                </div>
                <p className="mt-4 text-stone-400">Please check server logs for stack trace.</p>
            </div>
        );
    }
}
