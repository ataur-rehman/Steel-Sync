/**
 * SAFE INVOICE NUMBER MIGRATION UTILITY
 * 
 * Automatically migrates from old invoice numbering system (I00001) 
 * to new system (01, 02, 088, etc.) at startup with full safety checks
 * 
 * SAFETY FEATURES:
 * - Creates backup before migration
 * - Transaction-based migration (all or nothing)
 * - Rollback on any error
 * - Duplicate detection and prevention
 * - Data integrity verification
 */

export interface MigrationResult {
  success: boolean;
  totalInvoices: number;
  migratedCount: number;
  skippedCount: number;
  backupCreated: boolean;
  errors: string[];
  migrationTime: number;
  verificationPassed: boolean;
}

export class SafeInvoiceNumberMigrator {
  private dbConnection: any;
  private backupTableName = 'invoices_backup_before_migration';

  constructor(dbConnection: any) {
    this.dbConnection = dbConnection;
  }

  /**
   * Check if migration is needed
   */
  async isMigrationNeeded(): Promise<boolean> {
    try {
      // Check if there are any old format invoices (starting with I)
      const oldFormatCount = await this.dbConnection.select(
        `SELECT COUNT(*) as count FROM invoices WHERE bill_number LIKE 'I%'`
      );

      const count = oldFormatCount?.[0]?.count || 0;
      console.log(`📊 Found ${count} invoices with old format (I00001)`);

      return count > 0;
    } catch (error) {
      console.error('❌ Error checking migration need:', error);
      return false;
    }
  }

  /**
   * Check if migration was already completed
   */
  async isMigrationCompleted(): Promise<boolean> {
    try {
      // Check for migration completion flag
      const result = await this.dbConnection.select(
        `SELECT value FROM app_settings WHERE key = 'invoice_migration_completed' LIMIT 1`
      );

      return result && result.length > 0 && result[0].value === 'true';
    } catch (error) {
      // If app_settings table doesn't exist, migration hasn't been completed
      return false;
    }
  }

  /**
   * Create backup of invoices table before migration
   */
  private async createBackup(): Promise<boolean> {
    try {
      console.log('💾 Creating backup of invoices table...');

      // Drop backup table if it exists
      await this.dbConnection.execute(`DROP TABLE IF EXISTS ${this.backupTableName}`);

      // Create backup table with exact same structure
      await this.dbConnection.execute(`
        CREATE TABLE ${this.backupTableName} AS 
        SELECT * FROM invoices WHERE bill_number LIKE 'I%'
      `);

      const backupCount = await this.dbConnection.select(
        `SELECT COUNT(*) as count FROM ${this.backupTableName}`
      );

      const count = backupCount?.[0]?.count || 0;
      console.log(`✅ Backup created with ${count} old format invoices`);
      return true;

    } catch (error) {
      console.error('❌ Error creating backup:', error);
      return false;
    }
  }

  /**
   * Verify data integrity after migration
   */
  private async verifyMigration(): Promise<boolean> {
    try {
      console.log('🔍 Verifying migration integrity...');

      // Check that no old format invoices remain
      const oldFormatRemaining = await this.dbConnection.select(
        `SELECT COUNT(*) as count FROM invoices WHERE bill_number LIKE 'I%'`
      );

      const remainingCount = oldFormatRemaining?.[0]?.count || 0;
      if (remainingCount > 0) {
        console.error(`❌ Migration incomplete: ${remainingCount} old format invoices still exist`);
        return false;
      }

      // Check that backup table exists and has data
      const backupCount = await this.dbConnection.select(
        `SELECT COUNT(*) as count FROM ${this.backupTableName}`
      );

      const backupExists = backupCount?.[0]?.count > 0;
      if (!backupExists) {
        console.error('❌ Backup table is empty or missing');
        return false;
      }

      // Check for any duplicate new format numbers
      const duplicates = await this.dbConnection.select(`
        SELECT bill_number, COUNT(*) as count 
        FROM invoices 
        WHERE bill_number REGEXP '^[0-9]+$'
        GROUP BY bill_number 
        HAVING count > 1
      `);

      if (duplicates && duplicates.length > 0) {
        console.error(`❌ Found ${duplicates.length} duplicate invoice numbers after migration`);
        return false;
      }

      console.log('✅ Migration verification passed');
      return true;

    } catch (error) {
      console.error('❌ Error verifying migration:', error);
      return false;
    }
  }

