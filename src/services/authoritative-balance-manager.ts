/**
 * 🛡️ AUTHORITATIVE BALANCE MANAGER
 * Single source of truth for all customer balance operations
 * Fixes all balance calculation inconsistencies
 */

export class AuthoritativeBalanceManager {
    private db: any;
    private eventBus: any;

    constructor(db: any, eventBus: any) {
        this.db = db;
        this.eventBus = eventBus;
    }

    /**
     * 🎯 SINGLE SOURCE OF TRUTH: Calculate customer balance from ledger entries
     * This is the ONLY method that should be used for balance calculations
     */
    async getCustomerBalance(customerId: number): Promise<number> {
        try {
            console.log(`💰 [AUTHORITATIVE] Calculating balance for customer ${customerId}`);

            const result = await this.db.executeRawQuery(`
        SELECT COALESCE(SUM(
          CASE 
            WHEN entry_type = 'debit' THEN amount
            WHEN entry_type = 'credit' THEN -amount
            ELSE 0
          END
        ), 0) as balance
        FROM customer_ledger_entries
        WHERE customer_id = ? 
          AND entry_type IN ('debit', 'credit')
          AND transaction_type NOT IN ('adjustment', 'reference', 'balance_sync')
      `, [customerId]);

            const balance = parseFloat(result[0]?.balance || 0);
            const roundedBalance = Math.round(balance * 100) / 100;

            console.log(`💰 [AUTHORITATIVE] Customer ${customerId} balance: Rs. ${roundedBalance.toFixed(2)}`);
            return roundedBalance;

        } catch (error) {
            console.error(`❌ [AUTHORITATIVE] Error calculating balance for customer ${customerId}:`, error);
            return 0;
        }
    }

    /**
     * 🔍 Get customer balance excluding specific invoice (for credit calculation)
     */
    async getCustomerBalanceExcludingInvoice(customerId: number, excludeInvoiceId: number): Promise<number> {
        try {
            console.log(`💰 [AUTHORITATIVE] Calculating balance for customer ${customerId} excluding invoice ${excludeInvoiceId}`);

            const result = await this.db.executeRawQuery(`
        SELECT COALESCE(SUM(
          CASE 
            WHEN entry_type = 'debit' THEN amount
            WHEN entry_type = 'credit' THEN -amount
            ELSE 0
          END
        ), 0) as balance
        FROM customer_ledger_entries
        WHERE customer_id = ? 
          AND entry_type IN ('debit', 'credit')
          AND transaction_type NOT IN ('adjustment', 'reference', 'balance_sync')
          AND reference_id != ?
      `, [customerId, excludeInvoiceId]);

            const balance = parseFloat(result[0]?.balance || 0);
            const roundedBalance = Math.round(balance * 100) / 100;

            console.log(`💰 [AUTHORITATIVE] Customer ${customerId} balance excluding invoice ${excludeInvoiceId}: Rs. ${roundedBalance.toFixed(2)}`);
            return roundedBalance;

        } catch (error) {
            console.error(`❌ [AUTHORITATIVE] Error calculating balance for customer ${customerId} excluding invoice ${excludeInvoiceId}:`, error);
            return 0;
        }
    }

    /**
     * 💳 Calculate available credit for customer
     */
    async getAvailableCredit(customerId: number, excludeInvoiceId?: number): Promise<number> {
        try {
            const balance = excludeInvoiceId
                ? await this.getCustomerBalanceExcludingInvoice(customerId, excludeInvoiceId)
                : await this.getCustomerBalance(customerId);

            // Credit is available when customer has negative balance (they paid more than they owe)
            const availableCredit = balance < 0 ? Math.abs(balance) : 0;

            console.log(`💳 [AUTHORITATIVE] Customer ${customerId} available credit: Rs. ${availableCredit.toFixed(2)}`);
            return availableCredit;

        } catch (error) {
            console.error(`❌ [AUTHORITATIVE] Error calculating available credit for customer ${customerId}:`, error);
            return 0;
        }
    }

    /**
     * 🔄 Sync customer balance in customers table with ledger calculation
     */
    async syncCustomerBalance(customerId: number): Promise<void> {
        try {
            console.log(`🔄 [AUTHORITATIVE] Syncing balance for customer ${customerId}`);

            const authoritativeBalance = await this.getCustomerBalance(customerId);

            await this.db.executeRawQuery(
                'UPDATE customers SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [authoritativeBalance, customerId]
            );

            // Emit real-time update event
            if (this.eventBus) {
                this.eventBus.emit('customer:balance_updated', {
                    customerId,
                    balance: authoritativeBalance
                });
            }

            console.log(`✅ [AUTHORITATIVE] Customer ${customerId} balance synced to Rs. ${authoritativeBalance.toFixed(2)}`);

        } catch (error) {
            console.error(`❌ [AUTHORITATIVE] Error syncing balance for customer ${customerId}:`, error);
            throw error;
        }
    }

