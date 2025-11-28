-- Performance Optimization: Critical Database Indexes
-- Date: 2024-11-25
-- Purpose: Reduce query times by 50-70% for common operations

-- ============================================
-- CRITICAL INDEXES FOR COMMON QUERIES
-- ============================================

-- Sales queries (dashboard, reports, daily closing)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sale_outlet_date_deleted 
    ON "Sale"(outletId, date DESC, deletedAt);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sale_staff_date 
    ON "Sale"(staffId, date DESC);

-- Expense queries (daily closing, reports, expense tracking)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expense_outlet_date_deleted 
    ON "Expense"(outletId, date DESC, deletedAt);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expense_category_date 
    ON "Expense"(category, date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expense_staff_date 
    ON "Expense"(staffId, date DESC);

-- Product queries (inventory, low stock, sales entry)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_outlet_stock 
    ON "Product"(outletId, currentStock);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_supplier 
    ON "Product"(supplierId, outletId);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_outlet_name 
    ON "Product"(outletId, name);

-- Wastage queries (reports, inventory tracking)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wastage_outlet_date 
    ON "Wastage"(outletId, date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wastage_product_date 
    ON "Wastage"(productId, date DESC);

-- Purchase Order queries (procurement, receiving)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_order_outlet_status 
    ON "PurchaseOrder"(outletId, status, createdAt DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_order_supplier 
    ON "PurchaseOrder"(supplierId, createdAt DESC);

-- Stock Move queries (audit trail, inventory reconciliation)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_move_outlet_date 
    ON "StockMove"(outletId, date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_move_product_date 
    ON "StockMove"(productId, date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_move_type_date 
    ON "StockMove"(type, date DESC);

-- Stock Check queries (inventory audits)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_check_outlet_date 
    ON "StockCheck"(outletId, date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_check_status 
    ON "StockCheck"(status, date DESC);

-- Monthly Summary queries (reports, analytics)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_monthly_summary_outlet_month 
    ON "MonthlySummary"(outletId, month DESC);

-- User queries (authentication, authorization)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_tenant 
    ON "User"(tenantId, role);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_outlet 
    ON "User"(outletId, role);

-- ============================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ============================================

-- Daily closing: fetch sales + expenses for specific date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sale_outlet_date_total 
    ON "Sale"(outletId, date, totalSale) 
    WHERE deletedAt IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expense_outlet_date_amount 
    ON "Expense"(outletId, date, amount) 
    WHERE deletedAt IS NULL;

-- Low stock alerts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_low_stock 
    ON "Product"(outletId, currentStock) 
    WHERE currentStock < 10;

-- Pending purchase orders
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_order_pending 
    ON "PurchaseOrder"(outletId, createdAt DESC) 
    WHERE status IN ('DRAFT', 'SENT');

-- ============================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ============================================

ANALYZE "Sale";
ANALYZE "Expense";
ANALYZE "Product";
ANALYZE "Wastage";
ANALYZE "PurchaseOrder";
ANALYZE "StockMove";
ANALYZE "StockCheck";
ANALYZE "MonthlySummary";
ANALYZE "User";
ANALYZE "Outlet";

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================
-- NOTES
-- ============================================

-- CONCURRENTLY: Indexes are built without locking the table
-- This allows the application to continue running during index creation

-- Expected Performance Improvements:
-- - Sale queries: 50-70% faster
-- - Expense queries: 50-70% faster  
-- - Product lookups: 60-80% faster
-- - Report generation: 40-60% faster
-- - Dashboard load: 50% faster

-- Estimated Index Creation Time:
-- - Small tables (<10k rows): 1-5 seconds
-- - Medium tables (10k-100k rows): 10-30 seconds
-- - Large tables (>100k rows): 1-5 minutes

-- Monitor Progress:
-- SELECT * FROM pg_stat_progress_create_index;
