import { prisma } from "@/server/db";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Plus, MapPin, Phone, Users, Store } from "lucide-react";
import { OutletExportButton } from "@/components/brand/OutletExportButton";

import { SearchInput } from "@/components/common/SearchInput";

export default async function OutletsPage({ searchParams }: { searchParams: { search?: string } }) {
    const { userId } = auth();
    if (!userId) return null;

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { tenantId: true }
    });

    if (!user?.tenantId) return <div>No tenant found</div>;

    const search = searchParams.search;

    const outlets = await prisma.outlet.findMany({
        where: {
            tenantId: user.tenantId,
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { code: { contains: search, mode: 'insensitive' } }
                ]
            })
        },
        include: {
            _count: { select: { users: true } }
        }
    });

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        Outlets
                    </h2>
                    <p className="text-muted-foreground">
                        Manage your restaurant locations and branches.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <SearchInput placeholder="Search outlets..." />
                    <Link href="/brand/outlets/new">
                        <Button className="shadow-lg hover:shadow-xl transition-all duration-200">
                            <Plus className="mr-2 h-4 w-4" /> Add Outlet
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {outlets.map((outlet) => (
                    <Card key={outlet.id} className="group hover:shadow-lg transition-all duration-200 border-l-4 border-l-transparent hover:border-l-primary">
                        <CardHeader className="pb-4">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                                        <Store className="h-5 w-5 text-muted-foreground" />
                                        {outlet.name}
                                    </CardTitle>
                                    <p className="text-sm font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-md inline-block">
                                        {outlet.code}
                                    </p>
                                </div>
                                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${outlet.status === 'ACTIVE'
                                    ? 'bg-green-100 text-green-700 border border-green-200'
                                    : 'bg-gray-100 text-gray-700 border border-gray-200'
                                    }`}>
                                    {outlet.status}
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2 text-sm text-muted-foreground">
                                <div className="flex items-start gap-2">
                                    <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                                    <span className="line-clamp-2">{outlet.address || 'No address provided'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 shrink-0" />
                                    <span>{outlet.phone || 'No phone'}</span>
                                </div>
                            </div>

                            <div className="pt-4 border-t flex items-center justify-between text-sm">
                                <div className="flex items-center gap-1.5 text-muted-foreground group-hover:text-primary transition-colors">
                                    <Users className="h-4 w-4" />
                                    <span className="font-medium">{outlet._count.users} Staff</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link href={`/brand/outlets/${outlet.id}`}>
                                        <Button variant="ghost" size="sm" className="h-8">
                                            View Details
                                        </Button>
                                    </Link>
                                    <OutletExportButton outletId={outlet.id} outletName={outlet.name} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {outlets.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-16 bg-muted/30 rounded-xl border border-dashed border-muted-foreground/25">
                        <div className="bg-muted p-4 rounded-full mb-4">
                            <Store className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No outlets yet</h3>
                        <p className="text-muted-foreground mb-6 text-center max-w-sm">
                            Get started by adding your first restaurant location to the platform.
                        </p>
                        <Link href="/brand/outlets/new">
                            <Button>Create Outlet</Button>
                        </Link>
                    </div>
                )}
            </div>
        </div >
    );
}
