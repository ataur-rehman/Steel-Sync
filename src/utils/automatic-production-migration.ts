/**
 * 🚀 AUTOMATIC PRODUCTION MIGRATION SYSTEM
 * 
 * Performance-optimized automatic migration system that:
 * 1. Runs on app startup
 * 2. Detects and fixes all production issues automatically
 * 3. Uses batched operations for performance
 * 4. Includes rollback capabilities
 * 5.                WHERE id IN (${invoicesToFix.map((inv: any) => '?').join(',')})
            `, invoicesToFix.map((inv: any) => inv.id));alidates all fixes automatically
 * 
 * ISSUES ADDRESSED:
 * - Invoice remaining_balance calculation errors
 * - Customer balance precision issues (5 paisa errors)
 * - Customer status logic inconsistencies
 * - Payment allocation to wrong totals
 * - Database trigger inconsistencies
 */

export interface ProductionMigrationResult {
    success: boolean;
    totalTime: number;
    operations: {
        triggersUpdated: boolean;
        invoicesFixed: number;
        customersFixed: number;
        validationPassed: boolean;
    };
    validation: {
        invoiceBalanceErrors: number;
        customerBalanceErrors: number;
        statusErrors: number;
    };
    performance: {
        batchSize: number;
        totalBatches: number;
        avgBatchTime: number;
    };
    errors: string[];
}

export class AutomaticProductionMigrator {
    private dbConnection: any;
    private batchSize = 100; // Process in batches for performance
    private readonly MIGRATION_VERSION = '1.0.0';
    private readonly MIGRATION_KEY = 'production_migration_v1_completed';

    constructor(dbConnection: any) {
        this.dbConnection = dbConnection;
    }

    /**
     * Check if this migration has already been completed
     */
    async isMigrationCompleted(): Promise<boolean> {
        try {
            const result = await this.dbConnection.select(
                `SELECT value FROM app_settings WHERE key = ? LIMIT 1`,
                [this.MIGRATION_KEY]
            );

            return result && result.length > 0 && result[0].value === this.MIGRATION_VERSION;
        } catch (error) {
            return false; // If app_settings doesn't exist, migration hasn't run
        }
    }

    /**
     * Detect if migration is needed by checking for common issues
     */
    async isMigrationNeeded(): Promise<boolean> {
        try {
            console.log('🔍 Checking if production migration is needed...');

            // Check 1: Invoice balance calculation errors (simplified check)
            const invoiceErrors = await this.dbConnection.select(`
                SELECT COUNT(*) as count FROM invoices 
                WHERE remaining_balance != ROUND(remaining_balance, 2)
                   OR (payment_amount > 0 AND remaining_balance = grand_total)
            `);

            // Check 2: Customer balance precision errors
            const customerErrors = await this.dbConnection.select(`
                SELECT COUNT(*) as count FROM customers 
                WHERE balance > 0 AND balance < 0.1
                   OR balance != ROUND(balance, 2)
            `);

            // Check 3: Customer status inconsistencies
            const statusErrors = await this.dbConnection.select(`
                SELECT COUNT(*) as count FROM customers 
                WHERE (balance <= 0.01 AND status = 'Outstanding')
                   OR (balance > 0.01 AND status != 'Outstanding')
            `);

            const invoiceCount = invoiceErrors?.[0]?.count || 0;
            const customerCount = customerErrors?.[0]?.count || 0;
            const statusCount = statusErrors?.[0]?.count || 0;

            console.log(`📊 Migration check results:`);
            console.log(`   Invoice balance errors: ${invoiceCount}`);
            console.log(`   Customer balance errors: ${customerCount}`);
            console.log(`   Status logic errors: ${statusCount}`);

            return invoiceCount > 0 || customerCount > 0 || statusCount > 0;

        } catch (error) {
            console.error('❌ Error checking migration need:', error);
            return true; // If we can't check, assume migration is needed
        }
    }

