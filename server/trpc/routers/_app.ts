import { router, publicProcedure } from "../trpc";
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
import { analyticsRouter } from "./analytics";
import { tenantRouter } from "./tenant";
import { outletsRouter } from "./outlets";
import { superRouter } from "./super";
import { superAnalyticsRouter } from "./superAnalytics";
import { paymentRouter } from "./payment";
import { paymentsRouter } from "./payments";
import { supportRouter } from "./support";
import { posRouter } from "./pos";
import { categoriesRouter } from "./categories";
import { customersRouter } from "./customers";
import { ingredientsRouter } from "./ingredients";
import { stockVerificationRouter } from "./stockVerification";
import { brandApplicationRouter } from "./brandApplication";
import { billingRouter } from "./billing";
import { publicRouter } from "./public";

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
    analytics: analyticsRouter,
    tenant: tenantRouter,
    outlets: outletsRouter,
    super: superRouter,
    superAnalytics: superAnalyticsRouter,
    payment: paymentRouter,
    support: supportRouter,
    pos: posRouter,
    categories: categoriesRouter,
    customers: customersRouter,
    ingredients: ingredientsRouter,
    stockVerification: stockVerificationRouter,
    payments: paymentsRouter,
    brandApplication: brandApplicationRouter,
    billing: billingRouter,
    public: publicRouter,
});

export type AppRouter = typeof appRouter;
