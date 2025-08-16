/**
 * CRITICAL ISSUE DIAGNOSIS: Missing Daily Ledger Entries
 * 
 * This file provides enhanced diagnostic functions to track down why
 * daily ledger entries are sometimes missing for cash refunds.
 * 
 * SYMPTOMS:
 * - User reports: "i am not seeing daily ledger outgoing entry after cash refund"
 * - "sometimes entries are not showed in daily ledger which is very dangerous and critical"
 * 
 * INVESTIGATION APPROACH:
 * 1. Add extensive logging to the return creation and ledger entry process
 * 2. Track transaction state before/after ledger entry creation
 * 3. Add verification steps to ensure entries are persisted
 * 4. Create a monitoring system to detect missing entries
 */

export class LedgerDiagnosticService {

    /**
     * Enhanced logging for return creation process
     * CRITICAL: Call this before processReturnSettlement
     */
    static logReturnCreationStart(returnData: any, settlementEligibility: any) {
        console.log('\n🔍 [LEDGER DIAGNOSTIC] Return Creation Started');
        console.log('━'.repeat(60));
        console.log(`📋 Return Number: ${returnData.return_number || 'Not set'}`);
        console.log(`💰 Settlement Type: ${returnData.settlement_type}`);
        console.log(`💵 Settlement Amount: Rs. ${settlementEligibility.credit_amount?.toFixed(2) || '0.00'}`);
        console.log(`👤 Customer: ${returnData.customer_name} (ID: ${returnData.customer_id})`);
        console.log(`⏰ Timestamp: ${new Date().toISOString()}`);

        if (returnData.settlement_type === 'cash') {
            console.log('🚨 [CRITICAL] Cash refund detected - will monitor ledger entry creation');
        }
    }

    /**
     * Track ledger entry creation attempt
     * CRITICAL: Call this in createLedgerEntry before INSERT
     */
    static logLedgerEntryAttempt(entry: any) {
        console.log('\n💾 [LEDGER DIAGNOSTIC] Attempting to create ledger entry');
        console.log('━'.repeat(50));
        console.log(`📅 Date: ${entry.date}`);
        console.log(`⏰ Time: ${entry.time}`);
        console.log(`📊 Type: ${entry.type} (${entry.category})`);
        console.log(`💰 Amount: Rs. ${entry.amount?.toFixed(2)}`);
        console.log(`🔗 Reference: ${entry.reference_type} #${entry.reference_id}`);
        console.log(`📄 Bill Number: ${entry.bill_number}`);
        console.log(`📝 Description: ${entry.description}`);
        console.log(`👤 Customer: ${entry.customer_name} (ID: ${entry.customer_id})`);
    }

    /**
     * Track ledger entry success
     * CRITICAL: Call this in createLedgerEntry after successful INSERT
     */
    static logLedgerEntrySuccess(entryData: any, insertResult: any) {
        console.log('\n✅ [LEDGER DIAGNOSTIC] Ledger entry created successfully');
        console.log(`🆔 Insert ID: ${insertResult?.lastInsertId || 'Unknown'}`);
        console.log(`📊 Changes: ${insertResult?.changes || 'Unknown'}`);
        console.log(`⏰ Success Timestamp: ${new Date().toISOString()}`);
    }

    /**
     * Track ledger entry failure
     * CRITICAL: Call this in createLedgerEntry catch block
     */
    static logLedgerEntryFailure(entryData: any, error: any) {
        console.log('\n❌ [LEDGER DIAGNOSTIC] Ledger entry creation FAILED');
        console.log('🚨 THIS IS A CRITICAL ISSUE!');
        console.log(`❌ Error: ${error.message}`);
        console.log(`❌ Error Code: ${error.code || 'Unknown'}`);
        console.log(`❌ SQL State: ${error.errno || 'Unknown'}`);
        console.log(`⏰ Failure Timestamp: ${new Date().toISOString()}`);

        // Log the entry data that failed
        console.log('\n📋 Failed Entry Data:');
        console.log(JSON.stringify(entryData, null, 2));
    }

