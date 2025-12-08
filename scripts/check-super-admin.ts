import { prisma } from '@/server/db';

async function checkSuperAdmin() {
    try {
        // Find the Super Admin user
        const superAdmin = await prisma.user.findFirst({
            where: {
                email: 'mnabeelca123@gmail.com'
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
            }
        });

        console.log('=== SUPER ADMIN DATABASE CHECK ===');
        console.log('User found:', superAdmin ? 'YES' : 'NO');

        if (superAdmin) {
            console.log('User Details:');
            console.log('  ID:', superAdmin.id);
            console.log('  Email:', superAdmin.email);
            console.log('  Name:', superAdmin.name);
            console.log('  Role:', superAdmin.role);
            console.log('  Clerk ID:', superAdmin.clerkId);
            console.log('  Tenant ID:', superAdmin.tenantId);
            console.log('  Outlet ID:', superAdmin.outletId);
            console.log('  Created:', superAdmin.createdAt);

            // Check if role is exactly 'SUPER'
            if (superAdmin.role === 'SUPER') {
                console.log('✅ Role is correctly set to SUPER');
            } else {
                console.log('❌ Role is NOT SUPER, it is:', superAdmin.role);
            }
        } else {
            console.log('❌ Super Admin user NOT FOUND in database');
        }

        console.log('=================================');
    } catch (error) {
        console.error('Error checking Super Admin:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkSuperAdmin();
