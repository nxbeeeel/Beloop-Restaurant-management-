import { prisma } from "@/server/db";
import { auth } from "@clerk/nextjs/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, CreditCard, Users, Store } from "lucide-react";
import { LogoutButton } from "@/components/auth/LogoutButton"; // Import moved to top

interface OutletWithStats {
    id: string;
    name: string;
    _count: {
        users: number;
    };
    sales: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        totalSale: any;
    }[];
}

export default async function BrandDashboard() {
    const { userId } = await auth();
    if (!userId) return null;

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { tenantId: true, tenant: true }
    });

    if (!user?.tenantId) return <div>No tenant found</div>;

    const outlets = await prisma.outlet.findMany({
        where: { tenantId: user.tenantId },
        include: {
            _count: { select: { users: true } },
            sales: {
                take: 1,
                orderBy: [{ date: 'desc' }]
            }
        }
    });

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        {user.tenant?.name} Dashboard
                    </h2>
                    <p className="text-muted-foreground">
                        Overview of your brand&apos;s performance across all outlets.
                    </p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="hover:shadow-lg transition-shadow duration-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Outlets</CardTitle>
                        <Store className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{outlets.length}</div>
                        <p className="text-xs text-muted-foreground">Fully operational</p>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-lg transition-shadow duration-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {outlets.reduce((acc: number, curr: OutletWithStats) => acc + curr._count.users, 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">Across all locations</p>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-lg transition-shadow duration-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹0.00</div>
                        <p className="text-xs text-muted-foreground">No revenue data yet</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-1">
                <Card className="hover:shadow-lg transition-shadow duration-200">
                    <CardHeader>
                        <CardTitle>Outlet Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="relative w-full overflow-auto">
                            <table className="w-full caption-bottom text-sm">
                                <thead className="[&_tr]:border-b">
                                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Outlet</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Staff</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Last Sale</th>
                                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="[&_tr:last-child]:border-0">
                                    {outlets.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="p-4 text-center text-muted-foreground">No outlets found.</td>
                                        </tr>
                                    ) : (
                                        outlets.map((outlet: OutletWithStats) => (
                                            <tr key={outlet.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                                <td className="p-4 align-middle font-medium">{outlet.name}</td>
                                                <td className="p-4 align-middle">{outlet._count.users}</td>
                                                <td className="p-4 align-middle">
                                                    {outlet.sales[0] ? `₹${outlet.sales[0].totalSale}` : 'No sales'}
                                                </td>
                                                <td className="p-4 align-middle text-right">
                                                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-green-500/15 text-green-700 hover:bg-green-500/25">
                                                        Active
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div >
    );
}
