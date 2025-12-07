
import { appRouter } from "../server/trpc/routers/_app";
import { prisma } from "../lib/prisma"; // Make sure this path is correct based on where we run it
import { createCallerFactory } from "../server/trpc/trpc";

// Mock context for super admin
const mockCtx = {
    prisma,
    user: {
        id: 'verify-script-user',
        role: 'SUPER' as const,
        email: 'verify@test.com'
    },
    userId: 'verify-script-user'
};

const createCaller = createCallerFactory(appRouter);
const caller = createCaller(mockCtx);

async function main() {
    console.log('--- Starting Brand Flow Verification ---\n');

    // 1. Submit Application (Public)
    // We use a separate caller or just call internal function if possible? 
    // Public procedures don't need auth, but our caller has context. That's fine.

    const brandName = `Test Brand ${Date.now()}`;
    console.log(`1. Submitting application for: ${brandName}`);

    const application = await caller.brandApplication.submit({
        brandName,
        contactName: 'Test Contact',
        email: `contact${Date.now()}@test.com`,
        phone: '1234567890',
        estimatedOutlets: 5
    });
    console.log('   Application submitted:', application.id);

    // 2. List Applications (Admin - requireSuper)
    console.log('\n2. Listing applications...');
    const apps = await caller.brandApplication.list();
    const myApp = apps.find(a => a.id === application.id);

    if (!myApp) {
        throw new Error('Application not found in list!');
    }
    console.log('   Found application in list.');

    // 3. Approve Application
    console.log('\n3. Approving application...');
    const approvedResult = await caller.brandApplication.approve({ id: application.id });
    console.log('   Approved. Tenant ID:', approvedResult.tenant.id);
    console.log('   Invite Token:', approvedResult.invite.token);

    // 4. Verify Tenant Billing setup
    console.log('\n4. Verifying billing...');
    const billingOverview = await caller.billing.getBillingOverview();
    const myTenantBilling = billingOverview.find(t => t.id === approvedResult.tenant.id);

    if (!myTenantBilling) throw new Error('Tenant not found in billing overview');

    console.log('   Tenant found in billing.');
    console.log('   Monthly Fee:', myTenantBilling.monthlyFee);
    console.log('   Price Per Outlet:', myTenantBilling.pricePerOutlet);

    // 5. Record Payment
    // 5. Recording Payment
    console.log('\n5. Recording Payment...');
    const paymentAmount = myTenantBilling.monthlyFee;


    // Actually I need to call it from super router
    const paymentResult = await caller.super.recordPayment({
        tenantId: approvedResult.tenant.id,
        amount: paymentAmount,
        method: 'CASH',
        date: new Date(),
        notes: 'Verification Script Payment'
    });

    console.log('   Payment recorded:', paymentResult.id);

    // 6. Verify Due Date Extension
    const updatedTenant = await prisma.tenant.findUnique({ where: { id: approvedResult.tenant.id } });
    console.log('   New Next Billing Date:', updatedTenant?.nextBillingDate);

    console.log('\n--- Verification SUCCESS ---');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
