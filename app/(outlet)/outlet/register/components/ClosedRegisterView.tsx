"use client";

import { format } from "date-fns";
import { Lock, History, Printer, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TransactionList } from "./TransactionList";

interface ClosedRegisterViewProps {
    register: any; // Ideally strictly typed
}

export function ClosedRegisterView({ register }: ClosedRegisterViewProps) {
    const cashSales = Number(register.totalCashIn || 0);
    const upiSales = Number(register.totalUPI || 0);
    const cardSales = Number(register.totalCard || 0);
    const totalSales = cashSales + upiSales + cardSales;

    // Variance calculation
    const variance = Number(register.closingVariance || 0);
    const isVarianceNegative = variance < 0;
    const absVariance = Math.abs(variance);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="bg-gray-100 text-gray-700 px-3 py-1">
                            <Lock className="w-3 h-3 mr-1" />
                            Closed
                        </Badge>
                        <h2 className="text-2xl font-bold tracking-tight">Register Summary</h2>
                    </div>
                    <p className="text-muted-foreground">
                        Closed by {register.closedByName} at {format(new Date(register.closedAt), "h:mm a")}
                    </p>
                </div>
                <Button variant="outline">
                    <Printer className="h-4 w-4 mr-2" />
                    Print Z-Report
                </Button>
            </div>

            {/* Closing Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="col-span-1 lg:col-span-1 border-t-4 border-t-gray-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Collected Cash
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{Number(register.physicalCash).toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                            System Expected: ₹{Number(register.systemCash).toFixed(2)}
                        </div>
                    </CardContent>
                </Card>

                <Card className={`col-span-1 lg:col-span-1 border-t-4 ${absVariance === 0 ? "border-t-green-500" : "border-t-red-500"
                    }`}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Variance / Discrepancy
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold flex items-center gap-1 ${absVariance === 0 ? "text-green-600" : "text-red-600"
                            }`}>
                            {absVariance === 0 ? (
                                <span>Matches Perfectly</span>
                            ) : (
                                <>
                                    {isVarianceNegative ? "-" : "+"}₹{absVariance.toFixed(2)}
                                </>
                            )}
                        </div>
                        {register.varianceReason && (
                            <div className="text-xs text-muted-foreground mt-1 italic">
                                "{register.varianceReason}"
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="col-span-1 lg:col-span-1 border-t-4 border-t-blue-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Sales (All Modes)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{totalSales.toFixed(2)}</div>
                        <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                            <span>Cash: ₹{cashSales}</span> •
                            <span>UPI: ₹{upiSales}</span> •
                            <span>Card: ₹{cardSales}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Separator />

            {/* Detailed Transaction History */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <History className="h-5 w-5 text-muted-foreground" />
                    Transaction History
                </h3>
                <Card>
                    <CardContent className="p-0">
                        <TransactionList registerId={register.id} type="ALL" />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
