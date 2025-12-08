"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Building2, Palette, ArrowRight, Mail, ArrowLeft, LogOut, Search } from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";

export default function OnboardingClient() {
    const router = useRouter();
    const [mode, setMode] = useState<'SELECT' | 'CREATE' | 'JOIN'>('SELECT');
    const [loading, setLoading] = useState(false);

    // Create Mode State
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        brandName: "",
        slug: "",
        logoFile: null as File | null,
        primaryColor: "#e11d48", // Default red
    });

    const titleStyle = { color: formData.primaryColor };
    const submitButtonStyle = { backgroundColor: formData.primaryColor };

    // Join Mode State
    const [joinToken, setJoinToken] = useState("");

    // --- Create Handlers ---
    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Limit to 500KB to prevent 413 errors
            if (file.size > 500000) {
                alert('Logo file is too large. Please choose a file smaller than 500KB.');
                return;
            }
            setFormData({ ...formData, logoFile: file });
            const reader = new FileReader();
            reader.onloadend = () => setLogoPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const generateSlug = (name: string) => {
        return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    };

    const handleBrandNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        setFormData({ ...formData, brandName: name, slug: generateSlug(name) });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            let logoUrl = null;
            if (formData.logoFile) {
                const reader = new FileReader();
                logoUrl = await new Promise<string>((resolve) => {
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(formData.logoFile!);
                });
            }

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

            const data = await response.json();
            console.log('Onboarding response:', { status: response.status, data });

            if (!response.ok) {
                const errorMsg = data.error || 'Failed to create brand';
                console.error('Onboarding error:', errorMsg);
                alert(`Error: ${errorMsg}`);
                throw new Error(errorMsg);
            }

            console.log('Brand created successfully, redirecting to dashboard...');
            // Force a hard redirect to ensure Clerk metadata refreshes
            window.location.href = '/brand/dashboard';
        } catch (error) {
            console.error('Onboarding error:', error);
            alert(`Failed to create brand: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    // --- Join Handler ---
    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!joinToken) return;
        // User manually pasting a token? Usually they click a link.
        // We can redirect them to the generic invite handler route.
        window.location.href = `/invite/brand?token=${joinToken}`;
    };

    // --- Renders ---

    const renderHeader = (title: string, desc: string) => (
        <CardHeader className="text-center space-y-2 relative pb-2">
            <div className="absolute top-0 right-0 p-4">
                <SignOutButton>
                    <Button variant="ghost" size="sm" className="gap-2 text-stone-500 hover:text-stone-900">
                        <LogOut size={16} /> Sign Out
                    </Button>
                </SignOutButton>
            </div>

            {mode !== 'SELECT' && (
                <div className="absolute top-0 left-0 p-4">
                    <Button variant="ghost" size="sm" className="gap-2 text-stone-500 hover:text-stone-900" onClick={() => setMode('SELECT')}>
                        <ArrowLeft size={16} /> Back
                    </Button>
                </div>
            )}

            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-rose-100">
                <Building2 className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold text-stone-900">{title}</CardTitle>
            <CardDescription className="text-base text-stone-600">{desc}</CardDescription>
        </CardHeader>
    );

    if (mode === 'SELECT') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
                <Card className="w-full max-w-4xl shadow-xl border-stone-200 overflow-hidden">
                    {renderHeader("Welcome to Beloop", "How would you like to get started?")}

                    <CardContent className="p-8 grid md:grid-cols-2 gap-6">
                        {/* Option 1: Create */}
                        <button
                            onClick={() => setMode('CREATE')}
                            className="group flex flex-col items-center p-8 rounded-xl border-2 border-stone-100 bg-white hover:border-rose-500 hover:bg-rose-50/50 transition-all text-center space-y-4 shadow-sm hover:shadow-md"
                        >
                            <div className="w-20 h-20 rounded-full bg-stone-100 flex items-center justify-center group-hover:bg-rose-100 transition-colors">
                                <Building2 className="w-10 h-10 text-stone-400 group-hover:text-rose-600" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-stone-900">Create New Brand</h3>
                                <p className="text-sm text-stone-500 max-w-[240px] mx-auto">
                                    I want to set up my own multi-outlet restaurant business.
                                </p>
                            </div>
                            <div className="pt-4">
                                <span className="inline-flex items-center text-sm font-semibold text-rose-600 group-hover:translate-x-1 transition-transform">
                                    Get Started <ArrowRight className="ml-2 w-4 h-4" />
                                </span>
                            </div>
                        </button>

                        {/* Option 2: Join */}
                        <button
                            onClick={() => setMode('JOIN')}
                            className="group flex flex-col items-center p-8 rounded-xl border-2 border-stone-100 bg-white hover:border-blue-500 hover:bg-blue-50/50 transition-all text-center space-y-4 shadow-sm hover:shadow-md"
                        >
                            <div className="w-20 h-20 rounded-full bg-stone-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                <Mail className="w-10 h-10 text-stone-400 group-hover:text-blue-600" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-stone-900">Join Existing Brand</h3>
                                <p className="text-sm text-stone-500 max-w-[240px] mx-auto">
                                    I have an invitation code or link from my manager.
                                </p>
                            </div>
                            <div className="pt-4">
                                <span className="inline-flex items-center text-sm font-semibold text-blue-600 group-hover:translate-x-1 transition-transform">
                                    Join Team <ArrowRight className="ml-2 w-4 h-4" />
                                </span>
                            </div>
                        </button>
                    </CardContent>
                    <CardFooter className="bg-stone-50 border-t border-stone-100 flex justify-center py-6">
                        <p className="text-sm text-stone-400">
                            Need help? <a href="#" className="underline hover:text-stone-600">Contact Support</a>
                        </p>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    if (mode === 'JOIN') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
                <Card className="w-full max-w-lg shadow-xl border-stone-200">
                    {renderHeader("Join Your Team", "Enter your invitation details")}

                    <CardContent className="space-y-6">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3 text-sm text-blue-800">
                            <Mail className="w-5 h-5 shrink-0" />
                            <p>
                                <strong>Check your email!</strong> You should have received an invitation link. Clicking that link is the easiest way to join.
                            </p>
                        </div>

                        <form onSubmit={handleJoin} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="token">Or paste your Invitation Token</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="token"
                                        placeholder="e.g. 550e8400-e29b..."
                                        value={joinToken}
                                        onChange={(e) => setJoinToken(e.target.value)}
                                        className="font-mono"
                                    />
                                </div>
                                <p className="text-xs text-stone-400">Found at the end of your invite link (?token=...)</p>
                            </div>

                            <Button type="submit" className="w-full bg-stone-900 hover:bg-stone-800" disabled={!joinToken}>
                                Find Invitation
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Default: CREATE Mode (The original form, heavily styled)
    return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
            <Card className="w-full max-w-2xl shadow-2xl border-stone-200">
                {renderHeader("Create Your Brand", "Set up your brand profile")}

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Brand Name */}
                        <div className="space-y-2">
                            <Label htmlFor="brandName" className="text-base font-semibold">Brand Name *</Label>
                            <Input
                                id="brandName" type="text" placeholder="e.g., Smoocho Restaurants"
                                value={formData.brandName} onChange={handleBrandNameChange} required
                                className="text-lg h-12"
                            />
                        </div>

                        {/* Slug */}
                        <div className="space-y-2">
                            <Label htmlFor="slug" className="text-base font-semibold">Brand URL Slug *</Label>
                            <Input
                                id="slug" type="text" value={formData.slug}
                                onChange={(e) => setFormData({ ...formData, slug: e.target.value })} required
                                className="text-lg h-12 font-mono"
                            />
                            <p className="text-sm text-muted-foreground">
                                Your URL: <span className="font-mono text-primary">/{formData.slug}</span>
                            </p>
                        </div>

                        {/* Logo Upload */}
                        <div className="space-y-2">
                            <Label className="text-base font-semibold">Brand Logo (Optional)</Label>
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0">
                                    <div className="w-24 h-24 rounded-lg border-2 border-dashed border-stone-200 flex items-center justify-center bg-stone-50 overflow-hidden">
                                        {logoPreview ? (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain" />
                                        ) : (
                                            <Upload className="w-8 h-8 text-stone-300" />
                                        )}
                                    </div>
                                </div>
                                <div className="flex-1 space-y-2">
                                    <Input
                                        id="logo" type="file" accept="image/*" onChange={handleLogoUpload}
                                        className="cursor-pointer file:text-stone-600 text-stone-600"
                                    />
                                    <p className="text-sm text-muted-foreground">Upload your brand logo (PNG, JPG, SVG).</p>
                                </div>
                            </div>
                        </div>

                        {/* Primary Color */}
                        <div className="space-y-2">
                            <Label className="text-base font-semibold flex items-center gap-2">
                                <Palette className="w-4 h-4" /> Brand Color
                            </Label>
                            <div className="flex items-center gap-4">
                                <Input
                                    id="primaryColor" type="color" value={formData.primaryColor}
                                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                                    className="w-16 h-12 cursor-pointer p-1"
                                />
                                <Input
                                    type="text" value={formData.primaryColor}
                                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                                    className="flex-1 h-12 font-mono uppercase"
                                />
                            </div>
                        </div>

                        {/* Preview */}
                        <div className="rounded-lg border border-stone-200 p-6 bg-stone-50/50">
                            <p className="text-sm font-semibold text-stone-500 mb-3 uppercase tracking-wider">Live Preview</p>
                            <div className="flex items-center gap-4">
                                {logoPreview && (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={logoPreview} alt="Logo" className="w-12 h-12 object-contain" />
                                )}
                                <div>
                                    {/* eslint-disable-next-line */}
                                    <h3 className="text-xl font-bold" style={titleStyle}>
                                        {formData.brandName || "Your Brand Name"}
                                    </h3>
                                    <p className="text-sm text-stone-500">Multi-outlet expense tracker</p>
                                </div>
                            </div>
                        </div>

                        <Button
                            type="submit" disabled={loading || !formData.brandName || !formData.slug}
                            className="w-full h-12 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                            style={submitButtonStyle}
                        >
                            {loading ? "Creating..." : "Create Brand & Continue"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
