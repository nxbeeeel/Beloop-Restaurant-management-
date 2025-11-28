'use server';

import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/server/db";

export async function syncUserMetadata() {
    const { userId } = auth();
    if (!userId) return { success: false, error: "Not authenticated" };

    console.log("Syncing metadata for user:", userId);
    try {
        const user = await prisma.user.findUnique({
            where: { clerkId: userId },
        });

        if (!user) {
            console.error("User not found in DB:", userId);
            return { success: false, error: "User not found in database" };
        }

        if (!user.tenantId) {
            console.error("User has no tenant:", userId);
            return { success: false, error: "User has no tenant" };
        }

        console.log("Updating Clerk metadata for user:", userId, "Role:", user.role);
        // Update Clerk metadata
        await clerkClient.users.updateUserMetadata(userId, {
            publicMetadata: {
                onboardingComplete: true,
                role: user.role,
                tenantId: user.tenantId,
                outletId: user.outletId,
            },
        });

        // Determine redirect path
        let path = '/outlet/dashboard';
        if (user.role === 'SUPER') path = '/super/dashboard';
        else if (user.role === 'BRAND_ADMIN') path = '/brand/dashboard';

        console.log("Sync successful, redirecting to:", path);
        return { success: true, redirectUrl: path };
    } catch (error) {
        console.error("Failed to sync metadata:", error);
        return { success: false, error: "Internal server error" };
    }
}



export async function completeOnboarding(formData: FormData) {
    const result = await syncUserMetadata();
    if (result.success && result.redirectUrl) {
        console.log("Onboarding complete, setting cookie and returning URL:", result.redirectUrl);

        // Set a cookie to bypass middleware immediately
        cookies().set('onboarding_complete', 'true', {
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 30 // 30 days
        });

        return { success: true, redirectUrl: result.redirectUrl };
    } else {
        console.error("Onboarding failed:", result.error);
        throw new Error(result.error);
    }
}
