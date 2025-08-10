// CRITICAL DATABASE SCHEMA FIX - Add missing total_balance column
// This fixes the "no such column: total_balance" error

console.log('🔧 CRITICAL FIX: Adding missing total_balance column to customers table...');

const DATABASE_SCHEMA_FIX = {
  async fixCustomersTableSchema() {
    try {
      console.log('1️⃣ Checking if total_balance column exists...');
      
      // Check current schema
      const schemaInfo = await db.safeSelect("PRAGMA table_info(customers)");
      console.log('📋 Current customers table schema:', schemaInfo);
      
      const hasBalanceColumn = schemaInfo.some(col => col.name === 'balance');
      const hasTotalBalanceColumn = schemaInfo.some(col => col.name === 'total_balance');
      
      console.log(`✅ Has 'balance' column: ${hasBalanceColumn}`);
      console.log(`✅ Has 'total_balance' column: ${hasTotalBalanceColumn}`);
      
      if (!hasTotalBalanceColumn) {
        console.log('2️⃣ Adding total_balance column...');
        
        if (hasBalanceColumn) {
          // Add total_balance column and copy data from balance column
          await db.execute("ALTER TABLE customers ADD COLUMN total_balance REAL DEFAULT 0");
          await db.execute("UPDATE customers SET total_balance = COALESCE(balance, 0)");
          console.log('✅ Added total_balance column and copied data from balance column');
        } else {
          // Just add the total_balance column
          await db.execute("ALTER TABLE customers ADD COLUMN total_balance REAL DEFAULT 0");
          console.log('✅ Added total_balance column with default value 0');
        }
      } else {
        console.log('✅ total_balance column already exists');
      }
      
      // Verify the fix
      const updatedSchema = await db.safeSelect("PRAGMA table_info(customers)");
      console.log('📋 Updated customers table schema:', updatedSchema);
      
      return { success: true, message: 'total_balance column added successfully' };
      
    } catch (error) {
      console.error('❌ Error fixing customers table schema:', error);
      return { success: false, message: error.message };
    }
  },
  
  async syncCustomerBalances() {
    try {
      console.log('3️⃣ Syncing customer balances from ledger entries...');
      
      // Get all customers
      const customers = await db.safeSelect("SELECT id, name FROM customers");
      console.log(`Found ${customers.length} customers to sync`);
      
      for (const customer of customers) {
        // Calculate balance from ledger entries
        const balanceResult = await db.safeSelect(`
          SELECT 
            COALESCE(SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END), 0) as total_debits,
            COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0) as total_credits,
            COALESCE(SUM(CASE WHEN type = 'debit' THEN amount ELSE -amount END), 0) as net_balance
          FROM customer_ledger_entries 
          WHERE customer_id = ?
        `, [customer.id]);
        
        const netBalance = balanceResult[0]?.net_balance || 0;
        
        // Update customer's total_balance
        await db.execute(
          "UPDATE customers SET total_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          [netBalance, customer.id]
        );
        
        console.log(`✅ Customer ${customer.name}: Balance = Rs.${netBalance.toFixed(2)}`);
      }
      
      return { success: true, message: `Synced balances for ${customers.length} customers` };
      
    } catch (error) {
      console.error('❌ Error syncing customer balances:', error);
      return { success: false, message: error.message };
    }
  }
};

// Execute the fix
async function executeSchemaFix() {
  console.log('🚨 CRITICAL DATABASE SCHEMA FIX STARTING...');
  
  // Step 1: Fix the schema
  const schemaResult = await DATABASE_SCHEMA_FIX.fixCustomersTableSchema();
  console.log('Schema Fix Result:', schemaResult);
  
  // Step 2: Sync balances
  const syncResult = await DATABASE_SCHEMA_FIX.syncCustomerBalances();
  console.log('Balance Sync Result:', syncResult);
  
  if (schemaResult.success && syncResult.success) {
    console.log('🎉 CRITICAL FIX COMPLETED SUCCESSFULLY!');
    console.log('✅ total_balance column added and synced');
    console.log('✅ Invoice creation should now work properly');
  } else {
    console.log('❌ CRITICAL FIX FAILED - Manual intervention required');
  }
}

// Auto-execute the fix
executeSchemaFix();
