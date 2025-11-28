// Check what's actually in the database
import { prisma } from "../server/db";

async function main() {
    console.log("=== ALL USERS IN DATABASE ===\n");

    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            clerkId: true,
            role: true,
            tenantId: true,
            name: true
        },
        orderBy: { email: 'asc' }
    });

    console.log(JSON.stringify(users, null, 2));
    console.log(`\nTotal users: ${users.length}`);
}

main()
    .catch((e) => {
        console.error("Error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
