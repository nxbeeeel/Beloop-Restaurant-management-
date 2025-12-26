'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, X, GripVertical, Save, Info } from 'lucide-react';
import { toast } from 'sonner';
import { PageTransition } from "@/components/ui/animations";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function BrandSettingsPage() {
    // Tenant Settings
    const { data: settings, isLoading, refetch } = trpc.tenant.getSettings.useQuery();

    // Mutations
    const updateProfile = trpc.tenant.updateProfile.useMutation({
        onSuccess: () => {
            toast.success('Brand profile updated successfully!');
            refetch();
        },
        onError: (e) => toast.error(e.message),
    });

    const updateCategories = trpc.tenant.updateSettings.useMutation({
        onSuccess: () => {
            toast.success('Categories saved successfully!');
            refetch();
        },
        onError: (e) => toast.error(e.message),
    });

    // Form State
    const [name, setName] = useState('');
    const [currency, setCurrency] = useState('');
    const [primaryColor, setPrimaryColor] = useState('');
    const [logoUrl, setLogoUrl] = useState('');

    // Category State
    const [expenseCategories, setExpenseCategories] = useState<string[]>([]);
    const [fruitCategories, setFruitCategories] = useState<string[]>([]);
    const [newExpenseCategory, setNewExpenseCategory] = useState('');
    const [newFruitCategory, setNewFruitCategory] = useState('');

    useEffect(() => {
        if (settings) {
            setName(settings.name);
            setCurrency(settings.currency);
            setPrimaryColor(settings.primaryColor);
            setLogoUrl(settings.logoUrl || '');
            setExpenseCategories(settings.expenseCategories);
            setFruitCategories(settings.fruitCategories);
        }
    }, [settings]);

    // Categories Handlers
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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <PageTransition>
            <div className="container mx-auto py-8 px-4 max-w-4xl space-y-8">
                <div>
                    <h1 className="text-3xl font-bold">Brand Settings</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage your brand profile, appearance, and categories.
                    </p>
                </div>

                <Tabs defaultValue="general" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                        <TabsTrigger value="general">General</TabsTrigger>
                        <TabsTrigger value="branding">Branding</TabsTrigger>
                        <TabsTrigger value="categories">Categories</TabsTrigger>
                    </TabsList>

                    {/* General Settings */}
                    <TabsContent value="general">
                        <Card>
                            <CardHeader>
                                <CardTitle>Profile & Currency</CardTitle>
                                <CardDescription>Basic information about your organization.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Brand Name</Label>
                                    <Input
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. Acme Foods"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="currency">Currency Code</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="currency"
                                            value={currency}
                                            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                                            maxLength={3}
                                            placeholder="e.g. USD, INR"
                                            className="uppercase w-32"
                                        />
                                        <div className="flex-1 flex items-center text-sm text-muted-foreground bg-muted/50 px-3 rounded-md">
                                            Changes affect all financial reports.
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <Button
                                        onClick={() => updateProfile.mutate({ name, currency })}
                                        disabled={updateProfile.isPending}
                                    >
                                        {updateProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Save Changes
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Branding Settings */}
                    <TabsContent value="branding">
                        <Card>
                            <CardHeader>
                                <CardTitle>Appearance</CardTitle>
                                <CardDescription>Customize how your brand looks in the dashboard.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="color">Primary Brand Color</Label>
                                        <div className="flex gap-3">
                                            <Input
                                                id="color"
                                                type="color"
                                                value={primaryColor}
                                                onChange={(e) => setPrimaryColor(e.target.value)}
                                                className="w-16 h-10 p-1 cursor-pointer"
                                            />
                                            <Input
                                                value={primaryColor}
                                                onChange={(e) => setPrimaryColor(e.target.value)}
                                                placeholder="#000000"
                                                className="uppercase font-mono"
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground">Used for buttons, links, and major accents.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="logo">Logo URL</Label>
                                        <Input
                                            id="logo"
                                            value={logoUrl}
                                            onChange={(e) => setLogoUrl(e.target.value)}
                                            placeholder="https://..."
                                        />
                                        <p className="text-xs text-muted-foreground">Direct link to your logo image (PNG/JPG).</p>
                                    </div>
                                </div>

                                {/* Preview */}
                                <div className="border rounded-lg p-4 bg-muted/30">
                                    <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">Preview</Label>
                                    <div
                                        className="flex items-center gap-4 p-4 bg-white rounded border shadow-sm w-fit min-w-[300px]"
                                        // eslint-disable-next-line
                                        style={{ '--preview-color': primaryColor } as React.CSSProperties}
                                    >
                                        {logoUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={logoUrl}
                                                alt="Logo"
                                                className="w-10 h-10 object-contain"
                                                onError={(e) => e.currentTarget.style.display = 'none'}
                                            />
                                        ) : (
                                            <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">Logo</div>
                                        )}
                                        <div>
                                            <h3 className="font-bold text-lg text-[var(--preview-color)]">{name || 'Brand Name'}</h3>
                                            <p className="text-xs text-muted-foreground">Brand Admin Dashboard</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <Button
                                        onClick={() => updateProfile.mutate({ primaryColor, logoUrl })}
                                        disabled={updateProfile.isPending}
                                    >
                                        {updateProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Save Branding
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Categories Settings */}
                    <TabsContent value="categories" className="space-y-6">
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertTitle>About Categories</AlertTitle>
                            <AlertDescription>
                                These categories appear in expense forms across all your outlets.
                            </AlertDescription>
                        </Alert>

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Expense Categories */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Expense Categories</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Add category..."
                                            value={newExpenseCategory}
                                            onChange={(e) => setNewExpenseCategory(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleAddExpenseCategory()}
                                        />
                                        <Button size="icon" onClick={handleAddExpenseCategory}>
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="bg-muted/50 rounded-lg p-2 max-h-[300px] overflow-y-auto space-y-1">
                                        {expenseCategories.map((category, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between p-2 bg-white rounded border text-sm group"
                                            >
                                                <span>{category}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500"
                                                    onClick={() => handleRemoveExpenseCategory(index)}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Fruit Categories */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Fruit Categories</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Add category..."
                                            value={newFruitCategory}
                                            onChange={(e) => setNewFruitCategory(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleAddFruitCategory()}
                                        />
                                        <Button size="icon" onClick={handleAddFruitCategory}>
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="bg-muted/50 rounded-lg p-2 max-h-[300px] overflow-y-auto space-y-1">
                                        {fruitCategories.map((category, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between p-2 bg-white rounded border text-sm group"
                                            >
                                                <span>{category}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500"
                                                    onClick={() => handleRemoveFruitCategory(index)}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="flex justify-end">
                            <Button
                                onClick={() => updateCategories.mutate({ expenseCategories, fruitCategories })}
                                disabled={updateCategories.isPending}
                            >
                                {updateCategories.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" /> Save Categories
                                    </>
                                )}
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </PageTransition>
    );
}
