import { prisma } from '@/server/db';

async function findDuplicateUsers() {
    try {
        console.log('=== FINDING ALL USERS FOR mnabeelca123@gmail.com ===\n');

        // Find all users with this email
        const users = await prisma.user.findMany({
            where: {
                email: {
                    equals: 'mnabeelca123@gmail.com',
                    mode: 'insensitive'
                }
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                clerkId: true,
                tenantId: true,
                outletId: true,
                createdAt: true
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        console.log(`Found ${users.length} user(s):\n`);

        users.forEach((user, index) => {
            console.log(`User ${index + 1}:`);
            console.log(`  - Database ID: ${user.id}`);
            console.log(`  - Clerk ID: ${user.clerkId}`);
            console.log(`  - Email: ${user.email}`);
            console.log(`  - Role: ${user.role}`);
            console.log(`  - Created: ${user.createdAt}`);
            console.log(`  - Tenant ID: ${user.tenantId || 'NULL'}`);
            console.log('');
        });

        if (users.length > 1) {
            console.log('⚠️  DUPLICATE USERS FOUND!');
            console.log('\nRecommendation:');
            console.log('  1. Keep the OLDEST user (first created)');
            console.log('  2. Update its Clerk ID to the current one');
            console.log('  3. Delete the duplicate(s)');
        } else if (users.length === 1) {
            console.log('✅ Only one user found (correct)');
            console.log('\nAction needed:');
            console.log('  - Update Clerk ID to: user_36YCfDC2SUMzvSvFyPhhtLE1Jmv');
            console.log('  - Ensure role is SUPER');
        } else {
            console.log('❌ No users found with this email!');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

findDuplicateUsers();
