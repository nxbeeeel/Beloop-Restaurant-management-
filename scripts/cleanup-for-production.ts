/**
 * Production Cleanup Script - Using Raw SQL
 * Deletes all data EXCEPT the super admin user (mnabeeelca123@gmail.com)
 * 
 * Usage: npx ts-node scripts/cleanup-for-production.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SUPER_ADMIN_EMAIL = 'mnabeeelca123@gmail.com';

async function cleanup() {
    console.log('🚀 Starting Production Cleanup...');
    console.log(`🛡️  Preserving Super Admin: ${SUPER_ADMIN_EMAIL}\n`);

    console.log('📦 Deleting all data using raw SQL...\n');

    // Using raw SQL to delete in correct order
    // Tables with underscore naming in DB
    const tables = [
        // Child tables first
        'AuditLog',
        'TemporaryPassword',
        'TicketComment',
        'Ticket',
        'StockVerificationItem',
        'StockVerification',
        'StockCheckItem',
        'StockCheck',
        'StockMove',
        'POItem',
        'PurchaseOrder',
        'SupplierPayment',
        'OrderItem',
        'Order',
        'RecipeItem',
        'Recipe',
        'Product',
        'Category',
        'Ingredient',
        'Expense',
        'Sale',
        'DailySummary',
        'MonthlySummary',
        'HistoricalInventorySummary',
        'DailyOutletMetric',
        'DailyBrandMetric',
        'Customer',
        'Supplier',
        'Invitation',
        'BrandInvitation',
        'BrandApplication',
    ];

    for (const table of tables) {
        try {
            await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
            console.log(`   ✅ Cleaned ${table}`);
        } catch (e: any) {
            console.log(`   ⚠️  Skipped ${table}: ${e.message?.slice(0, 50)}`);
        }
    }

    // Delete users except super admin
    console.log('\n   Deleting users (except Super Admin)...');
    try {
        const result = await prisma.$executeRaw`
            DELETE FROM "User" WHERE email != ${SUPER_ADMIN_EMAIL}
        `;
        console.log(`   ✅ Deleted users (except super admin)`);
    } catch (e: any) {
        console.log(`   ⚠️  User deletion error: ${e.message?.slice(0, 50)}`);
    }

    // Delete outlets
    console.log('\n   Deleting outlets...');
    try {
        await prisma.$executeRaw`DELETE FROM "Outlet"`;
        console.log(`   ✅ Cleaned outlets`);
    } catch (e: any) {
        console.log(`   ⚠️  Outlet deletion error: ${e.message?.slice(0, 50)}`);
    }

    // Delete tenants
    console.log('\n   Deleting tenants...');
    try {
        await prisma.$executeRaw`DELETE FROM "Tenant"`;
        console.log(`   ✅ Cleaned tenants`);
    } catch (e: any) {
        console.log(`   ⚠️  Tenant deletion error: ${e.message?.slice(0, 50)}`);
    }

    console.log('\n✅ Production cleanup complete!');
    console.log(`🛡️  Super Admin preserved: ${SUPER_ADMIN_EMAIL}`);
}

cleanup()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
