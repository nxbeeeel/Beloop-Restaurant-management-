"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, IndianRupee, Calendar, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export default function PaymentsPage() {
    const { data: user } = trpc.dashboard.getUser.useQuery();
    const outletId = user?.outletId || "";

    const { data: payments, isLoading } = trpc.payments.list.useQuery(
        { outletId },
        { enabled: !!outletId }
    );

    return (
        <div className="space-y-6 pb-24 lg:pb-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">Supplier Payments</h1>
                    <p className="text-gray-500 text-sm lg:text-base">Track payments made to suppliers</p>
                </div>
                <Link href="/outlet/payments/create">
                    <Button className="bg-primary">
                        <Plus className="w-4 h-4 mr-2" />
                        Record Payment
                    </Button>
                </Link>
            </div>

            {isLoading ? (
                <div className="text-center py-12">Loading...</div>
            ) : (
                <div className="grid gap-4">
                    {payments?.map((payment) => (
                        <Card key={payment.id} className="hover:bg-gray-50 transition-colors">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <IndianRupee className="w-5 h-5 text-gray-500" />
                                        {payment.supplier.name}
                                    </CardTitle>
                                    <Badge variant="outline">
                                        {payment.method}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-between items-end">
                                    <div className="text-sm text-gray-600 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4" />
                                            {new Date(payment.date).toLocaleDateString()}
                                        </div>
                                        {payment.reference && (
                                            <div className="text-xs text-gray-400">
                                                Ref: {payment.reference}
                                            </div>
                                        )}
                                    </div>
                                    <div className="font-bold text-lg text-gray-900">
                                        ₹{Number(payment.amount).toFixed(2)}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {payments?.length === 0 && (
                        <div className="text-center py-12 text-gray-500 border-2 border-dashed rounded-lg">
                            No payments recorded
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
