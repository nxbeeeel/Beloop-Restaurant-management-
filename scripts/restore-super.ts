
import { PrismaClient } from '@prisma/client';
import { createClerkClient } from '@clerk/backend';

const prisma = new PrismaClient();
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

async function restoreSuperAdmin() {
    const email = 'mnabeelca123@gmail.com';
    console.log(`Restoring SUPER role for ${email}...`);

    // 1. Find User in DB
    const user = await prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } }
    });

    if (!user) {
        console.error('User not found in Database!');
        return;
    }

    // 2. Update DB Role - AND REMOVE TENANT ID (Force Detach)
    await prisma.user.update({
        where: { id: user.id },
        data: {
            role: 'SUPER',
            tenantId: null,
            outletId: null
        }
    });
    console.log(`✅ Database: Role set to SUPER, Tenant cleared for ${user.id}`);

    // 3. Update Clerk Metadata
    try {
        const clerkUserList = await clerk.users.getUserList({
            emailAddress: [email],
            limit: 1
        });

        if (clerkUserList.data.length > 0) {
            const clerkUser = clerkUserList.data[0];
            // Force null for tenantId in metadata too
            await clerk.users.updateUser(clerkUser.id, {
                publicMetadata: {
                    role: 'SUPER',
                    onboardingComplete: true,
                    tenantId: null,
                    outletId: null
                }
            });
            console.log(`✅ Clerk: Metadata updated (SUPER, No Tenant) for ${clerkUser.id}`);
        } else {
            console.warn('⚠️ Clerk user not found by email.');
        }

    } catch (error) {
        console.error('❌ Failed to update Clerk:', error);
    }
}

restoreSuperAdmin()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
