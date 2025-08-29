// CRITICAL: Data Integrity Service
// This service identifies and fixes balance calculation issues

class DataIntegrityService {
    private db: any;

    constructor(databaseService: any) {
        this.db = databaseService;
    }

    async checkInvoiceIntegrity(invoiceId?: number): Promise<{
        issues: Array<{
            type: string;
            severity: 'CRITICAL' | 'WARNING' | 'INFO';
            description: string;
            invoiceId: number;
            currentValue: any;
            expectedValue: any;
        }>;
        autoFixed: boolean;
    }> {
        console.log('🔍 [INTEGRITY-CHECK] Starting data integrity check...');

        const issues = [];
        let autoFixed = false;

        try {
            // Check specific invoice or all invoices
            const whereClause = invoiceId ? `WHERE id = ${invoiceId}` : '';

            const invoices = await this.db.dbConnection.select(`
        SELECT 
          id,
          bill_number,
          grand_total,
          remaining_balance,
          payment_amount,
          (remaining_balance - grand_total) as balance_difference,
          CASE 
            WHEN payment_amount = 0 AND ABS(remaining_balance - grand_total) > 0.02 THEN 'UNPAID_BALANCE_MISMATCH'
            WHEN remaining_balance < 0 AND payment_amount < grand_total THEN 'NEGATIVE_BALANCE_UNDERPAID'
            WHEN remaining_balance > grand_total THEN 'BALANCE_EXCEEDS_TOTAL'
            ELSE 'OK'
          END as issue_type
        FROM invoices 
        ${whereClause}
        ORDER BY id DESC
      `);

            for (const invoice of invoices) {
                if (invoice.issue_type !== 'OK') {
                    const severity = this.determineIssueSeverity(invoice.issue_type);

                    issues.push({
                        type: invoice.issue_type,
                        severity,
                        description: this.getIssueDescription(invoice.issue_type),
                        invoiceId: invoice.id,
                        currentValue: {
                            grand_total: invoice.grand_total,
                            remaining_balance: invoice.remaining_balance,
                            payment_amount: invoice.payment_amount,
                            difference: invoice.balance_difference
                        },
                        expectedValue: this.calculateExpectedValues(invoice)
                    });

                    // Auto-fix critical issues
                    if (severity === 'CRITICAL' && Math.abs(invoice.balance_difference) < 1.0) {
                        await this.autoFixBalanceIssue(invoice);
                        autoFixed = true;
                    }
                }
            }

            console.log(`🔍 [INTEGRITY-CHECK] Found ${issues.length} issues, auto-fixed: ${autoFixed}`);
            return { issues, autoFixed };

        } catch (error) {
            console.error('Error during integrity check:', error);
            throw error;
        }
    }

    private determineIssueSeverity(issueType: string): 'CRITICAL' | 'WARNING' | 'INFO' {
        switch (issueType) {
            case 'BALANCE_EXCEEDS_TOTAL':
            case 'NEGATIVE_BALANCE_UNDERPAID':
                return 'CRITICAL';
            case 'UNPAID_BALANCE_MISMATCH':
                return 'WARNING';
            default:
                return 'INFO';
        }
    }

    private getIssueDescription(issueType: string): string {
        switch (issueType) {
            case 'BALANCE_EXCEEDS_TOTAL':
                return 'Remaining balance is higher than grand total - this should never happen';
            case 'NEGATIVE_BALANCE_UNDERPAID':
                return 'Invoice has negative balance but is not fully paid';
            case 'UNPAID_BALANCE_MISMATCH':
                return 'Unpaid invoice balance does not match grand total';
            default:
                return 'Unknown issue type';
        }
    }

    private calculateExpectedValues(invoice: any) {
        // For unpaid invoices, remaining balance should equal grand total
        if (invoice.payment_amount === 0) {
            return {
                remaining_balance: invoice.grand_total,
                reason: 'Unpaid invoice should have remaining_balance = grand_total'
            };
        }

        // For paid invoices, calculate based on payments and returns
        const expectedRemaining = Math.max(0, invoice.grand_total - invoice.payment_amount);
        return {
            remaining_balance: expectedRemaining,
            reason: 'Remaining balance should be grand_total - payment_amount (considering returns)'
        };
    }

    private async autoFixBalanceIssue(invoice: any): Promise<void> {
        console.log(`🔧 [AUTO-FIX] Fixing balance issue for invoice ${invoice.id}`);

        try {
            // Recalculate the correct remaining balance
            const correctBalance = await this.db.dbConnection.select(`
        SELECT ROUND(
          ${invoice.grand_total} - 
          COALESCE((
            SELECT SUM(ri.return_quantity * ri.unit_price)
            FROM return_items ri 
            JOIN invoice_items ii ON ri.original_invoice_item_id = ii.id
            WHERE ii.invoice_id = ${invoice.id}
          ), 0) - 
          COALESCE(${invoice.payment_amount}, 0),
          2
        ) as correct_balance
      `);

            const newBalance = correctBalance[0]?.correct_balance || invoice.grand_total;

            // Update the invoice with the correct balance
            await this.db.dbConnection.execute(
                'UPDATE invoices SET remaining_balance = ? WHERE id = ?',
                [newBalance, invoice.id]
            );

            console.log(`✅ [AUTO-FIX] Fixed invoice ${invoice.id}: ${invoice.remaining_balance} → ${newBalance}`);

        } catch (error) {
            console.error(`❌ [AUTO-FIX] Failed to fix invoice ${invoice.id}:`, error);
            throw error;
        }
    }

    async runComprehensiveCheck(): Promise<void> {
        console.log('🔍 [COMPREHENSIVE-CHECK] Running full database integrity check...');

        const result = await this.checkInvoiceIntegrity();

        if (result.issues.length > 0) {
            console.warn(`⚠️ Found ${result.issues.length} data integrity issues:`);
            result.issues.forEach(issue => {
                console.warn(`  - ${issue.severity}: ${issue.description} (Invoice ${issue.invoiceId})`);
            });
        } else {
            console.log('✅ [COMPREHENSIVE-CHECK] No integrity issues found');
        }
    }
}

export default DataIntegrityService;
