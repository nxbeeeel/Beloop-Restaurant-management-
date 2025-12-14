/**
 * Brand Dashboard Resolver - DEPRECATED
 * 
 * This page has been intentionally emptied as part of the Middleware-Only Routing refactor.
 * All routing logic is now handled by middleware.ts to eliminate redirect loops.
 * 
 * When users hit /brand/dashboard, middleware will redirect them to /brand/[slug]/dashboard
 * based on their JWT claims.
 * 
 * @see middleware.ts for the authoritative routing logic
 */

import { redirect } from "next/navigation";

export default function BrandDashboardDeprecated() {
    // Simple redirect to home, middleware will route to correct dashboard
    redirect("/");
}
