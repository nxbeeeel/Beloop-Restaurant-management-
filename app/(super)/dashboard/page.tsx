import Link from "next/link";
import { Shield, Building2, Users, Settings } from "lucide-react";
import LogoutButton from "@/components/LogoutButton";

export default function SuperDashboard() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-8">
            {/* Header */}
            <header className="flex justify-between items-center mb-12">
                <h1 className="text-4xl font-bold flex items-center gap-3">
                    <Shield className="w-8 h-8 text-yellow-400" />
                    Super Admin Dashboard
                </h1>
                <LogoutButton />
            </header>

            {/* Tagline */}
            <p className="text-xl mb-8 text-gray-300">
                Central Command Center: Manage Users, Tenants, and Platform Settings.
            </p>

            {/* Action Cards */}
            <div className="grid md:grid-cols-3 gap-8">
                {/* Brands & Tenants */}
                <Link href="/super/tenants" className="block">
                    <div className="bg-gray-800 rounded-xl p-6 hover:bg-gray-700 transition-colors border border-gray-600">
                        <div className="flex items-center gap-3 mb-4">
                            <Building2 className="w-6 h-6 text-indigo-400" />
                            <h2 className="text-2xl font-semibold">Brands & Tenants</h2>
                        </div>
                        <p className="text-gray-400">View and manage all tenant brands.</p>
                    </div>
                </Link>

                {/* Applications */}
                <Link href="/super/applications" className="block">
                    <div className="bg-gray-800 rounded-xl p-6 hover:bg-gray-700 transition-colors border border-gray-600">
                        <div className="flex items-center gap-3 mb-4">
                            <Users className="w-6 h-6 text-green-400" />
                            <h2 className="text-2xl font-semibold">Applications</h2>
                        </div>
                        <p className="text-gray-400">Review new brand applications.</p>
                    </div>
                </Link>

                {/* Settings / Users */}
                <Link href="/super/users" className="block">
                    <div className="bg-gray-800 rounded-xl p-6 hover:bg-gray-700 transition-colors border border-gray-600">
                        <div className="flex items-center gap-3 mb-4">
                            <Settings className="w-6 h-6 text-pink-400" />
                            <h2 className="text-2xl font-semibold">Users & Settings</h2>
                        </div>
                        <p className="text-gray-400">Invite, edit roles, and configure platform.</p>
                    </div>
                </Link>
            </div>
        </div>
    );
}
