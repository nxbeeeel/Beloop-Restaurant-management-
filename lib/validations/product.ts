import { z } from "zod";

export const createProductSchema = z.object({
    outletId: z.string(),
    name: z.string().min(1),
    sku: z.string().min(1),
    unit: z.string().min(1),
    minStock: z.number().min(0).default(0),
    supplierId: z.string().optional(),
    price: z.number().min(0).default(0),
    categoryId: z.string().optional(),
    description: z.string().optional(),
    imageUrl: z.string().optional(),
    applyToAllOutlets: z.boolean().default(false),
    recipe: z.array(z.object({
        ingredientId: z.string(),
        quantity: z.number().min(0),
        unit: z.string().default("g")
    })).optional(),
});

export const updateProductSchema = z.object({
    id: z.string(),
    name: z.string().min(1).optional(),
    unit: z.string().min(1).optional(),
    minStock: z.number().min(0).optional(),
    supplierId: z.string().optional().nullable(), // Nullable for clearing
    price: z.number().min(0).optional(),
    categoryId: z.string().optional().nullable(),
    description: z.string().optional(),
    imageUrl: z.string().optional(),
    applyToAllOutlets: z.boolean().default(false),
    recipe: z.array(z.object({
        ingredientId: z.string(),
        quantity: z.number().min(0),
        unit: z.string().default("g")
    })).optional(),
});

export const adjustStockSchema = z.object({
    productId: z.string(),
    outletId: z.string(),
    qty: z.number(),
    type: z.enum(['PURCHASE', 'ADJUSTMENT', 'WASTE', 'SALE']),
    notes: z.string().optional()
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
