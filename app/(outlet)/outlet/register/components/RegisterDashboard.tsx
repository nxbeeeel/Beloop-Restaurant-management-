"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { Loader2, Plus, Minus, ArrowUp, ArrowDown, History, Lock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
// Sub-components (will create next)
import { TransactionList } from "./TransactionList";
import { AddTransactionDialog } from "./AddTransactionDialog";
import { CloseRegisterDialog } from "./CloseRegisterDialog";
import { WithdrawalDialog } from "./WithdrawalDialog";

interface RegisterMetricsProps {
    label: string;
    value: number;
    subValue?: string;
    icon: React.ElementType;
    trend?: "up" | "down" | "neutral";
    color?: string;
}

function RegisterMetricCard({ label, value, subValue, icon: Icon, color = "text-primary" }: RegisterMetricsProps) {
    return (
        <Card>
            <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                    <p className="text-sm font-medium text-muted-foreground">{label}</p>
                    <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <div className="flex flex-col gap-1">
                    <div className="text-2xl font-bold">₹{value.toFixed(2)}</div>
                    {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
                </div>
            </CardContent>
        </Card>
    );
}

interface RegisterDashboardProps {
    register: any; // Ideally strictly typed from router output
    outletId: string;
    onUpdate: () => void;
}

export function RegisterDashboard({ register, outletId, onUpdate }: RegisterDashboardProps) {
    const [activeTab, setActiveTab] = useState("overview");

    // Calculate current running balance
    const currentBalance =
        Number(register.actualOpening) +
        Number(register.totalCashIn) -
        Number(register.totalCashOut);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Actions */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-3 py-1">
                        <span className="w-2 h-2 rounded-full bg-green-600 mr-2 animate-pulse" />
                        Register Open
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                        Opened by {register.openedByName} at {format(new Date(register.openedAt), "h:mm a")}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={onUpdate}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <CloseRegisterDialog
                        registerId={register.id}
                        currentBalance={currentBalance}
                        outletId={outletId}
                        onSuccess={onUpdate}
                    />
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <RegisterMetricCard
                    label="Current Cash in Drawer"
                    value={currentBalance}
                    subValue={`Opening: ₹${Number(register.actualOpening).toFixed(2)}`}
                    icon={Lock}
                    color="text-blue-600"
                />
                <RegisterMetricCard
                    label="Total Cash Sales"
                    value={Number(register.totalCashIn)}
                    icon={ArrowUp}
                    color="text-green-600"
                />
                <RegisterMetricCard
                    label="Total Cash Out"
                    value={Number(register.totalCashOut)}
                    subValue="Expenses & Withdrawals"
                    icon={ArrowDown}
                    color="text-red-600"
                />
                <RegisterMetricCard
                    label="Digital Sales"
                    value={Number(register.totalUPI) + Number(register.totalCard)}
                    subValue={`UPI: ₹${Number(register.totalUPI)} • Card: ₹${Number(register.totalCard)}`}
                    icon={History}
                    color="text-purple-600"
                />
            </div>

            {/* Main Content Areas */}
            <Tabs defaultValue="overview" className="space-y-4" onValueChange={setActiveTab}>
                <div className="flex items-center justify-between">
                    <TabsList>
                        <TabsTrigger value="overview">Transactions</TabsTrigger>
                        <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-2">
                        <WithdrawalDialog
                            registerId={register.id}
                            outletId={outletId}
                            onSuccess={onUpdate}
                        />
                        <AddTransactionDialog
                            registerId={register.id}
                            outletId={outletId}
                            onSuccess={onUpdate}
                        />
                    </div>
                </div>

                <TabsContent value="overview" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Today's Transactions</CardTitle>
                            <CardDescription>
                                Monitor cash inflows and outflows in real-time.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <TransactionList
                                registerId={register.id}
                                type="ALL"
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="withdrawals" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Cash Withdrawals</CardTitle>
                            <CardDescription>
                                Track cash drops, petty cash usage, and owner withdrawals.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <TransactionList
                                registerId={register.id}
                                type="WITHDRAWAL"
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
