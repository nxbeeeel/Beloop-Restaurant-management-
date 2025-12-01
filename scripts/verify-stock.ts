

import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';
import { appRouter } from '../server/trpc/routers/_app'; // Adjust path if needed
import { createContext } from '../server/trpc/context'; // Adjust path if needed

const prisma = new PrismaClient();

async function main() {
    console.log("Starting Verification Script...");

    // 1. Setup Data
    const tenantId = "test-tenant-" + Date.now();
    const outletId = "test-outlet-" + Date.now();

    // Create Tenant & Outlet (Mocking or direct DB creation if needed, but let's assume we can use existing or create new)
    // For simplicity, we'll create them directly via Prisma
    const tenant = await prisma.tenant.create({ data: { name: "Test Tenant", id: tenantId } });
    const outlet = await prisma.outlet.create({ data: { name: "Test Outlet", tenantId: tenant.id, id: outletId, address: "Test Address", phone: "123" } });

    // Create User context mock
    const ctx = {
        prisma,
        user: { id: "test-user", tenantId: tenant.id, role: "OWNER", outletId: outlet.id },
        res: null as any,
        req: null as any
    };

    const caller = appRouter.createCaller(ctx);

    console.log("Created Tenant & Outlet");

    // 2. Create Ingredient
    const ingredient = await caller.ingredients.create({
        outletId: outlet.id,
        name: "Test Flour",
        unit: "kg",
        cost: 10,
        stock: 100, // Initial Stock
        minStock: 10
    });
    console.log("Created Ingredient:", ingredient.name, "Stock:", ingredient.stock);

    // 3. Create Product with Recipe
    const productWithRecipe = await caller.products.create({
        outletId: outlet.id,
        name: "Bread",
        sku: "BREAD-001",
        unit: "loaf",
        price: 50,
        recipe: [{ ingredientId: ingredient.id, quantity: 0.5 }] // Uses 0.5kg flour
    });
    console.log("Created Product with Recipe:", productWithRecipe.name);

    // 4. Create Product WITHOUT Recipe
    const productSimple = await caller.products.create({
        outletId: outlet.id,
        name: "Soda",
        sku: "SODA-001",
        unit: "can",
        price: 20
    });
    // Add initial stock for simple product
    await caller.products.adjustStock({
        productId: productSimple.id,
        outletId: outlet.id,
        qty: 50,
        type: 'PURCHASE'
    });
    console.log("Created Simple Product:", productSimple.name, "Stock: 50");

    // 5. Simulate Sale
    console.log("Simulating Sale...");
    await caller.pos.syncSales({
        outletId: outlet.id,
        orders: [{
            id: "order-1",
            localId: "order-1",
            total: 70,
            subtotal: 70,
            tax: 0,
            discount: 0,
            paymentMethod: "CASH",
            status: "COMPLETED",
            createdAt: new Date().toISOString(),
            items: [
                {
                    productId: productWithRecipe.id,
                    quantity: 2, // Should deduct 2 * 0.5 = 1kg flour
                    price: 50,
                    name: productWithRecipe.name
                },
                {
                    productId: productSimple.id,
                    quantity: 5, // Should deduct 5 cans
                    price: 20,
                    name: productSimple.name
                }
            ]
        }]
    });

    // 6. Verify Stock
    const updatedIngredient = await prisma.ingredient.findUnique({ where: { id: ingredient.id } });
    const updatedProductSimple = await prisma.product.findUnique({ where: { id: productSimple.id } });
    const updatedProductRecipe = await prisma.product.findUnique({ where: { id: productWithRecipe.id } });

    console.log("--- Verification Results ---");

    // Ingredient Stock: 100 - (2 * 0.5) = 99
    if (updatedIngredient?.stock === 99) {
        console.log("✅ Ingredient Stock Correct: 99");
    } else {
        console.error("❌ Ingredient Stock Incorrect:", updatedIngredient?.stock, "Expected: 99");
    }

    // Simple Product Stock: 50 - 5 = 45
    if (updatedProductSimple?.currentStock === 45) {
        console.log("✅ Simple Product Stock Correct: 45");
    } else {
        console.error("❌ Simple Product Stock Incorrect:", updatedProductSimple?.currentStock, "Expected: 45");
    }

    // Recipe Product Stock: Should be 0 (or unchanged if we don't track stock for recipe items, but usually we track 'available' based on ingredients, but here we just check if it was decremented directly. The logic says if recipe exists, deduct ingredient, else deduct product. So product stock should remain 0 or whatever it was).
    // Actually, `pos.ts` logic: if recipeItems.length > 0, deduct ingredients. Else deduct product.
    // So productWithRecipe.currentStock should be 0 (initial).
    if (updatedProductRecipe?.currentStock === 0) {
        console.log("✅ Recipe Product Stock Correct (Unchanged): 0");
    } else {
        console.error("❌ Recipe Product Stock Incorrect:", updatedProductRecipe?.currentStock, "Expected: 0");
    }

    // Cleanup
    await prisma.recipeItem.deleteMany({ where: { productId: productWithRecipe.id } });
    await prisma.stockMove.deleteMany({ where: { outletId: outlet.id } });
    await prisma.orderItem.deleteMany({ where: { order: { outletId: outlet.id } } });
    await prisma.order.deleteMany({ where: { outletId: outlet.id } });
    await prisma.product.deleteMany({ where: { outletId: outlet.id } });
    await prisma.ingredient.deleteMany({ where: { outletId: outlet.id } });
    await prisma.outlet.delete({ where: { id: outlet.id } });
    await prisma.tenant.delete({ where: { id: tenant.id } });

    console.log("Cleanup Complete");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
