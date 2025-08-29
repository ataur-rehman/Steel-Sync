-- EMERGENCY DATA INTEGRITY PROTECTION
-- Add constraints and triggers to prevent balance inconsistencies

-- 1. Create a function to safely calculate remaining balance
CREATE OR REPLACE TRIGGER trg_safe_balance_calculation
AFTER INSERT OR UPDATE ON invoices
FOR EACH ROW
BEGIN
  -- Calculate the correct remaining balance
  UPDATE invoices 
  SET remaining_balance = ROUND(
    GREATEST(0, -- Ensure remaining balance is never negative unless overpaid
      NEW.grand_total - 
      COALESCE((
        SELECT SUM(ri.return_quantity * ri.unit_price)
        FROM return_items ri 
        JOIN invoice_items ii ON ri.original_invoice_item_id = ii.id
        WHERE ii.invoice_id = NEW.id
      ), 0) - 
      COALESCE(NEW.payment_amount, 0)
    ),
    2
  )
  WHERE id = NEW.id;
  
  -- Log any suspicious balance calculations
  INSERT INTO balance_audit_log (
    invoice_id, 
    old_balance, 
    new_balance, 
    grand_total, 
    payment_amount, 
    calculation_timestamp,
    issue_detected
  ) 
  SELECT 
    NEW.id,
    OLD.remaining_balance,
    NEW.remaining_balance,
    NEW.grand_total,
    NEW.payment_amount,
    CURRENT_TIMESTAMP,
    CASE 
      WHEN NEW.remaining_balance > NEW.grand_total AND NEW.payment_amount = 0 THEN 'BALANCE_EXCEEDS_TOTAL'
      WHEN NEW.remaining_balance < 0 AND NEW.payment_amount < NEW.grand_total THEN 'NEGATIVE_BALANCE_UNPAID'
      ELSE NULL
    END
  WHERE NEW.remaining_balance > NEW.grand_total OR (NEW.remaining_balance < 0 AND NEW.payment_amount < NEW.grand_total);
END;

-- 2. Create audit log table if it doesn't exist
CREATE TABLE IF NOT EXISTS balance_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  old_balance REAL,
  new_balance REAL,
  grand_total REAL,
  payment_amount REAL,
  calculation_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  issue_detected TEXT,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);
