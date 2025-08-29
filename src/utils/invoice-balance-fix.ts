// src/utils/invoice-balance-fix.ts
import { db } from '../services/database';

export class InvoiceBalanceFixer {

    static async diagnoseAndFix(): Promise<{
        success: boolean;
        diagnostics: any[];
        fixes: any[];
        errors: string[];
    }> {
        const result = {
            success: false,
            diagnostics: [] as any[],
            fixes: [] as any[],
            errors: [] as string[]
        };

        try {
            if (!db) {
                throw new Error('Database service not available');
            }

            console.log('🔄 Starting invoice balance diagnosis and fix...');

            // Step 1: Diagnose return calculation issues
            console.log('📋 Step 1: Diagnosing return calculation issues...');

            const returnIssues = await db.executeRawQuery(`
        SELECT 
          i.id, i.bill_number, i.grand_total, i.payment_amount, i.remaining_balance,
          COALESCE(returns.total_returned, 0) as total_returned,
          COALESCE(i.grand_total - returns.total_returned - i.payment_amount, i.remaining_balance) as calculated_remaining,
          ABS(i.remaining_balance - (i.grand_total - COALESCE(returns.total_returned, 0) - i.payment_amount)) as balance_error,
          c.name as customer_name
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        LEFT JOIN (
          SELECT 
            ri.original_invoice_item_id,
            ii.invoice_id,
            SUM(ri.return_quantity * ri.unit_price) as total_returned
          FROM return_items ri
          JOIN invoice_items ii ON ri.original_invoice_item_id = ii.id
          GROUP BY ii.invoice_id
        ) returns ON i.id = returns.invoice_id
        WHERE i.payment_amount > 0 
          AND returns.total_returned > 0
          AND ABS(i.remaining_balance - (i.grand_total - COALESCE(returns.total_returned, 0) - i.payment_amount)) > 0.01
        ORDER BY balance_error DESC
      `);

            result.diagnostics.push({
                type: 'return_calculation_issues',
                count: returnIssues.length,
                data: returnIssues
            });

            // Step 2: Fix return calculation errors
            if (returnIssues.length > 0) {
                console.log(`🔧 Fixing ${returnIssues.length} return calculation errors...`);

                const returnFixes = await db.executeCommand(`
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
          WHERE id IN (
            SELECT i.id
            FROM invoices i
            LEFT JOIN (
              SELECT 
                ii.invoice_id,
                SUM(ri.return_quantity * ri.unit_price) as total_returned
              FROM return_items ri
              JOIN invoice_items ii ON ri.original_invoice_item_id = ii.id
              GROUP BY ii.invoice_id
            ) returns ON i.id = returns.invoice_id
            WHERE returns.total_returned > 0
              AND ABS(i.remaining_balance - (i.grand_total - COALESCE(returns.total_returned, 0) - i.payment_amount)) > 0.01
          )
        `);

                result.fixes.push({
                    type: 'return_calculation_fix',
                    changes: returnFixes.changes || 0
                });
            }

            // Step 3: Fix payment calculation errors
            console.log('📋 Step 3: Fixing payment calculation errors...');

            const paymentFixes = await db.executeCommand(`
        UPDATE invoices 
        SET remaining_balance = ROUND(grand_total - COALESCE(payment_amount, 0), 2)
        WHERE ABS(remaining_balance - (grand_total - COALESCE(payment_amount, 0))) > 0.01
          AND id NOT IN (
            SELECT DISTINCT ii.invoice_id 
            FROM return_items ri 
            JOIN invoice_items ii ON ri.original_invoice_item_id = ii.id
            WHERE ii.invoice_id = invoices.id
          )
      `);

            result.fixes.push({
                type: 'payment_calculation_fix',
                changes: paymentFixes.changes || 0
            });

            // Step 4: Update customer balances
            console.log('📋 Step 4: Updating customer balances...');

            const customerUpdates = await db.executeCommand(`
        UPDATE customers 
        SET 
          balance = ROUND((
            SELECT COALESCE(SUM(i.remaining_balance), 0) 
            FROM invoices i 
            WHERE i.customer_id = customers.id
          ), 2),
          status = CASE 
            WHEN (
              SELECT COALESCE(SUM(i.remaining_balance), 0) 
              FROM invoices i 
              WHERE i.customer_id = customers.id
            ) <= 0.01 THEN 'Clear'
            ELSE 'Outstanding'
          END
      `);

            result.fixes.push({
                type: 'customer_balance_update',
                changes: customerUpdates.changes || 0
            });

            // Step 5: Final verification
            console.log('📊 Step 5: Final verification...');

            const verification = await db.executeRawQuery(`
        SELECT 
          COUNT(*) as total_invoices,
          SUM(CASE WHEN remaining_balance < 0 THEN 1 ELSE 0 END) as negative_balances,
          SUM(CASE WHEN ABS(remaining_balance - ROUND(remaining_balance, 2)) > 0.001 THEN 1 ELSE 0 END) as precision_errors
        FROM invoices
      `);

            result.diagnostics.push({
                type: 'final_verification',
                data: verification[0]
            });

            const verifyResult = verification[0];
            result.success = verifyResult.negative_balances === 0 && verifyResult.precision_errors === 0;

            console.log('🎉 Invoice balance fix completed!');
            console.log(`✅ Fixed invoices with returns: ${result.fixes.find(f => f.type === 'return_calculation_fix')?.changes || 0}`);
            console.log(`✅ Fixed invoices with payments: ${result.fixes.find(f => f.type === 'payment_calculation_fix')?.changes || 0}`);
            console.log(`✅ Updated customers: ${result.fixes.find(f => f.type === 'customer_balance_update')?.changes || 0}`);

        } catch (error: any) {
            console.error('❌ Error in invoice balance fix:', error);
            result.errors.push(error.message);
        }

        return result;
    }

