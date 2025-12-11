
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, Suspense } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, AlertCircle, Upload, Palette } from 'lucide-react';
import { useClerk, useUser } from '@clerk/nextjs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function BrandInviteContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const router = useRouter();
    const { user, isLoaded: isUserLoaded } = useUser();
    const { signOut } = useClerk();

    const [isActivating, setIsActivating] = useState(false);

    // Customization State
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [primaryColor, setPrimaryColor] = useState('#e11d48');

    const colorPreviewStyle = { backgroundColor: primaryColor };
    const buttonStyle = {
        backgroundColor: user ? primaryColor : '#e5e7eb',
        color: 'white',
        cursor: user ? 'pointer' : 'not-allowed'
    } as React.CSSProperties;

    // Mutation to activate
    const activateMutation = trpc.public.activateBrand.useMutation({
        onSuccess: (data: any) => {
            toast.success("Brand Activated Successfully! 🎉");
            // Redirect to dashboard
            setTimeout(() => {
                router.push('/brand/dashboard');
            }, 1500);
        },
        onError: (err: any) => {
            toast.error(err.message || "Failed to activate brand");
            setIsActivating(false);
        }
    });

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Limit to 500KB to prevent 413 errors
            if (file.size > 500000) {
                alert('Logo file is too large. Please choose a file smaller than 500KB.');
                return;
            }
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleActivate = async () => {
        if (!token) return;
        setIsActivating(true);

        // Skip logo if too large to prevent 413 errors
        // Base64 encoding increases size by ~33%, so limit to ~500KB original
        let logoUrl: string | null = null;
        if (logoFile && logoFile.size < 500000) {
            const reader = new FileReader();
            logoUrl = await new Promise<string>((resolve) => {
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(logoFile);
            });
        } else if (logoFile) {
            console.warn('Logo file too large, skipping upload');
        }

        activateMutation.mutate({
            token,
            logoUrl: logoUrl, // Pass optional logo
            primaryColor: primaryColor // Pass optional color
        });
    };

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-white p-4 font-sans selection:bg-rose-500/30">
                <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-500">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 mb-4">
                        <AlertCircle className="w-8 h-8 text-rose-500" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">Invalid Invitation Link</h1>
                    <p className="text-gray-400 text-lg">
                        This invitation link is either missing a token or has expired.
                    </p>
                    <div className="pt-4">
                        <Button
                            variant="outline"
                            className="border-white/10 hover:bg-white/5 text-white"
                            onClick={() => router.push('/')}
                        >
                            Return to Home
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#09090b] text-white p-4 font-sans selection:bg-rose-500/30">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px] opacity-20" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-rose-900/20 rounded-full blur-[120px] opacity-20" />
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay"></div>
            </div>

            <div className="w-full max-w-lg space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 relative z-10">
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/50">
                        Welcome to Beloop
                    </h1>
                    <p className="text-lg text-gray-400">You've been invited to set up your brand.</p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl overflow-hidden">
                    <div className="p-6 border-b border-white/5 bg-white/5">
                        <h2 className="text-xl font-semibold text-white">Accept Invitation</h2>
                        <p className="text-sm text-gray-400 mt-1">
                            Customize your brand profile before activating.
                        </p>
                    </div>

                    <div className="p-8 space-y-8">
                        {!isUserLoaded ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
                            </div>
                        ) : !user ? (
                            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-6 text-rose-200">
                                <p className="font-semibold mb-2 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" /> Authentication Required
                                </p>
                                <p className="text-sm opacity-90 mb-4">You must be signed in to accept this invitation.</p>
                                <Button
                                    className="w-full bg-rose-600 hover:bg-rose-700 text-white border-0"
                                    onClick={() => router.push(`/sign-in?redirect_url=${encodeURIComponent(window.location.href)}`)}
                                >
                                    Sign In / Sign Up
                                </Button>
                            </div>
                        ) : (
                            <>
                                {/* User Profile */}
                                <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-white font-bold text-lg border border-white/10">
                                        {user.firstName?.charAt(0) || user.emailAddresses[0].emailAddress.charAt(0)}
                                    </div>
                                    <div className="overflow-hidden flex-1">
                                        <p className="text-base font-medium text-white truncate">
                                            {user.fullName || 'User'}
                                        </p>
                                        <p className="text-sm text-gray-400 truncate">
                                            {user.primaryEmailAddress?.emailAddress}
                                        </p>
                                    </div>
                                    <button
                                        className="text-xs text-rose-400 hover:text-rose-300 font-medium px-3 py-1.5 rounded-full bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
                                        onClick={() => signOut()}
                                    >
                                        Switch
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <span className="w-full border-t border-white/10" />
                                        </div>
                                        <div className="relative flex justify-center text-xs uppercase tracking-wider">
                                            <span className="bg-[#121215] px-3 text-gray-500 font-medium">Customize Your Brand</span>
                                        </div>
                                    </div>

                                    {/* Logo Upload */}
                                    <div className="space-y-4">
                                        <Label className="text-sm font-medium flex items-center gap-2 text-gray-300">
                                            <Upload className="w-4 h-4" /> Brand Logo
                                        </Label>
                                        <div className="flex items-center gap-4">
                                            <div className="h-20 w-20 rounded-2xl border border-white/10 bg-black/20 flex items-center justify-center overflow-hidden shrink-0 group relative">
                                                {logoPreview ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                                                ) : (
                                                    <Upload className="w-8 h-8 text-gray-600 group-hover:text-gray-500 transition-colors" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <Input
                                                    id="logo" type="file" accept="image/*" onChange={handleLogoUpload}
                                                    className="cursor-pointer file:text-white text-gray-400 bg-white/5 border-white/10 hover:bg-white/10 transition-colors"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Brand Color */}
                                    <div className="space-y-4">
                                        <Label className="text-sm font-medium flex items-center gap-2 text-gray-300">
                                            <Palette className="w-4 h-4" /> Brand Theme Color
                                        </Label>
                                        <div className="flex items-center gap-3">
                                            {/* eslint-disable-next-line */}
                                            <div
                                                className="h-11 w-11 rounded-full border-2 border-white/10 shadow-lg cursor-pointer overflow-hidden relative"
                                                // eslint-disable-next-line react-dom/no-unsafe-inline-style
                                                style={colorPreviewStyle}
                                            >
                                                <input
                                                    type="color"
                                                    title="Choose Brand Color"
                                                    aria-label="Choose Brand Color"
                                                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                                    value={primaryColor}
                                                    onChange={(e) => setPrimaryColor(e.target.value)}
                                                />
                                            </div>
                                            <Input
                                                type="text"
                                                value={primaryColor}
                                                onChange={(e) => setPrimaryColor(e.target.value)}
                                                className="font-mono uppercase w-32 bg-white/5 border-white/10 text-white"
                                                placeholder="#E11D48"
                                                maxLength={7}
                                            />
                                            {/* eslint-disable-next-line react-dom/no-unsafe-inline-style */}
                                            <div className="h-11 flex-1 rounded-lg flex items-center px-4 text-white text-sm font-medium shadow-lg" style={colorPreviewStyle}>
                                                Preview Button
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="p-6 bg-white/5 border-t border-white/5">
                        {/* eslint-disable-next-line */}
                        <Button
                            className="w-full text-lg h-14 shadow-xl transition-all hover:scale-[1.02] bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
                            // eslint-disable-next-line react-dom/no-unsafe-inline-style
                            style={user ? { backgroundColor: primaryColor } : {}}
                            disabled={!user || isActivating || activateMutation.isPending}
                            onClick={handleActivate}
                        >
                            {activateMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Setting Up...
                                </>
                            ) : (
                                <>
                                    Activate Brand <CheckCircle2 className="ml-2 h-5 w-5" />
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function BrandInvitePage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-stone-400" /></div>}>
            <BrandInviteContent />
        </Suspense>
    );
}