    /**
     * Verify ledger entry exists after creation
     * CRITICAL: Call this after processReturnSettlement
     */
    static async verifyLedgerEntryExists(
        dbConnection: any,
        returnId: number,
        expectedAmount: number,
        returnNumber: string
    ): Promise<boolean> {
        try {
            console.log('\n🔍 [LEDGER DIAGNOSTIC] Verifying ledger entry exists...');

            const ledgerEntries = await dbConnection.select(`
        SELECT 
          id, date, time, type, category, description, amount, 
          reference_id, reference_type, bill_number, created_at
        FROM ledger_entries 
        WHERE reference_id = ? 
          AND reference_type IN ('return', 'other')
          AND type = 'outgoing'
          AND amount = ?
        ORDER BY created_at DESC
      `, [returnId, expectedAmount]);

            if (ledgerEntries && ledgerEntries.length > 0) {
                console.log('✅ [LEDGER DIAGNOSTIC] Ledger entry found!');
                console.log(`📊 Found ${ledgerEntries.length} matching entry(ies)`);

                ledgerEntries.forEach((entry, index) => {
                    console.log(`\n📋 Entry ${index + 1}:`);
                    console.log(`   🆔 ID: ${entry.id}`);
                    console.log(`   📅 Date: ${entry.date} ${entry.time}`);
                    console.log(`   💰 Amount: Rs. ${entry.amount}`);
                    console.log(`   📝 Description: ${entry.description}`);
                    console.log(`   🔗 Reference: ${entry.reference_type} #${entry.reference_id}`);
                    console.log(`   ⏰ Created: ${entry.created_at}`);
                });

                return true;
            } else {
                console.log('🚨 [CRITICAL] NO LEDGER ENTRY FOUND!');
                console.log(`❌ Expected: Return ${returnNumber} (ID: ${returnId}) with amount Rs. ${expectedAmount}`);
                console.log('🔍 Checking if ANY entries exist for this return...');

                // Check for any entries with this return ID
                const anyEntries = await dbConnection.select(`
          SELECT id, type, category, amount, reference_type, created_at
          FROM ledger_entries 
          WHERE reference_id = ?
        `, [returnId]);

                if (anyEntries && anyEntries.length > 0) {
                    console.log(`⚠️  Found ${anyEntries.length} OTHER entry(ies) for this return:`);
                    anyEntries.forEach((entry, index) => {
                        console.log(`   ${index + 1}. ${entry.type} ${entry.category} Rs.${entry.amount} (${entry.reference_type})`);
                    });
                } else {
                    console.log('💥 CRITICAL: NO entries found for this return ID at all!');
                    console.log('🚨 This indicates the createLedgerEntry call completely failed silently!');
                }

                return false;
            }
        } catch (error) {
            console.log('❌ [LEDGER DIAGNOSTIC] Error during verification:', error);
            return false;
        }
    }

    /**
     * Track transaction state
     * CRITICAL: Call this before and after key operations
     */
    static async logTransactionState(dbConnection: any, context: string) {
        try {
            console.log(`\n🔄 [TRANSACTION DIAGNOSTIC] ${context}`);

            // Check if we're in a transaction
            const inTransaction = await dbConnection.select('PRAGMA journal_mode');
            console.log(`📊 Journal Mode: ${JSON.stringify(inTransaction)}`);

            // Check for any locks
            const lockInfo = await dbConnection.select('PRAGMA locking_mode');
            console.log(`🔒 Locking Mode: ${JSON.stringify(lockInfo)}`);

        } catch (error) {
            console.log(`❌ [TRANSACTION DIAGNOSTIC] Error checking transaction state: ${error.message}`);
        }
    }

