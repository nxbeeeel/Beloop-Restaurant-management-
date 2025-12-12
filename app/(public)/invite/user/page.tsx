"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, Suspense } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { useClerk, useUser } from '@clerk/nextjs';

function UserInviteContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const router = useRouter();
    const { user, isLoaded: isUserLoaded } = useUser();
    const { signOut } = useClerk();

    const [isAccepting, setIsAccepting] = useState(false);

    // Mutation to accept invite
    const acceptMutation = trpc.public.acceptInvite.useMutation({
        onSuccess: (data: any) => {
            toast.success("Invitation Accepted! Welcome aboard. 🎉");
            // Redirect based on response or default
            setTimeout(() => {
                // If brand admin, go to brand dashboard. If super, super. 
                // For now, let's default to brand dashboard or main dashboard resolver.
                router.push('/');
            }, 1000);
        },
        onError: (err: any) => {
            toast.error(err.message || "Failed to accept invitation");
            setIsAccepting(false);
        }
    });

    const handleAccept = async () => {
        if (!token) return;
        setIsAccepting(true);
        acceptMutation.mutate({ token });
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
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px] opacity-20" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-900/20 rounded-full blur-[120px] opacity-20" />
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay"></div>
            </div>

            <div className="w-full max-w-lg space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 relative z-10">
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/50">
                        You&apos;ve Been Invited
                    </h1>
                    <p className="text-lg text-gray-400">Join your team on Beloop.</p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl overflow-hidden">
                    <div className="p-6 border-b border-white/5 bg-white/5">
                        <h2 className="text-xl font-semibold text-white">Accept Invitation</h2>
                        <p className="text-sm text-gray-400 mt-1">
                            Confirm your account details to join.
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
                                    onClick={() => router.push(`/login?redirect_url=${encodeURIComponent(window.location.href)}`)}
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
                                        Switch Account
                                    </button>
                                </div>

                                <div className="flex items-center justify-center py-4">
                                    <div className="h-px bg-white/10 w-full" />
                                    <span className="px-4 text-gray-500 text-xs uppercase tracking-widest whitespace-nowrap">Ready to Join</span>
                                    <div className="h-px bg-white/10 w-full" />
                                </div>
                            </>
                        )}
                    </div>

                    <div className="p-6 bg-white/5 border-t border-white/5">
                        <Button
                            className="w-full text-lg h-14 shadow-xl transition-all hover:scale-[1.02] bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                            disabled={!user || isAccepting || acceptMutation.isPending}
                            onClick={handleAccept}
                        >
                            {acceptMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Joining...
                                </>
                            ) : (
                                <>
                                    Accept & Join Team <ArrowRight className="ml-2 h-5 w-5" />
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function UserInvitePage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#09090b]"><Loader2 className="h-8 w-8 animate-spin text-stone-400" /></div>}>
            <UserInviteContent />
        </Suspense>
    );
}