  /**
   * Rollback migration in case of error
   */
  private async rollbackMigration(): Promise<boolean> {
    try {
      console.log('🔄 Rolling back migration...');

      // Restore old format invoices from backup
      const backupData = await this.dbConnection.select(`SELECT * FROM ${this.backupTableName}`);

      if (!backupData || backupData.length === 0) {
        console.error('❌ No backup data found for rollback');
        return false;
      }

      // Delete any new format invoices created during failed migration
      await this.dbConnection.execute(`
        DELETE FROM invoices 
        WHERE bill_number REGEXP '^[0-9]+$' 
        AND id IN (
          SELECT id FROM ${this.backupTableName}
        )
      `);

      // Restore from backup
      for (const invoice of backupData) {
        const columns = Object.keys(invoice).join(', ');
        const placeholders = Object.keys(invoice).map(() => '?').join(', ');
        const values = Object.values(invoice);

        await this.dbConnection.execute(
          `INSERT OR REPLACE INTO invoices (${columns}) VALUES (${placeholders})`,
          values
        );
      }

      console.log('✅ Migration rolled back successfully');
      return true;

    } catch (error) {
      console.error('❌ Error during rollback:', error);
      return false;
    }
  }

  /**
   * Perform the actual migration with full safety
   */
  async performSafeMigration(): Promise<MigrationResult> {
    const startTime = Date.now();

    const result: MigrationResult = {
      success: false,
      totalInvoices: 0,
      migratedCount: 0,
      skippedCount: 0,
      backupCreated: false,
      errors: [],
      migrationTime: 0,
      verificationPassed: false
    };

    try {
      console.log('� Starting SAFE invoice number migration...');

      // Step 1: Check if migration is needed
      if (!(await this.isMigrationNeeded())) {
        console.log('✅ No migration needed - no old format invoices found');
        result.success = true;
        result.migrationTime = Date.now() - startTime;
        return result;
      }

      // Step 2: Check if already completed
      if (await this.isMigrationCompleted()) {
        console.log('✅ Migration already completed previously');
        result.success = true;
        result.migrationTime = Date.now() - startTime;
        return result;
      }

      // Step 3: Create backup
      result.backupCreated = await this.createBackup();
      if (!result.backupCreated) {
        result.errors.push('Failed to create backup');
        return result;
      }

      // Step 4: Begin transaction for safe migration
      await this.dbConnection.execute('BEGIN TRANSACTION');

      try {
        // Get all old format invoices
        const oldFormatInvoices = await this.dbConnection.select(`
          SELECT id, bill_number 
          FROM invoices 
          WHERE bill_number LIKE 'I%' 
          ORDER BY CAST(SUBSTR(bill_number, 2) AS INTEGER)
        `);

        result.totalInvoices = oldFormatInvoices.length;
        console.log(`📊 Found ${result.totalInvoices} invoices to migrate`);

        // Step 5: Migrate each invoice
        for (const invoice of oldFormatInvoices) {
          const oldNumber = invoice.bill_number;

          // Extract number part (remove 'I' prefix)
          const numericPart = oldNumber.substring(1);
          const number = parseInt(numericPart);

          if (isNaN(number)) {
            console.warn(`⚠️ Skipping invalid invoice number: ${oldNumber}`);
            result.skippedCount++;
            continue;
          }

          // Generate new format (with appropriate leading zeros)
          let newNumber: string;
          if (number < 10) {
            newNumber = `0${number}`;
          } else if (number < 100) {
            newNumber = `0${number}`;
          } else if (number < 1000) {
            newNumber = `0${number}`;
          } else {
            newNumber = number.toString();
          }

          // Check if new number already exists
          const existingCheck = await this.dbConnection.select(
            `SELECT id FROM invoices WHERE bill_number = ? AND id != ?`,
            [newNumber, invoice.id]
          );

          if (existingCheck && existingCheck.length > 0) {
            console.warn(`⚠️ Skipping ${oldNumber} - new format ${newNumber} already exists`);
            result.skippedCount++;
            continue;
          }

          // Update the invoice
          await this.dbConnection.execute(
            `UPDATE invoices SET bill_number = ? WHERE id = ?`,
            [newNumber, invoice.id]
          );

          console.log(`✅ Migrated ${oldNumber} → ${newNumber}`);
          result.migratedCount++;
        }

        // Step 6: Verify migration
        result.verificationPassed = await this.verifyMigration();

        if (!result.verificationPassed) {
          throw new Error('Migration verification failed');
        }

        // Step 7: Mark migration as completed
        await this.dbConnection.execute(`
          INSERT OR REPLACE INTO app_settings (key, value) 
          VALUES ('invoice_migration_completed', 'true')
        `);

        // Step 8: Commit transaction
        await this.dbConnection.execute('COMMIT');

        result.success = true;
        console.log(`🎉 Migration completed successfully!`);
        console.log(`   📊 Migrated: ${result.migratedCount} invoices`);
        console.log(`   ⏭️ Skipped: ${result.skippedCount} invoices`);

      } catch (migrationError) {
        console.error('❌ Error during migration:', migrationError);

        // Rollback transaction
        await this.dbConnection.execute('ROLLBACK');

        // Attempt to rollback migration
        await this.rollbackMigration();

        result.errors.push(`Migration failed: ${migrationError.message}`);
        return result;
      }

    } catch (error) {
      console.error('❌ Critical migration error:', error);
      result.errors.push(`Critical error: ${error.message}`);
    }

    result.migrationTime = Date.now() - startTime;
    return result;
  }

