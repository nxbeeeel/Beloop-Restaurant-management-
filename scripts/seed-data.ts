
import { prisma } from "../server/db";
import { hash } from "bcrypt";

async function main() {
    console.log("🌱 STARTING SEED...");

    // 1. Create 3 Brands
    const brands = [
        { name: "Burger King Demo", slug: "bk-demo" },
        { name: "Pizza Hut Demo", slug: "ph-demo" },
        { name: "Starbucks Demo", slug: "sb-demo" }
    ];

    for (const brand of brands) {
        console.log(`Creating Brand: ${brand.name}...`);

        // Check if exists
        let tenant = await prisma.tenant.findUnique({ where: { slug: brand.slug } });
        if (!tenant) {
            tenant = await prisma.tenant.create({
                data: {
                    name: brand.name,
                    slug: brand.slug,
                    status: "ACTIVE",
                    subscriptionStatus: "ACTIVE",
                    pricePerOutlet: 250,
                    nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                }
            });
        }

        // 2. Create 3 Outlets per Brand
        const locations = ["Downtown", "Mall", "Airport"];
        for (const loc of locations) {
            const outletName = `${brand.name} - ${loc}`;
            let outlet = await prisma.outlet.findFirst({ where: { name: outletName, tenantId: tenant.id } });

            if (!outlet) {
                outlet = await prisma.outlet.create({
                    data: {
                        name: outletName,
                        tenantId: tenant.id,
                        address: "123 Demo St",
                        phone: "555-0100",
                        isMain: loc === "Downtown"
                    }
                });
            }

            // 3. Create Random Sales for specific Outlet
            console.log(`   Generating Sales for ${outlet.name}...`);
            const salesData = [];
            for (let i = 0; i < 50; i++) {
                salesData.push({
                    tenantId: tenant.id,
                    outletId: outlet.id,
                    orderId: `ORD-${Math.floor(Math.random() * 10000)}`,
                    amount: Math.floor(Math.random() * 500) + 50, // $50 - $550
                    paymentMethod: Math.random() > 0.5 ? "CARD" : "CASH",
                    status: "COMPLETED",
                    items: {},
                    createdAt: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)) // Last 30 days
                });
            }
            await prisma.sale.createMany({ data: salesData });
        }

        // 4. Create Brand Admin User
        const password = await hash("password123", 10);
        const adminEmail = `admin@${brand.slug}.com`;

        const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
        if (!existingUser) {
            await prisma.user.create({
                data: {
                    name: `${brand.name} Admin`,
                    email: adminEmail,
                    passwordHash: password,
                    role: "BRAND_ADMIN",
                    tenantId: tenant.id,
                    clerkId: `mock_clerk_${brand.slug}` // Mock ID
                }
            });
        }
    }

    console.log("✅ SEED COMPLETE! Dashboard should now have data.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
