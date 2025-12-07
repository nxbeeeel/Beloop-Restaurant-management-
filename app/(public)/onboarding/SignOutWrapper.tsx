'use client';

import { SignOutButton } from "@clerk/nextjs";
import { LogOut } from "lucide-react";

export default function SignOutWrapper() {
    return (
        <SignOutButton>
            <button className="px-6 py-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2">
                <LogOut size={16} />
                Sign Out / Cancel
            </button>
        </SignOutButton>
    );
}