  /**
   * Clean up backup table after successful migration (optional)
   */
  async cleanupBackup(): Promise<boolean> {
    try {
      console.log('🧹 Cleaning up migration backup...');
      await this.dbConnection.execute(`DROP TABLE IF EXISTS ${this.backupTableName}`);
      console.log('✅ Backup cleanup completed');
      return true;
    } catch (error) {
      console.error('❌ Error cleaning up backup:', error);
      return false;
    }
  }
}
return result;
      }

console.log(`📋 Found ${result.totalInvoices} invoices with old format`);

// Start transaction for safety
await this.dbConnection.execute('BEGIN TRANSACTION');

try {
  for (const invoice of oldFormatInvoices) {
    try {
      // Extract number from I00001 format
      const match = invoice.bill_number.match(/^I(\d+)$/);
      if (!match) {
        result.skippedCount++;
        result.errors.push(`Invalid format: ${invoice.bill_number}`);
        continue;
      }

      const number = parseInt(match[1], 10);

      // Generate new format with one leading zero
      let newBillNumber: string;
      if (number < 10) {
        newBillNumber = `0${number}`;
      } else if (number < 100) {
        newBillNumber = `0${number}`;
      } else if (number < 1000) {
        newBillNumber = `0${number}`;
      } else {
        newBillNumber = `0${number}`;
      }

      // Check if new number already exists
      const existingNew = await this.dbConnection.select(
        'SELECT id FROM invoices WHERE bill_number = ? AND id != ?',
        [newBillNumber, invoice.id]
      );

      if (existingNew.length > 0) {
        result.skippedCount++;
        result.errors.push(`New number ${newBillNumber} already exists for invoice ${invoice.id}`);
        continue;
      }

      // Update the invoice number
      await this.dbConnection.execute(
        'UPDATE invoices SET bill_number = ? WHERE id = ?',
        [newBillNumber, invoice.id]
      );

      // Update related records in ledger_entries if they exist
      await this.dbConnection.execute(
        'UPDATE ledger_entries SET bill_number = ? WHERE bill_number = ?',
        [newBillNumber, invoice.bill_number]
      );

      // Update related records in any other tables that reference bill_number
      // Add more tables here if needed

      result.migratedCount++;
      console.log(`✅ Migrated ${invoice.bill_number} → ${newBillNumber}`);

    } catch (error) {
      result.errors.push(`Error migrating invoice ${invoice.id}: ${error}`);
      console.warn(`⚠️ Error migrating invoice ${invoice.id}:`, error);
    }
  }

  // Commit transaction
  await this.dbConnection.execute('COMMIT');
  result.success = true;

  console.log(`✅ Migration completed: ${result.migratedCount} migrated, ${result.skippedCount} skipped`);

  if (result.errors.length > 0) {
    console.warn(`⚠️ Migration had ${result.errors.length} errors:`, result.errors);
  }

} catch (error) {
  // Rollback on error
  await this.dbConnection.execute('ROLLBACK');
  throw error;
}

    } catch (error) {
  result.success = false;
  result.errors.push(`Migration failed: ${error}`);
  console.error('❌ Invoice number migration failed:', error);
}

return result;
  }

  /**
   * Preview what changes would be made without actually doing them
   */
  async previewMigration(): Promise < Array < { oldNumber: string, newNumber: string } >> {
  const preview: Array<{ oldNumber: string, newNumber: string }> =[];

try {
  const oldFormatInvoices = await this.dbConnection.select(
    `SELECT bill_number FROM invoices WHERE bill_number LIKE 'I%' ORDER BY id LIMIT 10`
  );

  for (const invoice of oldFormatInvoices) {
    const match = invoice.bill_number.match(/^I(\d+)$/);
    if (match) {
      const number = parseInt(match[1], 10);
      const newNumber = `0${number}`;
      preview.push({
        oldNumber: invoice.bill_number,
        newNumber: newNumber
      });
    }
  }
} catch (error) {
  console.error('Error generating migration preview:', error);
}

return preview;
  }

  /**
   * Check if migration is needed
   */
  async needsMigration(): Promise < boolean > {
  try {
    const oldFormatCount = await this.dbConnection.select(
      `SELECT COUNT(*) as count FROM invoices WHERE bill_number LIKE 'I%'`
    );
    return oldFormatCount[0]?.count > 0;
  } catch(error) {
    console.error('Error checking migration need:', error);
    return false;
  }
}
}
