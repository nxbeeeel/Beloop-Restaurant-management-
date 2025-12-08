import { prisma } from '@/server/db';
import { clerkClient } from '@clerk/nextjs/server';

async function fixSuperAdminClerkId() {
    try {
        console.log('=== FIXING SUPER ADMIN CLERK ID ===\n');

        const OLD_CLERK_ID = 'user_35vhKsepH3xNugEOoGVkHDHX9Vm';
        const NEW_CLERK_ID = 'user_36YCfDC2SUMzvSvFyPhhtLE1Jmv';

        // 1. Update database
        console.log('1. Updating database...');
        const updatedUser = await prisma.user.update({
            where: {
                clerkId: OLD_CLERK_ID
            },
            data: {
                clerkId: NEW_CLERK_ID
            },
            select: {
                id: true,
                email: true,
                role: true,
                clerkId: true
            }
        });

        console.log('✅ Database updated:');
        console.log(`  - User ID: ${updatedUser.id}`);
        console.log(`  - Email: ${updatedUser.email}`);
        console.log(`  - Role: ${updatedUser.role}`);
        console.log(`  - New Clerk ID: ${updatedUser.clerkId}`);

        // 2. Update Clerk metadata
        console.log('\n2. Updating Clerk metadata...');
        const client = await clerkClient();
        await client.users.updateUser(NEW_CLERK_ID, {
            publicMetadata: {
                role: 'SUPER',
                onboardingComplete: true,
                userId: updatedUser.id
            }
        });

        console.log('✅ Clerk metadata updated');

        console.log('\n✅ SUCCESS! Super Admin account fixed');
        console.log('\nNext steps:');
        console.log('  1. Logout completely');
        console.log('  2. Login again');
        console.log('  3. Should redirect to /super/dashboard instantly');

    } catch (error) {
        console.error('\n❌ Error:', error);
        if (error instanceof Error) {
            console.error('Message:', error.message);
        }
    } finally {
        await prisma.$disconnect();
    }
}

fixSuperAdminClerkId();
