'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cancelInvitation, resendInvitation } from "@/server/actions/invitation";
import { useRouter } from 'next/navigation';

export function InviteActions({ inviteId }: { inviteId: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState<'revoke' | 'resend' | null>(null);

    const handleRevoke = async () => {
        if (!confirm("Are you sure you want to revoke this invitation? The link will become invalid.")) return;
        setLoading('revoke');
        try {
            await cancelInvitation(inviteId);
            toast.success("Invitation revoked");
            router.refresh();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(null);
        }
    };

    const handleResend = async () => {
        setLoading('resend');
        try {
            await resendInvitation(inviteId);
            toast.success("Invitation resent successfully");
            router.refresh();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="flex items-center gap-1">
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-stone-500 hover:text-stone-900"
                onClick={handleResend}
                disabled={!!loading}
                title="Resend Invitation"
            >
                {loading === 'resend' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-stone-500 hover:text-red-600 hover:bg-red-50"
                onClick={handleRevoke}
                disabled={!!loading}
                title="Revoke Invitation"
            >
                {loading === 'revoke' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            </Button>
        </div>
    );
}
