
import { prisma } from "../server/db";

async function main() {
    console.log("🔍 Checking Brand Applications...");
    const apps = await prisma.brandApplication.findMany();
    console.table(apps);

    console.log("\n🔍 Checking Brand Invitations...");
    const invites = await prisma.brandInvitation.findMany();
    console.table(invites);

    if (invites.length > 0) {
        console.log("\n📋 Sample Token URL:");
        console.log(`http://localhost:3000/invite/brand?token=${invites[0].token}`);
    } else {
        console.log("\n❌ No invitations found.");
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
