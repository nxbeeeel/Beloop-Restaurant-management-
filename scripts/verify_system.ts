
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();
const logFile = 'verify_log.txt';

function log(msg: string) {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
}

async function verifySystem() {
    fs.writeFileSync(logFile, "Starting Verification...\n");

    // 1. Fetch or Create Tenant
    let tenant = await prisma.tenant.findFirst({ where: { slug: 'system-verify-tenant' } });
    if (!tenant) {
        log("Creating Test Tenant...");
        tenant = await prisma.tenant.create({
            data: {
                name: "System Verify Tenant",
                slug: "system-verify-tenant",
                status: "ACTIVE"
            }
        });
    }
    log(`Using Tenant: ${tenant.name} (${tenant.id})`);

    // 2. Create Test Outlet
    const testCode = `TEST_${Date.now()}`;
    log(`Creating Outlet with code: ${testCode}`);

    const outlet = await prisma.outlet.create({
        data: {
            tenantId: tenant.id,
            name: "System Verify Outlet",
            code: testCode,
            status: "ACTIVE"
        }
    });
    log(`Outlet Created: ${outlet.id}`);

    // 3. Create Product (Test Cascade)
    log("Creating Product linked to Outlet...");
    const product = await prisma.product.create({
        data: {
            outletId: outlet.id,
            sku: `SKU_${testCode}`,
            name: "Test Product",
            unit: "pc",
            version: 1,
            price: 100,
            currentStock: 0
        }
    });
    log(`Product Created: ${product.id}`);

    // 4. Verify Data Exists
    const fetchedOutlet = await prisma.outlet.findUnique({
        where: { id: outlet.id },
        include: { products: true }
    });

    if (!fetchedOutlet || fetchedOutlet.products.length === 0) {
        throw new Error("Creation Verification Failed");
    }
    log("Creation Verified.");

    // 5. Hard Delete Outlet
    log("Deleting Outlet...");
    await prisma.outlet.delete({
        where: { id: outlet.id }
    });

    // 6. Verify Deletion
    const deletedOutlet = await prisma.outlet.findUnique({ where: { id: outlet.id } });
    const deletedProduct = await prisma.product.findUnique({ where: { id: product.id } });

    if (deletedOutlet) throw new Error("Outlet Deletion Failed (Still exists)");
    if (deletedProduct) throw new Error("Cascade Deletion Failed (Product still exists)");

    log("✅ System Verification Successful: Creation, Association, and Hard Delete Cascade works.");

    // Cleanup Tenant
    if (tenant.slug === 'system-verify-tenant') {
        log("Cleaning up Test Tenant...");
        await prisma.tenant.delete({ where: { id: tenant.id } });
    }
}

verifySystem()
    .catch(e => {
        log(`❌ Verification Failed: ${e.message}`);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
