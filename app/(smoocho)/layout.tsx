import "@/app/globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import { TRPCProvider } from "@/components/TRPCProvider";
import Link from "next/link";

export const metadata = {
    title: "SMOOCHO Velocity | Mini-ERP",
    description: "Blazing fast restaurant cash register management",
};

export default function VelocityLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ClerkProvider>
            <TRPCProvider>
                <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                    {/* Velocity Header */}
                    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-900/80 backdrop-blur-xl">
                        <div className="container mx-auto flex h-16 items-center justify-between px-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-500">
                                    <span className="text-xl font-bold text-white">⚡</span>
                                </div>
                                <div>
                                    <h1 className="text-lg font-bold text-white">SMOOCHO Velocity</h1>
                                    <p className="text-xs text-slate-400">Cash Register Management</p>
                                </div>
                            </div>

                            {/* Navigation */}
                            <nav className="flex items-center gap-1">
                                <Link
                                    href="/velocity/register"
                                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                                >
                                    Register
                                </Link>
                                <Link
                                    href="/velocity/procurement"
                                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                                >
                                    Bills
                                </Link>
                                <Link
                                    href="/velocity/dashboard"
                                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                                >
                                    Dashboard
                                </Link>
                                <Link
                                    href="/velocity/settings"
                                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                                >
                                    ⚙️
                                </Link>
                            </nav>
                        </div>
                    </header>

                    {/* Main Content */}
                    <main className="container mx-auto px-4 py-6">
                        {children}
                    </main>

                    <Toaster
                        position="bottom-right"
                        toastOptions={{
                            style: {
                                background: "rgb(30 41 59)",
                                border: "1px solid rgb(51 65 85)",
                                color: "white",
                            },
                        }}
                    />
                </div>
            </TRPCProvider>
        </ClerkProvider>
    );
}
