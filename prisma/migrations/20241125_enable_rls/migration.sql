-- Migration: Enable Row-Level Security (RLS)
-- Date: 2024-11-25
-- Purpose: Implement database-level tenant isolation for enterprise security

-- ============================================
-- STEP 1: ENABLE RLS ON ALL CORE TABLES
-- ============================================

ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Sale" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Expense" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Wastage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PurchaseOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Supplier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockMove" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DailyClosure" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MonthlySummary" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockCheck" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockCheckItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Outlet" ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: CREATE RLS POLICIES
-- ============================================

-- Policy for Outlet (tenant-level isolation)
CREATE POLICY tenant_isolation_outlet ON "Outlet"
    USING (
        "tenantId" = current_setting('app.current_tenant_id', true)::text
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.bypass_rls', true) = 'true'
    );

-- Policy for Supplier (tenant-level isolation)
CREATE POLICY tenant_isolation_supplier ON "Supplier"
    USING (
        "tenantId" = current_setting('app.current_tenant_id', true)::text
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.bypass_rls', true) = 'true'
    );

-- Policy for Product (outlet-level, but outlet belongs to tenant)
CREATE POLICY tenant_isolation_product ON "Product"
    USING (
        EXISTS (
            SELECT 1 FROM "Outlet" 
            WHERE "Outlet"."id" = "Product"."outletId"
            AND "Outlet"."tenantId" = current_setting('app.current_tenant_id', true)::text
        )
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.bypass_rls', true) = 'true'
    );

-- Policy for Sale (outlet-level)
CREATE POLICY tenant_isolation_sale ON "Sale"
    USING (
        EXISTS (
            SELECT 1 FROM "Outlet" 
            WHERE "Outlet"."id" = "Sale"."outletId"
            AND "Outlet"."tenantId" = current_setting('app.current_tenant_id', true)::text
        )
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.bypass_rls', true) = 'true'
    );

-- Policy for Expense (outlet-level)
CREATE POLICY tenant_isolation_expense ON "Expense"
    USING (
        EXISTS (
            SELECT 1 FROM "Outlet" 
            WHERE "Outlet"."id" = "Expense"."outletId"
            AND "Outlet"."tenantId" = current_setting('app.current_tenant_id', true)::text
        )
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.bypass_rls', true) = 'true'
    );

-- Policy for Wastage (outlet-level)
CREATE POLICY tenant_isolation_wastage ON "Wastage"
    USING (
        EXISTS (
            SELECT 1 FROM "Outlet" 
            WHERE "Outlet"."id" = "Wastage"."outletId"
            AND "Outlet"."tenantId" = current_setting('app.current_tenant_id', true)::text
        )
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.bypass_rls', true) = 'true'
    );

-- Policy for PurchaseOrder (outlet-level)
CREATE POLICY tenant_isolation_purchase_order ON "PurchaseOrder"
    USING (
        EXISTS (
            SELECT 1 FROM "Outlet" 
            WHERE "Outlet"."id" = "PurchaseOrder"."outletId"
            AND "Outlet"."tenantId" = current_setting('app.current_tenant_id', true)::text
        )
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.bypass_rls', true) = 'true'
    );

-- Policy for StockMove (outlet-level)
CREATE POLICY tenant_isolation_stock_move ON "StockMove"
    USING (
        EXISTS (
            SELECT 1 FROM "Outlet" 
            WHERE "Outlet"."id" = "StockMove"."outletId"
            AND "Outlet"."tenantId" = current_setting('app.current_tenant_id', true)::text
        )
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.bypass_rls', true) = 'true'
    );

-- Policy for DailyClosure (outlet-level)
CREATE POLICY tenant_isolation_daily_closure ON "DailyClosure"
    USING (
        EXISTS (
            SELECT 1 FROM "Outlet" 
            WHERE "Outlet"."id" = "DailyClosure"."outletId"
            AND "Outlet"."tenantId" = current_setting('app.current_tenant_id', true)::text
        )
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.bypass_rls', true) = 'true'
    );

-- Policy for MonthlySummary (outlet-level)
CREATE POLICY tenant_isolation_monthly_summary ON "MonthlySummary"
    USING (
        EXISTS (
            SELECT 1 FROM "Outlet" 
            WHERE "Outlet"."id" = "MonthlySummary"."outletId"
            AND "Outlet"."tenantId" = current_setting('app.current_tenant_id', true)::text
        )
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.bypass_rls', true) = 'true'
    );

