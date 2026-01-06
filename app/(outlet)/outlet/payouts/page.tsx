"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useOutlet } from "@/hooks/use-outlet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, IndianRupee, Plus, Download, TrendingUp, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, exportToCsv } from "@/lib/export";
import { Skeleton, SkeletonTable } from "@/components/ui/skeleton-loaders";

// Aggregator options
const AGGREGATORS = [
    { id: "ZOMATO", name: "Zomato", color: "bg-red-100 text-red-700" },
    { id: "SWIGGY", name: "Swiggy", color: "bg-orange-100 text-orange-700" },
    { id: "OTHER", name: "Other Online", color: "bg-blue-100 text-blue-700" },
];

export default function PayoutsPage() {
    const { outletId, isLoading: userLoading } = useOutlet();
    const [isAddOpen, setIsAddOpen] = useState(false);

    // Form state
    const [aggregator, setAggregator] = useState<string>("ZOMATO");
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [reference, setReference] = useState("");

    // Month filter
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    const months = useMemo(() => {
        const result = [];
        const now = new Date();
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            result.push({
                value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
                label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            });
        }
        return result;
    }, []);

    // TODO: Fetch payouts from backend
    // For now, using mock data
    const payouts = [
        { id: "1", aggregator: "ZOMATO", amount: 15000, date: new Date("2026-01-05"), reference: "ZOM-12345" },
        { id: "2", aggregator: "SWIGGY", amount: 12500, date: new Date("2026-01-04"), reference: "SWG-67890" },
        { id: "3", aggregator: "ZOMATO", amount: 18000, date: new Date("2026-01-01"), reference: "ZOM-11111" },
    ];

    // Calculate totals
    const totalZomato = payouts.filter(p => p.aggregator === "ZOMATO").reduce((sum, p) => sum + p.amount, 0);
    const totalSwiggy = payouts.filter(p => p.aggregator === "SWIGGY").reduce((sum, p) => sum + p.amount, 0);
    const totalOther = payouts.filter(p => p.aggregator === "OTHER").reduce((sum, p) => sum + p.amount, 0);
    const grandTotal = totalZomato + totalSwiggy + totalOther;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || parseFloat(amount) <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }
        // TODO: Call backend mutation
        toast.success(`Payout of ${formatCurrency(parseFloat(amount))} recorded from ${aggregator}`);
        setIsAddOpen(false);
        resetForm();
    };

    const resetForm = () => {
        setAggregator("ZOMATO");
        setAmount("");
        setDate(new Date().toISOString().split("T")[0]);
        setReference("");
    };

    const handleExport = () => {
        if (!payouts.length) {
            toast.error("No payouts to export");
            return;
        }
        exportToCsv(payouts, [
            { header: "Date", accessor: (r) => formatDate(r.date) },
            { header: "Aggregator", accessor: "aggregator" },
            { header: "Amount (₹)", accessor: (r) => r.amount.toFixed(2) },
            { header: "Reference", accessor: "reference" },
        ], `payouts-${selectedMonth}`);
        toast.success("Exported to CSV");
    };

    const getAggregatorBadge = (aggregatorId: string) => {
        const agg = AGGREGATORS.find(a => a.id === aggregatorId);
        return agg ? <Badge className={agg.color}>{agg.name}</Badge> : <Badge>{aggregatorId}</Badge>;
    };

    if (userLoading) {
        return (
            <div className="space-y-6 pb-20">
                <Skeleton className="h-8 w-64" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                </div>
                <SkeletonTable rows={5} cols={4} />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20 md:pb-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                        <Upload className="h-7 w-7 text-primary" />
                        Aggregator Payouts
                    </h1>
                    <p className="text-gray-500 text-sm">Track payments received from Zomato, Swiggy, and other platforms</p>
                </div>
                <div className="flex gap-2">
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-[160px]">
                            <Calendar className="h-4 w-4 mr-2" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {months.map(m => (
                                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                    <Button onClick={() => setIsAddOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Payout
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-green-700">Total Received</p>
                            <TrendingUp className="h-4 w-4 text-green-500" />
                        </div>
                        <p className="text-2xl font-bold text-green-700">{formatCurrency(grandTotal)}</p>
                    </CardContent>
                </Card>
                <Card className="bg-red-50 border-red-200">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-red-700">Zomato</p>
                            <IndianRupee className="h-4 w-4 text-red-500" />
                        </div>
                        <p className="text-2xl font-bold text-red-700">{formatCurrency(totalZomato)}</p>
                    </CardContent>
                </Card>
                <Card className="bg-orange-50 border-orange-200">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-orange-700">Swiggy</p>
                            <IndianRupee className="h-4 w-4 text-orange-500" />
                        </div>
                        <p className="text-2xl font-bold text-orange-700">{formatCurrency(totalSwiggy)}</p>
                    </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-blue-700">Other Online</p>
                            <IndianRupee className="h-4 w-4 text-blue-500" />
                        </div>
                        <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalOther)}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Payouts Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Payout History</CardTitle>
                    <CardDescription>Payments received from aggregator platforms</CardDescription>
                </CardHeader>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Platform</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Reference</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {payouts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-12 text-gray-500">
                                    <Upload className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                    <p>No payouts recorded this month</p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            payouts.map((payout) => (
                                <TableRow key={payout.id}>
                                    <TableCell className="font-medium">{formatDate(payout.date)}</TableCell>
                                    <TableCell>{getAggregatorBadge(payout.aggregator)}</TableCell>
                                    <TableCell className="text-right font-semibold text-green-600">
                                        {formatCurrency(payout.amount)}
                                    </TableCell>
                                    <TableCell className="text-gray-500">{payout.reference || "-"}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Add Payout Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Record Payout Received</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Platform</Label>
                            <Select value={aggregator} onValueChange={setAggregator}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {AGGREGATORS.map(agg => (
                                        <SelectItem key={agg.id} value={agg.id}>{agg.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Amount Received (₹)</Label>
                            <Input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                step="0.01"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Date</Label>
                            <Input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Reference / Transaction ID (Optional)</Label>
                            <Input
                                value={reference}
                                onChange={(e) => setReference(e.target.value)}
                                placeholder="e.g., ZOM-12345"
                            />
                        </div>

                        <Button type="submit" className="w-full">
                            <Plus className="h-4 w-4 mr-2" />
                            Record Payout
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
