
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const outletId = "cmjrjak2q0001l804ez5n5qyw"; // The one from user logs
    console.log(`🌱 Seeding POS Products for Outlet: ${outletId}`);

    // 1. Create Categories
    const categories = [
        { name: "Coffee" },
        { name: "Bakery" },
        { name: "Food" },
        { name: "Beverages" }
    ];

    const catMap = new Map();

    for (const c of categories) {
        const cat = await prisma.category.upsert({
            where: { id: `cat_${c.name.toLowerCase()}` }, // Use deterministic IDs properly if possible, but simpler here
            create: {
                id: `cat_${c.name.toLowerCase()}`,
                name: c.name,
                outletId
            },
            update: {},
        });
        // Upsert by ID requires ID. If we don't have deterministic ID, findFirst is better.
        // Actually, let's just findFirst or create.
        const existing = await prisma.category.findFirst({ where: { outletId, name: c.name } });
        if (existing) {
            catMap.set(c.name, existing.id);
        } else {
            const newCat = await prisma.category.create({ data: { name: c.name, outletId } });
            catMap.set(c.name, newCat.id);
        }
    }

    // 2. Create Products
    const products = [
        { name: "Espresso", price: 150, category: "Coffee", sku: "COF001" },
        { name: "Cappuccino", price: 220, category: "Coffee", sku: "COF002" },
        { name: "Latte", price: 240, category: "Coffee", sku: "COF003" },
        { name: "Croissant", price: 180, category: "Bakery", sku: "BAK001" },
        { name: "Chocolate Cake", price: 350, category: "Bakery", sku: "BAK002" },
        { name: "Club Sandwich", price: 280, category: "Food", sku: "FOD001" },
        { name: "Ice Tea", price: 120, category: "Beverages", sku: "BEV001" }
    ];

    for (const p of products) {
        const catId = catMap.get(p.category);
        await prisma.product.upsert({
            where: { outletId_sku: { outletId, sku: p.sku } },
            update: {
                price: p.price,
                categoryId: catId
            },
            create: {
                name: p.name,
                sku: p.sku,
                price: p.price,
                unit: "Item",
                outletId,
                categoryId: catId,
                currentStock: 100 // Initial Stock
            }
        });
        console.log(`Created/Updated: ${p.name}`);
    }

    console.log("✅ Seeding Complete");
}

main()
    .catch((e: any) => {
        console.error("❌ Seed Failed");
        console.error("CODE:", e.code);
        console.error("META:", e.meta);
        console.error("MSG:", e.message?.substring(0, 500));
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
