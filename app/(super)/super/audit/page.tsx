'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import {
    Activity, Search, Filter, Clock, User, Database,
    ChevronRight, Loader2, AlertCircle, RefreshCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDistanceToNow } from 'date-fns';

// Action color mapping
const actionColors: Record<string, string> = {
    CREATE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    UPDATE: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    DELETE: 'bg-red-500/10 text-red-400 border-red-500/30',
    LOGIN: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    DEFAULT: 'bg-stone-500/10 text-stone-400 border-stone-500/30',
};

const getActionColor = (action: string) => {
    const upperAction = action.toUpperCase();
    if (upperAction.includes('CREATE') || upperAction.includes('INVITE')) return actionColors.CREATE;
    if (upperAction.includes('UPDATE') || upperAction.includes('CHANGE')) return actionColors.UPDATE;
    if (upperAction.includes('DELETE') || upperAction.includes('REMOVE')) return actionColors.DELETE;
    if (upperAction.includes('LOGIN') || upperAction.includes('AUTH')) return actionColors.LOGIN;
    return actionColors.DEFAULT;
};

export default function AuditLogPage() {
    const [actionFilter, setActionFilter] = useState<string>('ALL');
    const [tableFilter, setTableFilter] = useState<string>('ALL');

    const { data, isLoading, refetch, isRefetching } = trpc.super.getAuditLogs.useQuery({
        limit: 50,
        action: actionFilter === 'ALL' ? undefined : actionFilter,
        tableName: tableFilter === 'ALL' ? undefined : tableFilter,
    });

    const logs = data?.logs || [];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <Activity className="w-8 h-8 text-rose-500" />
                        Activity Audit Log
                    </h2>
                    <p className="text-stone-400 mt-1">
                        Track all administrative actions across the platform.
                    </p>
                </div>
                <Button
                    onClick={() => refetch()}
                    variant="outline"
                    className="border-stone-700 text-stone-300 hover:bg-stone-800"
                    disabled={isRefetching}
                >
                    <RefreshCcw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-4 bg-stone-900 p-4 rounded-xl border border-stone-800">
                <div className="flex items-center gap-2 text-stone-400">
                    <Filter className="w-4 h-4" />
                    <span className="text-sm font-medium">Filters:</span>
                </div>

                <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger className="w-[180px] bg-stone-950 border-stone-800 text-white">
                        <SelectValue placeholder="Action Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-stone-900 border-stone-800 text-white">
                        <SelectItem value="ALL">All Actions</SelectItem>
                        <SelectItem value="CREATE">Create</SelectItem>
                        <SelectItem value="UPDATE">Update</SelectItem>
                        <SelectItem value="DELETE">Delete</SelectItem>
                        <SelectItem value="LOGIN">Login</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={tableFilter} onValueChange={setTableFilter}>
                    <SelectTrigger className="w-[180px] bg-stone-950 border-stone-800 text-white">
                        <SelectValue placeholder="Entity Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-stone-900 border-stone-800 text-white">
                        <SelectItem value="ALL">All Entities</SelectItem>
                        <SelectItem value="Tenant">Tenant</SelectItem>
                        <SelectItem value="User">User</SelectItem>
                        <SelectItem value="Outlet">Outlet</SelectItem>
                        <SelectItem value="Invitation">Invitation</SelectItem>
                    </SelectContent>
                </Select>

                {(actionFilter !== 'ALL' || tableFilter !== 'ALL') && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setActionFilter('ALL'); setTableFilter('ALL'); }}
                        className="text-stone-400 hover:text-white"
                    >
                        Clear Filters
                    </Button>
                )}
            </div>

            {/* Timeline */}
            <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-stone-800" />

                {isLoading ? (
                    <div className="space-y-4 ml-14">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Skeleton key={i} className="h-24 w-full bg-stone-900 rounded-xl" />
                        ))}
                    </div>
                ) : logs.length === 0 ? (
                    <Card className="bg-stone-900 border-stone-800 p-12 text-center ml-14">
                        <AlertCircle className="w-12 h-12 text-stone-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">No Activity Yet</h3>
                        <p className="text-stone-400">
                            Audit logs will appear here as actions are performed.
                        </p>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {logs.map((log, index) => (
                            <div key={log.id} className="relative flex items-start gap-4 group">
                                {/* Timeline dot */}
                                <div className={`
                                    relative z-10 w-12 h-12 rounded-full flex items-center justify-center
                                    bg-stone-900 border-2 border-stone-700 group-hover:border-rose-500 transition-colors
                                `}>
                                    <Activity className="w-5 h-5 text-stone-400 group-hover:text-rose-400 transition-colors" />
                                </div>

                                {/* Content Card */}
                                <Card className="flex-1 bg-stone-900 border-stone-800 hover:border-stone-700 transition-colors p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Badge className={`${getActionColor(log.action)} border`}>
                                                    {log.action}
                                                </Badge>
                                                <Badge variant="outline" className="border-stone-700 text-stone-400">
                                                    <Database className="w-3 h-3 mr-1" />
                                                    {log.tableName}
                                                </Badge>
                                            </div>

                                            <p className="text-white font-medium">
                                                {log.userName || 'System'} performed {log.action.toLowerCase()} on {log.tableName}
                                            </p>

                                            <div className="flex items-center gap-4 mt-2 text-sm text-stone-500">
                                                <span className="flex items-center gap-1">
                                                    <User className="w-3 h-3" />
                                                    {log.user?.email || 'Unknown'}
                                                </span>
                                                {log.tenant && (
                                                    <span className="flex items-center gap-1">
                                                        <Database className="w-3 h-3" />
                                                        {log.tenant.name}
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                                                </span>
                                            </div>
                                        </div>

                                        <Button variant="ghost" size="icon" className="text-stone-500 hover:text-white">
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    {/* Details expansion (optional) */}
                                    {(log.oldValue || log.newValue) && (
                                        <details className="mt-3 pt-3 border-t border-stone-800">
                                            <summary className="text-xs text-stone-500 cursor-pointer hover:text-stone-300">
                                                View Changes
                                            </summary>
                                            <div className="mt-2 grid grid-cols-2 gap-4 text-xs">
                                                {log.oldValue && (
                                                    <div className="bg-red-500/5 border border-red-500/20 rounded p-2">
                                                        <span className="text-red-400 font-medium">Before:</span>
                                                        <pre className="text-stone-400 mt-1 overflow-auto">
                                                            {JSON.stringify(log.oldValue, null, 2)}
                                                        </pre>
                                                    </div>
                                                )}
                                                {log.newValue && (
                                                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded p-2">
                                                        <span className="text-emerald-400 font-medium">After:</span>
                                                        <pre className="text-stone-400 mt-1 overflow-auto">
                                                            {JSON.stringify(log.newValue, null, 2)}
                                                        </pre>
                                                    </div>
                                                )}
                                            </div>
                                        </details>
                                    )}
                                </Card>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Load More */}
            {data?.nextCursor && (
                <div className="text-center pt-4">
                    <Button variant="outline" className="border-stone-700 text-stone-300">
                        Load More
                    </Button>
                </div>
            )}
        </div>
    );
}
