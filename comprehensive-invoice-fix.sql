-- Comprehensive database fix for invoice balance calculations
-- This script will recreate all triggers and fix all invoice balance issues

-- Drop existing broken triggers
DROP TRIGGER IF EXISTS trg_invoice_payment_insert;
DROP TRIGGER IF EXISTS trg_invoice_payment_update;
DROP TRIGGER IF EXISTS trg_invoice_payment_delete;
DROP TRIGGER IF EXISTS trg_update_balance_on_payment;

-- Create corrected triggers that properly handle returns

-- Trigger 1: Update invoice when payments are inserted
CREATE TRIGGER trg_invoice_payment_insert
AFTER INSERT ON payments
WHEN NEW.invoice_id IS NOT NULL AND NEW.payment_type = 'incoming'
BEGIN
  UPDATE invoices 
  SET 
    payment_amount = (
      SELECT COALESCE(SUM(amount), 0) 
      FROM payments 
      WHERE invoice_id = NEW.invoice_id AND payment_type = 'incoming'
    ),
    remaining_balance = ROUND(
      grand_total - 
      COALESCE((
        SELECT SUM(ri.total_price)
        FROM return_items ri 
        JOIN invoice_items ii ON ri.original_invoice_item_id = ii.id
        WHERE ii.invoice_id = NEW.invoice_id
      ), 0) - 
      COALESCE((
        SELECT SUM(amount) 
        FROM payments 
        WHERE invoice_id = NEW.invoice_id AND payment_type = 'incoming'
      ), 0), 
      2
    ),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.invoice_id;
END;

-- Trigger 2: Update invoice when payments are updated
CREATE TRIGGER trg_invoice_payment_update
AFTER UPDATE ON payments
WHEN (NEW.invoice_id IS NOT NULL AND NEW.payment_type = 'incoming') 
     OR (OLD.invoice_id IS NOT NULL AND OLD.payment_type = 'incoming')
BEGIN
  -- Update new invoice if exists
  UPDATE invoices 
  SET 
    payment_amount = (
      SELECT COALESCE(SUM(amount), 0) 
      FROM payments 
      WHERE invoice_id = NEW.invoice_id AND payment_type = 'incoming'
    ),
    remaining_balance = ROUND(
      grand_total - 
      COALESCE((
        SELECT SUM(ri.total_price)
        FROM return_items ri 
        JOIN invoice_items ii ON ri.original_invoice_item_id = ii.id
        WHERE ii.invoice_id = NEW.invoice_id
      ), 0) - 
      COALESCE((
        SELECT SUM(amount) 
        FROM payments 
        WHERE invoice_id = NEW.invoice_id AND payment_type = 'incoming'
      ), 0), 
      2
    ),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.invoice_id AND NEW.invoice_id IS NOT NULL;

  -- Update old invoice if it was changed
  UPDATE invoices 
  SET 
    payment_amount = (
      SELECT COALESCE(SUM(amount), 0) 
      FROM payments 
      WHERE invoice_id = OLD.invoice_id AND payment_type = 'incoming'
    ),
    remaining_balance = ROUND(
      grand_total - 
      COALESCE((
        SELECT SUM(ri.total_price)
        FROM return_items ri 
        JOIN invoice_items ii ON ri.original_invoice_item_id = ii.id
        WHERE ii.invoice_id = OLD.invoice_id
      ), 0) - 
      COALESCE((
        SELECT SUM(amount) 
        FROM payments 
        WHERE invoice_id = OLD.invoice_id AND payment_type = 'incoming'
      ), 0), 
      2
    ),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = OLD.invoice_id AND OLD.invoice_id IS NOT NULL AND OLD.invoice_id != NEW.invoice_id;
END;

-- Trigger 3: Update invoice when payments are deleted
CREATE TRIGGER trg_invoice_payment_delete
AFTER DELETE ON payments
WHEN OLD.invoice_id IS NOT NULL AND OLD.payment_type = 'incoming'
BEGIN
  UPDATE invoices 
  SET 
    payment_amount = (
      SELECT COALESCE(SUM(amount), 0) 
      FROM payments 
      WHERE invoice_id = OLD.invoice_id AND payment_type = 'incoming'
    ),
    remaining_balance = ROUND(
      grand_total - 
      COALESCE((
        SELECT SUM(ri.total_price)
        FROM return_items ri 
        JOIN invoice_items ii ON ri.original_invoice_item_id = ii.id
        WHERE ii.invoice_id = OLD.invoice_id
      ), 0) - 
      COALESCE((
        SELECT SUM(amount) 
        FROM payments 
        WHERE invoice_id = OLD.invoice_id AND payment_type = 'incoming'
      ), 0), 
      2
    ),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = OLD.invoice_id;
END;

-- Trigger 4: Update invoice when returns are processed
CREATE TRIGGER trg_invoice_return_insert
AFTER INSERT ON return_items
BEGIN
  UPDATE invoices 
  SET 
    remaining_balance = ROUND(
      grand_total - 
      COALESCE((
        SELECT SUM(ri.total_price)
        FROM return_items ri 
        JOIN invoice_items ii ON ri.original_invoice_item_id = ii.id
        WHERE ii.invoice_id = invoices.id
      ), 0) - 
      COALESCE(payment_amount, 0), 
      2
    ),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = (
    SELECT ii.invoice_id 
    FROM invoice_items ii 
    WHERE ii.id = NEW.original_invoice_item_id
  );
END;

-- Now fix all existing invoices
.headers on
.mode table

SELECT '=== Fixing All Invoice Balances ===' as info;

UPDATE invoices 
SET remaining_balance = ROUND(
  grand_total - 
  COALESCE((
    SELECT SUM(ri.total_price)
    FROM return_items ri 
    JOIN invoice_items ii ON ri.original_invoice_item_id = ii.id
    WHERE ii.invoice_id = invoices.id
  ), 0) - 
  COALESCE(payment_amount, 0), 
  2
);

SELECT '=== Verification: All Invoice Balances ===' as info;
SELECT 
  bill_number,
  grand_total,
  COALESCE((
    SELECT SUM(ri.total_price)
    FROM return_items ri 
    JOIN invoice_items ii ON ri.original_invoice_item_id = ii.id
    WHERE ii.invoice_id = invoices.id
  ), 0) as total_returns,
  payment_amount,
  remaining_balance,
  CASE 
    WHEN remaining_balance <= 0.01 THEN 'PAID'
    WHEN payment_amount > 0 THEN 'PARTIAL'
    ELSE 'PENDING'
  END as status
FROM invoices 
ORDER BY id;

SELECT '=== Database Fix Complete ===' as info;
