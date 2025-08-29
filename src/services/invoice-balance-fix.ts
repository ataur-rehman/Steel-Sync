/**
 * PRODUCTION DATABASE FIX - INVOICE BALANCE CALCULATION
 * 
 * This is the REAL solution to fix invoice balance calculation errors.
 * Run this once to fix the root cause permanently.
 */

import { DatabaseService } from './database';

export class InvoiceBalanceFix {

    /**
     * Fix invoice balance calculation issues permanently
     * This creates the missing database triggers that ensure balances are always correct
     */
    static async fixInvoiceBalanceCalculations(): Promise<void> {
        console.log('🔧 === FIXING INVOICE BALANCE CALCULATIONS ===');

        const db = DatabaseService.getInstance();

        try {
            // 1. Ensure required tables exist
            await this.ensureTablesExist(db);

            // 2. Create the missing triggers
            await this.createBalanceCalculationTriggers(db);

            // 3. Fix existing corrupted balances
            await this.fixExistingBalances(db);

            console.log('✅ Invoice balance calculation fix complete!');
            console.log('📊 All future operations will maintain correct balances automatically');

        } catch (error) {
            console.error('❌ Failed to fix invoice balance calculations:', error);
            throw error;
        }
    }

    private static async ensureTablesExist(db: any): Promise<void> {
        console.log('📋 Ensuring required tables exist...');

        // Invoice items table
        await db.executeCommand(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        quantity REAL NOT NULL DEFAULT 1,
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
      )
    `);

        // Return items table
        await db.executeCommand(`
      CREATE TABLE IF NOT EXISTS return_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        original_invoice_item_id INTEGER NOT NULL,
        return_quantity REAL NOT NULL,
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (original_invoice_item_id) REFERENCES invoice_items(id)
      )
    `);

        console.log('✅ Required tables verified');
    }

    private static async createBalanceCalculationTriggers(db: any): Promise<void> {
        console.log('🔧 Creating balance calculation triggers...');

        // Drop existing triggers to avoid conflicts
        await db.executeCommand(`DROP TRIGGER IF EXISTS trg_update_balance_on_return_insert`);
        await db.executeCommand(`DROP TRIGGER IF EXISTS trg_update_balance_on_return_delete`);
        await db.executeCommand(`DROP TRIGGER IF EXISTS trg_update_balance_on_payment`);

        // 1. Update balance when return is added
        await db.executeCommand(`
      CREATE TRIGGER trg_update_balance_on_return_insert
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
    `);

        // 2. Update balance when return is deleted
        await db.executeCommand(`
      CREATE TRIGGER trg_update_balance_on_return_delete
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
    `);

        // 3. Update balance when payment is made
        await db.executeCommand(`
      CREATE TRIGGER trg_update_balance_on_payment
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
    `);

        console.log('✅ Balance calculation triggers created');
    }

    private static async fixExistingBalances(db: any): Promise<void> {
        console.log('🔄 Fixing existing corrupted balances...');

        // Get all invoices and recalculate their balances
        const invoices = await db.executeRawQuery(`
      SELECT id, grand_total, payment_amount 
      FROM invoices
    `);

        let fixedCount = 0;

        for (const invoice of invoices) {
            // Calculate correct balance
            const returns = await db.executeRawQuery(`
        SELECT COALESCE(SUM(ri.return_quantity * ri.unit_price), 0) as total_returned
        FROM return_items ri 
        JOIN invoice_items ii ON ri.original_invoice_item_id = ii.id
        WHERE ii.invoice_id = ?
      `, [invoice.id]);

            const totalReturned = returns[0]?.total_returned || 0;
            const correctBalance = Math.round((invoice.grand_total - totalReturned - (invoice.payment_amount || 0)) * 100) / 100;

            // Update if balance is wrong
            const currentBalance = await db.executeRawQuery(`
        SELECT remaining_balance FROM invoices WHERE id = ?
      `, [invoice.id]);

            if (Math.abs(currentBalance[0].remaining_balance - correctBalance) > 0.01) {
                await db.executeCommand(`
          UPDATE invoices 
          SET remaining_balance = ?, updated_at = datetime('now')
          WHERE id = ?
        `, [correctBalance, invoice.id]);

                fixedCount++;
            }
        }

        console.log(`✅ Fixed ${fixedCount} corrupted invoice balances`);
    }

    /**
     * Verify that the fix is working correctly
     */
    static async verifyFix(): Promise<boolean> {
        console.log('🔍 Verifying invoice balance fix...');

        const db = DatabaseService.getInstance();

        try {
            // Check if triggers exist
            const triggers = await db.executeRawQuery(`
        SELECT name FROM sqlite_master 
        WHERE type='trigger' 
        AND name LIKE 'trg_update_balance_%'
      `);

            if (triggers.length < 3) {
                console.log('❌ Required triggers are missing');
                return false;
            }

            // Check for balance inconsistencies
            const inconsistencies = await db.executeRawQuery(`
        SELECT COUNT(*) as count
        FROM invoices i
        WHERE ABS(
          i.remaining_balance - (
            i.grand_total - 
            COALESCE((
              SELECT SUM(ri.return_quantity * ri.unit_price)
              FROM return_items ri 
              JOIN invoice_items ii ON ri.original_invoice_item_id = ii.id
              WHERE ii.invoice_id = i.id
            ), 0) - 
            COALESCE(i.payment_amount, 0)
          )
        ) > 0.01
      `);

            const issueCount = inconsistencies[0]?.count || 0;

            if (issueCount > 0) {
                console.log(`❌ Found ${issueCount} invoices with balance calculation errors`);
                return false;
            }

            console.log('✅ Invoice balance fix verification passed');
            return true;

        } catch (error) {
            console.error('❌ Verification failed:', error);
            return false;
        }
    }
}
