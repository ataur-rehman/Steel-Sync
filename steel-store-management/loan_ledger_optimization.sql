-- Loan Ledger Database Optimization Script
-- This script creates optimized indexes and views for enhanced loan ledger performance

-- Performance indexes for loan ledger queries
CREATE INDEX IF NOT EXISTS idx_invoices_remaining_balance ON invoices(remaining_balance) WHERE remaining_balance > 0;
CREATE INDEX IF NOT EXISTS idx_invoices_customer_created_balance ON invoices(customer_id, created_at, remaining_balance);
CREATE INDEX IF NOT EXISTS idx_payments_customer_date_amount ON payments(customer_id, date DESC, amount);
CREATE INDEX IF NOT EXISTS idx_customers_active_credit ON customers(is_active, credit_limit) WHERE is_active = 1;

-- Covering indexes for loan summary calculations
CREATE INDEX IF NOT EXISTS idx_invoices_customer_totals ON invoices(customer_id, grand_total, remaining_balance, created_at);
CREATE INDEX IF NOT EXISTS idx_payments_customer_totals ON payments(customer_id, amount, date);

-- Optimized view for loan ledger data
CREATE VIEW IF NOT EXISTS loan_ledger_view AS
WITH customer_balances AS (
  SELECT 
    c.id,
    c.name,
    c.phone,
    c.email,
    c.address,
    c.credit_limit,
    c.last_contact_date,
    c.next_follow_up_date,
    COALESCE(SUM(i.grand_total), 0) as total_invoiced,
    COALESCE(SUM(p.amount), 0) as total_paid,
    COALESCE(SUM(i.grand_total), 0) - COALESCE(SUM(p.amount), 0) as outstanding,
    COUNT(DISTINCT i.id) as invoice_count,
    COUNT(DISTINCT p.id) as payment_count,
    MAX(i.created_at) as last_invoice_date,
    MAX(p.date) as last_payment_date
  FROM customers c
  LEFT JOIN invoices i ON c.id = i.customer_id
  LEFT JOIN payments p ON c.id = p.customer_id
  WHERE c.is_active = 1
  GROUP BY c.id, c.name, c.phone, c.email, c.address, c.credit_limit, c.last_contact_date, c.next_follow_up_date
  HAVING outstanding > 0
),
aging_analysis AS (
  SELECT 
    i.customer_id,
    SUM(CASE 
      WHEN JULIANDAY('now') - JULIANDAY(i.created_at) <= 30 
      THEN COALESCE(i.remaining_balance, 0)
      ELSE 0 
    END) as aging_current,
    SUM(CASE 
      WHEN JULIANDAY('now') - JULIANDAY(i.created_at) > 30 
      AND JULIANDAY('now') - JULIANDAY(i.created_at) <= 60 
      THEN COALESCE(i.remaining_balance, 0)
      ELSE 0 
    END) as aging_30,
    SUM(CASE 
      WHEN JULIANDAY('now') - JULIANDAY(i.created_at) > 60 
      AND JULIANDAY('now') - JULIANDAY(i.created_at) <= 90 
      THEN COALESCE(i.remaining_balance, 0)
      ELSE 0 
    END) as aging_60,
    SUM(CASE 
      WHEN JULIANDAY('now') - JULIANDAY(i.created_at) > 90 
      AND JULIANDAY('now') - JULIANDAY(i.created_at) <= 120 
      THEN COALESCE(i.remaining_balance, 0)
      ELSE 0 
    END) as aging_90,
    SUM(CASE 
      WHEN JULIANDAY('now') - JULIANDAY(i.created_at) > 120 
      THEN COALESCE(i.remaining_balance, 0)
      ELSE 0 
    END) as aging_120
  FROM invoices i
  WHERE i.remaining_balance > 0
  GROUP BY i.customer_id
)
SELECT 
  cb.*,
  COALESCE(CAST(JULIANDAY('now') - JULIANDAY(cb.last_invoice_date) AS INTEGER), 0) as days_overdue,
  COALESCE(aa.aging_current, 0) as aging_current,
  COALESCE(aa.aging_30, 0) as aging_30,
  COALESCE(aa.aging_60, 0) as aging_60,
  COALESCE(aa.aging_90, 0) as aging_90,
  COALESCE(aa.aging_120, 0) as aging_120,
  CASE 
    WHEN (JULIANDAY('now') - JULIANDAY(cb.last_invoice_date) > 120) 
         OR ((COALESCE(aa.aging_90, 0) + COALESCE(aa.aging_120, 0)) / NULLIF(cb.outstanding, 0) > 0.7) 
         OR (cb.outstanding > 100000) 
    THEN 'critical'
    WHEN (JULIANDAY('now') - JULIANDAY(cb.last_invoice_date) > 90) 
         OR ((COALESCE(aa.aging_90, 0) + COALESCE(aa.aging_120, 0)) / NULLIF(cb.outstanding, 0) > 0.5) 
         OR (cb.outstanding > 50000) 
    THEN 'high'
    WHEN (JULIANDAY('now') - JULIANDAY(cb.last_invoice_date) > 60) 
         OR ((COALESCE(aa.aging_90, 0) + COALESCE(aa.aging_120, 0)) / NULLIF(cb.outstanding, 0) > 0.3) 
         OR (cb.outstanding > 25000) 
    THEN 'medium'
    ELSE 'low'
  END as risk_level
