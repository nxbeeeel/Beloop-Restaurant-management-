
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

        // 1.5 Create Brand Admin User
        const password = await hash("password123", 10);
        const adminEmail = `admin@${brand.slug}.com`;
        let adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });
        if (!adminUser) {
            adminUser = await prisma.user.create({
                data: {
                    name: `${brand.name} Admin`,
                    email: adminEmail,
                    role: "BRAND_ADMIN",
                    tenantId: tenant.id,
                    clerkId: `mock_clerk_${brand.slug}` // Mock ID
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
                        code: `LOC-${loc.toUpperCase().substring(0, 3)}-${Math.floor(Math.random() * 100)}`,
                    }
                });
            }

            // 3. Create Random Sales for specific Outlet
            console.log(`   Generating Sales for ${outlet.name}...`);
            // 3. Create Orders & Daily Sales
            console.log(`   Generating Sales for ${outlet.name}...`);

            const daysToSeed = 30;
            const ordersPerDay = 5;

            for (let d = 0; d < daysToSeed; d++) {
                const date = new Date();
                date.setDate(date.getDate() - d);
                // Normalize date to YYYY-MM-DD for Sale record
                const dayStart = new Date(date);
                dayStart.setHours(0, 0, 0, 0);

                let dailyTotal = 0;
                let dailyCash = 0;
                let dailyBank = 0;
                let dailyProfit = 0;

                // Create Orders for this day
                const ordersData = [];
                for (let i = 0; i < ordersPerDay; i++) {
                    const amount = Math.floor(Math.random() * 500) + 50;
                    const isCash = Math.random() > 0.5;
                    const profit = Math.floor(amount * 0.4); // 40% margin

                    dailyTotal += amount;
                    if (isCash) dailyCash += amount; else dailyBank += amount;
                    dailyProfit += profit;

                    ordersData.push({
                        outletId: outlet.id,
                        status: "COMPLETED" as const, // Cast for Prisma Enum
                        totalAmount: amount,
                        paymentMethod: isCash ? "CASH" : "CARD",
                        createdAt: dayStart, // Simplification: all at start of day
                        updatedAt: dayStart
                    });
                }

                // Batch create orders
                await prisma.order.createMany({ data: ordersData });

                // Create/Upsert Daily Sale Record
                // Schema requires staffId (which we have from adminUser)
                // Schema requires tenantId (optional?)
                await prisma.sale.upsert({
                    where: {
                        outletId_date: {
                            outletId: outlet.id,
                            date: dayStart
                        }
                    },
                    update: {
                        totalSale: dailyTotal,
                        cashSale: dailyCash,
                        bankSale: dailyBank,
                        profit: dailyProfit
                    },
                    create: {
                        outletId: outlet.id,
                        staffId: adminUser.id,
                        tenantId: tenant.id,
                        date: dayStart,
                        totalSale: dailyTotal,
                        cashSale: dailyCash,
                        bankSale: dailyBank,
                        profit: dailyProfit,
                        totalExpense: 0,
                    }
                });
            }
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
