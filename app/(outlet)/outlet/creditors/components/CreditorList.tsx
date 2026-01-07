"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, ChevronRight, AlertCircle } from "lucide-react";

interface SupplierSummary {
    supplierId: string;
    supplierName: string;
    balance: number;
    lastActivity: string | Date | null;
}

interface CreditorListProps {
    suppliers: SupplierSummary[];
    onSelect: (supplierId: string) => void;
}

export function CreditorList({ suppliers, onSelect }: CreditorListProps) {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredSuppliers = suppliers.filter(s =>
        s.supplierName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Active Creditors</CardTitle>
                    <div className="relative w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search suppliers..."
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Supplier Name</TableHead>
                            <TableHead>Last Activity</TableHead>
                            <TableHead className="text-right">Outstanding Balance</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredSuppliers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    No creditors found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredSuppliers.map((supplier) => (
                                <TableRow
                                    key={supplier.supplierId}
                                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => onSelect(supplier.supplierId)}
                                >
                                    <TableCell className="font-medium">
                                        {supplier.supplierName}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {supplier.lastActivity
                                            ? format(new Date(supplier.lastActivity), "MMM d, yyyy")
                                            : "No activity"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge className={`font-mono text-sm ${supplier.balance > 0
                                                ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                                                : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                                            }`}>
                                            ₹{supplier.balance.toFixed(2)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
