"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Building2, Palette } from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";
import { LogOut } from "lucide-react";

export default function OnboardingClient() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        brandName: "",
        slug: "",
        logoFile: null as File | null,
        primaryColor: "#e11d48", // Default red
    });

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData({ ...formData, logoFile: file });

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    };

    const handleBrandNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        setFormData({
            ...formData,
            brandName: name,
            slug: generateSlug(name),
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Upload logo to Cloudflare R2 or similar (for now, we'll use base64)
            let logoUrl = null;
            if (formData.logoFile) {
                // In production, upload to Cloudflare R2
                // For now, convert to base64 data URL
                const reader = new FileReader();
                logoUrl = await new Promise<string>((resolve) => {
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(formData.logoFile!);
                });
            }

            // Create tenant
            const response = await fetch('/api/onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.brandName,
                    slug: formData.slug,
                    logoUrl,
                    primaryColor: formData.primaryColor,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to create brand');
            }

            // Redirect to brand dashboard
            router.push('/brand/dashboard');
        } catch (error) {
            console.error('Onboarding error:', error);
            alert('Failed to create brand. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
            <Card className="w-full max-w-2xl shadow-2xl">
                <CardHeader className="text-center space-y-2 relative">
                    <div className="absolute top-0 right-0 p-4">
                        <SignOutButton>
                            <Button variant="outline" size="sm" className="gap-2">
                                <LogOut size={16} />
                                Sign Out
                            </Button>
                        </SignOutButton>
                    </div>

                    <div className="mx-auto w-16 h-16 bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl flex items-center justify-center mb-4">
                        <Building2 className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        Welcome to Beloop
                    </CardTitle>
                    <CardDescription className="text-base">
                        Let&apos;s set up your brand profile to get started
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Brand Name */}
                        <div className="space-y-2">
                            <Label htmlFor="brandName" className="text-base font-semibold">
                                Brand Name *
                            </Label>
                            <Input
                                id="brandName"
                                type="text"
                                placeholder="e.g., Smoocho Restaurants"
                                value={formData.brandName}
                                onChange={handleBrandNameChange}
                                required
                                className="text-lg h-12"
                            />
                            <p className="text-sm text-muted-foreground">
                                This will be displayed across your dashboard
                            </p>
                        </div>

                        {/* Slug (Auto-generated) */}
                        <div className="space-y-2">
                            <Label htmlFor="slug" className="text-base font-semibold">
                                Brand URL Slug *
                            </Label>
                            <Input
                                id="slug"
                                type="text"
                                value={formData.slug}
                                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                required
                                className="text-lg h-12 font-mono"
                            />
                            <p className="text-sm text-muted-foreground">
                                Your brand URL: <span className="font-mono text-primary">/{formData.slug}</span>
                            </p>
                        </div>

                        {/* Logo Upload */}
                        <div className="space-y-2">
                            <Label className="text-base font-semibold">
                                Brand Logo (Optional)
                            </Label>
                            <div className="flex items-start gap-4">
                                {/* Logo Preview */}
                                <div className="flex-shrink-0">
                                    <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden">
                                        {logoPreview ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain" />
                                        ) : (
                                            <Upload className="w-8 h-8 text-gray-400" />
                                        )}
                                    </div>
                                </div>

                                {/* Upload Button */}
                                <div className="flex-1 space-y-2">
                                    <Input
                                        id="logo"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoUpload}
                                        className="cursor-pointer"
                                    />
                                    <p className="text-sm text-muted-foreground">
                                        Upload your brand logo (PNG, JPG, SVG). Max 2MB.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Primary Color */}
                        <div className="space-y-2">
                            <Label htmlFor="primaryColor" className="text-base font-semibold flex items-center gap-2">
                                <Palette className="w-4 h-4" />
                                Brand Color
                            </Label>
                            <div className="flex items-center gap-4">
                                <Input
                                    id="primaryColor"
                                    type="color"
                                    value={formData.primaryColor}
                                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                                    className="w-20 h-12 cursor-pointer"
                                />
                                <Input
                                    type="text"
                                    value={formData.primaryColor}
                                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                                    className="flex-1 h-12 font-mono"
                                    placeholder="#e11d48"
                                />
                            </div>
                            <p className="text-sm text-muted-foreground">
                                This color will be used for buttons, links, and highlights in your dashboard
                            </p>
                        </div>

                        {/* Preview */}
                        <div className="rounded-lg border-2 border-gray-200 p-6 bg-gradient-to-br from-white to-gray-50">
                            <p className="text-sm font-semibold text-gray-600 mb-3">Preview:</p>
                            <div className="flex items-center gap-4">
                                {logoPreview && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={logoPreview} alt="Logo" className="w-12 h-12 object-contain" />
                                )}
                                <div>
                                    <h3 className="text-xl font-bold" style={{ color: formData.primaryColor }}>
                                        {formData.brandName || "Your Brand Name"}
                                    </h3>
                                    <p className="text-sm text-gray-500">Multi-outlet expense tracker</p>
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            disabled={loading || !formData.brandName || !formData.slug}
                            className="w-full h-12 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                            style={{ backgroundColor: formData.primaryColor }}
                        >
                            {loading ? "Creating your brand..." : "Create Brand & Continue"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div >
    );
}