    /**
     * 🧹 Clean up polluted ledger entries
     */
    async cleanupLedgerPollution(): Promise<{
        removedReferenceEntries: number;
        removedAdjustmentEntries: number;
        removedZeroAmountEntries: number;
    }> {
        try {
            console.log(`🧹 [AUTHORITATIVE] Starting ledger cleanup...`);

            // Remove reference entries with zero amount
            const referenceResult = await this.db.executeRawQuery(`
        DELETE FROM customer_ledger_entries 
        WHERE transaction_type = 'adjustment' 
          AND amount = 0 
          AND description LIKE '%REFERENCE ONLY%'
      `);

            // Remove other adjustment entries that pollute calculations
            const adjustmentResult = await this.db.executeRawQuery(`
        DELETE FROM customer_ledger_entries 
        WHERE transaction_type IN ('adjustment', 'reference', 'balance_sync')
          AND entry_type NOT IN ('debit', 'credit')
      `);

            // Remove entries with zero amounts that don't contribute to balance
            const zeroAmountResult = await this.db.executeRawQuery(`
        DELETE FROM customer_ledger_entries 
        WHERE amount = 0 
          AND transaction_type NOT IN ('invoice', 'payment')
      `);

            const removedReferenceEntries = referenceResult?.changes || 0;
            const removedAdjustmentEntries = adjustmentResult?.changes || 0;
            const removedZeroAmountEntries = zeroAmountResult?.changes || 0;

            console.log(`✅ [AUTHORITATIVE] Ledger cleanup complete:`);
            console.log(`   - Reference entries removed: ${removedReferenceEntries}`);
            console.log(`   - Adjustment entries removed: ${removedAdjustmentEntries}`);
            console.log(`   - Zero amount entries removed: ${removedZeroAmountEntries}`);

            return {
                removedReferenceEntries,
                removedAdjustmentEntries,
                removedZeroAmountEntries
            };

        } catch (error) {
            console.error(`❌ [AUTHORITATIVE] Error during ledger cleanup:`, error);
            throw error;
        }
    }

    /**
     * 🔧 Fix all customer balances - comprehensive repair
     */
    async fixAllCustomerBalances(): Promise<{
        customersProcessed: number;
        balancesFixed: number;
        totalDiscrepancy: number;
        cleanupResults: any;
    }> {
        try {
            console.log(`🔧 [AUTHORITATIVE] Starting comprehensive balance fix...`);

            // Step 1: Clean up ledger pollution
            const cleanupResults = await this.cleanupLedgerPollution();

            // Step 2: Get all customers with ledger entries
            const customersWithLedger = await this.db.executeRawQuery(`
        SELECT DISTINCT customer_id FROM customer_ledger_entries
      `);

            let customersProcessed = 0;
            let balancesFixed = 0;
            let totalDiscrepancy = 0;

            console.log(`🔄 [AUTHORITATIVE] Processing ${customersWithLedger.length} customers...`);

            for (const row of customersWithLedger) {
                try {
                    const customerId = row.customer_id;
                    customersProcessed++;

                    // Get current stored balance
                    const customerResult = await this.db.executeRawQuery(
                        'SELECT balance FROM customers WHERE id = ?',
                        [customerId]
                    );

                    const storedBalance = parseFloat(customerResult[0]?.balance || 0);
                    const authoritativeBalance = await this.getCustomerBalance(customerId);
                    const discrepancy = Math.abs(storedBalance - authoritativeBalance);

                    if (discrepancy > 0.01) {
                        console.log(`🔧 [AUTHORITATIVE] Fixing customer ${customerId}: Rs. ${storedBalance.toFixed(2)} → Rs. ${authoritativeBalance.toFixed(2)}`);

                        await this.syncCustomerBalance(customerId);
                        balancesFixed++;
                        totalDiscrepancy += discrepancy;
                    }

                } catch (error) {
                    console.error(`❌ [AUTHORITATIVE] Error processing customer ${row.customer_id}:`, error);
                }
            }

            console.log(`✅ [AUTHORITATIVE] Comprehensive balance fix complete:`);
            console.log(`   - Customers processed: ${customersProcessed}`);
            console.log(`   - Balances fixed: ${balancesFixed}`);
            console.log(`   - Total discrepancy resolved: Rs. ${totalDiscrepancy.toFixed(2)}`);

            return {
                customersProcessed,
                balancesFixed,
                totalDiscrepancy,
                cleanupResults
            };

        } catch (error) {
            console.error(`❌ [AUTHORITATIVE] Error during comprehensive balance fix:`, error);
            throw error;
        }
    }
}