    /**
     * Create diagnostic summary
     * CRITICAL: Call this at the end of return creation
     */
    static createDiagnosticSummary(
        returnNumber: string,
        settlementType: string,
        amount: number,
        ledgerEntryCreated: boolean,
        verificationPassed: boolean
    ) {
        console.log('\n📊 [FINAL DIAGNOSTIC SUMMARY]');
        console.log('━'.repeat(60));
        console.log(`📋 Return: ${returnNumber}`);
        console.log(`💰 Settlement: ${settlementType} Rs. ${amount.toFixed(2)}`);
        console.log(`💾 Ledger Entry Created: ${ledgerEntryCreated ? '✅ YES' : '❌ NO'}`);
        console.log(`🔍 Verification Passed: ${verificationPassed ? '✅ YES' : '❌ NO'}`);

        if (settlementType === 'cash' && (!ledgerEntryCreated || !verificationPassed)) {
            console.log('\n🚨 CRITICAL CASH REFUND ISSUE DETECTED!');
            console.log('📋 Immediate Actions Required:');
            console.log('   1. Check transaction rollback logs');
            console.log('   2. Verify database connection stability');
            console.log('   3. Check for constraint violations');
            console.log('   4. Investigate createLedgerEntry function');
            console.log('   5. Add manual ledger entry if needed');
        }

        console.log(`⏰ Diagnostic Completed: ${new Date().toISOString()}`);
        console.log('━'.repeat(60));
    }

    /**
     * Recovery function to create missing ledger entries
     * CRITICAL: Use this to manually fix missing entries
     */
    static async createMissingLedgerEntry(
        dbConnection: any,
        returnData: {
            return_id: number;
            return_number: string;
            amount: number;
            customer_id: number;
            customer_name: string;
            date: string;
            time: string;
            created_by: string;
        }
    ): Promise<boolean> {
        try {
            console.log('\n🔧 [RECOVERY] Creating missing cash refund ledger entry');

            const result = await dbConnection.execute(`
        INSERT INTO ledger_entries 
        (date, time, type, category, description, amount, running_balance, 
         customer_id, customer_name, reference_id, reference_type, bill_number, 
         notes, created_by, payment_method, is_manual, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
                returnData.date,
                returnData.time,
                'outgoing',
                'Cash Refund',
                `RECOVERED: Cash refund for return ${returnData.return_number}`,
                returnData.amount,
                0, // running_balance calculated separately
                returnData.customer_id,
                returnData.customer_name,
                returnData.return_id,
                'other', // Mapped from 'return' to 'other' for schema compliance
                returnData.return_number,
                `RECOVERED ENTRY: Original cash refund ledger entry was missing`,
                returnData.created_by,
                'cash',
                1, // Mark as manual since it's a recovery
            ]);

            console.log('✅ [RECOVERY] Missing ledger entry created successfully');
            console.log(`🆔 New Entry ID: ${result?.lastInsertId}`);

            return true;
        } catch (error) {
            console.log('❌ [RECOVERY] Failed to create missing ledger entry:', error);
            return false;
        }
    }
}

/**
 * ENHANCED DATABASE SERVICE INTEGRATION
 * 
 * Instructions for integrating these diagnostics:
 * 
 * 1. In createReturn function, add at the start:
 *    LedgerDiagnosticService.logReturnCreationStart(returnData, settlementEligibility);
 * 
 * 2. In processReturnSettlement function, add before createLedgerEntry call:
 *    await LedgerDiagnosticService.logTransactionState(this.dbConnection, 'Before Ledger Entry Creation');
 * 
 * 3. In createLedgerEntry function, add at the start:
 *    LedgerDiagnosticService.logLedgerEntryAttempt(entry);
 * 
 * 4. In createLedgerEntry function, add after successful INSERT:
 *    LedgerDiagnosticService.logLedgerEntrySuccess(entry, result);
 * 
 * 5. In createLedgerEntry function, add in catch block:
 *    LedgerDiagnosticService.logLedgerEntryFailure(entry, error);
 * 
 * 6. In createReturn function, add after processReturnSettlement:
 *    const verificationPassed = await LedgerDiagnosticService.verifyLedgerEntryExists(
 *      this.dbConnection, returnId, settlementEligibility.credit_amount, returnNumber
 *    );
 * 
 * 7. In createReturn function, add before final return:
 *    LedgerDiagnosticService.createDiagnosticSummary(
 *      returnNumber, returnData.settlement_type, settlementEligibility.credit_amount,
 *      true, verificationPassed
 *    );
 */

export default LedgerDiagnosticService;
