import { clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/server/db';

async function verifySuperAdmin() {
    try {
        console.log('=== SUPER ADMIN VERIFICATION ===\n');

        // 1. Check Database
        console.log('1. DATABASE CHECK:');
        const dbUser = await prisma.user.findFirst({
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

        if (dbUser) {
            console.log('  ✅ User found in database');
            console.log('  - ID:', dbUser.id);
            console.log('  - Email:', dbUser.email);
            console.log('  - Name:', dbUser.name);
            console.log('  - Role:', dbUser.role);
            console.log('  - Clerk ID:', dbUser.clerkId);
            console.log('  - Tenant ID:', dbUser.tenantId || 'NULL (correct for SUPER)');
            console.log('  - Outlet ID:', dbUser.outletId || 'NULL (correct for SUPER)');

            if (dbUser.role === 'SUPER') {
                console.log('  ✅ Role is correctly set to SUPER');
            } else {
                console.log('  ❌ Role is NOT SUPER:', dbUser.role);
            }

            // 2. Check Clerk Metadata
            if (dbUser.clerkId) {
                console.log('\n2. CLERK METADATA CHECK:');
                try {
                    const client = await clerkClient();
                    const clerkUser = await client.users.getUser(dbUser.clerkId);

                    console.log('  ✅ User found in Clerk');
                    console.log('  - Clerk ID:', clerkUser.id);
                    console.log('  - Email:', clerkUser.emailAddresses[0]?.emailAddress);
                    console.log('  - Public Metadata:', JSON.stringify(clerkUser.publicMetadata, null, 2));

                    const metadata = clerkUser.publicMetadata as any;

                    if (metadata?.role === 'SUPER') {
                        console.log('  ✅ Clerk metadata has role: SUPER');
                    } else {
                        console.log('  ❌ Clerk metadata missing or incorrect role:', metadata?.role || 'NONE');
                        console.log('\n  🔧 FIX NEEDED: Call /api/admin/fix-super-admin to set Clerk metadata');
                    }

                    if (metadata?.onboardingComplete === true) {
                        console.log('  ✅ Clerk metadata has onboardingComplete: true');
                    } else {
                        console.log('  ⚠️  Clerk metadata missing onboardingComplete');
                    }

                } catch (clerkError) {
                    console.log('  ❌ Error fetching Clerk user:', clerkError instanceof Error ? clerkError.message : 'Unknown error');
                }
            } else {
                console.log('\n2. CLERK METADATA CHECK:');
                console.log('  ❌ No Clerk ID in database');
            }
        } else {
            console.log('  ❌ User NOT found in database');
        }

        console.log('\n=================================');

    } catch (error) {
        console.error('Error during verification:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifySuperAdmin();
