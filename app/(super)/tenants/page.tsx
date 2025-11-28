import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

export default async function TenantsPage() {
    const { userId } = auth();
    if (!userId) redirect("/login");

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { role: true },
    });
    if (!user || user.role !== "SUPER") redirect("/");

    const tenants = await prisma.tenant.findMany({
        orderBy: { createdAt: "desc" },
    });

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">All Brands (Tenants)</h1>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Slug</TableHead>
                        <TableHead>Created At</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {tenants.map((t) => (
                        <TableRow key={t.id}>
                            <TableCell>{t.name}</TableCell>
                            <TableCell>{t.slug}</TableCell>
                            <TableCell>{new Date(t.createdAt).toLocaleDateString()}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