    /**
     * Update database triggers (performance optimized)
     * Simplified version focusing on precision and basic payment tracking
     */
    private async updateDatabaseTriggers(): Promise<boolean> {
        try {
            console.log('🔧 Updating database triggers...');

            // Drop existing triggers
            await this.dbConnection.execute('DROP TRIGGER IF EXISTS trg_invoice_payment_insert');
            await this.dbConnection.execute('DROP TRIGGER IF EXISTS trg_invoice_payment_update');
            await this.dbConnection.execute('DROP TRIGGER IF EXISTS trg_invoice_payment_delete');

            // Create simplified triggers focusing on precision
            await this.dbConnection.execute(`
                CREATE TRIGGER trg_invoice_payment_insert 
                AFTER INSERT ON invoice_payments
                BEGIN
                    UPDATE invoices SET 
                        payment_amount = ROUND(COALESCE((
                            SELECT SUM(amount) FROM invoice_payments 
                            WHERE invoice_id = NEW.invoice_id
                        ), 0), 2),
                        remaining_balance = ROUND((grand_total - COALESCE((
                            SELECT SUM(amount) FROM invoice_payments 
                            WHERE invoice_id = NEW.invoice_id
                        ), 0)), 2),
                        status = CASE 
                            WHEN ROUND((grand_total - COALESCE((
                                SELECT SUM(amount) FROM invoice_payments 
                                WHERE invoice_id = NEW.invoice_id
                            ), 0)), 2) <= 0.01 THEN 'paid'
                            WHEN COALESCE((
                                SELECT SUM(amount) FROM invoice_payments 
                                WHERE invoice_id = NEW.invoice_id
                            ), 0) > 0 THEN 'partially_paid'
                            ELSE 'pending'
                        END,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = NEW.invoice_id;
                END;
            `);

            await this.dbConnection.execute(`
                CREATE TRIGGER trg_invoice_payment_update 
                AFTER UPDATE ON invoice_payments
                BEGIN
                    UPDATE invoices SET 
                        payment_amount = ROUND(COALESCE((
                            SELECT SUM(amount) FROM invoice_payments 
                            WHERE invoice_id = NEW.invoice_id
                        ), 0), 2),
                        remaining_balance = ROUND((grand_total - COALESCE((
                            SELECT SUM(amount) FROM invoice_payments 
                            WHERE invoice_id = NEW.invoice_id
                        ), 0)), 2),
                        status = CASE 
                            WHEN ROUND((grand_total - COALESCE((
                                SELECT SUM(amount) FROM invoice_payments 
                                WHERE invoice_id = NEW.invoice_id
                            ), 0)), 2) <= 0.01 THEN 'paid'
                            WHEN COALESCE((
                                SELECT SUM(amount) FROM invoice_payments 
                                WHERE invoice_id = NEW.invoice_id
                            ), 0) > 0 THEN 'partially_paid'
                            ELSE 'pending'
                        END,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = NEW.invoice_id;
                END;
            `);

            await this.dbConnection.execute(`
                CREATE TRIGGER trg_invoice_payment_delete 
                AFTER DELETE ON invoice_payments
                BEGIN
                    UPDATE invoices SET 
                        payment_amount = ROUND(COALESCE((
                            SELECT SUM(amount) FROM invoice_payments 
                            WHERE invoice_id = OLD.invoice_id
                        ), 0), 2),
                        remaining_balance = ROUND((grand_total - COALESCE((
                            SELECT SUM(amount) FROM invoice_payments 
                            WHERE invoice_id = OLD.invoice_id
                        ), 0)), 2),
                        status = CASE 
                            WHEN ROUND((grand_total - COALESCE((
                                SELECT SUM(amount) FROM invoice_payments 
                                WHERE invoice_id = OLD.invoice_id
                            ), 0)), 2) <= 0.01 THEN 'paid'
                            WHEN COALESCE((
                                SELECT SUM(amount) FROM invoice_payments 
                                WHERE invoice_id = OLD.invoice_id
                            ), 0) > 0 THEN 'partially_paid'
                            ELSE 'pending'
                        END,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = OLD.invoice_id;
                END;
            `);

            console.log('✅ Database triggers updated successfully');
            return true;

        } catch (error) {
            console.error('❌ Error updating triggers:', error);
            return false;
        }
    }

    /**
     * Fix invoice balances in batches for performance
     * Simplified version focusing on precision and basic calculations
     */
    private async fixInvoiceBalances(): Promise<number> {
        try {
            console.log('🔧 Fixing invoice balance calculations...');

            // Fix precision issues and basic balance calculations
            const updateResult = await this.dbConnection.execute(`
                UPDATE invoices SET 
                    payment_amount = ROUND(COALESCE(payment_amount, 0), 2),
                    remaining_balance = ROUND((grand_total - COALESCE(payment_amount, 0)), 2),
                    status = CASE 
                        WHEN ROUND((grand_total - COALESCE(payment_amount, 0)), 2) <= 0.01 THEN 'paid'
                        WHEN COALESCE(payment_amount, 0) > 0 THEN 'partially_paid'
                        ELSE 'pending'
                    END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE remaining_balance != ROUND(remaining_balance, 2)
                   OR payment_amount != ROUND(payment_amount, 2)
                   OR (payment_amount > 0 AND remaining_balance = grand_total)
            `);

            const fixedCount = updateResult.rowsAffected || 0;
            console.log(`✅ Fixed ${fixedCount} invoice balances`);
            return fixedCount;

        } catch (error) {
            console.error('❌ Error fixing invoice balances:', error);
            return 0;
        }
    }

