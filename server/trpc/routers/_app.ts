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
import { supportRouter } from "./support";
import { posRouter } from "./pos";
import { categoriesRouter } from "./categories";

export const appRouter = router({
    health: publicProcedure.query(() => ({ status: "ok" })),
    pos: posRouter,
    superAnalytics: superAnalyticsRouter,
    payment: paymentRouter,
    support: supportRouter,
});

export type AppRouter = typeof appRouter;
