import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface TenantHealth {
    id: string;
    name: string;
    status: string;
    outlets: number;
    users: number;
    monthlyRevenue: number;
    lastActivity: Date;
    healthScore: number;
}

interface TenantHealthTableProps {
    tenants: TenantHealth[];
}

export function TenantHealthTable({ tenants }: TenantHealthTableProps) {
    const getHealthColor = (score: number) => {
        if (score >= 90) return "text-emerald-500";
        if (score >= 70) return "text-yellow-500";
        if (score >= 50) return "text-orange-500";
        return "text-rose-500";
    };

    const getHealthIcon = (score: number) => {
        if (score >= 90) return <CheckCircle className="h-4 w-4 text-emerald-500" />;
        if (score >= 70) return <CheckCircle className="h-4 w-4 text-yellow-500" />;
        if (score >= 50) return <AlertTriangle className="h-4 w-4 text-orange-500" />;
        return <XCircle className="h-4 w-4 text-rose-500" />;
    };

    return (
        <Card className="col-span-4 lg:col-span-3">
            <CardHeader>
                <CardTitle>Tenant Health Monitor</CardTitle>
                <CardDescription>
                    Real-time health status of all active tenants based on activity and revenue.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tenant</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Health</TableHead>
                            <TableHead className="text-right">Revenue (30d)</TableHead>
                            <TableHead className="text-right">Users</TableHead>
                            <TableHead className="text-right">Last Activity</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tenants.map((tenant) => (
                            <TableRow key={tenant.id}>
                                <TableCell className="font-medium">{tenant.name}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                        Active
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        {getHealthIcon(tenant.healthScore)}
                                        <span className={getHealthColor(tenant.healthScore)}>
                                            {tenant.healthScore}%
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    ₹{tenant.monthlyRevenue.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right">{tenant.users}</TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                    {formatDistanceToNow(new Date(tenant.lastActivity), { addSuffix: true })}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
