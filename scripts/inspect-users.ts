
import { prisma } from "../server/db";

async function inspectUsers() {
    console.log("🔍 INSPECTING USER DATABASE...");
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            role: true,
            clerkId: true,
            tenantId: true
        }
    });

    console.table(users);

    const missingRole = users.filter(u => !u.role);
    if (missingRole.length > 0) {
        console.error("❌ FOUND USERS WITH NO ROLE:", missingRole);
    } else {
        console.log("✅ All users have roles assigned in DB.");
    }
}

inspectUsers();
