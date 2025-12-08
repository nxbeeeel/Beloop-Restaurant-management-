import Link from "next/link";
import { Shield, Building2, Users, Settings, Activity, DollarSign, Store, ArrowUpRight } from "lucide-react";
import LogoutButton from "@/components/LogoutButton";
import { trpc } from "@/lib/trpc";
import { api } from "@/lib/trpc/server";

export default async function SuperDashboard() {
    // 1. Fetch Real Data
    const stats = await api.super.getStats();

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white p-8 font-sans selection:bg-rose-500/30">
            {/* Background Texture */}
            <div className="fixed inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />

            {/* Header */}
            <header className="flex justify-between items-center mb-12 relative z-10">
                <div className="flex items-center gap-4">
                    {/* CSS Logo (Wide Format) */}
                    <div className="flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">
                        <div className="relative w-8 h-8 flex items-center justify-center">
                            <div className="absolute inset-0 bg-gradient-to-tr from-rose-500 to-orange-500 rounded-lg opacity-80 blur-[2px]" />
                            <Shield className="relative w-5 h-5 text-white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 leading-none">
                                BELOOP
                            </span>
                            <span className="text-[10px] text-rose-500 font-mono tracking-widest uppercase leading-none mt-0.5">
                                COMMAND
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-xs text-green-500 flex items-center gap-1.5 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        SYSTEM OPERATIONAL
                    </span>
                    <LogoutButton />
                </div>
            </header>

            {/* Main Content */}
            <div className="relative z-10 max-w-7xl mx-auto space-y-12">

                {/* Hero / Welcome */}
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight text-white">
                        Command Center
                    </h1>
                    <p className="text-gray-400 max-w-2xl">
                        Global oversight of the Beloop ecosystem. Real-time metrics across all tenants.
                    </p>
                </div>

                {/* 1. Live Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors group">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-gray-400 text-sm font-medium">Total Revenue</span>
                            <div className="p-2 bg-green-500/10 rounded-lg text-green-500 group-hover:text-green-400">
                                <DollarSign className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="text-3xl font-bold text-white mb-1">{stats.totalSales.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">Global Transactions</div>
                    </div>

                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors group">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-gray-400 text-sm font-medium">Active Tenants</span>
                            <div className="p-2 bg-rose-500/10 rounded-lg text-rose-500 group-hover:text-rose-400">
                                <Building2 className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="text-3xl font-bold text-white mb-1">{stats.totalTenants.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">Brands Onboarded</div>
                    </div>

                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors group">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-gray-400 text-sm font-medium">Total Outlets</span>
                            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500 group-hover:text-purple-400">
                                <Store className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="text-3xl font-bold text-white mb-1">{stats.totalOutlets.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">Operational Locations</div>
                    </div>

                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors group">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-gray-400 text-sm font-medium">System Users</span>
                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500 group-hover:text-blue-400">
                                <Users className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="text-3xl font-bold text-white mb-1">{stats.totalUsers.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">Registered Accounts</div>
                    </div>
                </div>

                {/* 2. Management Modules */}
                <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-white/80 flex items-center gap-2">
                        <Activity className="w-5 h-5" /> Management Consoles
                    </h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        <Link href="/brand/dashboard" className="group">
                            <div className="h-full p-8 rounded-2xl bg-gradient-to-br from-gray-900 to-black border border-white/10 hover:border-rose-500/50 transition-all duration-300 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <Building2 className="w-24 h-24" />
                                </div>
                                <div className="relative z-10">
                                    <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center mb-6 text-indigo-400 group-hover:scale-110 transition-transform">
                                        <Building2 className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                        Manage Brands <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </h3>
                                    <p className="text-gray-400 text-sm">Create tenants, configure billing, and invite brand admins.</p>
                                </div>
                            </div>
                        </Link>

                        <Link href="/outlet/dashboard" className="group">
                            <div className="h-full p-8 rounded-2xl bg-gradient-to-br from-gray-900 to-black border border-white/10 hover:border-emerald-500/50 transition-all duration-300 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <Store className="w-24 h-24" />
                                </div>
                                <div className="relative z-10">
                                    <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-6 text-emerald-400 group-hover:scale-110 transition-transform">
                                        <Store className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                        Outlet Monitor <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </h3>
                                    <p className="text-gray-400 text-sm">Drill down into specific outlet performance and staff activity.</p>
                                </div>
                            </div>
                        </Link>

                        <Link href="/super/users" className="group">
                            <div className="h-full p-8 rounded-2xl bg-gradient-to-br from-gray-900 to-black border border-white/10 hover:border-pink-500/50 transition-all duration-300 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <Settings className="w-24 h-24" />
                                </div>
                                <div className="relative z-10">
                                    <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center mb-6 text-pink-400 group-hover:scale-110 transition-transform">
                                        <Settings className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                        System Config <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </h3>
                                    <p className="text-gray-400 text-sm">Global settings, roles, and emergency controls.</p>
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
