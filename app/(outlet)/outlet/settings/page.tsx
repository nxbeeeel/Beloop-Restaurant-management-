"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Save, Store, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
    const router = useRouter();
    const { data: user } = trpc.dashboard.getUser.useQuery();
    const outletId = user?.outletId || "";

    const { data: outlet, isLoading } = trpc.outlets.getById.useQuery({ id: outletId }, {
        enabled: !!outletId
    });

    const updateOutlet = trpc.outlets.update.useMutation({
        onSuccess: () => toast.success("Outlet settings updated"),
        onError: (err) => toast.error(err.message)
    });

    const updateOutletSettings = trpc.outlets.updateSettings.useMutation({
        onSuccess: () => toast.success("Settings updated"),
        onError: (err) => toast.error(err.message)
    });

    const [name, setName] = useState("");
    const [address, setAddress] = useState("");
    const [phone, setPhone] = useState("");
    const [isPosEnabled, setIsPosEnabled] = useState(false);
    const [googleSheetsUrl, setGoogleSheetsUrl] = useState("");

    // Sync state when data loads
    if (outlet && name === "" && !isLoading) {
        setName(outlet.name);
        setAddress(outlet.address || "");
        setPhone(outlet.phone || "");
        setIsPosEnabled(outlet.isPosEnabled);
        setGoogleSheetsUrl(outlet.googleSheetsUrl || "");
    }

    const handleSave = () => {
        updateOutlet.mutate({
            id: outletId,
            name,
            address,
            phone,
        });

        if (googleSheetsUrl !== outlet?.googleSheetsUrl) {
            updateOutletSettings.mutate({
                outletId,
                googleSheetsUrl
            });
        }
    };

    const handleSheetsSave = () => {
        updateOutletSettings.mutate({
            outletId,
            googleSheetsUrl
        });
    };

    if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-24 lg:pb-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Outlet Settings</h1>
                <p className="text-gray-500">Manage your outlet configuration and preferences.</p>
            </div>

            <div className="grid gap-6">
                {/* General Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle>General Information</CardTitle>
                        <CardDescription>Basic details about your outlet.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Outlet Name</Label>
                            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Outlet Name" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="address">Address</Label>
                            <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} aria-label="Address" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Phone Number" />
                        </div>
                        <div className="flex justify-end">
                            <Button onClick={handleSave} disabled={updateOutlet.isPending}>
                                {updateOutlet.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* POS Configuration */}
                <Card>
                    <CardHeader>
                        <CardTitle>POS Configuration</CardTitle>
                        <CardDescription>Manage Point of Sale access and settings.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="space-y-0.5">
                                <Label htmlFor="pos-toggle" className="text-base">Enable POS Access</Label>
                                <p className="text-sm text-muted-foreground">
                                    Allow the POS application to connect to this outlet.
                                </p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="pos-toggle"
                                    className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                                    checked={isPosEnabled}
                                    onChange={async (e) => {
                                        const checked = e.target.checked;
                                        setIsPosEnabled(checked);
                                        try {
                                            await updateOutletSettings.mutateAsync({
                                                outletId,
                                                isPosEnabled: checked
                                            });
                                        } catch (error) {
                                            setIsPosEnabled(!checked); // Revert on error
                                        }
                                    }}
                                    aria-label="Enable POS Access"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Developer Information */}
                <Card>
                    <CardHeader>
                        <CardTitle>Developer Information</CardTitle>
                        <CardDescription>System identifiers for API and POS configuration.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label>Tenant ID</Label>
                            <div className="p-3 bg-gray-100 rounded-md font-mono text-sm break-all">
                                {outlet?.tenantId}
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>Outlet ID</Label>
                            <div className="p-3 bg-gray-100 rounded-md font-mono text-sm break-all">
                                {outlet?.id}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Google Sheets Integration */}
                <Card>
                    <CardHeader>
                        <CardTitle>Google Sheets Integration</CardTitle>
                        <CardDescription>Connect your outlet to Google Sheets for automated reporting.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="sheets-url">Google Apps Script URL</Label>
                            <Input
                                id="sheets-url"
                                placeholder="https://script.google.com/macros/s/..."
                                value={googleSheetsUrl}
                                onChange={(e) => setGoogleSheetsUrl(e.target.value)}
                                aria-label="Google Apps Script URL"
                            />
                            <p className="text-xs text-gray-500">
                                Paste the Web App URL from your Google Apps Script deployment.
                            </p>
                        </div>
                        <div className="flex justify-end">
                            <Button onClick={handleSheetsSave} disabled={updateOutletSettings.isPending}>
                                <Save className="w-4 h-4 mr-2" />
                                Save Settings
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Danger Zone */}
                <Card className="border-red-100">
                    <CardHeader>
                        <CardTitle className="text-red-600">Danger Zone</CardTitle>
                        <CardDescription>Irreversible actions.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="destructive" className="w-full sm:w-auto">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Outlet
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
