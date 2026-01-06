'use client';

import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/badge';
import { Loader2, Activity, Database, Zap, Server, Users, Building2, ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';

export default function SystemHealthPage() {
    const { data, isLoading } = trpc.superAdmin.system.getHealth.useQuery(undefined, {
        refetchInterval: 30000,
    });

    if (isLoading) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
            </div>
        );
    }

    if (!data) return <div className="text-stone-400">No data available</div>;

    const formatUptime = (seconds: number) => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${days}d ${hours}h ${minutes}m`;
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white">System Health</h1>
                <p className="text-stone-400">Monitor platform performance and status</p>
            </div>

            {/* Overall Status */}
            <div className="bg-stone-900 border border-stone-800 rounded-xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">System Status</h2>
                    <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30">
                        <Activity className="h-3 w-3 mr-1" />
                        {data.status.toUpperCase()}
                    </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-stone-800/50 rounded-lg p-4 border border-stone-700">
                        <p className="text-sm text-stone-400 mb-1">Uptime</p>
                        <p className="text-2xl font-bold text-white">{formatUptime(data.uptime)}</p>
                    </div>
                    <div className="bg-stone-800/50 rounded-lg p-4 border border-stone-700">
                        <p className="text-sm text-stone-400 mb-1">DB Latency</p>
                        <p className="text-2xl font-bold text-white">{data.dbLatency}ms</p>
                    </div>
                    <div className="bg-stone-800/50 rounded-lg p-4 border border-stone-700">
                        <p className="text-sm text-stone-400 mb-1">Last Check</p>
                        <p className="text-2xl font-bold text-white">{format(new Date(data.timestamp), 'HH:mm:ss')}</p>
                    </div>
                </div>
            </div>

            {/* Services Status */}
            <div className="bg-stone-900 border border-stone-800 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-6">Services</h2>
                <div className="grid gap-4">
                    {data.services.map((service) => (
                        <div key={service.name} className="flex justify-between items-center p-4 bg-stone-800/50 border border-stone-700 rounded-lg">
                            <div className="flex items-center gap-3">
                                {service.name === 'Database' && <Database className="h-5 w-5 text-blue-500" />}
                                {service.name === 'API' && <Server className="h-5 w-5 text-purple-500" />}
                                {service.name === 'Cache' && <Zap className="h-5 w-5 text-yellow-500" />}
                                <div>
                                    <p className="font-medium text-white">{service.name}</p>
                                    <p className="text-sm text-stone-500">Latency: {service.latency}</p>
                                </div>
                            </div>
                            <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30">
                                {service.status.toUpperCase()}
                            </Badge>
                        </div>
                    ))}
                </div>
            </div>

            {/* Platform Statistics */}
            <div className="bg-stone-900 border border-stone-800 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-6">Platform Statistics</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-6 bg-stone-800/50 border border-stone-700 rounded-lg">
                        <Building2 className="h-8 w-8 text-rose-500 mx-auto mb-3" />
                        <p className="text-sm text-stone-400 mb-2">Total Tenants</p>
                        <p className="text-4xl font-bold text-white">{data.stats.tenants}</p>
                    </div>
                    <div className="text-center p-6 bg-stone-800/50 border border-stone-700 rounded-lg">
                        <Users className="h-8 w-8 text-blue-500 mx-auto mb-3" />
                        <p className="text-sm text-stone-400 mb-2">Total Users</p>
                        <p className="text-4xl font-bold text-white">{data.stats.users}</p>
                    </div>
                    <div className="text-center p-6 bg-stone-800/50 border border-stone-700 rounded-lg">
                        <ShoppingCart className="h-8 w-8 text-emerald-500 mx-auto mb-3" />
                        <p className="text-sm text-stone-400 mb-2">Total Sales Records</p>
                        <p className="text-4xl font-bold text-white">{data.stats.totalSales.toLocaleString()}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
