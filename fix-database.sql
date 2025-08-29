-- Create essential tables for invoice balance system
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_number TEXT UNIQUE NOT NULL,
  customer_id INTEGER NOT NULL,
  customer_name TEXT NOT NULL,
  grand_total REAL NOT NULL DEFAULT 0,
  payment_amount REAL NOT NULL DEFAULT 0,
  remaining_balance REAL NOT NULL DEFAULT 0,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL,
  total_price REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS return_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  original_invoice_item_id INTEGER NOT NULL,
  return_quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  total_price REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (original_invoice_item_id) REFERENCES invoice_items(id)
);

-- Create the ACTUAL TRIGGERS that fix invoice balance calculations
-- This is the REAL solution to your problem

-- 1. Update invoice balance when return is added
CREATE TRIGGER IF NOT EXISTS trg_update_balance_on_return_insert
AFTER INSERT ON return_items
FOR EACH ROW
BEGIN
  UPDATE invoices 
  SET 
    remaining_balance = ROUND(
      grand_total - 
      COALESCE((
        SELECT SUM(ri.return_quantity * ri.unit_price)
        FROM return_items ri 
        JOIN invoice_items ii ON ri.original_invoice_item_id = ii.id
        WHERE ii.invoice_id = (
          SELECT invoice_id FROM invoice_items WHERE id = NEW.original_invoice_item_id
        )
      ), 0) - 
      COALESCE(payment_amount, 0), 
      2
    ),
    updated_at = datetime('now')
  WHERE id = (
    SELECT invoice_id FROM invoice_items WHERE id = NEW.original_invoice_item_id
  );
END;

-- 2. Update invoice balance when return is deleted
CREATE TRIGGER IF NOT EXISTS trg_update_balance_on_return_delete
AFTER DELETE ON return_items
FOR EACH ROW
BEGIN
  UPDATE invoices 
  SET 
    remaining_balance = ROUND(
      grand_total - 
      COALESCE((
        SELECT SUM(ri.return_quantity * ri.unit_price)
        FROM return_items ri 
        JOIN invoice_items ii ON ri.original_invoice_item_id = ii.id
        WHERE ii.invoice_id = (
          SELECT invoice_id FROM invoice_items WHERE id = OLD.original_invoice_item_id
        )
      ), 0) - 
      COALESCE(payment_amount, 0), 
      2
    ),
    updated_at = datetime('now')
  WHERE id = (
    SELECT invoice_id FROM invoice_items WHERE id = OLD.original_invoice_item_id
  );
END;

-- 3. Update invoice balance when payment is made
CREATE TRIGGER IF NOT EXISTS trg_update_balance_on_payment
AFTER UPDATE OF payment_amount ON invoices
FOR EACH ROW
WHEN NEW.payment_amount != OLD.payment_amount
BEGIN
  UPDATE invoices 
  SET 
    remaining_balance = ROUND(
      grand_total - 
      COALESCE((
        SELECT SUM(ri.return_quantity * ri.unit_price)
        FROM return_items ri 
        JOIN invoice_items ii ON ri.original_invoice_item_id = ii.id
        WHERE ii.invoice_id = NEW.id
      ), 0) - 
      COALESCE(payment_amount, 0), 
      2
    )
  WHERE id = NEW.id;
END;

-- Insert test data to reproduce your exact scenario
INSERT OR IGNORE INTO invoices (id, bill_number, customer_id, customer_name, grand_total, payment_amount, remaining_balance, date, time)
VALUES (17, 'INV-017', 1, 'Test Customer', 23000, 13000, 10000, '2024-01-15', '10:30:00');

INSERT OR IGNORE INTO invoice_items (id, invoice_id, product_name, quantity, unit_price, total_price)
VALUES (1, 17, 'Steel Rod', 100, 230, 23000);

-- Insert return data (10000 worth of returns)
INSERT OR IGNORE INTO return_items (original_invoice_item_id, return_quantity, unit_price, total_price)
VALUES (1, 43.48, 230, 10000);
