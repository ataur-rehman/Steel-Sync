-- PERFORMANCE TEST: Daily Ledger with Years of Data
-- Testing scenario: 500 entries per day for 3 years = 547,500 total entries

-- Test query performance with indexes
EXPLAIN QUERY PLAN SELECT * FROM ledger_entries WHERE date = '2025-09-06';

-- Test query performance with customer filter  
EXPLAIN QUERY PLAN SELECT * FROM ledger_entries WHERE date = '2025-09-06' AND (customer_id = 1 OR customer_id IS NULL OR customer_id = 0);

-- Test query performance with payment channel filter
EXPLAIN QUERY PLAN SELECT * FROM ledger_entries WHERE payment_channel_id = 1 AND date = '2025-09-06';

-- Memory usage test: Count entries per date for year
SELECT date, COUNT(*) as daily_count 
FROM ledger_entries 
WHERE date BETWEEN '2024-01-01' AND '2024-12-31' 
GROUP BY date 
ORDER BY daily_count DESC 
LIMIT 10;

-- Performance benchmark: Average query time for date range
SELECT COUNT(*) as total_entries_year FROM ledger_entries WHERE date BETWEEN '2024-01-01' AND '2024-12-31';
