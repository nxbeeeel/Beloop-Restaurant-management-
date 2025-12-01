"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Copy, Download, Code2, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function GenerateScriptPage() {
    const [copied, setCopied] = useState(false);
    const { data: user } = trpc.dashboard.getUser.useQuery();
    const outletId = user?.outletId || "";

    const { data: scriptData, isLoading } = trpc.googleSheets.generateScript.useQuery(
        { outletId },
        { enabled: !!outletId }
    );

    const handleCopy = () => {
        if (!scriptData?.scriptCode) return;
        navigator.clipboard.writeText(scriptData.scriptCode);
        setCopied(true);
        toast.success("Script copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        if (!scriptData?.scriptCode) return;
        const blob = new Blob([scriptData.scriptCode], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `beloop-script-${scriptData.outletCode}.gs`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Script downloaded!");
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">Generating your custom script...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-20 md:pb-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                    Google Apps Script Generator
                </h1>
                <p className="text-gray-500 text-sm md:text-base">
                    Customized script for {scriptData?.outletName} ({scriptData?.outletCode})
                </p>
            </div>

            {/* Instructions Card */}
            <Card className="border-0 shadow-lg ring-1 ring-blue-100 bg-blue-50">
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg text-blue-900">
                        <Code2 className="h-5 w-5" />
                        Setup Instructions
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                        <li>Create a new Google Sheet for your outlet</li>
                        <li>Go to <strong>Extensions → Apps Script</strong></li>
                        <li>Delete any existing code in the editor</li>
                        <li>Copy the script below and paste it into the editor</li>
                        <li>Click <strong>Save</strong> (disk icon)</li>
                        <li>Click <strong>Run → setupSheets</strong> to create the Sales and Expenses sheets</li>
                        <li>Go to <strong>Deploy → New deployment</strong></li>
                        <li>Select type: <strong>Web app</strong></li>
                        <li>Set "Who has access" to: <strong>Anyone</strong></li>
                        <li>Click <strong>Deploy</strong> and copy the Web App URL</li>
                        <li>
                            Go back to{" "}
                            <Link href="/outlet/settings/sheets" className="underline font-medium">
                                Sheet Settings
                            </Link>{" "}
                            and paste the URL
                        </li>
                    </ol>
                </CardContent>
            </Card>

            {/* Script Card */}
            <Card className="border-0 shadow-lg ring-1 ring-gray-100">
                <CardHeader className="pb-4 border-b border-gray-50">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Generated Script</CardTitle>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCopy}
                                className="gap-2"
                            >
                                {copied ? (
                                    <>
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                        Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-4 w-4" />
                                        Copy
                                    </>
                                )}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDownload}
                                className="gap-2"
                            >
                                <Download className="h-4 w-4" />
                                Download
                            </Button>
                        </div>
                    </div>
                    <CardDescription>
                        This script includes your outlet ID and expense categories
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="relative">
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs font-mono max-h-[600px] overflow-y-auto">
                            <code>{scriptData?.scriptCode}</code>
                        </pre>
                    </div>
                </CardContent>
            </Card>

            {/* Expense Categories Info */}
            {scriptData?.expenseCategories && scriptData.expenseCategories.length > 0 && (
                <Card className="border-0 shadow-lg ring-1 ring-gray-100">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg">Included Expense Categories</CardTitle>
                        <CardDescription>
                            These categories will be available in the dropdown when entering expenses
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {scriptData.expenseCategories.map((category: string) => (
                                <span
                                    key={category}
                                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                                >
                                    {category}
                                </span>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
