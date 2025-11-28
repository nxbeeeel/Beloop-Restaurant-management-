import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Building2, UserPlus, DollarSign } from "lucide-react";

interface Activity {
    id: string;
    type: 'TENANT_CREATED' | 'USER_REGISTERED' | 'HIGH_VALUE_SALE';
    description: string;
    timestamp: Date;
    metadata?: any;
}

interface ActivityFeedProps {
    activities: Activity[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'TENANT_CREATED':
                return <Building2 className="h-4 w-4 text-blue-500" />;
            case 'USER_REGISTERED':
                return <UserPlus className="h-4 w-4 text-emerald-500" />;
            case 'HIGH_VALUE_SALE':
                return <DollarSign className="h-4 w-4 text-amber-500" />;
            default:
                return <Building2 className="h-4 w-4" />;
        }
    };

    return (
        <Card className="col-span-4 lg:col-span-2">
            <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                    Latest actions across the platform
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-8">
                    {activities.map((activity) => (
                        <div key={activity.id} className="flex items-center">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full border bg-muted">
                                {getActivityIcon(activity.type)}
                            </div>
                            <div className="ml-4 space-y-1">
                                <p className="text-sm font-medium leading-none">
                                    {activity.description}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                                </p>
                            </div>
                        </div>
                    ))}
                    {activities.length === 0 && (
                        <div className="text-center text-muted-foreground py-8">
                            No recent activity
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
