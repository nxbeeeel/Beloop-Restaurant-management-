
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    const outletId = "cmjrjak2q0001l804ez5n5qyw";
    console.log(`Checking for Outlet: ${outletId}`);
    const outlet = await prisma.outlet.findUnique({ where: { id: outletId } });
    if (outlet) {
        console.log("✅ Outlet FOUND:", outlet.name);
    } else {
        console.log("❌ Outlet NOT FOUND in this database.");
        // List all outlets
        const all = await prisma.outlet.findMany({ select: { id: true, name: true } });
        console.log("Available Outlets:", all);
    }
}

main().finally(() => prisma.$disconnect());
