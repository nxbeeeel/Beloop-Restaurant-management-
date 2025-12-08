'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { createInvitation } from "@/server/actions/invitation";
import { useRouter } from 'next/navigation';

interface Outlet {
    id: string;
    name: string;
}

interface InviteUserFormProps {
    outlets: Outlet[];
    brandColor?: string;
}

export function InviteUserForm({ outlets, brandColor = '#e11d48' }: InviteUserFormProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [role, setRole] = useState("STAFF");

    const ringStyle = { '--tw-ring-color': brandColor } as React.CSSProperties;
    const buttonStyle = { backgroundColor: brandColor };

    const handleSubmit = async (formData: FormData) => {
        setIsSubmitting(true);
        try {
            const result = await createInvitation(formData);

            if (result.success) {
                toast.success(result.message);
                router.push('/brand/staff');
                router.refresh();
            } else {
                // Should not happen with new action response structure but good to handle
                toast.error("Something went wrong");
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to send invitation");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form action={handleSubmit} className="space-y-4">
            <div>
                <input
                    name="email"
                    type="email"
                    placeholder="colleague@example.com"
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-offset-1 outline-none transition-all"
                    style={ringStyle}
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-1" htmlFor="role-select">Role</label>
                <select
                    id="role-select"
                    name="role"
                    title="Select Role"
                    aria-label="Select Role"
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-offset-1 outline-none transition-all"
                    style={ringStyle}
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                >
                    <option value="STAFF">Staff</option>
                    <option value="OUTLET_MANAGER">Outlet Manager</option>
                    <option value="BRAND_ADMIN">Brand Admin</option>
                </select>
            </div>

            {(role === 'STAFF' || role === 'OUTLET_MANAGER') && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="block text-sm font-medium mb-1" htmlFor="outlet-select">Outlet (Required)</label>
                    <select
                        id="outlet-select"
                        name="outletId"
                        title="Select Outlet"
                        aria-label="Select Outlet"
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-offset-1 outline-none transition-all"
                        style={ringStyle}
                        required
                    >
                        <option value="">Select Outlet...</option>
                        {outlets.map((outlet) => (
                            <option key={outlet.id} value={outlet.id}>{outlet.name}</option>
                        ))}
                    </select>
                </div>
            )}

            <div className="pt-4">
                <Button
                    type="submit"
                    className="w-full text-white transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
                    style={buttonStyle}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                        </>
                    ) : (
                        <>
                            Send Invitation <Send className="ml-2 h-4 w-4" />
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
}
