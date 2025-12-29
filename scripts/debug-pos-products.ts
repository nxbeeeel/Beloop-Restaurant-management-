
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const outletId = "cmjrjak2q0001l804ez5n5qyw";
    console.log(`\n🔍 Checking Products for Outlet: ${outletId}`);

    const count = await prisma.product.count({ where: { outletId } });
    console.log(`Total Count: ${count}`);

    if (count > 0) {
        const products = await prisma.product.findMany({
            where: { outletId },
            take: 5,
            select: {
                id: true,
                name: true,
                categoryId: true,
                category: { select: { name: true } },
                isActive: true
            }
        });

        console.log("\nSample Products:");
        products.forEach((p: any) => {
            console.log(`- [${p.isActive ? 'ACTIVE' : 'INACTIVE'}] ${p.name} (Cat: ${p.category?.name || 'NULL'})`);
        });
    } else {
        console.log("No products found.");
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
