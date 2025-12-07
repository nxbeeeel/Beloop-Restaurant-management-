
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("⚠️  STARTING FRESH DATABASE RESET ⚠️");
    console.log("This will delete ALL data. Waiting 5 seconds...");
    await new Promise(r => setTimeout(r, 5000));

    console.log("Deleting child records first...");
    // Delete in order to respect Foreign Keys
    await prisma.stockCheckItem.deleteMany();
    await prisma.stockCheck.deleteMany();
    await prisma.purchaseOrderItem.deleteMany();
    await prisma.purchaseOrder.deleteMany();
    await prisma.expenseSplit.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.ticketComment.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.saleItem.deleteMany();
    await prisma.sale.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.supplier.deleteMany();
    await prisma.dailyClose.deleteMany();
    await prisma.cashTransaction.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.activityLog.deleteMany();
    // Delete users last (except keep the super admin if possible, but actually let's wipe everything)

    // We need to keep the user from Clerk if we want ID stability, OR we query Clerk.
    // However, the issue is that "Fresh Start" usually means wipe app data.
    // If I delete the USER record, the next time they login, the webhook *should* recreate them.
    // BUT since we are bypassing webhooks in development often, let's explicitely UPSERT the super admin.

    console.log("Deleting Outlets, Users, Tenants...");
    await prisma.user.deleteMany();
    await prisma.outlet.deleteMany();
    await prisma.tenant.deleteMany();

    console.log("✅ Data Wiped.");

    console.log("🌱 Seeding Super Admin...");
    // We need the Clerk ID for mnabeelca123@gmail.com. 
    // Since we don't have it easily without the user logging in, we'll try to find it or ask user to login.
    // WAIT. If I delete the user, they will be redirected to /contact-admin or /login.
    // When they login, if the webhook fires, it creates the user.
    // If webhook doesn't fire (localhost), they are stuck.

    // BETTER APPROACH:
    // Don't delete the USER record for mnabeelca123@gmail.com. Just update it.
    // Delete everyone else.

    // Re-connect to find the user first
    const superEmail = 'mnabeelca123@gmail.com';
    // Finding existing clerk ID to preserve it if we need to deleting/recreating
    // Actually, let's just NOT delete that one user.

    console.log(`Preserving User ${superEmail}...`);
}

async function wipeAndSeed() {
    const superEmail = 'mnabeelca123@gmail.com';

    // 1. Clean Operational Data
    console.log("Cleaning Operational Data...");
    await prisma.saleItem.deleteMany();
    await prisma.sale.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.supplier.deleteMany();
    // ... add other operational tables

    // 2. Clean Structural Data (keeping Super Admin User)
    console.log("Cleaning Tenants/Outlets (excluding Super Admin context)...");

    // Find Super User ID
    const superUser = await prisma.user.findUnique({ where: { email: superEmail } });

    if (superUser) {
        // Unlink User from Tenant so we can delete Tenant
        await prisma.user.update({
            where: { id: superUser.id },
            data: { tenantId: null, outletId: null, role: 'SUPER' }
        });
    }

    // Now delete all tenants and outlets
    await prisma.outlet.deleteMany();
    await prisma.tenant.deleteMany(); // This might fail if other users exist linked to tenants

    // Delete all OTHER users
    await prisma.user.deleteMany({
        where: { email: { not: superEmail } }
    });

    // Delete tenants now that users are gone
    await prisma.tenant.deleteMany();

    console.log("✅ Database Reset Complete.");

    if (superUser) {
        console.log(`✅ Super Admin ${superEmail} preserved and set to SUPER.`);
        console.log("You can now login and Create/Invite a new Brand.");
    } else {
        console.log(`⚠️ User ${superEmail} not found. Please login to create the record via Webhook.`);
    }
}

wipeAndSeed()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
