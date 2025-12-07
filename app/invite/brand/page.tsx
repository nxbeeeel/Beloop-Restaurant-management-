
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

        // Convert Logo to Base64 if exists
        let logoUrl: string | null = null;
        if (logoFile) {
            const reader = new FileReader();
            logoUrl = await new Promise<string>((resolve) => {
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(logoFile);
            });
        }

        activateMutation.mutate({
            token,
            logoUrl: logoUrl, // Pass optional logo
            primaryColor: primaryColor // Pass optional color
        });
    };

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
                <Card className="max-w-md w-full border-red-200">
                    <CardHeader>
                        <CardTitle className="text-red-600 flex items-center gap-2">
                            <AlertCircle /> Invalid Link
                        </CardTitle>
                        <CardDescription>
                            This invitation link is missing a token. Please check the URL and try again.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 p-4">
            <div className="w-full max-w-lg space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-stone-900">Welcome to Beloop</h1>
                    <p className="mt-2 text-stone-600">You've been invited to set up your brand.</p>
                </div>

                <Card className="border-stone-200 shadow-xl overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-stone-50 to-stone-100 border-b border-stone-100 pb-6">
                        <CardTitle className="text-xl">Accept Invitation</CardTitle>
                        <CardDescription>
                            Customize your brand profile before activating.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6 pt-6">
                        {!isUserLoaded ? (
                            <div className="flex justify-center py-4">
                                <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
                            </div>
                        ) : !user ? (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                                <p className="font-semibold mb-1">Authentication Required</p>
                                <p>You must be signed in to accept this invitation.</p>
                                <Button
                                    className="mt-3 w-full bg-stone-900 hover:bg-stone-800 text-white"
                                    onClick={() => router.push(`/sign-in?redirect_url=${encodeURIComponent(window.location.href)}`)}
                                >
                                    Sign In / Sign Up
                                </Button>
                            </div>
                        ) : (
                            <>
                                {/* User Profile */}
                                <div className="flex items-center gap-3 p-3 bg-stone-100 rounded-lg border border-stone-200">
                                    <div className="h-10 w-10 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 font-bold border border-stone-300">
                                        {user.firstName?.charAt(0) || user.emailAddresses[0].emailAddress.charAt(0)}
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-sm font-medium text-stone-900 truncate">
                                            {user.fullName || 'User'}
                                        </p>
                                        <p className="text-xs text-stone-500 truncate">
                                            {user.primaryEmailAddress?.emailAddress}
                                        </p>
                                    </div>
                                    <div className="ml-auto">
                                        <button className="text-xs text-rose-600 hover:text-rose-700 underline font-medium" onClick={() => signOut()}>
                                            Switch Account
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <span className="w-full border-t border-stone-200" />
                                        </div>
                                        <div className="relative flex justify-center text-xs uppercase">
                                            <span className="bg-white px-2 text-stone-500 font-medium">Customize Your Brand</span>
                                        </div>
                                    </div>

                                    {/* Logo Upload */}
                                    <div className="space-y-3">
                                        <Label className="text-sm font-medium flex items-center gap-2 text-stone-700">
                                            <Upload className="w-4 h-4" /> Brand Logo (Optional)
                                        </Label>
                                        <div className="flex items-center gap-4">
                                            <div className="h-16 w-16 rounded-md border-2 border-dashed border-stone-300 flex items-center justify-center bg-stone-50 overflow-hidden shrink-0">
                                                {logoPreview ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                                                ) : (
                                                    <Upload className="w-6 h-6 text-stone-300" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <Input
                                                    id="logo" type="file" accept="image/*" onChange={handleLogoUpload}
                                                    className="cursor-pointer file:text-stone-600 text-stone-600 text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Brand Color */}
                                    <div className="space-y-3">
                                        <Label className="text-sm font-medium flex items-center gap-2 text-stone-700">
                                            <Palette className="w-4 h-4" /> Brand Theme Color
                                        </Label>
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="h-10 w-10 rounded-full border-2 border-stone-200 shadow-sm cursor-pointer overflow-hidden relative"
                                                style={{ backgroundColor: primaryColor }}
                                            >
                                                <input
                                                    type="color"
                                                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                                    value={primaryColor}
                                                    onChange={(e) => setPrimaryColor(e.target.value)}
                                                />
                                            </div>
                                            <Input
                                                type="text"
                                                value={primaryColor}
                                                onChange={(e) => setPrimaryColor(e.target.value)}
                                                className="font-mono uppercase w-32"
                                                placeholder="#E11D48"
                                                maxLength={7}
                                            />
                                            <div className="h-10 flex-1 rounded-md flex items-center px-3 text-white text-sm font-medium shadow-sm" style={{ backgroundColor: primaryColor }}>
                                                Preview Button
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                    <CardFooter className="bg-stone-50/50 pt-6 border-t border-stone-100">
                        <Button
                            className="w-full text-lg h-12 shadow-md transition-all hover:scale-[1.01]"
                            style={{
                                backgroundColor: user ? primaryColor : '#e5e7eb',
                                color: 'white',
                                cursor: user ? 'pointer' : 'not-allowed'
                            }}
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
                    </CardFooter>
                </Card>
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
