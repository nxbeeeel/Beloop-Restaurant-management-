'use client';

import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Activity, Database, Zap, Server } from 'lucide-react';
import { format } from 'date-fns';

export default function SystemHealthPage() {
    const { data, isLoading } = trpc.super.getSystemHealth.useQuery(undefined, {
        refetchInterval: 30000, // Refetch every 30 seconds
    });

    if (isLoading) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!data) return <div>No data available</div>;

    const formatUptime = (seconds: number) => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${days}d ${hours}h ${minutes}m`;
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">System Health</h1>
                <p className="text-muted-foreground">Monitor platform performance and status</p>
            </div>

            {/* Overall Status */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>System Status</CardTitle>
                        <Badge variant="default" className="bg-green-500 hover:bg-green-500">
                            <Activity className="h-3 w-3 mr-1" />
                            {data.status.toUpperCase()}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Uptime</p>
                            <p className="text-2xl font-bold">{formatUptime(data.uptime)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">DB Latency</p>
                            <p className="text-2xl font-bold">{data.dbLatency}ms</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Last Check</p>
                            <p className="text-2xl font-bold">{format(new Date(data.timestamp), 'HH:mm:ss')}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Services Status */}
            <Card>
                <CardHeader>
                    <CardTitle>Services</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {data.services.map((service) => (
                            <div key={service.name} className="flex justify-between items-center p-4 border rounded-lg">
                                <div className="flex items-center gap-3">
                                    {service.name === 'Database' && <Database className="h-5 w-5 text-blue-500" />}
                                    {service.name === 'API' && <Server className="h-5 w-5 text-purple-500" />}
                                    {service.name === 'Cache' && <Zap className="h-5 w-5 text-yellow-500" />}
                                    <div>
                                        <p className="font-medium">{service.name}</p>
                                        <p className="text-sm text-muted-foreground">Latency: {service.latency}</p>
                                    </div>
                                </div>
                                <Badge variant="default" className="bg-green-500 hover:bg-green-500">
                                    {service.status.toUpperCase()}
                                </Badge>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Platform Statistics */}
            <Card>
                <CardHeader>
                    <CardTitle>Platform Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center p-4 border rounded-lg">
                            <p className="text-sm text-muted-foreground mb-2">Total Tenants</p>
                            <p className="text-3xl font-bold">{data.stats.tenants}</p>
                        </div>
                        <div className="text-center p-4 border rounded-lg">
                            <p className="text-sm text-muted-foreground mb-2">Total Users</p>
                            <p className="text-3xl font-bold">{data.stats.users}</p>
                        </div>
                        <div className="text-center p-4 border rounded-lg">
                            <p className="text-sm text-muted-foreground mb-2">Total Sales Records</p>
                            <p className="text-3xl font-bold">{data.stats.totalSales.toLocaleString()}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
