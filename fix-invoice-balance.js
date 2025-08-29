// Emergency fix for invoice balance calculation after returns
import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';

// Use the same database path as the application
const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'com.itehadironstore.management', 'store.db');

console.log('🔧 Opening database:', dbPath);

try {
    const db = new Database(dbPath);

    console.log('📊 Current invoice data:');
    const invoices = db.prepare(`
    SELECT id, bill_number, grand_total, payment_amount, remaining_balance 
    FROM invoices 
    WHERE bill_number = '01'
  `).all();

    console.table(invoices);

    console.log('📊 Returns for this invoice:');
    const returns = db.prepare(`
    SELECT ri.*, r.return_number, r.total_amount as return_total
    FROM return_items ri 
    JOIN returns r ON ri.return_id = r.id
    JOIN invoice_items ii ON ri.original_invoice_item_id = ii.id
    WHERE ii.invoice_id = (SELECT id FROM invoices WHERE bill_number = '01')
  `).all();

    console.table(returns);

    // Calculate the total return amount
    const totalReturnAmount = returns.reduce((sum, item) => sum + item.total_price, 0);
    console.log(`📈 Total return amount: Rs. ${totalReturnAmount}`);

    // Update the remaining balance
    console.log('🔧 Fixing invoice balance...');

    const updateResult = db.prepare(`
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
    )
    WHERE bill_number = '01'
  `).run();

    console.log('✅ Update result:', updateResult);

    console.log('📊 Updated invoice data:');
    const updatedInvoices = db.prepare(`
    SELECT id, bill_number, grand_total, payment_amount, remaining_balance 
    FROM invoices 
    WHERE bill_number = '01'
  `).all();

    console.table(updatedInvoices);

    db.close();
    console.log('✅ Database fix completed successfully!');

} catch (error) {
    console.error('❌ Error:', error);
}
