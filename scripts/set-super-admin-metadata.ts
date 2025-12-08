import { clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/server/db';

async function setSuperAdminMetadata() {
    try {
        // Find Super Admin user in database
        const superAdmin = await prisma.user.findFirst({
            where: {
                email: 'mnabeelca123@gmail.com',
                role: 'SUPER'
            }
        });

        if (!superAdmin) {
            console.error('Super Admin user not found in database');
            return;
        }

        console.log('Found Super Admin:', {
            id: superAdmin.id,
            email: superAdmin.email,
            role: superAdmin.role,
            clerkId: superAdmin.clerkId
        });

        if (!superAdmin.clerkId) {
            console.error('Super Admin has no Clerk ID');
            return;
        }

        // Update Clerk metadata
        const client = await clerkClient();
        await client.users.updateUser(superAdmin.clerkId, {
            publicMetadata: {
                role: 'SUPER',
                onboardingComplete: true,
                userId: superAdmin.id
            }
        });

        console.log('✅ Clerk metadata updated successfully for Super Admin');
        console.log('User should now redirect to /super/dashboard');
    } catch (error) {
        console.error('Error setting Super Admin metadata:', error);
    }
}

setSuperAdminMetadata();
