"use client";

import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCircle, Mail, Shield, Building2, LogOut } from "lucide-react";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
    const { user } = useUser();
    const { signOut, openUserProfile } = useClerk();
    const router = useRouter();

    if (!user) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-gray-500">Loading...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-24">
            <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">Profile & Settings</h1>
                <p className="text-gray-500 text-sm lg:text-base">Manage your account settings and preferences.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Info Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserCircle className="w-5 h-5" />
                            Account Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
                                {user.firstName?.[0] || user.emailAddresses[0]?.emailAddress[0] || 'U'}
                            </div>
                            <div>
                                <p className="font-semibold text-lg">{user.fullName || 'User'}</p>
                                <p className="text-sm text-gray-500">{user.emailAddresses[0]?.emailAddress}</p>
                            </div>
                        </div>

                        <div className="pt-4 border-t space-y-3">
                            <div className="flex items-center gap-3 text-sm">
                                <Mail className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-600">Email:</span>
                                <span className="font-medium">{user.emailAddresses[0]?.emailAddress}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Shield className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-600">User ID:</span>
                                <span className="font-mono text-xs text-gray-500">{user.id.slice(0, 20)}...</span>
                            </div>
                        </div>

                        <Button
                            onClick={() => openUserProfile()}
                            className="w-full mt-4"
                        >
                            Edit Profile in Clerk
                        </Button>
                    </CardContent>
                </Card>

                {/* Quick Actions Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => openUserProfile()}
                        >
                            <UserCircle className="w-4 h-4 mr-2" />
                            Change Password
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => openUserProfile()}
                        >
                            <Shield className="w-4 h-4 mr-2" />
                            Security Settings
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => signOut(() => router.push("/"))}
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Sign Out
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>About Clerk Authentication</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-600">
                        Your account is managed by Clerk. To change your password, update your email,
                        or manage two-factor authentication, click the "Edit Profile in Clerk" button above.
                        This will open Clerk's secure profile management interface.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
