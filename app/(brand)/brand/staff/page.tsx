import { prisma } from "@/server/db";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Plus, Mail, User as UserIcon, Building2, Clock } from "lucide-react";

import { SearchInput } from "@/components/common/SearchInput";

export default async function StaffPage({ searchParams }: { searchParams: { search?: string } }) {
    const { userId } = auth();
    if (!userId) return null;

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { tenantId: true }
    });

    if (!user?.tenantId) return <div>No tenant found</div>;

    const search = searchParams.search;

    const staff = await prisma.user.findMany({
        where: {
            tenantId: user.tenantId,
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } }
                ]
            })
        },
        include: { outlet: true },
        orderBy: { createdAt: 'desc' }
    });

    const pendingInvites = await prisma.invitation.findMany({
        where: {
            tenantId: user.tenantId,
            status: 'PENDING',
            ...(search && {
                email: { contains: search, mode: 'insensitive' }
            })
        },
        include: { outlet: true },
        orderBy: { createdAt: 'desc' }
    });

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        Team Members
                    </h2>
                    <p className="text-muted-foreground">
                        Manage staff access and roles across your organization.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <SearchInput placeholder="Search staff..." />
                    <Link href="/brand/staff/invite">
                        <Button className="shadow-lg hover:shadow-xl transition-all duration-200">
                            <Plus className="mr-2 h-4 w-4" /> Invite User
                        </Button>
                    </Link>
                </div>
            </div>

            {pendingInvites.length > 0 && (
                <Card className="border-orange-200 bg-orange-50/30">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold text-orange-900 flex items-center gap-2">
                            <Clock className="h-5 w-5" /> Pending Invitations
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border bg-white overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-muted-foreground font-medium">
                                    <tr>
                                        <th className="p-4">Email</th>
                                        <th className="p-4">Role</th>
                                        <th className="p-4">Outlet</th>
                                        <th className="p-4">Invitation Link</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {pendingInvites.map((invite) => (
                                        <tr key={invite.id} className="hover:bg-muted/50 transition-colors">
                                            <td className="p-4 font-medium">{invite.email || '-'}</td>
                                            <td className="p-4">
                                                <span className="inline-flex items-center rounded-md bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700 ring-1 ring-inset ring-orange-700/10">
                                                    {invite.inviteRole}
                                                </span>
                                            </td>
                                            <td className="p-4 text-muted-foreground">{invite.outlet?.name || 'All Outlets'}</td>
                                            <td className="p-4">
                                                <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-xs select-all">
                                                    {process.env.NEXT_PUBLIC_APP_URL}/invite/{invite.token}
                                                </code>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <UserIcon className="h-5 w-5" /> Active Users
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground font-medium">
                                <tr>
                                    <th className="p-4">Name</th>
                                    <th className="p-4">Email</th>
                                    <th className="p-4">Role</th>
                                    <th className="p-4">Outlet</th>
                                    <th className="p-4">Joined</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {staff.map((member) => (
                                    <tr key={member.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="p-4 font-medium flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                {member.name.charAt(0).toUpperCase()}
                                            </div>
                                            {member.name}
                                        </td>
                                        <td className="p-4 text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-3 w-3" />
                                                {member.email}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${member.role === 'BRAND_ADMIN'
                                                ? 'bg-purple-100 text-purple-700 ring-purple-700/10'
                                                : member.role === 'OUTLET_MANAGER'
                                                    ? 'bg-blue-100 text-blue-700 ring-blue-700/10'
                                                    : 'bg-gray-100 text-gray-700 ring-gray-600/10'
                                                }`}>
                                                {member.role.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="p-4 text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="h-3 w-3" />
                                                {member.outlet?.name || 'All Outlets'}
                                            </div>
                                        </td>
                                        <td className="p-4 text-muted-foreground">
                                            {member.createdAt.toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
