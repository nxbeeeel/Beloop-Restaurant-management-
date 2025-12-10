"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Save, Store, MapPin, Phone, Hash } from "lucide-react";
import Link from "next/link";
import { PageTransition } from "@/components/ui/animations";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function OutletDetailsPage({ params }: { params: { outletId: string } }) {
    const router = useRouter();
    const utils = trpc.useContext();
    const { data: outlet, isLoading } = trpc.outlets.getById.useQuery({ id: params.outletId });

    const updateMutation = trpc.outlets.update.useMutation({
        onSuccess: () => {
            toast.success("Outlet updated successfully");
            utils.outlets.getById.invalidate({ id: params.outletId });
            utils.outlets.list.invalidate();
        },
        onError: (err) => toast.error(err.message),
    });

    const [formData, setFormData] = useState({
        name: "",
        code: "",
        address: "",
        phone: "",
        status: "ACTIVE",
        isPosEnabled: false
    });

    useEffect(() => {
        if (outlet) {
            setFormData({
                name: outlet.name,
                code: outlet.code,
                address: outlet.address || "",
                phone: outlet.phone || "",
                status: outlet.status,
                isPosEnabled: outlet.isPosEnabled || false
            });
        }
    }, [outlet]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateMutation.mutate({
            id: params.outletId,
            name: formData.name,
            code: formData.code,
            address: formData.address,
            phone: formData.phone,
            status: formData.status as any,
            isPosEnabled: formData.isPosEnabled
        });
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
                <div className="h-64 bg-gray-100 animate-pulse rounded-xl" />
            </div>
        );
    }

    if (!outlet) {
        return <div>Outlet not found</div>;
    }

    return (
        <PageTransition>
            <div className="space-y-6 max-w-4xl mx-auto">
                <div className="flex items-center gap-4">
                    <Link href="/brand/outlets">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{outlet.name}</h1>
                        <p className="text-muted-foreground">Manage outlet details and settings.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <Card>
                        <CardHeader>
                            <CardTitle>General Information</CardTitle>
                            <CardDescription>Basic details about this outlet.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Outlet Name</Label>
                                    <div className="relative">
                                        <Store className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="pl-9"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="code">Outlet Code</Label>
                                    <div className="relative">
                                        <Hash className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                        <Input
                                            id="code"
                                            value={formData.code}
                                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                            className="pl-9"
                                            required
                                            maxLength={10}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="address">Address</Label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Textarea
                                        id="address"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="pl-9 min-h-[80px]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone Number</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                        <Input
                                            id="phone"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="pl-9"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="status">Status</Label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(val) => setFormData({ ...formData, status: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ACTIVE">Active</SelectItem>
                                            <SelectItem value="INACTIVE">Inactive</SelectItem>
                                            <SelectItem value="ARCHIVED">Archived</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="isPosEnabled">POS Access</Label>
                                    <Select
                                        value={formData.isPosEnabled ? "ENABLED" : "DISABLED"}
                                        onValueChange={(val) => setFormData({ ...formData, isPosEnabled: val === "ENABLED" })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ENABLED">Enabled</SelectItem>
                                            <SelectItem value="DISABLED">Disabled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end">
                                <Button type="submit" disabled={updateMutation.isPending}>
                                    {updateMutation.isPending ? (
                                        <>Saving...</>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" /> Save Changes
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </form>
            </div>
        </PageTransition>
    );
}
