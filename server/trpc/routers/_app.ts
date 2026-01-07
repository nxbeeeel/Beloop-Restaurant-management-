import { router, publicProcedure } from "@/server/trpc/trpc";
import { salesRouter } from "./sales";
import { expensesRouter } from "./expenses";
import { dashboardRouter } from "./dashboard";
import { reportsRouter } from "./reports";
import { googleSheetsRouter } from "./googleSheets";
import { suppliersRouter } from "./suppliers";
import { productsRouter } from "./products";
import { inventoryRouter } from "./inventory";
import { procurementRouter } from "./procurement";
import { dailyClosureRouter } from "./dailyClosure";
import { wastageRouter } from "./wastage";
import { adjustmentsRouter } from "./adjustments";
import { ledgerRouter } from "./ledger";
import { outletsRouter } from "./outlets";
import { analyticsRouter } from "./analytics";
import { tenantRouter } from "./tenant";
import { superModularRouter } from "./super/index";
import { superAnalyticsRouter } from "./superAnalytics";
import { paymentsRouter } from "./payments"; // Supplier Payments
import { supportRouter } from "./support";
import { posRouter } from "./pos";
import { categoriesRouter } from "./categories";
import { customersRouter } from "./customers";
import { ingredientsRouter } from "./ingredients";
import { stockVerificationRouter } from "./stockVerification";
import { brandApplicationRouter } from "./brandApplication";
import { publicRouter } from "./public";
import { brandAnalyticsRouter } from "./brandAnalytics";
import { auditRouter } from "./audit";
import { brandRouter } from "./brand";
import { transfersRouter } from "./transfers";
import { securityRouter } from "./security";
import { dailyRegisterRouter } from "./dailyRegister";
import { creditorLedgerRouter } from "./creditorLedger";
import { expensesV2Router } from "./expensesV2";

export const appRouter = router({
    health: publicProcedure.query(() => ({ status: "ok" })),
    sales: salesRouter,
    expenses: expensesRouter,
    dashboard: dashboardRouter,
    reports: reportsRouter,
    googleSheets: googleSheetsRouter,
    suppliers: suppliersRouter,
    products: productsRouter,
    inventory: inventoryRouter,
    procurement: procurementRouter,
    dailyClosure: dailyClosureRouter,
    wastage: wastageRouter,
    adjustments: adjustmentsRouter,
    ledger: ledgerRouter,
    analytics: analyticsRouter,
    tenant: tenantRouter,
    outlets: outletsRouter,
    superAdmin: superModularRouter, // Modular Super Admin Router
    superAnalytics: superAnalyticsRouter,
    support: supportRouter,
    pos: posRouter,
    categories: categoriesRouter,
    customers: customersRouter,
    ingredients: ingredientsRouter,
    stockVerification: stockVerificationRouter,
    payments: paymentsRouter, // Supplier Payments (not platform billing)
    brandApplication: brandApplicationRouter,
    public: publicRouter,
    brandAnalytics: brandAnalyticsRouter,
    audit: auditRouter,
    brand: brandRouter,
    transfers: transfersRouter, // Multi-outlet stock transfers
    security: securityRouter, // V2: PIN security & notifications
    dailyRegister: dailyRegisterRouter, // V2: Cash management (replaces Velocity)
    creditorLedger: creditorLedgerRouter, // V2: Supplier accounts & instant ledger
    expensesV2: expensesV2Router, // V2: Expense tracking with categories & proof
});

export type AppRouter = typeof appRouter;
