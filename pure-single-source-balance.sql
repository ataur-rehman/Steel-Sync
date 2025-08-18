-- PURE SINGLE SOURCE SOLUTION: Make customers.balance a computed field
-- This SQL creates a view that always calculates balance from ledger entries

-- First, let's create a view for customers with calculated balances
CREATE VIEW IF NOT EXISTS customers_with_balance AS
SELECT 
  c.*,
  COALESCE(
    (SELECT SUM(CASE WHEN cle.entry_type = 'debit' THEN cle.amount ELSE -cle.amount END)
     FROM customer_ledger_entries cle 
     WHERE cle.customer_id = c.id), 
    0
  ) as calculated_balance,
  COALESCE(
    (SELECT SUM(CASE WHEN cle.entry_type = 'debit' AND cle.transaction_type = 'invoice' THEN cle.amount ELSE 0 END)
     FROM customer_ledger_entries cle 
     WHERE cle.customer_id = c.id), 
    0
  ) as total_invoiced,
  COALESCE(
    (SELECT SUM(CASE WHEN cle.entry_type = 'credit' AND cle.transaction_type = 'payment' THEN cle.amount ELSE 0 END)
     FROM customer_ledger_entries cle 
     WHERE cle.customer_id = c.id), 
    0
  ) as total_paid
FROM customers c;

-- Alternative: If we want to keep the balance column, we can make it auto-calculated with triggers
-- But the view approach is cleaner and more reliable
