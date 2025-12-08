import { clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/server/db';

/**
 * One-time script to sync existing Super Admin user to Clerk metadata
 * After this runs, the webhook will handle all future syncs automatically
 */
async function syncSuperAdminToClerk() {
    try {
        console.log('=== SYNCING SUPER ADMIN TO CLERK ===\n');

        // 1. Find Super Admin in database
        const superAdmin = await prisma.user.findFirst({
            where: {
                email: 'mnabeelca123@gmail.com',
                role: 'SUPER'
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                clerkId: true,
                tenantId: true,
                outletId: true
            }
        });

        if (!superAdmin) {
            console.error('❌ Super Admin user not found in database');
            return;
        }

        console.log('✅ Found Super Admin in database:');
        console.log('  - ID:', superAdmin.id);
        console.log('  - Email:', superAdmin.email);
        console.log('  - Role:', superAdmin.role);
        console.log('  - Clerk ID:', superAdmin.clerkId);

        if (!superAdmin.clerkId) {
            console.error('❌ Super Admin has no Clerk ID');
            return;
        }

        // 2. Update Clerk metadata
        console.log('\n📝 Updating Clerk metadata...');

        const client = await clerkClient();
        await client.users.updateUser(superAdmin.clerkId, {
            publicMetadata: {
                role: 'SUPER',
                onboardingComplete: true,
                userId: superAdmin.id
            }
        });

        console.log('✅ Clerk metadata updated successfully!');

        // 3. Verify the update
        console.log('\n🔍 Verifying update...');
        const clerkUser = await client.users.getUser(superAdmin.clerkId);
        const metadata = clerkUser.publicMetadata as any;

        console.log('  - Clerk role:', metadata?.role);
        console.log('  - Onboarding complete:', metadata?.onboardingComplete);
        console.log('  - User ID:', metadata?.userId);

        if (metadata?.role === 'SUPER' && metadata?.onboardingComplete === true) {
            console.log('\n✅ SUCCESS! Super Admin metadata is correctly set in Clerk');
            console.log('\n📋 Next steps:');
            console.log('  1. Clear browser cache');
            console.log('  2. Logout completely');
            console.log('  3. Login as mnabeelca123@gmail.com');
            console.log('  4. Should redirect instantly to /super/dashboard');
            console.log('\n🎉 The webhook will handle all future syncs automatically!');
        } else {
            console.error('\n❌ Metadata verification failed');
            console.log('Expected: { role: "SUPER", onboardingComplete: true }');
            console.log('Got:', metadata);
        }

    } catch (error) {
        console.error('\n❌ Error:', error);
        if (error instanceof Error) {
            console.error('Message:', error.message);
            console.error('Stack:', error.stack);
        }
    } finally {
        await prisma.$disconnect();
    }
}

syncSuperAdminToClerk();
