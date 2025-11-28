// Script to check and fix user role
import { prisma } from "../server/db";

async function main() {
    const email = "mnabeelca123@gmail.com";

    // Find user by email
    let user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, clerkId: true, role: true, tenantId: true, name: true }
    });

    if (!user) {
        console.log(`❌ No user found with email ${email}`);
        console.log("Checking all users...");
        const allUsers = await prisma.user.findMany({
            select: { id: true, email: true, clerkId: true, role: true, name: true }
        });
        console.log("All users:", JSON.stringify(allUsers, null, 2));
        return;
    }

    console.log("Current user state:", JSON.stringify(user, null, 2));

    // Update to SUPER role
    const updated = await prisma.user.update({
        where: { email },
        data: {
            role: "SUPER",
            tenantId: null, // SUPER users don't need a tenant
            outletId: null
        },
    });

    console.log("✅ Updated user:", JSON.stringify(updated, null, 2));
    console.log("\n🎉 User upgraded to SUPER role!");
    console.log("👉 Now log out and log back in to see the changes.");
}

main()
    .catch((e) => {
        console.error("Error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