-- Policy for StockCheck (outlet-level)
CREATE POLICY tenant_isolation_stock_check ON "StockCheck"
    USING (
        EXISTS (
            SELECT 1 FROM "Outlet" 
            WHERE "Outlet"."id" = "StockCheck"."outletId"
            AND "Outlet"."tenantId" = current_setting('app.current_tenant_id', true)::text
        )
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.bypass_rls', true) = 'true'
    );

-- Policy for StockCheckItem (via StockCheck -> Outlet)
CREATE POLICY tenant_isolation_stock_check_item ON "StockCheckItem"
    USING (
        EXISTS (
            SELECT 1 FROM "StockCheck" 
            JOIN "Outlet" ON "Outlet"."id" = "StockCheck"."outletId"
            WHERE "StockCheck"."id" = "StockCheckItem"."stockCheckId"
            AND "Outlet"."tenantId" = current_setting('app.current_tenant_id', true)::text
        )
        OR current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.bypass_rls', true) = 'true'
    );

-- ============================================
-- STEP 3: CREATE INDEXES FOR RLS PERFORMANCE
-- ============================================

-- These indexes improve RLS policy performance
CREATE INDEX IF NOT EXISTS idx_outlet_tenant_id ON "Outlet"("tenantId");
CREATE INDEX IF NOT EXISTS idx_product_outlet_id ON "Product"("outletId");
CREATE INDEX IF NOT EXISTS idx_sale_outlet_id ON "Sale"("outletId");
CREATE INDEX IF NOT EXISTS idx_expense_outlet_id ON "Expense"("outletId");
CREATE INDEX IF NOT EXISTS idx_wastage_outlet_id ON "Wastage"("outletId");
CREATE INDEX IF NOT EXISTS idx_purchase_order_outlet_id ON "PurchaseOrder"("outletId");
CREATE INDEX IF NOT EXISTS idx_stock_move_outlet_id ON "StockMove"("outletId");
CREATE INDEX IF NOT EXISTS idx_daily_closure_outlet_id ON "DailyClosure"("outletId");
CREATE INDEX IF NOT EXISTS idx_monthly_summary_outlet_id ON "MonthlySummary"("outletId");
CREATE INDEX IF NOT EXISTS idx_stock_check_outlet_id ON "StockCheck"("outletId");

-- ============================================
-- STEP 4: GRANT PERMISSIONS
-- ============================================

-- Ensure the application user has necessary permissions
-- (Adjust role name based on your database setup)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO beloop_app_user;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Test 1: Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('Product', 'Sale', 'Expense', 'Wastage', 'PurchaseOrder', 'Supplier');

-- Test 2: Verify policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('Product', 'Sale', 'Expense', 'Wastage', 'PurchaseOrder', 'Supplier');

-- Test 3: Test tenant isolation (run with different tenant IDs)
-- SET app.current_tenant_id = 'tenant_1';
-- SELECT COUNT(*) FROM "Product"; -- Should only see tenant_1 products

-- SET app.current_tenant_id = 'tenant_2';
-- SELECT COUNT(*) FROM "Product"; -- Should only see tenant_2 products

-- ============================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================

-- To disable RLS (for emergency rollback):
-- ALTER TABLE "Product" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Sale" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Expense" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Wastage" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "PurchaseOrder" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Supplier" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "StockMove" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "DailyClosure" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "MonthlySummary" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "StockCheck" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "StockCheckItem" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Outlet" DISABLE ROW LEVEL SECURITY;

-- DROP POLICY tenant_isolation_outlet ON "Outlet";
-- DROP POLICY tenant_isolation_supplier ON "Supplier";
-- DROP POLICY tenant_isolation_product ON "Product";
-- DROP POLICY tenant_isolation_sale ON "Sale";
-- DROP POLICY tenant_isolation_expense ON "Expense";
-- DROP POLICY tenant_isolation_wastage ON "Wastage";
-- DROP POLICY tenant_isolation_purchase_order ON "PurchaseOrder";
-- DROP POLICY tenant_isolation_stock_move ON "StockMove";
-- DROP POLICY tenant_isolation_daily_closure ON "DailyClosure";
-- DROP POLICY tenant_isolation_monthly_summary ON "MonthlySummary";
-- DROP POLICY tenant_isolation_stock_check ON "StockCheck";
-- DROP POLICY tenant_isolation_stock_check_item ON "StockCheckItem";
