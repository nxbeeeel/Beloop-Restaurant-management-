/**
 * Super Admin Router - Modular Structure
 * 
 * This file merges all super admin sub-routers into one
 * for backward compatibility with existing API calls.
 */
import { router } from '../../trpc';
import { tenantsRouter } from './tenants.router';
import { usersRouter } from './users.router';
import { billingRouter } from './billing.router';
import { systemRouter } from './system.router';

/**
 * Merged Super Router
 * 
 * Maintains API compatibility by nesting routes:
 * - super.tenants.list (was super.listTenants)
 * - super.users.list (was super.listAllUsers)
 * - super.billing.listPayments
 * - super.system.getStats
 * 
 * For backward compatibility, also export flat merged router below.
 */
export const superModularRouter = router({
    tenants: tenantsRouter,
    users: usersRouter,
    billing: billingRouter,
    system: systemRouter,
});

// Re-export individual routers for direct import
export { tenantsRouter, usersRouter, billingRouter, systemRouter };
