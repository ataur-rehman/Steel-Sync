// ROOT CAUSE ANALYSIS: Invoice Balance Calculation Issues
// Expert Software Engineer Analysis

/*
REAL PROBLEM ANALYSIS:
===================

Your scenario: 
- Invoice Total: 23,000
- Products Returned: 10,000  
- Payment Made: 13,000
- Expected Outstanding: 0
- Actual Outstanding: 10,000 ❌

ROOT CAUSE HYPOTHESIS:
The remaining_balance field is NOT being updated when:
1. Products are returned (return_items table updated but invoice.remaining_balance unchanged)
2. Payments are made after returns (payment triggers don't account for returns)
3. Invoice edits/deletions happen (stale balance data)

REAL INVESTIGATION NEEDED:
1. Check actual database triggers
2. Verify return processing workflow
3. Analyze payment processing logic
4. Find WHERE the calculation is going wrong
*/

import { DatabaseService, db } from '../services/database';

interface ProblematicInvoice {
    id: number;
    bill_number: string;
    customer_name: string;
    grand_total: number;
    current_balance: number;
    correct_balance: number;
    balance_error: number;
    total_returned: number;
    payment_amount: number;
    return_count: number;
}

interface AnalysisResult {
    category: string;
    issues: string[];
    recommendations: string[];
}

export class InvoiceBalanceRootCauseAnalyzer {

    // Step 1: Find the EXACT problematic invoices
    static async findExactProblematicInvoices(): Promise<any[]> {
        console.log('🔍 FINDING EXACT PROBLEMATIC INVOICES...');

        const problematicInvoices = await db.executeRawQuery(`
      SELECT 
        i.id,
        i.bill_number,
        i.customer_id,
        i.grand_total,
        i.payment_amount,
        i.remaining_balance as current_balance,
        
        -- Calculate what the balance SHOULD be
        ROUND(
          i.grand_total - 
          COALESCE(returns.total_returned, 0) - 
          COALESCE(i.payment_amount, 0), 2
        ) as correct_balance,
        
        -- Calculate the error
        ABS(
          i.remaining_balance - 
          ROUND(
            i.grand_total - 
            COALESCE(returns.total_returned, 0) - 
            COALESCE(i.payment_amount, 0), 2
          )
        ) as balance_error,
        
        COALESCE(returns.total_returned, 0) as total_returned,
        returns.return_count,
        c.name as customer_name,
        i.created_at,
        i.updated_at
        
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN (
        SELECT 
          ii.invoice_id,
          SUM(ri.return_quantity * ri.unit_price) as total_returned,
          COUNT(ri.id) as return_count
        FROM return_items ri
        JOIN invoice_items ii ON ri.original_invoice_item_id = ii.id
        GROUP BY ii.invoice_id
      ) returns ON i.id = returns.invoice_id
      
      WHERE ABS(
        i.remaining_balance - 
        ROUND(
          i.grand_total - 
          COALESCE(returns.total_returned, 0) - 
          COALESCE(i.payment_amount, 0), 2
        )
      ) > 0.01
      
      ORDER BY balance_error DESC
      LIMIT 20
    `);

        console.log(`📊 Found ${problematicInvoices.length} invoices with calculation errors`);

        problematicInvoices.forEach((inv, index) => {
            console.log(`\n🔴 Invoice ${index + 1}: ${inv.bill_number}`);
            console.log(`   Customer: ${inv.customer_name}`);
            console.log(`   Grand Total: ${inv.grand_total}`);
            console.log(`   Returned: ${inv.total_returned} (${inv.return_count || 0} returns)`);
            console.log(`   Payment: ${inv.payment_amount}`);
            console.log(`   Current Balance: ${inv.current_balance}`);
            console.log(`   Correct Balance: ${inv.correct_balance}`);
            console.log(`   ERROR: ${inv.balance_error}`);
        });

        return problematicInvoices;
    }

    /**
     * 2. ANALYZE DATABASE TRIGGERS
     * Check what triggers exist and what's missing
     */
    static async analyzeDatabaseTriggers(): Promise<AnalysisResult> {
        console.log('\n🔧 === STEP 2: ANALYZING DATABASE TRIGGERS ===');

        const result: AnalysisResult = {
            category: 'triggers',
            issues: [],
            recommendations: []
        };

        try {
            // Check what triggers exist
            const existingTriggers = await db.executeRawQuery(
                `SELECT name, sql FROM sqlite_master WHERE type='trigger' ORDER BY name`
            );

            console.log('📋 Existing triggers:');
            existingTriggers.forEach((trigger: any) => {
                console.log(`   ${trigger.name}`);
            });

            // Check for specific triggers we need
            const requiredTriggers = [
                'update_invoice_balance_on_return',
                'update_invoice_balance_on_return_delete',
                'update_invoice_balance_on_payment',
                'update_invoice_balance_on_payment_delete',
                'recalculate_balance_on_invoice_edit'
            ];

            const missingTriggers = requiredTriggers.filter(triggerName =>
                !existingTriggers.some((t: any) => t.name === triggerName)
            );

            if (missingTriggers.length > 0) {
                console.log('❌ MISSING CRITICAL TRIGGERS:');
                missingTriggers.forEach(trigger => {
                    console.log(`   - ${trigger}`);
                    result.issues.push(`Missing trigger: ${trigger}`);
                });

                result.recommendations.push('Create proper database triggers for balance consistency');
            }

            // Check trigger quality
            for (const trigger of existingTriggers) {
                if (trigger.sql && !trigger.sql.includes('remaining_balance')) {
                    result.issues.push(`Trigger ${trigger.name} doesn't update remaining_balance`);
                }
            }

            console.log(`🔍 Analysis complete: ${result.issues.length} trigger issues found`);
            return result;

        } catch (error) {
            console.error('❌ Error analyzing triggers:', error);
            throw error;
        }
    }

