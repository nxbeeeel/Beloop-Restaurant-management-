'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
    title: string;
    value: string | number;
    change?: number;
    trend?: 'up' | 'down' | 'neutral';
    icon: LucideIcon;
    loading?: boolean;
    description?: string;
}

export function KPICard({
    title,
    value,
    change,
    trend = 'neutral',
    icon: Icon,
    loading = false,
    description
}: KPICardProps) {
    if (loading) {
        return (
            <Card className="hover:shadow-lg transition-all duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-4 rounded" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-8 w-32 mb-2" />
                    <Skeleton className="h-3 w-full" />
                </CardContent>
            </Card>
        );
    }

    const trendColor = {
        up: 'text-green-600',
        down: 'text-red-600',
        neutral: 'text-gray-600'
    }[trend];

    const trendBg = {
        up: 'bg-green-50',
        down: 'bg-red-50',
        neutral: 'bg-gray-50'
    }[trend];

    return (
        <Card className="hover:shadow-lg transition-all duration-200 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                    {title}
                </CardTitle>
                <div className={cn(
                    "p-2 rounded-lg transition-colors",
                    trendBg,
                    "group-hover:scale-110 transition-transform duration-200"
                )}>
                    <Icon className={cn("h-4 w-4", trendColor)} />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold text-gray-900 mb-1 transition-all duration-300">
                    {value}
                </div>
                {change !== undefined && (
                    <p className={cn("text-xs font-medium flex items-center gap-1", trendColor)}>
                        {change > 0 ? '↑' : change < 0 ? '↓' : '→'}
                        <span>{Math.abs(change)}%</span>
                        <span className="text-gray-500">from last period</span>
                    </p>
                )}
                {description && (
                    <p className="text-xs text-gray-500 mt-1">{description}</p>
                )}
            </CardContent>
        </Card>
    );
}
