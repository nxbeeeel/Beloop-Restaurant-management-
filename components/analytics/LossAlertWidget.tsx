import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface LossOutlet {
    id: string;
    name: string;
    netProfit: number;
    revenue: number;
}

interface LossAlertWidgetProps {
    outlets: LossOutlet[];
}

export function LossAlertWidget({ outlets }: LossAlertWidgetProps) {
    if (outlets.length === 0) return null;

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    return (
        <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-red-700 text-lg">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    Attention Required: Loss Making Outlets
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    <p className="text-sm text-red-600">
                        The following {outlets.length} outlets have reported a net loss this month. Immediate review recommended.
                    </p>
                    <div className="grid gap-2">
                        {outlets.map((outlet) => (
                            <div key={outlet.id} className="flex items-center justify-between bg-white p-3 rounded border border-red-100 shadow-sm">
                                <div>
                                    <div className="font-medium text-gray-900">{outlet.name}</div>
                                    <div className="text-xs text-gray-500">Revenue: {formatCurrency(outlet.revenue)}</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-red-600">{formatCurrency(outlet.netProfit)}</div>
                                    <Button variant="link" className="h-auto p-0 text-xs text-red-500 hover:text-red-700">
                                        Review Performance &rarr;
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