    /**
     * 3. ANALYZE RETURN WORKFLOW
     * Check how returns are processed and if they update balances
     */
    static async analyzeReturnWorkflow(): Promise<AnalysisResult> {
        console.log('\n🔄 === STEP 3: ANALYZING RETURN WORKFLOW ===');

        const result: AnalysisResult = {
            category: 'return_workflow',
            issues: [],
            recommendations: []
        };

        try {

            // Check recent returns and their impact
            const recentReturns = await db.executeRawQuery(`
      SELECT 
        ri.id,
        ri.return_quantity,
        ri.unit_price,
        ri.return_quantity * ri.unit_price as return_value,
        ii.invoice_id,
        i.bill_number,
        i.remaining_balance,
        ri.created_at as return_date
      FROM return_items ri
      JOIN invoice_items ii ON ri.original_invoice_item_id = ii.id
      JOIN invoices i ON ii.invoice_id = i.id
      ORDER BY ri.created_at DESC
      LIMIT 10
    `);

            console.log(`📦 Analyzing ${recentReturns.length} recent returns:`);

            for (const ret of recentReturns) {
                console.log(`\n📦 Return ID ${ret.id}:`);
                console.log(`   Invoice: ${ret.bill_number}`);
                console.log(`   Return Value: ${ret.return_value}`);
                console.log(`   Current Invoice Balance: ${ret.remaining_balance}`);
                console.log(`   Return Date: ${ret.return_date}`);

                // Check if this return affected the invoice balance
                const invoiceHistory = await db.executeRawQuery(`
        SELECT * FROM invoices WHERE id = ? ORDER BY updated_at DESC LIMIT 1
      `, [ret.invoice_id]);

                if (invoiceHistory.length > 0) {
                    const invoice = invoiceHistory[0];
                    console.log(`   Invoice Last Updated: ${invoice.updated_at}`);

                    if (invoice.updated_at < ret.return_date) {
                        console.log(`   🚨 PROBLEM: Invoice not updated after return!`);
                        result.issues.push(`Invoice ${invoice.bill_number} not updated after return on ${ret.return_date}`);
                    }
                }
            }

            result.recommendations.push('Ensure database triggers update invoice balances when returns are processed');
            return result;

        } catch (error) {
            console.error('❌ Error analyzing return workflow:', error);
            throw error;
        }
    }

    /**
     * 4. ANALYZE PAYMENT WORKFLOW
     * Check how payments are processed and if they consider returns
     */
    static async analyzePaymentWorkflow(): Promise<AnalysisResult> {
        console.log('\n💰 === STEP 4: ANALYZING PAYMENT WORKFLOW ===');

        const result: AnalysisResult = {
            category: 'payment_workflow',
            issues: [],
            recommendations: []
        };

        try {
            // Find invoices with both payments and returns
            const paymentsAfterReturns = await db.executeRawQuery(`
        SELECT 
          i.id,
          i.bill_number,
          i.grand_total,
          i.payment_amount,
          i.remaining_balance,
          COALESCE(SUM(ri.return_quantity * ri.unit_price), 0) as total_returned,
          i.updated_at as payment_date
        FROM invoices i
        LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
        LEFT JOIN return_items ri ON ii.id = ri.original_invoice_item_id
        WHERE i.payment_amount > 0
        GROUP BY i.id, i.bill_number, i.grand_total, i.payment_amount, i.remaining_balance, i.updated_at
        HAVING total_returned > 0
        ORDER BY i.updated_at DESC
        LIMIT 10
      `);

            console.log(`💳 Analyzing ${paymentsAfterReturns.length} payments on invoices with returns:`);

            paymentsAfterReturns.forEach(payment => {
                const expectedBalance = payment.grand_total - payment.total_returned - payment.payment_amount;
                const balanceError = Math.abs(payment.remaining_balance - expectedBalance);

                console.log(`\n💳 Payment on ${payment.bill_number}:`);
                console.log(`   Grand Total: ${payment.grand_total}`);
                console.log(`   Total Returned: ${payment.total_returned}`);
                console.log(`   Payment: ${payment.payment_amount}`);
                console.log(`   Current Balance: ${payment.remaining_balance}`);
                console.log(`   Expected Balance: ${expectedBalance}`);
                console.log(`   Error: ${balanceError} ${balanceError > 0.01 ? '🚨' : '✅'}`);

                if (balanceError > 0.01) {
                    result.issues.push(`Payment on invoice ${payment.bill_number} doesn't account for returns properly`);
                }
            });

            result.recommendations.push('Update payment triggers to consider existing returns when calculating balances');
            return result;

        } catch (error) {
            console.error('❌ Error analyzing payment workflow:', error);
            throw error;
        }
    }

