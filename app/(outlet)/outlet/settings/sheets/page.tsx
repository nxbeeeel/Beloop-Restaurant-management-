"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Link as LinkIcon, FileSpreadsheet } from "lucide-react";

export default function SheetsSettingsPage() {
    const [url, setUrl] = useState("");
    const { data: user } = trpc.dashboard.getUser.useQuery();
    const outletId = user?.outletId || "";

    const { data: existingUrl, isLoading } = trpc.googleSheets.getAppsScriptUrl.useQuery(
        { outletId },
        { enabled: !!outletId }
    );

    useEffect(() => {
        if (existingUrl?.appsScriptUrl) {
            setUrl(existingUrl.appsScriptUrl);
        }
    }, [existingUrl]);

    const saveMutation = trpc.googleSheets.saveAppsScriptUrl.useMutation({
        onSuccess: () => toast.success("Settings saved successfully"),
        onError: (e) => toast.error(e.message)
    });

    const handleSave = () => {
        if (!url) return;
        // Basic validation
        if (!url.startsWith("https://script.google.com/")) {
            toast.error("Invalid URL. Must start with https://script.google.com/");
            return;
        }
        saveMutation.mutate({ outletId, appsScriptUrl: url });
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-20 md:pb-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Google Sheets Integration</h1>
                    <p className="text-gray-500 text-sm md:text-base">Connect your outlet data to Google Sheets for automated reporting</p>
                </div>
                <Button asChild variant="outline">
                    <a href="/outlet/settings/sheets/generate">Generate Script</a>
                </Button>
            </div>

            <Card className="border-0 shadow-lg ring-1 ring-gray-100">
                <CardHeader className="pb-4 border-b border-gray-50">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <FileSpreadsheet className="h-5 w-5 text-green-600" />
                        Connection Settings
                    </CardTitle>
                    <CardDescription>
                        Enter your Google Apps Script Web App URL to enable data sync.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Apps Script Web App URL</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="https://script.google.com/macros/s/..."
                                    className="pl-10 font-mono text-sm"
                                />
                            </div>
                            <Button onClick={handleSave} disabled={saveMutation.isPending || isLoading}>
                                {saveMutation.isPending ? "Saving..." : "Save"}
                            </Button>
                        </div>
                        <p className="text-xs text-gray-500">
                            This URL is generated when you deploy your Google Apps Script as a Web App.
                        </p>
                    </div>

                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                        <h4 className="font-medium text-blue-900 mb-2 text-sm">How to set up?</h4>
                        <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
                            <li>Open the <a href="#" className="underline hover:text-blue-600">Template Spreadsheet</a> (ask Admin for link)</li>
                            <li>Go to <strong>Extensions &gt; Apps Script</strong></li>
                            <li>Click <strong>Deploy &gt; New deployment</strong></li>
                            <li>Select type: <strong>Web app</strong></li>
                            <li>Set &quot;Who has access&quot; to: <strong>Anyone</strong></li>
                            <li>Copy the generated URL and paste it above</li>
                        </ol>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
