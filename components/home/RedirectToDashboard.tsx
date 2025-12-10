"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function RedirectToDashboard() {
    const { isSignedIn, isLoaded, user } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (isLoaded && isSignedIn && user) {
            const role = user.publicMetadata.role as string;

            // Dynamic Redirect based on Role
            switch (role) {
                case 'SUPER':
                    router.push('/super/dashboard');
                    break;
                case 'BRAND_ADMIN':
                    router.push('/brand/dashboard');
                    break;
                case 'OUTLET_MANAGER':
                    router.push('/outlet/dashboard');
                    break;
                case 'STAFF':
                case 'WAITER':
                case 'KITCHEN':
                    router.push('/outlet/orders');
                    break;
                default:
                    // If no role, they might be pending or in onboarding. 
                    // Do nothing or send to onboarding if that page existed.
                    // For now, let them stay on home page with "Pending" state if logical.
                    console.log("User has no role, staying on Home.");
                    break;
            }
        }
    }, [isLoaded, isSignedIn, user, router]);

    return null;
}
