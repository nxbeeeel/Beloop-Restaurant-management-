
import { prisma } from "../server/db";

async function main() {
    console.log("🚀 Creating Test Brand Application...");

    // 1. Create Application
    const app = await prisma.brandApplication.create({
        data: {
            brandName: "Debug Brand " + Date.now(),
            contactName: "Debug User",
            email: "mnabeelca123@gmail.com", // Targeting the known user
            phone: "1234567890",
            estimatedOutlets: 5,
            status: "PENDING"
        }
    });
    console.log(`✅ Application Created: ${app.id}`);

    // 2. Approve Application (Simulate Super Admin)
    const token = crypto.randomUUID();
    const invite = await prisma.brandInvitation.create({
        data: {
            token,
            brandName: app.brandName,
            email: app.email,
            expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 Hours
        }
    });

    await prisma.brandApplication.update({
        where: { id: app.id },
        data: { status: 'APPROVED' }
    });

    console.log(`✅ Invitation Created: ${invite.id}`);
    console.log(`\n🔗 VALID INVITE LINK:`);
    console.log(`http://localhost:3000/invite/brand?token=${token}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
