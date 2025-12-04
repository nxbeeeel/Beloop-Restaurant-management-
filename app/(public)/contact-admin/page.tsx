import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Building2, Mail, ArrowLeft } from "lucide-react";

export default async function ContactAdminPage() {
    const { userId } = await auth();
    if (userId) {
        const user = await prisma.user.findUnique({
            where: { clerkId: userId },
            include: { tenant: true, outlet: true }
        });
        if (user?.tenantId) {
            // If user already belongs to a brand, redirect to appropriate dashboard
            if (user.outletId) {
                redirect("/outlet/dashboard");
            } else {
                redirect("/brand/dashboard");
            }
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
            <Card className="w-full max-w-lg shadow-2xl">
                <CardHeader className="text-center space-y-4">
                    <div className="mx-auto w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mb-2">
                        <Building2 className="w-10 h-10 text-white" />
                    </div>
                    <CardTitle className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        Account Created Successfully!
                    </CardTitle>
                    <CardDescription className="text-base">
                        Your account has been created, but you need to be assigned to a brand to continue.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-3">
                        <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                            <Mail className="w-5 h-5" />
                            What&apos;s Next?
                        </h3>
                        <p className="text-sm text-blue-800">
                            You have two options to get started with Beloop:
                        </p>
                        <ul className="text-sm text-blue-800 space-y-2 list-disc list-inside">
                            <li><strong>Create Your Own Brand:</strong> Start your own business on Beloop</li>
                            <li><strong>Join an Existing Brand:</strong> Contact your brand admin for an invitation</li>
                        </ul>
                    </div>
                    <div className="space-y-3">
                        <Link href="/onboarding" className="block">
                            <Button className="w-full h-12 text-lg bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700">
                                Create My Brand
                            </Button>
                        </Link>
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-white text-gray-500">OR</span>
                            </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                            <p className="text-sm font-medium text-gray-700">
                                Already have an invitation?
                            </p>
                            <p className="text-xs text-gray-600">
                                Check your email for an invitation link from your brand admin. The link will automatically assign you to the correct brand and outlet.
                            </p>
                        </div>
                    </div>
                    <div className="pt-4 border-t">
                        <Link href="/">
                            <Button variant="ghost" className="w-full">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Home
                            </Button>
                        </Link>
                    </div>
                    <div className="text-center text-xs text-gray-500">
                        <p>Need help? Contact support at <a href="mailto:support@beloop.com" className="text-rose-600 hover:underline">support@beloop.com</a></p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
