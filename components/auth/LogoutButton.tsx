"use client";

import { SignOutButton } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LogoutButtonProps {
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    size?: "default" | "sm" | "lg" | "icon";
    className?: string;
    showText?: boolean;
}

export function LogoutButton({
    variant = "ghost",
    size = "default",
    className = "",
    showText = true
}: LogoutButtonProps) {
    return (
        <SignOutButton redirectUrl="/">
            <Button variant={variant} size={size} className={className}>
                <LogOut className={`w-4 h-4 ${showText ? "mr-2" : ""}`} />
                {showText && "Logout"}
            </Button>
        </SignOutButton>
    );
}
