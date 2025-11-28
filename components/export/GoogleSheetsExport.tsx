"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, CheckCircle2, Loader2, ExternalLink } from "lucide-react";

export default function GoogleSheetsExportPage({ outletId }: { outletId: string }) {
    const currentDate = new Date();
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
    const [exportResult, setExportResult] = useState<{
        spreadsheetUrl?: string;
        salesCount?: number;
        expensesCount?: number;
    } | null>(null);

    const exportMutation = trpc.googleSheets.exportMonthlyReport.useMutation({
        onSuccess: (data) => {
            setExportResult(data);
        },
    });

    const handleExport = () => {
        exportMutation.mutate({
            outletId,
            year: selectedYear,
            month: selectedMonth,
        });
    };

    const handlePreviousMonth = () => {
        if (selectedMonth === 1) {
            setSelectedMonth(12);
            setSelectedYear(selectedYear - 1);
        } else {
            setSelectedMonth(selectedMonth - 1);
        }
    };

    const handleNextMonth = () => {
        if (selectedMonth === 12) {
            setSelectedMonth(1);
            setSelectedYear(selectedYear + 1);
        } else {
            setSelectedMonth(selectedMonth + 1);
        }
    };

    const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long' });

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    Google Sheets Export
                </h2>
                <p className="text-muted-foreground">
                    Export your sales and expense data to Google Sheets for easy sharing and analysis.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5" />
                        Export Monthly Report
                    </CardTitle>
                    <CardDescription>
                        Select a month to export sales and expenses data to a new Google Spreadsheet
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Month Selection */}
                    <div className="flex items-center justify-center gap-4">
                        <Button variant="outline" onClick={handlePreviousMonth}>
                            ← Previous
                        </Button>
                        <div className="text-center min-w-[200px]">
                            <div className="text-2xl font-bold">{monthName} {selectedYear}</div>
                        </div>
                        <Button variant="outline" onClick={handleNextMonth}>
                            Next →
                        </Button>
                    </div>

                    {/* Export Button */}
                    <div className="flex justify-center">
                        <Button
                            size="lg"
                            onClick={handleExport}
                            disabled={exportMutation.isPending}
                            className="shadow-lg hover:shadow-xl transition-all"
                        >
                            {exportMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Exporting...
                                </>
                            ) : (
                                <>
                                    <Download className="mr-2 h-5 w-5" />
                                    Export to Google Sheets
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Success Message */}
                    {exportResult && (
                        <div className="rounded-lg border border-green-200 bg-green-50 p-6">
                            <div className="flex items-start gap-4">
                                <CheckCircle2 className="h-6 w-6 text-green-600 mt-0.5" />
                                <div className="flex-1 space-y-3">
                                    <div>
                                        <h3 className="font-semibold text-green-900">Export Successful!</h3>
                                        <p className="text-sm text-green-700 mt-1">
                                            Your data has been exported to Google Sheets
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="bg-white rounded-md p-3">
                                            <div className="text-muted-foreground">Sales Records</div>
                                            <div className="text-2xl font-bold text-green-600">{exportResult.salesCount}</div>
                                        </div>
                                        <div className="bg-white rounded-md p-3">
                                            <div className="text-muted-foreground">Expense Records</div>
                                            <div className="text-2xl font-bold text-green-600">{exportResult.expensesCount}</div>
                                        </div>
                                    </div>

                                    {exportResult.spreadsheetUrl && (
                                        <a
                                            href={exportResult.spreadsheetUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 text-sm font-medium text-green-700 hover:text-green-800 hover:underline"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                            Open Spreadsheet
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {exportMutation.isError && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                            <div className="flex items-start gap-3">
                                <div className="text-red-600">⚠️</div>
                                <div>
                                    <h3 className="font-semibold text-red-900">Export Failed</h3>
                                    <p className="text-sm text-red-700 mt-1">
                                        {exportMutation.error.message || 'An error occurred while exporting data'}
                                    </p>
                                    <p className="text-xs text-red-600 mt-2">
                                        Make sure you have configured Google Sheets API credentials in your environment variables.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Setup Instructions */}
            <Card>
                <CardHeader>
                    <CardTitle>Setup Instructions</CardTitle>
                    <CardDescription>
                        Follow these steps to enable Google Sheets export
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-3 text-sm">
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                                1
                            </div>
                            <div>
                                <div className="font-medium">Create a Google Cloud Project</div>
                                <div className="text-muted-foreground">
                                    Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Cloud Console</a> and create a new project
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                                2
                            </div>
                            <div>
                                <div className="font-medium">Enable Google Sheets API</div>
                                <div className="text-muted-foreground">
                                    Enable the Google Sheets API in your project
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                                3
                            </div>
                            <div>
                                <div className="font-medium">Create Service Account</div>
                                <div className="text-muted-foreground">
                                    Create a service account and download the JSON key file
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                                4
                            </div>
                            <div>
                                <div className="font-medium">Add to Environment Variables</div>
                                <div className="text-muted-foreground">
                                    Add <code className="bg-muted px-1 py-0.5 rounded text-xs">GOOGLE_SERVICE_ACCOUNT_KEY</code> to your .env file with the JSON key content
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
