'use client';

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { createOutlet } from "@/server/actions/outlet";
import Link from "next/link";
import { z } from "zod";

const outletSchema = z.object({
    name: z.string().min(1, "Outlet name is required").max(100, "Name must be less than 100 characters"),
    code: z.string().min(1, "Outlet code is required").max(10, "Code must be 10 characters or less"),
    address: z.string().optional(),
    phone: z.string().optional(),
});

type OutletFormData = z.infer<typeof outletSchema>;
type FormErrors = Partial<Record<keyof OutletFormData, string>>;

export default function NewOutletPage() {
    const router = useRouter();
    const params = useParams();
    const slug = params.slug as string;
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setErrors({});

        try {
            const formData = new FormData(e.currentTarget);
            const data = {
                name: formData.get('name') as string,
                code: formData.get('code') as string,
                address: formData.get('address') as string,
                phone: formData.get('phone') as string,
            };

            // Client-side validation
            const validation = outletSchema.safeParse(data);
            if (!validation.success) {
                const fieldErrors: FormErrors = {};
                validation.error.errors.forEach((err) => {
                    if (err.path[0]) {
                        fieldErrors[err.path[0] as keyof OutletFormData] = err.message;
                    }
                });
                setErrors(fieldErrors);
                toast.error("Please fix the errors in the form");
                setIsLoading(false);
                return;
            }

            await createOutlet(formData);

            toast.success("Outlet created successfully!");
            router.push(`/brand/${slug}/outlets`);
            router.refresh();
        } catch (error) {
            console.error("Error creating outlet:", error);
            toast.error(error instanceof Error ? error.message : "Failed to create outlet");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href={`/brand/${slug}/outlets`}>
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
                            <Link href={`/brand/${slug}/outlets`}>
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
