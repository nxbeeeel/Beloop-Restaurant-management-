'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useClerk } from '@clerk/nextjs';
import { Loader2, RefreshCw, LogOut } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface SessionSyncRedirectProps {
    targetPath: string;
}

export function SessionSyncRedirect({ targetPath }: SessionSyncRedirectProps) {
    const router = useRouter();
    const { user, isLoaded } = useUser();
    const clerk = useClerk();
    const [showControls, setShowControls] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Show manual controls if sync takes longer than 5 seconds
        const timer = setTimeout(() => setShowControls(true), 5000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const syncAndRedirect = async () => {
            if (isLoaded && user) {
                try {
                    await user.reload();
                    const role = user.publicMetadata.role || user.unsafeMetadata?.role;
                    
                    if (!role) {
                        setTimeout(syncAndRedirect, 2000);
                        return;
                    }

                    console.log(`✅ Role found: ${role}. Redirecting...`);
                    window.location.href = targetPath;
                } catch (error) {
                    console.error("Sync failed:", error);
                }
            }
        };
        syncAndRedirect();
    }, [isLoaded, user, targetPath]);

    const handleForceSync = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/force-update-metadata');
            const data = await res.json();
            
            if (res.ok && data.success) {
                toast.success("Permissions updated!");
                await user?.reload();
                window.location.href = targetPath;
            } else {
                toast.error("Update failed: " + (data.error || "Unknown error"));
            }
        } catch (error) {
            toast.error("Connection failed");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        await clerk.signOut({ redirectUrl: '/' });
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50">
            <div className="flex flex-col items-center space-y-6">
                <Loader2 className="h-12 w-12 animate-spin text-rose-600" />
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-stone-800">Finalizing Setup...</h2>
                    <p className="text-stone-500 mt-2">Syncing your account permissions.</p>
                </div>

                {showControls && (
                    <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 w-full max-w-xs">
                        <Button 
                            variant="default" 
                            onClick={handleForceSync} 
                            disabled={isLoading}
                            className="bg-rose-600 hover:bg-rose-700 w-full"
                        >
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                            Force Permission Sync
                        </Button>
                        <Button variant="outline" onClick={handleLogout} className="w-full">
                            <LogOut className="mr-2 h-4 w-4" />
                            Log Out & Try Again
                        </Button>

                        {/* DEBUG DATA */}
                        <div className="mt-4 p-4 bg-stone-100 rounded text-[10px] font-mono text-stone-500 break-all border border-stone-200 text-left">
                            <div className="mb-1 border-b border-stone-300 pb-1 font-bold">DEBUG INFO</div>
                            <strong>User ID:</strong> {user?.id} <br/>
                            <strong>Role (DB):</strong> {user?.publicMetadata?.role ? String(user.publicMetadata.role) : '❌ MISSING'} <br/>
                            <strong>Meta:</strong> {JSON.stringify(user?.publicMetadata || {})} <br/>
                            <strong>Updated:</strong> {new Date().toLocaleTimeString()}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
