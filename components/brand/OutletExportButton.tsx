'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface OutletExportButtonProps {
    outletId: string;
    outletName: string;
}

export function OutletExportButton({ outletId, outletName }: OutletExportButtonProps) {
    const [isExporting, setIsExporting] = useState(false);
    const utils = trpc.useUtils();

    const handleDownload = async () => {
        try {
            setIsExporting(true);
            toast.info('Generating report...');

            // Fetch data
            const data = await utils.client.outlets.getExportData.query({ outletId });

            // Create Workbook
            const wb = XLSX.utils.book_new();

            // 1. Sales Sheet
            const salesData = data.sales.map(s => ({
                Date: new Date(s.date).toLocaleDateString(),
                'Total Sale': s.totalSale,
                'Cash': s.cashSale,
                'Bank': s.bankSale,
                'Swiggy': s.swiggy,
                'Zomato': s.zomato,
                'Expenses': s.totalExpense,
                'Profit': s.profit,
                'Staff': s.staff?.name || 'Unknown'
            }));
            const salesWs = XLSX.utils.json_to_sheet(salesData);
            XLSX.utils.book_append_sheet(wb, salesWs, 'Sales');

            // 2. Expenses Sheet
            const expensesData = data.expenses.map(e => ({
                Date: new Date(e.date).toLocaleDateString(),
                'Category': e.category,
                'Amount': e.amount,
                'Payment Method': e.paymentMethod,
                'Description': e.description,
                'Staff': e.staff?.name || 'Unknown'
            }));
            const expensesWs = XLSX.utils.json_to_sheet(expensesData);
            XLSX.utils.book_append_sheet(wb, expensesWs, 'Expenses');

            // 3. Inventory Sheet
            const inventoryData = data.inventory.map(i => ({
                'Product': i.name,
                'Current Stock': i.currentStock,
                'Unit': i.unit,
                'Min Stock': i.minStock,
                'Supplier': i.supplier?.name || ''
            }));
            const inventoryWs = XLSX.utils.json_to_sheet(inventoryData);
            XLSX.utils.book_append_sheet(wb, inventoryWs, 'Inventory');

            // Generate File
            const fileName = `${outletName.replace(/[^a-z0-9]/gi, '_')}_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);

            toast.success('Report downloaded successfully!');
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Failed to generate report');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={isExporting}
            className="h-8"
        >
            {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
                <Download className="h-4 w-4 mr-2" />
            )}
            Download Report
        </Button>
    );
}
