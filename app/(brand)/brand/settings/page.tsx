'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, X, GripVertical, Save } from 'lucide-react';
import { toast } from 'sonner';
import { PageTransition } from "@/components/ui/animations";

export default function BrandSettingsPage() {
    // Tenant Settings (Categories)
    const { data: tenantSettings, isLoading, refetch } = trpc.tenant.getSettings.useQuery();
    const updateTenantSettings = trpc.tenant.updateSettings.useMutation({
        onSuccess: () => {
            toast.success('Categories saved successfully!');
            refetch();
        },
        onError: (error) => toast.error(error.message || 'Failed to save categories'),
    });

    // Category State
    const [expenseCategories, setExpenseCategories] = useState<string[]>([]);
    const [fruitCategories, setFruitCategories] = useState<string[]>([]);
    const [newExpenseCategory, setNewExpenseCategory] = useState('');
    const [newFruitCategory, setNewFruitCategory] = useState('');

    // Initialize state
    useEffect(() => {
        if (tenantSettings) {
            setExpenseCategories(tenantSettings.expenseCategories);
            setFruitCategories(tenantSettings.fruitCategories);
        }
    }, [tenantSettings]);

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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <PageTransition>
            <div className="container mx-auto py-8 px-4 max-w-4xl">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold">Brand Settings</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage global settings for your brand, including expense categories.
                    </p>
                </div>

                <Tabs defaultValue="categories" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-1 md:w-auto md:inline-grid">
                        <TabsTrigger value="categories">Expense Categories</TabsTrigger>
                    </TabsList>

                    {/* Categories Management */}
                    <TabsContent value="categories" className="space-y-6">
                        {/* Expense Categories */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Expense Categories</CardTitle>
                                <CardDescription>
                                    Define the expense categories for your brand. These will appear in expense forms across all outlets.
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
                                {updateTenantSettings.isPending ? (
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
