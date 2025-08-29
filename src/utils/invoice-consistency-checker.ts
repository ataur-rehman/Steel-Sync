import { db } from '../services/database';

export class InvoiceConsistencyChecker {

    static async checkInvoice17() {
        console.log('🔍 === CHECKING INVOICE 17 CONSISTENCY ===');

        try {
            // Get invoice details
            const invoice = await db.executeRawQuery(`
        SELECT 
          id,
          bill_number,
          grand_total,
          payment_amount,
          remaining_balance,
          customer_id,
          updated_at
        FROM invoices 
        WHERE bill_number = '17'
      `);

            if (invoice.length === 0) {
                console.log('❌ Invoice 17 not found');
                return;
            }

            const inv = invoice[0];
            console.log('📄 Invoice 17 Data:');
            console.log(`   Grand Total: ${inv.grand_total}`);
            console.log(`   Payment Amount: ${inv.payment_amount}`);
            console.log(`   Remaining Balance: ${inv.remaining_balance}`);
            console.log(`   Last Updated: ${inv.updated_at}`);

            // Get returns for this invoice
            const returns = await db.executeRawQuery(`
        SELECT 
          ri.id,
          ri.return_quantity,
          ri.unit_price,
          ri.return_quantity * ri.unit_price as return_value,
          ri.created_at
        FROM return_items ri
        JOIN invoice_items ii ON ri.original_invoice_item_id = ii.id
        WHERE ii.invoice_id = ?
      `, [inv.id]);

            console.log(`\n🔄 Returns for Invoice 17 (${returns.length} returns):`);
            let totalReturns = 0;
            returns.forEach((ret, index) => {
                console.log(`   Return ${index + 1}: Qty ${ret.return_quantity} × ${ret.unit_price} = ${ret.return_value}`);
                totalReturns += ret.return_value;
            });
            console.log(`   Total Returns: ${totalReturns}`);

            // Calculate what the balance should be
            const correctBalance = inv.grand_total - totalReturns - (inv.payment_amount || 0);
            console.log(`\n🧮 Balance Calculation:`);
            console.log(`   Grand Total: ${inv.grand_total}`);
            console.log(`   - Returns: ${totalReturns}`);
            console.log(`   - Payments: ${inv.payment_amount || 0}`);
            console.log(`   = Correct Balance: ${correctBalance}`);
            console.log(`   Current DB Balance: ${inv.remaining_balance}`);

            if (Math.abs(correctBalance - inv.remaining_balance) > 0.01) {
                console.log('❌ BALANCE MISMATCH DETECTED!');

                // Fix this specific invoice
                console.log('🔧 Fixing invoice 17...');
                await db.executeCommand(`
          UPDATE invoices 
          SET remaining_balance = ROUND(
            grand_total - 
            COALESCE((
              SELECT SUM(ri.return_quantity * ri.unit_price)
              FROM return_items ri 
              JOIN invoice_items ii ON ri.original_invoice_item_id = ii.id
              WHERE ii.invoice_id = ?
            ), 0) - 
            COALESCE(payment_amount, 0), 
            2
          )
          WHERE id = ?
        `, [inv.id, inv.id]);

                // Check if fixed
                const fixedInvoice = await db.executeRawQuery(`
          SELECT remaining_balance FROM invoices WHERE id = ?
        `, [inv.id]);

                console.log(`✅ Fixed! New balance: ${fixedInvoice[0].remaining_balance}`);

            } else {
                console.log('✅ Balance is correct!');
            }

            // Check triggers exist
            console.log('\n🔧 Checking triggers...');
            const triggers = await db.executeRawQuery(`
        SELECT name FROM sqlite_master 
        WHERE type='trigger' 
        AND name LIKE '%balance%'
      `);

            console.log(`Found ${triggers.length} balance-related triggers:`);
            triggers.forEach(t => console.log(`   - ${t.name}`));

        } catch (error) {
            console.error('❌ Error checking invoice:', error);
        }
    }

    static async refreshAllInvoiceBalances() {
        console.log('🔄 === REFRESHING ALL INVOICE BALANCES ===');

        try {
            const result = await db.executeCommand(`
        UPDATE invoices 
        SET remaining_balance = ROUND(
          grand_total - 
          COALESCE((
            SELECT SUM(ri.return_quantity * ri.unit_price)
            FROM return_items ri 
            JOIN invoice_items ii ON ri.original_invoice_item_id = ii.id
            WHERE ii.invoice_id = invoices.id
          ), 0) - 
          COALESCE(payment_amount, 0), 
          2
        )
      `);

            console.log(`✅ Refreshed ${result.changes || 0} invoices`);

        } catch (error) {
            console.error('❌ Error refreshing balances:', error);
        }
    }
}
