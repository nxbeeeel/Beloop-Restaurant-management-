'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
        } finally {
    setIsLoading(false);
}
    };

return (
    <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
            <Link href="/brand/outlets">
                <Button variant="ghost" size="sm">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>
            </Link>
            <div>
                <h1 className="text-3xl font-bold">Add New Outlet</h1>
                <p className="text-gray-500">Create a new outlet for your brand</p>
            </div>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Outlet Details</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Outlet Name *</Label>
                        <Input
                            id="name"
                            name="name"
                            type="text"
                            placeholder="e.g. Downtown Branch"
                            required
                            disabled={isLoading}
                            className={errors.name ? "border-red-500" : ""}
                        />
                        {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="code">Outlet Code *</Label>
                        <Input
                            id="code"
                            name="code"
                            type="text"
                            placeholder="e.g. DT01"
                            required
                            maxLength={10}
                            disabled={isLoading}
                            className={errors.code ? "border-red-500" : ""}
                        />
                        {errors.code && <p className="text-xs text-red-500">{errors.code}</p>}
                        <p className="text-xs text-gray-500">Unique code for this outlet (max 10 chars)</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Textarea
                            id="address"
                            name="address"
                            placeholder="Full address"
                            rows={3}
                            disabled={isLoading}
                            className={errors.address ? "border-red-500" : ""}
                        />
                        {errors.address && <p className="text-xs text-red-500">{errors.address}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                            id="phone"
                            name="phone"
                            type="tel"
                            placeholder="Contact number"
                            disabled={isLoading}
                            className={errors.phone ? "border-red-500" : ""}
                        />
                        {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                    </div>

                    <div className="flex gap-2 pt-4">
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            {isLoading ? "Creating..." : "Create Outlet"}
                        </Button>
                        <Link href="/brand/outlets">
                            <Button type="button" variant="outline" disabled={isLoading}>
                                Cancel
                            </Button>
                        </Link>
                    </div>
                </form>
            </CardContent>
        </Card>
    </div>
);
}
