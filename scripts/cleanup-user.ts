
import { PrismaClient } from '@prisma/client';
import { createClerkClient } from '@clerk/backend';

const prisma = new PrismaClient();
const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

async function cleanupUser(email: string) {
    console.log(`🔍 Looking up user: ${email}`);

    try {
        // 1. Find and Delete User from DB
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            console.log("⚠️ User not found in database.");
        } else {
            console.log(`✅ Found User ID: ${user.id} (Clerk: ${user.clerkId})`);
            await prisma.user.delete({ where: { id: user.id } });
            console.log("🗑️ Deleted user from Database.");

            // 2. Clear Clerk Metadata (or Delete Clerk User if needed)
            // For now, let's just clear metadata so they are fresh
            try {
                await clerkClient.users.updateUserMetadata(user.clerkId, {
                    publicMetadata: {
                        role: null,
                        tenantId: null,
                        onboardingComplete: null
                    }
                });
                console.log("✨ Cleared Clerk Metadata.");
            } catch (err: any) {
                console.error("⚠️ Failed to update Clerk metadata (User might be deleted):", err.message);
            }
        }

        // 3. Double Check Invites
        const invites = await prisma.invitation.findMany({ where: { email } });
        if (invites.length > 0) {
            console.log(`Found ${invites.length} pending/old invitations. Deleting...`);
            await prisma.invitation.deleteMany({ where: { email } });
        }

        const brandInvites = await prisma.brandInvitation.findMany({ where: { email } });
        if (brandInvites.length > 0) {
            console.log(`Found ${brandInvites.length} pending/old brand invitations. Deleting...`);
            await prisma.brandInvitation.deleteMany({ where: { email } });
        }

        console.log("🎉 Cleanup Complete!");

    } catch (error) {
        console.error("❌ Error during cleanup:", error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run for the specific email
cleanupUser('kuruvivaa@gmail.com');