    static async findSpecificScenario(grandTotal: number, returnAmount: number, paymentAmount: number): Promise<any[]> {
        try {
            if (!db) {
                throw new Error('Database service not available');
            }

            const scenarios = await db.executeRawQuery(`
        SELECT 
          i.id, i.bill_number, i.grand_total, i.payment_amount, i.remaining_balance,
          COALESCE(returns.total_returned, 0) as total_returned,
          c.name as customer_name,
          (i.grand_total - COALESCE(returns.total_returned, 0) - i.payment_amount) as expected_remaining
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        LEFT JOIN (
          SELECT 
            ri.original_invoice_item_id,
            ii.invoice_id,
            SUM(ri.return_quantity * ri.unit_price) as total_returned
          FROM return_items ri
          JOIN invoice_items ii ON ri.original_invoice_item_id = ii.id
          GROUP BY ii.invoice_id
        ) returns ON i.id = returns.invoice_id
        WHERE i.grand_total >= ? AND i.grand_total <= ?
          AND returns.total_returned >= ? AND returns.total_returned <= ?
          AND i.payment_amount >= ? AND i.payment_amount <= ?
          AND ABS(i.remaining_balance - (i.grand_total - COALESCE(returns.total_returned, 0) - i.payment_amount)) > 0.01
        ORDER BY ABS(i.remaining_balance - (i.grand_total - COALESCE(returns.total_returned, 0) - i.payment_amount)) DESC
        LIMIT 10
      `, [
                grandTotal * 0.9, grandTotal * 1.1,  // ±10% of grand total
                returnAmount * 0.8, returnAmount * 1.2,  // ±20% of return amount
                paymentAmount * 0.8, paymentAmount * 1.2   // ±20% of payment amount
            ]);

            return scenarios;
        } catch (error) {
            console.error('Error finding specific scenario:', error);
            return [];
        }
    }
}

// Convenience function for your specific scenario
export async function fixInvoiceBalanceIssue(): Promise<void> {
    try {
        console.log('🚀 Running invoice balance diagnostic and fix...');

        // First, check for your specific scenario
        const specificIssues = await InvoiceBalanceFixer.findSpecificScenario(23000, 10000, 13000);
        if (specificIssues.length > 0) {
            console.log('🎯 Found invoices matching your scenario:');
            specificIssues.forEach(invoice => {
                console.log(`📄 ${invoice.bill_number}: Total ${invoice.grand_total}, Returned ${invoice.total_returned}, Payment ${invoice.payment_amount}, Current Balance ${invoice.remaining_balance}, Should Be ${invoice.expected_remaining}`);
            });
        }

        // Run the comprehensive fix
        const result = await InvoiceBalanceFixer.diagnoseAndFix();

        if (result.success) {
            console.log('✅ All invoice balance issues have been fixed!');
            console.log('💡 Your scenario (23000 → returned 10000 → payment 13000) should now show 0 outstanding');
        } else {
            console.log('⚠️ Some issues may still exist:', result.errors);
        }

        return;
    } catch (error) {
        console.error('❌ Failed to fix invoice balance issues:', error);
        throw error;
    }
}
