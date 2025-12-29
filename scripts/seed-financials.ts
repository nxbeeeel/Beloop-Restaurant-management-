
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Seeding Financial Accounts...");

    const outlets = await prisma.outlet.findMany({
        where: { status: 'ACTIVE' }
    });

    console.log(`Found ${outlets.length} active outlets.`);

    const defaultAccounts = [
        { name: "Cash on Hand", type: "ASSET", isSystem: true, code: "1000" },
        { name: "Bank Account", type: "ASSET", isSystem: true, code: "1001" },
        { name: "Inventory Asset", type: "ASSET", isSystem: true, code: "1200" },
        { name: "Accounts Payable", type: "LIABILITY", isSystem: true, code: "2000" },
        { name: "Sales Revenue", type: "REVENUE", isSystem: true, code: "4000" },
        { name: "Cost of Goods Sold", type: "EXPENSE", isSystem: true, code: "5000" }
    ];

    for (const outlet of outlets) {
        console.log(`Processing outlet: ${outlet.name} (${outlet.id})`);

        for (const template of defaultAccounts) {
            const exists = await prisma.financialAccount.findFirst({
                where: {
                    outletId: outlet.id,
                    name: template.name
                }
            });

            if (!exists) {
                await prisma.financialAccount.create({
                    data: {
                        outletId: outlet.id,
                        name: template.name,
                        type: template.type,
                        code: template.code,
                        isSystem: template.isSystem,
                        balance: 0
                    }
                });
                console.log(`  + Created ${template.name}`);
            } else {
                console.log(`  . Skipped ${template.name} (Exists)`);
            }
        }
    }

    console.log("✅ Seeding complete.");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
