import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { enforceTenant } from "@/server/trpc/middleware/roleCheck";

/**
 * Expenses V2 Router
 *
 * Improved expense tracking with:
 * - Configurable categories per outlet
 * - Proof image uploads
 * - Budget tracking
 * - Porter expense references (links to orders/customers)
 */
export const expensesV2Router = router({
    // ═══════════════════════════════════════════════════════════════
    // CATEGORIES
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get all expense categories for an outlet
     */
    getCategories: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            includeInactive: z.boolean().default(false),
        }).optional())
        .query(async ({ ctx, input }) => {
            const { prisma, user } = ctx;
            const outletId = user?.outletId;

            if (!outletId) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "No outlet context" });
            }

            const categories = await prisma.expenseCategoryV2.findMany({
                where: {
                    outletId,
                    ...(input?.includeInactive ? {} : { isActive: true }),
                },
                orderBy: { sortOrder: "asc" },
            });

            return categories.map(c => ({
                ...c,
                budgetMonthly: c.budgetMonthly ? Number(c.budgetMonthly) : null,
            }));
        }),

    /**
     * Create a new expense category
     */
    createCategory: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            name: z.string().min(1).max(50),
            code: z.string().min(1).max(20).toUpperCase(),
            icon: z.string().optional(),
            color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
            budgetMonthly: z.number().positive().optional(),
            requiresProof: z.boolean().default(true),
            requiresRef: z.boolean().default(false),
        }))
        .mutation(async ({ ctx, input }) => {
            const { prisma, user } = ctx;
            const outletId = user?.outletId;

            if (!outletId) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "No outlet context" });
            }

            // Check for duplicate code
            const existing = await prisma.expenseCategoryV2.findUnique({
                where: { outletId_code: { outletId, code: input.code } },
            });

            if (existing) {
                throw new TRPCError({
                    code: "CONFLICT",
                    message: `Category with code "${input.code}" already exists`,
                });
            }

            // Get max sort order
            const maxOrder = await prisma.expenseCategoryV2.aggregate({
                where: { outletId },
                _max: { sortOrder: true },
            });

            const category = await prisma.expenseCategoryV2.create({
                data: {
                    outletId,
                    name: input.name,
                    code: input.code,
                    icon: input.icon,
                    color: input.color,
                    budgetMonthly: input.budgetMonthly,
                    requiresProof: input.requiresProof,
                    requiresRef: input.requiresRef,
                    sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
                },
            });

            return {
                ...category,
                budgetMonthly: category.budgetMonthly ? Number(category.budgetMonthly) : null,
            };
        }),

    /**
     * Update an expense category
     */
    updateCategory: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            id: z.string(),
            name: z.string().min(1).max(50).optional(),
            icon: z.string().optional(),
            color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
            budgetMonthly: z.number().positive().nullable().optional(),
            requiresProof: z.boolean().optional(),
            requiresRef: z.boolean().optional(),
            isActive: z.boolean().optional(),
            sortOrder: z.number().int().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { prisma, user } = ctx;
            const outletId = user?.outletId;

            if (!outletId) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "No outlet context" });
            }

            const { id, ...updateData } = input;

            const category = await prisma.expenseCategoryV2.update({
                where: { id, outletId },
                data: updateData,
            });

            return {
                ...category,
                budgetMonthly: category.budgetMonthly ? Number(category.budgetMonthly) : null,
            };
        }),

    /**
     * Seed default categories for a new outlet
     */
    seedDefaultCategories: protectedProcedure
        .use(enforceTenant)
        .mutation(async ({ ctx }) => {
            const { prisma, user } = ctx;
            const outletId = user?.outletId;

            if (!outletId) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "No outlet context" });
            }

            const defaultCategories = [
                { code: "RENT", name: "Rent", icon: "🏠", requiresProof: true, requiresRef: false },
                { code: "SALARY", name: "Salary", icon: "💰", requiresProof: false, requiresRef: false },
                { code: "ELECTRIC", name: "Electricity", icon: "⚡", requiresProof: true, requiresRef: false },
                { code: "GAS", name: "Gas Cylinder", icon: "🔥", requiresProof: true, requiresRef: false },
                { code: "PORTER", name: "Porter/Delivery", icon: "🛵", requiresProof: false, requiresRef: true },
                { code: "REPAIR", name: "Repairs & Maintenance", icon: "🔧", requiresProof: true, requiresRef: false },
                { code: "SUPPLIES", name: "Cleaning Supplies", icon: "🧹", requiresProof: true, requiresRef: false },
                { code: "MISC", name: "Miscellaneous", icon: "📦", requiresProof: false, requiresRef: false },
            ];

            const created = await prisma.expenseCategoryV2.createMany({
                data: defaultCategories.map((cat, idx) => ({
                    outletId,
                    ...cat,
                    sortOrder: idx + 1,
                })),
                skipDuplicates: true,
            });

            return { created: created.count };
        }),

    // ═══════════════════════════════════════════════════════════════
    // EXPENSE ENTRIES
    // ═══════════════════════════════════════════════════════════════

    /**
     * List expense entries with filters
     */
    listExpenses: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            startDate: z.string().optional(),
            endDate: z.string().optional(),
            categoryId: z.string().optional(),
            limit: z.number().min(1).max(100).default(50),
            offset: z.number().min(0).default(0),
        }))
        .query(async ({ ctx, input }) => {
            const { prisma, user } = ctx;
            const outletId = user?.outletId;

            if (!outletId) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "No outlet context" });
            }

            const dateFilter: { gte?: Date; lte?: Date } = {};
            if (input.startDate) dateFilter.gte = new Date(input.startDate);
            if (input.endDate) dateFilter.lte = new Date(input.endDate + "T23:59:59");

            const where = {
                outletId,
                ...(input.categoryId && { categoryId: input.categoryId }),
                ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
            };

            const [expenses, total] = await Promise.all([
                prisma.expenseEntryV2.findMany({
                    where,
                    include: {
                        category: { select: { name: true, code: true, icon: true, color: true } },
                    },
                    orderBy: { date: "desc" },
                    take: input.limit,
                    skip: input.offset,
                }),
                prisma.expenseEntryV2.count({ where }),
            ]);

            return {
                expenses: expenses.map(e => ({
                    ...e,
                    amount: Number(e.amount),
                })),
                total,
                hasMore: input.offset + expenses.length < total,
            };
        }),

    /**
     * Create a new expense entry
     */
    createExpense: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            categoryId: z.string(),
            amount: z.number().positive(),
            description: z.string().min(1),
            vendorName: z.string().optional(),
            paymentMethod: z.enum(["CASH", "UPI", "CARD", "BANK"]),
            proofImageUrl: z.string().url().optional(),
            referenceType: z.enum(["ORDER", "CUSTOMER", "OTHER"]).optional(),
            referenceId: z.string().optional(),
            referenceName: z.string().optional(),
            date: z.string().optional(), // ISO date string
        }))
        .mutation(async ({ ctx, input }) => {
            const { prisma, user } = ctx;
            const outletId = user?.outletId;
            const userId = user?.id;
            const userName = user?.name || "Unknown";

            if (!outletId || !userId) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "No outlet context" });
            }

            // Validate category exists and belongs to outlet
            const category = await prisma.expenseCategoryV2.findFirst({
                where: { id: input.categoryId, outletId },
            });

            if (!category) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Category not found" });
            }

            // Check proof requirement
            if (category.requiresProof && !input.proofImageUrl) {
                // Allow creation but flag as missing proof
            }

            // Check reference requirement (for Porter expenses)
            if (category.requiresRef && !input.referenceId) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: `${category.name} expenses require an Order or Customer reference`,
                });
            }

            const expense = await prisma.expenseEntryV2.create({
                data: {
                    outletId,
                    categoryId: input.categoryId,
                    amount: input.amount,
                    description: input.description,
                    vendorName: input.vendorName,
                    paymentMethod: input.paymentMethod,
                    proofImageUrl: input.proofImageUrl,
                    proofMissing: category.requiresProof && !input.proofImageUrl,
                    referenceType: input.referenceType,
                    referenceId: input.referenceId,
                    referenceName: input.referenceName,
                    createdBy: userId,
                    createdByName: userName,
                    date: input.date ? new Date(input.date) : new Date(),
                },
                include: {
                    category: { select: { name: true, code: true, icon: true } },
                },
            });

            return {
                ...expense,
                amount: Number(expense.amount),
            };
        }),

    /**
     * Update an expense entry (add proof, fix details)
     */
    updateExpense: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            id: z.string(),
            description: z.string().min(1).optional(),
            vendorName: z.string().optional(),
            proofImageUrl: z.string().url().optional(),
            referenceName: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { prisma, user } = ctx;
            const outletId = user?.outletId;

            if (!outletId) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "No outlet context" });
            }

            const { id, proofImageUrl, ...updateData } = input;

            const expense = await prisma.expenseEntryV2.update({
                where: { id, outletId },
                data: {
                    ...updateData,
                    ...(proofImageUrl && {
                        proofImageUrl,
                        proofMissing: false,
                    }),
                },
                include: {
                    category: { select: { name: true, code: true, icon: true } },
                },
            });

            return {
                ...expense,
                amount: Number(expense.amount),
            };
        }),

    /**
     * Delete an expense entry (soft delete or hard delete if same day)
     */
    deleteExpense: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            id: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { prisma, user } = ctx;
            const outletId = user?.outletId;

            if (!outletId) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "No outlet context" });
            }

            // Check if expense exists and is from today
            const expense = await prisma.expenseEntryV2.findFirst({
                where: { id: input.id, outletId },
            });

            if (!expense) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Expense not found" });
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const expenseDate = new Date(expense.date);
            expenseDate.setHours(0, 0, 0, 0);

            if (expenseDate < today) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Cannot delete expenses from previous days. Contact manager.",
                });
            }

            await prisma.expenseEntryV2.delete({
                where: { id: input.id },
            });

            return { success: true };
        }),

    // ═══════════════════════════════════════════════════════════════
    // REPORTS & ANALYTICS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get expense summary by category for a date range
     */
    getSummaryByCategory: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            startDate: z.string(),
            endDate: z.string(),
        }))
        .query(async ({ ctx, input }) => {
            const { prisma, user } = ctx;
            const outletId = user?.outletId;

            if (!outletId) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "No outlet context" });
            }

            const dateFilter = {
                gte: new Date(input.startDate),
                lte: new Date(input.endDate + "T23:59:59"),
            };

            // Get all categories with their totals
            const categories = await prisma.expenseCategoryV2.findMany({
                where: { outletId, isActive: true },
                include: {
                    expenses: {
                        where: { outletId, date: dateFilter },
                        select: { amount: true },
                    },
                },
                orderBy: { sortOrder: "asc" },
            });

            const summary = categories.map(cat => {
                const total = cat.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
                const budget = cat.budgetMonthly ? Number(cat.budgetMonthly) : null;
                const budgetUsed = budget ? (total / budget) * 100 : null;

                return {
                    id: cat.id,
                    code: cat.code,
                    name: cat.name,
                    icon: cat.icon,
                    color: cat.color,
                    total,
                    count: cat.expenses.length,
                    budget,
                    budgetUsed: budgetUsed ? Math.round(budgetUsed) : null,
                    isOverBudget: budget ? total > budget : false,
                };
            });

            const grandTotal = summary.reduce((sum, s) => sum + s.total, 0);

            return {
                categories: summary,
                grandTotal,
                totalTransactions: summary.reduce((sum, s) => sum + s.count, 0),
            };
        }),

    /**
     * Get expenses missing proof
     */
    getMissingProof: protectedProcedure
        .use(enforceTenant)
        .query(async ({ ctx }) => {
            const { prisma, user } = ctx;
            const outletId = user?.outletId;

            if (!outletId) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "No outlet context" });
            }

            const expenses = await prisma.expenseEntryV2.findMany({
                where: { outletId, proofMissing: true },
                include: {
                    category: { select: { name: true, icon: true } },
                },
                orderBy: { date: "desc" },
                take: 50,
            });

            return expenses.map(e => ({
                ...e,
                amount: Number(e.amount),
            }));
        }),

    /**
     * Get daily expense totals for a month (for chart)
     */
    getDailyTotals: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            month: z.string().regex(/^\d{4}-\d{2}$/), // YYYY-MM
        }))
        .query(async ({ ctx, input }) => {
            const { prisma, user } = ctx;
            const outletId = user?.outletId;

            if (!outletId) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "No outlet context" });
            }

            const startDate = new Date(`${input.month}-01`);
            const endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + 1);
            endDate.setDate(0); // Last day of month

            const expenses = await prisma.expenseEntryV2.groupBy({
                by: ["date"],
                where: {
                    outletId,
                    date: { gte: startDate, lte: endDate },
                },
                _sum: { amount: true },
                orderBy: { date: "asc" },
            });

            // Fill in missing days with 0
            const dailyTotals: { date: string; total: number }[] = [];
            const current = new Date(startDate);

            while (current <= endDate) {
                const dateStr = current.toISOString().split("T")[0];
                const found = expenses.find(e =>
                    e.date.toISOString().split("T")[0] === dateStr
                );
                dailyTotals.push({
                    date: dateStr,
                    total: found?._sum.amount ? Number(found._sum.amount) : 0,
                });
                current.setDate(current.getDate() + 1);
            }

            return dailyTotals;
        }),
});