    /**
     * Fix customer balances in batches for performance
     * Simplified version focusing on precision and status logic
     */
    private async fixCustomerBalances(): Promise<number> {
        try {
            console.log('🔧 Fixing customer balance calculations...');

            // Get customers that need balance recalculation
            const customersToFix = await this.dbConnection.select(`
                SELECT id FROM customers 
                WHERE balance > 0 AND balance < 0.1
                   OR balance != ROUND(balance, 2)
                   OR (balance <= 0.01 AND status = 'Outstanding')
                   OR (balance > 0.01 AND status != 'Outstanding')
            `);

            console.log(`📊 Found ${customersToFix.length} customers to fix`);

            let fixedCount = 0;

            // Process customers in batches for performance
            for (let i = 0; i < customersToFix.length; i += this.batchSize) {
                const batch = customersToFix.slice(i, i + this.batchSize);

                for (const customer of batch) {
                    try {
                        // Recalculate customer balance
                        const totalBalance = await this.dbConnection.select(`
                            SELECT ROUND(COALESCE(SUM(remaining_balance), 0), 2) as total 
                            FROM invoices 
                            WHERE customer_id = ?
                        `, [customer.id]);

                        const newBalance = totalBalance?.[0]?.total || 0;

                        // Update customer balance and status
                        await this.dbConnection.execute(`
                            UPDATE customers SET 
                                balance = ?,
                                status = CASE 
                                    WHEN ? <= 0.01 THEN 'Clear'
                                    ELSE 'Outstanding'
                                END,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = ?
                        `, [newBalance, newBalance, customer.id]);

                        fixedCount++;

                    } catch (customerError) {
                        console.error(`❌ Error fixing customer ${customer.id}:`, customerError);
                    }
                }

                // Log progress for large datasets
                if (customersToFix.length > 50) {
                    console.log(`   Processed ${Math.min(i + this.batchSize, customersToFix.length)}/${customersToFix.length} customers`);
                }
            }

            console.log(`✅ Fixed ${fixedCount} customer balances`);
            return fixedCount;

        } catch (error) {
            console.error('❌ Error fixing customer balances:', error);
            return 0;
        }
    }    /**
     * Validate all fixes were applied correctly
     */
    private async validateMigration(): Promise<{ passed: boolean; errors: any }> {
        try {
            console.log('🔍 Validating migration results...');

            // Check invoice balance accuracy
            const invoiceErrors = await this.dbConnection.select(`
                SELECT 
                    id, grand_total, payment_amount, remaining_balance,
                    ROUND((grand_total - COALESCE((
                        SELECT SUM(ri.return_quantity * ri.unit_price) 
                        FROM return_items ri 
                        JOIN invoice_items ii ON ri.original_invoice_item_id = ii.id
                        WHERE ii.invoice_id = invoices.id
                    ), 0)) - COALESCE(payment_amount, 0), 2) as calculated_remaining
                FROM invoices 
                WHERE ABS(remaining_balance - (
                    ROUND((grand_total - COALESCE((
                        SELECT SUM(ri.return_quantity * ri.unit_price) 
                        FROM return_items ri 
                        JOIN invoice_items ii ON ri.original_invoice_item_id = ii.id
                        WHERE ii.invoice_id = invoices.id
                    ), 0)) - COALESCE(payment_amount, 0), 2)
                )) > 0.01
                LIMIT 10
            `);

            // Check customer balance consistency
            const customerErrors = await this.dbConnection.select(`
                SELECT 
                    c.id, c.balance, c.status,
                    ROUND(COALESCE(SUM(i.remaining_balance), 0), 2) as calculated_balance
                FROM customers c
                LEFT JOIN invoices i ON c.id = i.customer_id
                GROUP BY c.id, c.balance, c.status
                HAVING ABS(c.balance - calculated_balance) > 0.01
                   OR (c.balance <= 0.01 AND c.status = 'Outstanding')
                   OR (c.balance > 0.01 AND c.status != 'Outstanding')
                LIMIT 10
            `);

            const validationResult = {
                invoiceBalanceErrors: invoiceErrors.length,
                customerBalanceErrors: customerErrors.length,
                statusErrors: customerErrors.filter((c: any) =>
                    (c.balance <= 0.01 && c.status === 'Outstanding') ||
                    (c.balance > 0.01 && c.status !== 'Outstanding')
                ).length
            };

            const passed = validationResult.invoiceBalanceErrors === 0 &&
                validationResult.customerBalanceErrors === 0;

            if (passed) {
                console.log('✅ Migration validation passed');
            } else {
                console.log('⚠️ Migration validation found issues:', validationResult);
                if (invoiceErrors.length > 0) {
                    console.log('Invoice balance errors:', invoiceErrors);
                }
                if (customerErrors.length > 0) {
                    console.log('Customer balance errors:', customerErrors);
                }
            }

            return { passed, errors: validationResult };

        } catch (error) {
            console.error('❌ Error during validation:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
            return { passed: false, errors: { validationError: errorMessage } };
        }
    }

    /**
     * Run the complete automatic migration
     */
    async runAutomaticMigration(): Promise<ProductionMigrationResult> {
        const startTime = Date.now();
        const result: ProductionMigrationResult = {
            success: false,
            totalTime: 0,
            operations: {
                triggersUpdated: false,
                invoicesFixed: 0,
                customersFixed: 0,
                validationPassed: false
            },
            validation: {
                invoiceBalanceErrors: 0,
                customerBalanceErrors: 0,
                statusErrors: 0
            },
            performance: {
                batchSize: this.batchSize,
                totalBatches: 0,
                avgBatchTime: 0
            },
            errors: []
        };

        try {
            console.log('🚀 === STARTING AUTOMATIC PRODUCTION MIGRATION ===');

            // Check if migration is needed
            const migrationNeeded = await this.isMigrationNeeded();
            if (!migrationNeeded) {
                console.log('✅ No migration needed - all issues already resolved');
                result.success = true;
                result.operations.validationPassed = true;
                return result;
            }

            // Check if already completed
            const alreadyCompleted = await this.isMigrationCompleted();
            if (alreadyCompleted) {
                console.log('✅ Migration already completed');
                result.success = true;
                result.operations.validationPassed = true;
                return result;
            }

            // Start transaction for data integrity
            await this.dbConnection.execute('BEGIN TRANSACTION');

            try {
                // Step 1: Update database triggers
                result.operations.triggersUpdated = await this.updateDatabaseTriggers();
                if (!result.operations.triggersUpdated) {
                    throw new Error('Failed to update database triggers');
                }

                // Step 2: Fix invoice balances
                result.operations.invoicesFixed = await this.fixInvoiceBalances();

                // Step 3: Fix customer balances
                result.operations.customersFixed = await this.fixCustomerBalances();

                // Step 4: Validate migration
                const validation = await this.validateMigration();
                result.operations.validationPassed = validation.passed;
                result.validation = validation.errors;

                if (!result.operations.validationPassed) {
                    throw new Error('Migration validation failed');
                }

                // Step 5: Mark migration as completed
                await this.dbConnection.execute(`
                    CREATE TABLE IF NOT EXISTS app_settings (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        key TEXT UNIQUE NOT NULL,
                        value TEXT NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `);

                await this.dbConnection.execute(`
                    INSERT OR REPLACE INTO app_settings (key, value) 
                    VALUES (?, ?)
                `, [this.MIGRATION_KEY, this.MIGRATION_VERSION]);

                // Commit transaction
                await this.dbConnection.execute('COMMIT');

                result.success = true;
                console.log('🎉 Automatic migration completed successfully!');

            } catch (migrationError) {
                // Rollback transaction
                await this.dbConnection.execute('ROLLBACK');
                throw migrationError;
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            result.errors.push(errorMessage);
            console.error('❌ Automatic migration failed:', error);
        }

        result.totalTime = Date.now() - startTime;

        console.log('📊 Migration Results:');
        console.log(`   ⏱️ Total time: ${result.totalTime}ms`);
        console.log(`   🔧 Triggers updated: ${result.operations.triggersUpdated}`);
        console.log(`   📄 Invoices fixed: ${result.operations.invoicesFixed}`);
        console.log(`   👥 Customers fixed: ${result.operations.customersFixed}`);
        console.log(`   ✅ Validation passed: ${result.operations.validationPassed}`);

        return result;
    }
}

/**
 * Quick utility function to run automatic migration
 */
export async function runAutomaticProductionMigration(dbConnection: any): Promise<ProductionMigrationResult> {
    const migrator = new AutomaticProductionMigrator(dbConnection);
    return await migrator.runAutomaticMigration();
}
