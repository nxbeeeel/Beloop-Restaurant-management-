import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";

interface StatCardProps {
    title: string;
    value: string | number;
    description?: string;
    icon?: React.ReactNode;
    trend?: number;
    trendLabel?: string;
    className?: string;
}

export function StatCard({
    title,
    value,
    description,
    icon,
    trend,
    trendLabel,
    className,
}: StatCardProps) {
    return (
        <Card className={cn("overflow-hidden", className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                {icon && <div className="text-muted-foreground">{icon}</div>}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {(trend !== undefined || description) && (
                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                        {trend !== undefined && (
                            <span
                                className={cn(
                                    "flex items-center font-medium mr-2",
                                    trend > 0
                                        ? "text-emerald-500"
                                        : trend < 0
                                            ? "text-rose-500"
                                            : "text-muted-foreground"
                                )}
                            >
                                {trend > 0 ? (
                                    <ArrowUp className="h-3 w-3 mr-1" />
                                ) : trend < 0 ? (
                                    <ArrowDown className="h-3 w-3 mr-1" />
                                ) : (
                                    <Minus className="h-3 w-3 mr-1" />
                                )}
                                {Math.abs(trend)}%
                            </span>
                        )}
                        {description || trendLabel}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
