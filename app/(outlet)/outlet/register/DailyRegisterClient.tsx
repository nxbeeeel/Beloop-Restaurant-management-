"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { Loader2, Plus, Lock, History, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { OpenRegisterForm } from "./components/OpenRegisterForm";
import { RegisterDashboard } from "./components/RegisterDashboard";
import { ClosedRegisterView } from "./components/ClosedRegisterView";

interface DailyRegisterClientProps {
    outletId: string;
    userRole: string;
}

export default function DailyRegisterClient({ outletId, userRole }: DailyRegisterClientProps) {
    const today = format(new Date(), "yyyy-MM-dd");
    const [viewDate, setViewDate] = useState(today);

    // Fetch register for the selected date
    const { data: register, isLoading, refetch } = trpc.dailyRegister.getRegister.useQuery({
        outletId,
        date: viewDate,
    }, {
        refetchInterval: 30000, // Refresh every 30s
    });

    if (isLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const isToday = viewDate === today;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Daily Register</h1>
                    <p className="text-muted-foreground">
                        Manage cash flow, track expenses, and close daily sales.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Date Navigation - Simplified for now */}
                    {!isToday && (
                        <Button variant="outline" onClick={() => setViewDate(today)}>
                            Back to Today
                        </Button>
                    )}
                </div>
            </div>

            {/* Error State or No Register */}
            {!register ? (
                isToday ? (
                    <div className="grid gap-6">
                        <Alert className="bg-amber-50 border-amber-200">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            <AlertTitle className="text-amber-800">Register Not Open</AlertTitle>
                            <AlertDescription className="text-amber-700">
                                The daily register for today has not been opened yet.
                                Please count the physical cash in the drawer to begin.
                            </AlertDescription>
                        </Alert>
                        <OpenRegisterForm outletId={outletId} onSuccess={() => refetch()} />
                    </div>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle>No Record Found</CardTitle>
                            <CardDescription>No register was opened on {viewDate}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button variant="outline" onClick={() => setViewDate(today)}>
                                Go to Today
                            </Button>
                        </CardContent>
                    </Card>
                )
            ) : (
                // Register Exists (Open or Closed)
                <>
                    {register.status === "OPEN" ? (
                        <RegisterDashboard
                            register={register}
                            outletId={outletId}
                            onUpdate={() => refetch()}
                        />
                    ) : (
                        <ClosedRegisterView register={register} />
                    )}
                </>
            )}
        </div>
    );
}
