import { prisma } from "@/server/db";
import { currentUser } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { acceptInvitation } from "@/server/actions/invitation";
import { SignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation"; // ✅ Added import

export default async function InvitePage({ params }: { params: { token: string } }) {
    const { token } = params;
    const user = await currentUser();

    const invite = await prisma.invitation.findUnique({
        where: { token },
        include: { tenant: true, outlet: true }
    });

    if (!invite) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <CardTitle className="text-red-600">Invalid Invitation</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-600">This invitation link is invalid or has expired.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (invite.status !== 'PENDING') {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <CardTitle className="text-yellow-600">Invitation Already Used</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-600">This invitation has already been accepted or has expired.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // If user is not logged in, show Clerk sign-in
    if (!user) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
                <div className="max-w-md w-full space-y-6">
                    <Card>
                        <CardHeader className="text-center">
                            <CardTitle>You&apos;ve been invited!</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center">
                            <p className="mb-4 text-gray-600">
                                You have been invited to join <strong>{invite.tenant?.name || 'Platform'}</strong>
                                {invite.outlet && <span> at <strong>{invite.outlet.name}</strong></span>}
                                {' '}as a <strong>{invite.inviteRole}</strong>.
                            </p>
                            <p className="text-sm text-gray-500 mb-4">Please sign in or create an account to accept this invitation.</p>
                        </CardContent>
                    </Card>

                    <div className="flex justify-center">
                        <SignIn
                            routing="path"
                            path={`/invite/${token}`}
                            redirectUrl={`/invite/${token}`}
                            afterSignInUrl={`/invite/${token}`}
                            afterSignUpUrl={`/invite/${token}`}
                        />
                    </div>
                </div>
            </div>
        );
    }

    // User is logged in, show accept button
    const handleAccept = async () => {
        "use server";
        const result = await acceptInvitation(token);
        if (result.redirectPath) {
            redirect(result.redirectPath);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <Card className="max-w-md w-full">
                <CardHeader className="text-center">
                    <CardTitle>You&apos;ve been invited!</CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-6">
                    <p className="text-gray-600">
                        You have been invited to join <strong>{invite.tenant?.name || 'Platform'}</strong>
                        {invite.outlet && <span> at <strong>{invite.outlet.name}</strong></span>}
                        {' '}as a <strong>{invite.inviteRole}</strong>.
                    </p>

                    <form action={handleAccept}>
                        <Button className="w-full" size="lg">Accept Invitation</Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