    /**
     * 5. CREATE PROPER TRIGGERS
     * The REAL FIX - Create comprehensive database triggers
     */
    static async createProperTriggers(): Promise<void> {
        console.log('\n🔧 === STEP 5: CREATING PROPER TRIGGERS ===');

        try {
            // Drop existing problematic triggers
            await db.executeCommand(`DROP TRIGGER IF EXISTS trg_return_items_insert`);
            await db.executeCommand(`DROP TRIGGER IF EXISTS trg_return_items_update`);
            await db.executeCommand(`DROP TRIGGER IF EXISTS trg_return_items_delete`);
            await db.executeCommand(`DROP TRIGGER IF EXISTS trg_invoice_payment_update`);

            console.log('✅ Dropped old triggers');

            // Create comprehensive return trigger
            await db.executeCommand(`
        CREATE TRIGGER trg_return_items_balance_update
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

            console.log('✅ Created return insert trigger');

            // Create payment update trigger that considers returns
            await db.executeCommand(`
        CREATE TRIGGER trg_invoice_payment_balance_update
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

            console.log('✅ Created payment update trigger');

            // Create return deletion trigger
            await db.executeCommand(`
        CREATE TRIGGER trg_return_items_balance_update_delete
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

            console.log('✅ Created return deletion trigger');

        } catch (error) {
            console.error('❌ Error creating triggers:', error);
            throw error;
        }
    }

    // Step 6: Fix all existing data
    static async fixAllExistingData(): Promise<number> {
        console.log('\n🔧 FIXING ALL EXISTING DATA...');

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
      WHERE ABS(
        remaining_balance - 
        ROUND(
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
      ) > 0.01
    `);

        console.log(`✅ Fixed ${result.changes || 0} invoices`);

        // Update customer balances
        const customerResult = await db.executeCommand(`
      UPDATE customers 
      SET 
        balance = ROUND((
          SELECT COALESCE(SUM(remaining_balance), 0) 
          FROM invoices 
          WHERE customer_id = customers.id
        ), 2),
        status = CASE 
          WHEN (
            SELECT COALESCE(SUM(remaining_balance), 0) 
            FROM invoices 
            WHERE customer_id = customers.id
          ) <= 0.01 THEN 'Clear'
          ELSE 'Outstanding'
        END
    `);

        console.log(`✅ Updated ${customerResult.changes || 0} customers`);

        return (result.changes || 0) + (customerResult.changes || 0);
    }

    // Complete root cause analysis and fix
    static async performCompleteAnalysisAndFix(): Promise<void> {
        console.log('🚀 STARTING COMPLETE ROOT CAUSE ANALYSIS...');

        try {
            // Step 1: Find problematic invoices
            const problematicInvoices = await InvoiceBalanceRootCauseAnalyzer.findExactProblematicInvoices();
            console.log(`🔍 Found ${problematicInvoices.length} problematic invoices to analyze`);

            // Step 2: Analyze triggers
            await InvoiceBalanceRootCauseAnalyzer.analyzeDatabaseTriggers();

            // Step 3: Analyze return workflow
            await InvoiceBalanceRootCauseAnalyzer.analyzeReturnWorkflow();

            // Step 4: Analyze payment workflow
            await InvoiceBalanceRootCauseAnalyzer.analyzePaymentWorkflow();

            // Step 5: Create proper triggers
            await this.createProperTriggers();

            // Step 6: Fix existing data
            const fixedCount = await this.fixAllExistingData();

            console.log('\n🎉 ROOT CAUSE ANALYSIS AND FIX COMPLETE!');
            console.log(`✅ Fixed ${fixedCount} records`);
            console.log(`✅ Created proper triggers for future consistency`);
            console.log('💡 Your scenario (23000 → returned 10000 → payment 13000) should now show 0 outstanding');

            // Verify the fix
            const verificationResult = await this.findExactProblematicInvoices();
            if (verificationResult.length === 0) {
                console.log('🎯 VERIFICATION: All invoice balance issues resolved!');
            } else {
                console.log(`⚠️ VERIFICATION: ${verificationResult.length} issues still exist`);
            }

        } catch (error) {
            console.error('❌ ROOT CAUSE ANALYSIS FAILED:', error);
            throw error;
        }
    }
}

// Export the main function
export async function performRootCauseAnalysisAndFix(): Promise<void> {
    await InvoiceBalanceRootCauseAnalyzer.performCompleteAnalysisAndFix();
}
