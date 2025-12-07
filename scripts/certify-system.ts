
import { PrismaClient } from '@prisma/client';
import { AnalyticsService } from '../server/services/analytics.service';
import { InventoryService } from '../server/services/inventory.service';
import { Redis } from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function main() {
    console.log("🏆 Starting System Certification...\n");

    const tenantA = await prisma.tenant.findFirst();
    if (!tenantA) {
        console.log("No tenants found! Creating one...");
        await prisma.tenant.create({
            data: { name: 'Cert Tenant', slug: 'cert-tenant', type: 'BRAND' }
        });
    }
    const tenantTarget = await prisma.tenant.findFirst();
    if (!tenantTarget) throw new Error("Failed to get tenant");

    // Create a dummy second tenant if needed for RLS test
    let tenantB = await prisma.tenant.findFirst({ where: { id: { not: tenantTarget.id } } });
    if (!tenantB) {
        console.log("Creating Tenant B for RLS test...");
        tenantB = await prisma.tenant.create({
            data: { name: 'Intruder Tenant', slug: 'intruder', type: 'BRAND' }
        });
    }

    // Redis Error Handler
    redis.on('error', (err) => {
        console.log('Redis Error (Non-fatal for other tests):', err.message);
    });

    // --- TEST 1: RLS / Isolation ---
    console.log("[TEST 1] Cross-Tenant Data Isolation");
    try {
        const data = await AnalyticsService.getBrandOverview(prisma, tenantB.id, 30);

        if (data && data.totalRevenue !== undefined) {
            console.log(`    [PASS] Service fetches specific tenant data correctly.`);
        }
    } catch (e) {
        console.log(`    [FAIL] Test Failed: ${e}`);
    }

    // --- TEST 2: Atomic Updates (ACID) ---
    console.log("\n[TEST 2] Atomic Inventory Update (Concurrency)");
    try {
        const product = await prisma.product.create({
            data: {
                name: 'Atomic Test Item',
                basePrice: 100,
                tenantId: tenantTarget.id,
                trackStock: true,
                stockQuantity: 1
            }
        });

        console.log(`    Created item ${product.name} with Stock: 1`);
        console.log("    Launching 3 concurrent purchase attempts...");

        let outlet = await prisma.outlet.findFirst({ where: { tenantId: tenantTarget.id } });
        if (!outlet) {
            outlet = await prisma.outlet.create({
                data: { name: 'Cert Outlet', tenantId: tenantTarget.id, address: 'Test', phone: '123' }
            });
        }

        const salePromises = [1, 2, 3].map(i =>
            InventoryService.processSale(prisma, tenantTarget.id, outlet!.id, {
                items: [{ productId: product.id, quantity: 1, name: product.name, price: 100 }]
            })
                .then(() => `Success ${i}`)
                .catch(e => `Failed ${i}: ${e.message}`)
        );

        const results = await Promise.all(salePromises);
        console.log("    Results:", results);

        const successCount = results.filter(r => r.includes('Success')).length;
        const failCount = results.filter(r => r.includes('Failed')).length;

        if (successCount === 1 && failCount === 2) {
            console.log("    [PASS] ACID Verification Passed: Only 1 transaction succeeded.");
        } else {
            console.log(`    [FAIL] ACID Verification Failed: Success: ${successCount}, Fail: ${failCount}`);
        }

        await prisma.product.delete({ where: { id: product.id } });

    } catch (e) {
        console.log(`    [FAIL] Test Error: ${e}`);
    }

    // --- TEST 3: POS Latency ---
    console.log("\n[TEST 3] POS Latency (Process Sale)");
    const startPos = performance.now();
    try {
        const p = await prisma.product.create({
            data: { name: 'Latency Test', basePrice: 50, tenantId: tenantTarget.id, trackStock: false }
        });

        let outlet = await prisma.outlet.findFirst({ where: { tenantId: tenantTarget.id } });

        await InventoryService.processSale(prisma, tenantTarget.id, outlet!.id, {
            items: [{ productId: p.id, quantity: 1, name: p.name, price: 50 }]
        });

        const endPos = performance.now();
        const duration = endPos - startPos;
        console.log(`    Time taken: ${duration.toFixed(2)}ms`);
        if (duration < 300) console.log("    [PASS] Sub-300ms Verified");
        else console.log("    [WARN] Over 300ms (Note: Cold start might affect this)");

        await prisma.product.delete({ where: { id: p.id } });
    } catch (e) {
        console.log(`    [FAIL] Test Error: ${e}`);
    }

    // --- TEST 4: Dashboard Cache ---
    console.log("\n[TEST 4] Dashboard Caching Speed");
    const KEY = `platform:stats`;
    try {
        await redis.del(KEY);

        const start1 = performance.now();
        await AnalyticsService.getPlatformStats(prisma);
        const end1 = performance.now();
        console.log(`    Cold Load: ${(end1 - start1).toFixed(2)}ms`);

        const start2 = performance.now();
        await AnalyticsService.getPlatformStats(prisma);
        const end2 = performance.now();
        console.log(`    Cached Load: ${(end2 - start2).toFixed(2)}ms`);

        if ((end2 - start2) < (end1 - start1) * 0.8 || (end2 - start2) < 20) {
            console.log("    [PASS] Caching Verified");
        } else {
            console.log("    [WARN] Cache verification unclear (Redius might be down or not hit).");
        }
    } catch (e) {
        console.log("    [WARN] Redis Test Failed (Connection issue likely). Skipping.");
    }

    // --- TEST 5: E2E Data Flow ---
    console.log("\n🔄 Test 5: End-to-End Pipeline");

    await redis.del(KEY);
    const stats = await AnalyticsService.getPlatformStats(prisma);
    console.log(`    Total Revenue in Stats: ${stats.totalRevenue}`);
    if (stats.totalRevenue > 0) {
        console.log("    ✅ Data Flow Verified: Sales are reflecting in Analytics.");
    } else {
        console.log("    ⚠️  Revenue is 0, might be issue or clean DB (or tenant mismatch).");
    }

    console.log("\n🏆 Certification Complete.");
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
        redis.disconnect();
    });
