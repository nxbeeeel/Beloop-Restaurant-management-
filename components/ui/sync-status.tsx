"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export function SyncStatus() {
    const utils = trpc.useUtils();
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Poll every 30 seconds for status update
    const { data: status, isLoading } = trpc.brandAnalytics.getSyncStatus.useQuery(undefined, {
        refetchInterval: 30000
    });

    const refreshMutation = trpc.brandAnalytics.refresh.useMutation({
        onMutate: () => {
            setIsRefreshing(true);
        },
        onSuccess: async () => {
            await utils.brandAnalytics.getSyncStatus.invalidate();
            await utils.brandAnalytics.getBrandOverview.invalidate();
            await utils.brandAnalytics.getOutletPerformance.invalidate();
            toast.success("Dashboard metrics refreshed");
        },
        onError: (err) => {
            toast.error(err.message);
        },
        onSettled: () => {
            setIsRefreshing(false);
        }
    });

    const handleRefresh = () => {
        refreshMutation.mutate();
    };

    if (isLoading) return null;

    return (
        <div className="flex items-center gap-3 text-sm">
            {status?.lastSyncedAt ? (
                <div className="flex items-center gap-1.5 text-gray-500">
                    <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                    <span className="hidden sm:inline">Synced {formatDistanceToNow(new Date(status.lastSyncedAt), { addSuffix: true })}</span>
                </div>
            ) : (
                <div className="flex items-center gap-1.5 text-amber-600">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Not synced today</span>
                </div>
            )}

            <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing || refreshMutation.isPending}
                className="h-8 gap-2 bg-white"
            >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Sync Now</span>
            </Button>
        </div>
    );
}
