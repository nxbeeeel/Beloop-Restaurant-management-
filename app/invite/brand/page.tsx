
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useClerk, useUser } from '@clerk/nextjs';

export default function BrandInvitePage() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const router = useRouter();
    const { user, isLoaded: isUserLoaded } = useUser();
    const { signOut } = useClerk();

    const [isActivating, setIsActivating] = useState(false);

    // Mutation to activate
    const activateMutation = trpc.public.activateBrand.useMutation({
        onSuccess: (data) => {
            toast.success("Brand Activated Successfully! 🎉");
            // Redirect to dashboard
            setTimeout(() => {
                router.push('/brand/dashboard');
            }, 1500);
        },
        onError: (err) => {
            toast.error(err.message || "Failed to activate brand");
            setIsActivating(false);
        }
    });

    const handleActivate = () => {
        if (!token) return;
        setIsActivating(true);
        activateMutation.mutate({ token });
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
            <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-stone-900">Welcome to Beloop</h1>
                    <p className="mt-2 text-stone-600">You've been invited to set up your brand.</p>
                </div>

                <Card className="border-stone-200 shadow-xl">
                    <CardHeader>
                        <CardTitle>Accept Invitation</CardTitle>
                        <CardDescription>
                            Click below to activate your brand and account.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 p-3 bg-stone-100 rounded-lg">
                                    <div className="h-10 w-10 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 font-bold">
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
                                </div>
                                <div className="text-xs text-stone-400 text-center">
                                    Not you? <button className="underline hover:text-stone-600" onClick={() => signOut()}>Sign Out</button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button
                            className="w-full bg-rose-600 hover:bg-rose-700 text-white text-lg h-12"
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
