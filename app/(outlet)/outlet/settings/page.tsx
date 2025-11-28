'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExternalLink, Save, Loader2, Plus, X, GripVertical, Download, FileCode } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function OutletSettingsPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [googleSheetsUrl, setGoogleSheetsUrl] = useState('');

    // Outlet Settings
    const { data: outletSettings, isLoading: isLoadingOutlet } = trpc.outlets.getSettings.useQuery({ outletId: params.id });
    const updateOutletSettings = trpc.outlets.updateSettings.useMutation({
        onSuccess: () => toast.success('Outlet settings saved successfully!'),
        onError: (error) => toast.error(error.message || 'Failed to save outlet settings'),
    });

    // Tenant Settings (Categories & Apps Script)
    const { data: tenantSettings, isLoading: isLoadingTenant, refetch: refetchTenant } = trpc.tenant.getSettings.useQuery();
    const updateTenantSettings = trpc.tenant.updateSettings.useMutation({
        onSuccess: () => {
            toast.success('Categories saved successfully!');
            refetchTenant();
        },
        onError: (error) => toast.error(error.message || 'Failed to save categories'),
    });
    const { data: appsScript } = trpc.tenant.generateAppsScript.useQuery();

    // Category State
    const [expenseCategories, setExpenseCategories] = useState<string[]>([]);
    const [fruitCategories, setFruitCategories] = useState<string[]>([]);
    const [newExpenseCategory, setNewExpenseCategory] = useState('');
    const [newFruitCategory, setNewFruitCategory] = useState('');

    // Initialize state
    useEffect(() => {
        if (outletSettings?.googleSheetsUrl) {
            setGoogleSheetsUrl(outletSettings.googleSheetsUrl);
        }
    }, [outletSettings]);

    useEffect(() => {
        if (tenantSettings) {
            setExpenseCategories(tenantSettings.expenseCategories);
            setFruitCategories(tenantSettings.fruitCategories);
        }
    }, [tenantSettings]);

    // Handlers for Outlet Settings
    const handleSaveOutletSettings = async () => {
        await updateOutletSettings.mutateAsync({
            outletId: params.id,
            googleSheetsUrl: googleSheetsUrl || null,
        });
    };

    // Handlers for Categories
    const handleAddExpenseCategory = () => {
        if (newExpenseCategory.trim()) {
            setExpenseCategories([...expenseCategories, newExpenseCategory.trim()]);
            setNewExpenseCategory('');
        }
    };

    const handleRemoveExpenseCategory = (index: number) => {
        setExpenseCategories(expenseCategories.filter((_, i) => i !== index));
    };

    const handleAddFruitCategory = () => {
        if (newFruitCategory.trim()) {
            setFruitCategories([...fruitCategories, newFruitCategory.trim()]);
            setNewFruitCategory('');
        }
    };

    const handleRemoveFruitCategory = (index: number) => {
        setFruitCategories(fruitCategories.filter((_, i) => i !== index));
    };

    const handleSaveCategories = async () => {
        await updateTenantSettings.mutateAsync({
            expenseCategories,
            fruitCategories,
        });
    };

    // Handler for Apps Script
    const handleDownloadAppsScript = () => {
        if (!appsScript) return;

        const blob = new Blob([appsScript.script], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = appsScript.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Apps Script downloaded!');
    };

    if (isLoadingOutlet || isLoadingTenant) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Outlet Settings</h1>
                <p className="text-muted-foreground mt-2">
                    Configure settings, manage categories, and setup Google Sheets integration.
                </p>
            </div>

            <Tabs defaultValue="general" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="categories">Categories</TabsTrigger>
                    <TabsTrigger value="apps-script">Apps Script</TabsTrigger>
                </TabsList>

                {/* General Settings (Google Sheets URL) */}
                <TabsContent value="general">
                    <Card>
                        <CardHeader>
                            <CardTitle>Google Sheets Integration</CardTitle>
                            <CardDescription>
                                Save your Google Apps Script Web App URL to enable direct access to your spreadsheet.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="googleSheetsUrl">Google Sheets URL</Label>
                                <Input
                                    id="googleSheetsUrl"
                                    type="url"
                                    placeholder="https://script.google.com/macros/s/..."
                                    value={googleSheetsUrl}
                                    onChange={(e) => setGoogleSheetsUrl(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Paste the Web App URL from your deployed Google Apps Script
                                </p>
                            </div>

                            {googleSheetsUrl && (
                                <div className="p-4 bg-muted rounded-lg">
                                    <p className="text-sm font-medium mb-2">Current Spreadsheet:</p>
                                    <a
                                        href={googleSheetsUrl.replace('/exec', '/dev')}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-primary hover:underline"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                        Open Google Sheet
                                    </a>
                                </div>
                            )}

                            <div className="flex gap-4">
                                <Button
                                    onClick={handleSaveOutletSettings}
                                    disabled={updateOutletSettings.isPending}
                                    className="flex-1"
                                >
                                    {updateOutletSettings.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                        <Save className="h-4 w-4 mr-2" />
                                    )}
                                    Save Settings
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Categories Management */}
                <TabsContent value="categories" className="space-y-6">
                    {/* Expense Categories */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Expense Categories</CardTitle>
                            <CardDescription>
                                Define the expense categories for your brand. These will appear in expense forms.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                {expenseCategories.map((category, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-2 p-3 bg-muted rounded-lg group hover:bg-muted/80 transition-colors"
                                    >
                                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                                        <span className="flex-1">{category}</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemoveExpenseCategory(index)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-2">
                                <Input
                                    placeholder="Add new expense category..."
                                    value={newExpenseCategory}
                                    onChange={(e) => setNewExpenseCategory(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddExpenseCategory()}
                                />
                                <Button onClick={handleAddExpenseCategory}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Fruit Categories */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Fruit Categories</CardTitle>
                            <CardDescription>
                                Define specific fruit categories for detailed tracking (optional).
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                {fruitCategories.map((category, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-2 p-3 bg-muted rounded-lg group hover:bg-muted/80 transition-colors"
                                    >
                                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                                        <span className="flex-1">{category}</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemoveFruitCategory(index)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-2">
                                <Input
                                    placeholder="Add new fruit category..."
                                    value={newFruitCategory}
                                    onChange={(e) => setNewFruitCategory(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddFruitCategory()}
                                />
                                <Button onClick={handleAddFruitCategory}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end">
                        <Button
                            onClick={handleSaveCategories}
                            disabled={updateTenantSettings.isPending}
                            size="lg"
                        >
                            {updateTenantSettings.isPending ? 'Saving...' : 'Save Categories'}
                        </Button>
                    </div>
                </TabsContent>

                {/* Apps Script Download */}
                <TabsContent value="apps-script" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Google Apps Script</CardTitle>
                            <CardDescription>
                                Download your custom Apps Script configured with your expense categories.
                                This script will create 3 separate sheets: Sales, Expenses, and Inventory.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted p-4 rounded-lg space-y-2">
                                <h3 className="font-semibold">Setup Instructions:</h3>
                                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                                    <li>Create a new Google Sheet</li>
                                    <li>Go to Extensions → Apps Script</li>
                                    <li>Delete all existing code</li>
                                    <li>Paste the downloaded script</li>
                                    <li>Update the SPREADSHEET_ID in the script</li>
                                    <li>Deploy as Web App (Execute as: Me, Access: Anyone)</li>
                                    <li>Copy the Web App URL and save it in the <strong>General</strong> tab</li>
                                </ol>
                            </div>

                            <div className="flex flex-col gap-4">
                                <Button
                                    onClick={handleDownloadAppsScript}
                                    disabled={!appsScript}
                                    size="lg"
                                    className="w-full"
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    Download Apps Script
                                </Button>

                                {appsScript && (
                                    <div className="text-sm text-muted-foreground text-center">
                                        Filename: <code className="bg-muted px-2 py-1 rounded">{appsScript.filename}</code>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
