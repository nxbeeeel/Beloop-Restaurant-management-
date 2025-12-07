
import { PrismaClient } from '@prisma/client';
import { createClerkClient } from '@clerk/backend';

const prisma = new PrismaClient();
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

async function nukeAndRestore() {
    const email = 'mnabeelca123@gmail.com';
    console.log(`🚨 STARTING RESET FOR: ${email}`);

    // 1. Find the User
    const user = await prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } }
    });

    if (!user) {
        console.error('❌ User not found!');
        return;
    }

    // 2. Find the "Mistake" Brand (Latest one or linked one)
    // If user is linked to a tenant, kill that one. If not, kill latest one created "yesterday"
    let tenantIdToDelete = user.tenantId;

    if (!tenantIdToDelete) {
        const latestTenant = await prisma.tenant.findFirst({
            orderBy: { createdAt: 'desc' }
        });
        if (latestTenant) {
            console.log(`⚠️ User not linked to tenant, but found latest tenant: ${latestTenant.name} (${latestTenant.id})`);
            tenantIdToDelete = latestTenant.id;
        }
    }

    if (tenantIdToDelete) {
        console.log(`🔥 DELETING TENANT: ${tenantIdToDelete} ...`);
        try {
            // Delete related data first if no cascade (Prisma usually handles this with Cascade, but let's be safe)
            // We rely on Cascade Delete in schema usually.
            await prisma.tenant.delete({
                where: { id: tenantIdToDelete }
            });
            console.log('✅ Tenant Deleted Successfully.');
        } catch (e) {
            console.error('Error deleting tenant (might already be gone):', e);
        }
    } else {
        console.log('ℹ️ No tenant found to delete.');
    }

    // 3. Restore User to GLORIOUS SUPER ADMIN
    console.log('👑 Restoring Super Admin Status...');
    await prisma.user.update({
        where: { id: user.id },
        data: {
            role: 'SUPER',
            tenantId: null,
            outletId: null
        }
    });

    // 4. Update Clerk
    try {
        const clerkUserList = await clerk.users.getUserList({ emailAddress: [email], limit: 1 });
        if (clerkUserList.data.length > 0) {
            await clerk.users.updateUser(clerkUserList.data[0].id, {
                publicMetadata: {
                    role: 'SUPER',
                    onboardingComplete: true,
                    tenantId: null,
                    outletId: null
                }
            });
            console.log('✅ Clerk Metadata Fixed.');
        }
    } catch (e) {
        console.error('Clerk Update Error:', e);
    }

    console.log('\n✨ DONE. You are now Super Admin with NO brand attached.');
    console.log('👉 Please Sign Out and Sign In to see "Super Dashboard".');
}

nukeAndRestore()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
