'use client';

import { Suspense } from 'react';
import { trpc } from "@/lib/trpc";
import { Plus, Search, Building2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function TenantManagementPage() {
    const { data: tenants, isLoading } = trpc.superAnalytics.getTenantHealth.useQuery();

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">Tenants</h2>
                    <p className="text-stone-400">Manage all registered brands and restaurant chains.</p>
                </div>
                <Button className="bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-500/20">
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Tenant
                </Button>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-4 bg-stone-900 p-4 rounded-xl border border-stone-800">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                    <Input
                        placeholder="Search tenants..."
                        className="pl-9 bg-stone-950 border-stone-800 text-white placeholder:text-stone-600 focus-visible:ring-rose-500"
                    />
                </div>
                <Button variant="outline" className="border-stone-800 text-stone-300 hover:bg-stone-800 hover:text-white">
                    Filter Status
                </Button>
            </div>

            {/* Tenant List */}
            <div className="grid gap-4">
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-20 w-full bg-stone-900 rounded-xl" />
                        ))}
                    </div>
                ) : (
                    tenants?.map((tenant: any) => (
                        <Card key={tenant.id} className="bg-stone-900 border-stone-800 hover:bg-stone-800/50 transition-colors group">
                            <div className="p-6 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center">
                                        {tenant.logoUrl ? (
                                            <img src={tenant.logoUrl} alt={tenant.name} className="w-8 h-8 object-contain" />
                                        ) : (
                                            <Building2 className="w-6 h-6 text-stone-500" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-white group-hover:text-rose-400 transition-colors">{tenant.name}</h3>
                                        <div className="flex items-center gap-2 text-sm text-stone-500">
                                            <span>{tenant.id}</span>
                                            <span>•</span>
                                            <span>{tenant.userCount ?? 0} Users</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="text-right hidden md:block">
                                        <p className="text-sm font-medium text-stone-300">₹{tenant.monthlyRevenue?.toLocaleString() ?? 0}</p>
                                        <p className="text-xs text-stone-500">Monthly Revenue</p>
                                    </div>

                                    <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-500">
                                        Active
                                    </Badge>

                                    <Button variant="ghost" size="icon" className="text-stone-400 hover:text-white hover:bg-stone-800">
                                        <MoreHorizontal className="w-5 h-5" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))
                )}

                {(!isLoading && (!tenants || tenants.length === 0)) && (
                    <div className="text-center py-20 bg-stone-900 rounded-xl border border-stone-800 border-dashed">
                        <Building2 className="w-12 h-12 text-stone-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">No Tenants Found</h3>
                        <p className="text-stone-500 max-w-sm mx-auto mb-6">Start by creating your first brand manually or invite a brand owner.</p>
                        <Button className="bg-rose-600 hover:bg-rose-700 text-white">Create Tenant</Button>
                    </div>
                )}
            </div>
        </div>
    );
}
