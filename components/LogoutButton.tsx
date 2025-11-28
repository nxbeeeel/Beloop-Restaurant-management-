"use client";

import { UserButton } from "@clerk/nextjs";

export default function LogoutButton() {
    return (
        <div className="flex items-center gap-4">
            <UserButton
                afterSignOutUrl="/"
                appearance={{
                    elements: {
                        avatarBox: "w-10 h-10",
                    }
                }}
            />
        </div>
    );
}
