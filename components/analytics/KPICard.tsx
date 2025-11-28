import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "lucide-react";
import { ScaleIn } from "@/components/ui/animations";
import { cn } from "@/lib/utils";

interface KPICardProps {
    title: string;
    value: string | number;
    subValue?: string;
    trend?: number; // Percentage change
    trendLabel?: string;
    icon?: React.ReactNode;
    status?: "success" | "warning" | "danger" | "neutral";
    className?: string;
    delay?: number;
}

export function KPICard({ title, value, subValue, trend, trendLabel, icon, status = "neutral", className, delay = 0 }: KPICardProps) {
    const getStatusColor = () => {
        switch (status) {
            case "success": return "text-green-600 bg-green-100";
            case "warning": return "text-yellow-600 bg-yellow-100";
            case "danger": return "text-red-600 bg-red-100";
            default: return "text-gray-600 bg-gray-100";
        }
    };

    return (
        <ScaleIn delay={delay} className={cn("h-full", className)}>
            <Card className="h-full border-none shadow-sm bg-white/60 backdrop-blur-xl hover:shadow-md transition-all duration-300 hover:bg-white/80 ring-1 ring-gray-200/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        {title}
                    </CardTitle>
                    {icon && (
                        <div className={cn("p-2 rounded-full", getStatusColor())}>
                            {icon}
                        </div>
                    )}
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold tracking-tight">{value}</div>
                    {(subValue || trend !== undefined) && (
                        <div className="flex items-center text-xs text-muted-foreground mt-2">
                            {trend !== undefined && (
                                <span className={cn(
                                    "flex items-center mr-2 font-medium px-1.5 py-0.5 rounded-full",
                                    trend > 0 ? "text-green-700 bg-green-50" : trend < 0 ? "text-red-700 bg-red-50" : "text-gray-700 bg-gray-50"
                                )}>
                                    {trend > 0 ? <ArrowUpIcon className="h-3 w-3 mr-1" /> : trend < 0 ? <ArrowDownIcon className="h-3 w-3 mr-1" /> : <MinusIcon className="h-3 w-3 mr-1" />}
                                    {Math.abs(trend)}%
                                </span>
                            )}
                            {subValue && <span>{subValue}</span>}
                            {trendLabel && <span className="ml-1 text-gray-400">{trendLabel}</span>}
                        </div>
                    )}
                </CardContent>
            </Card>
        </ScaleIn>
    );
}