FROM customer_balances cb
LEFT JOIN aging_analysis aa ON cb.id = aa.customer_id
WHERE cb.outstanding > 0
ORDER BY cb.outstanding DESC;

-- Statistics table for fast summary calculations
CREATE TABLE IF NOT EXISTS loan_ledger_stats (
  stat_date DATE PRIMARY KEY,
  total_customers INTEGER,
  total_outstanding REAL,
  critical_customers INTEGER,
  aging_current REAL,
  aging_30 REAL,
  aging_60 REAL,
  aging_90 REAL,
  aging_120 REAL,
  collection_efficiency REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Trigger to maintain loan ledger statistics
CREATE TRIGGER IF NOT EXISTS update_loan_stats_on_payment
AFTER INSERT ON payments
BEGIN
  INSERT OR REPLACE INTO loan_ledger_stats (
    stat_date,
    total_customers,
    total_outstanding,
    critical_customers,
    aging_current,
    aging_30,
    aging_60,
    aging_90,
    aging_120,
    collection_efficiency
  )
  SELECT 
    DATE('now') as stat_date,
    COUNT(*) as total_customers,
    SUM(outstanding) as total_outstanding,
    SUM(CASE WHEN risk_level = 'critical' THEN 1 ELSE 0 END) as critical_customers,
    SUM(aging_current) as aging_current,
    SUM(aging_30) as aging_30,
    SUM(aging_60) as aging_60,
    SUM(aging_90) as aging_90,
    SUM(aging_120) as aging_120,
    CASE 
      WHEN SUM(outstanding) > 0 
      THEN (SUM(aging_current) / SUM(outstanding)) * 100 
      ELSE 100 
    END as collection_efficiency
  FROM loan_ledger_view;
END;

-- Performance analysis query
-- Use this to monitor query performance
CREATE VIEW IF NOT EXISTS loan_performance_metrics AS
SELECT 
  'Total Outstanding' as metric,
  SUM(outstanding) as value,
  'PKR' as unit
FROM loan_ledger_view
UNION ALL
SELECT 
  'Average Days Overdue' as metric,
  AVG(days_overdue) as value,
  'days' as unit
FROM loan_ledger_view
UNION ALL
SELECT 
  'Collection Efficiency' as metric,
  CASE 
    WHEN SUM(outstanding) > 0 
    THEN (SUM(aging_current) / SUM(outstanding)) * 100 
    ELSE 100 
  END as value,
  '%' as unit
FROM loan_ledger_view;

-- Cleanup old statistics (keep last 90 days)
DELETE FROM loan_ledger_stats 
WHERE stat_date < DATE('now', '-90 days');

-- PRAGMA optimizations for better performance
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -64000;  -- 64MB cache
PRAGMA temp_store = MEMORY;
PRAGMA mmap_size = 268435456;  -- 256MB mmap

-- Analyze tables for query optimization
ANALYZE customers;
ANALYZE invoices;
ANALYZE payments;
ANALYZE loan_ledger_stats;
