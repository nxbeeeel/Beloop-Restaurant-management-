import { prisma } from "@/server/db";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import { createInvitation } from "@/server/actions/invitation";

interface Outlet {
    id: string;
    name: string;
}

export default async function InviteUserPage() {
    const { userId } = await auth();
    if (!userId) return null;

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { tenantId: true }
    });

    if (!user?.tenantId) return <div>No tenant found</div>;

    const outlets = await prisma.outlet.findMany({
        where: { tenantId: user.tenantId }
    });

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Invite New User</h1>

            <div className="bg-white p-6 rounded-lg shadow border">
                <form action={createInvitation} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Email Address</label>
                        <input
                            name="email"
                            type="email"
                            placeholder="colleague@example.com"
                            className="w-full p-2 border rounded-md"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Role</label>
                        <select
                            name="role"
                            className="w-full p-2 border rounded-md"
                            aria-label="Select user role"
                            required
                        >
                            <option value="STAFF">Staff</option>
                            <option value="OUTLET_MANAGER">Outlet Manager</option>
                            <option value="BRAND_ADMIN">Brand Admin</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Outlet (Required for Staff/Manager)</label>
                        <select
                            name="outletId"
                            className="w-full p-2 border rounded-md"
                            aria-label="Select outlet"
                        >
                            <option value="">Select Outlet...</option>
                            {outlets.map((outlet: Outlet) => (
                                <option key={outlet.id} value={outlet.id}>{outlet.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="pt-4">
                        <Button type="submit">Send Invitation</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
