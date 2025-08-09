/**
 * Database Schema Verification and Update Tool
 * 
 * This tool checks if the current database schema matches the centralized schema
 * and provides information about missing columns that might be causing payment issues.
 */

// Database Schema Verification Tool
class SchemaVerificationTool {
  constructor() {
    console.log('🔧 Schema Verification Tool Initialized');
  }

  async verifySchemas() {
    console.log('🔍 Starting database schema verification...');
    
    try {
      // Check vendor_payments table schema
      await this.checkVendorPaymentsSchema();
      
      // Check payments table schema
      await this.checkPaymentsSchema();
      
      // Check stock_receiving table schema
      await this.checkStockReceivingSchema();
      
      // Test actual payment creation
      await this.testPaymentCreation();
      
      console.log('✅ Schema verification completed!');
      
    } catch (error) {
      console.error('❌ Schema verification failed:', error);
    }
  }

  async checkVendorPaymentsSchema() {
    console.log('\n📊 Checking vendor_payments table schema...');
    
    try {
      const schema = await db.dbConnection.select('PRAGMA table_info(vendor_payments)');
      const columns = schema.map(col => ({
        name: col.name,
        type: col.type,
        notnull: col.notnull,
        dflt_value: col.dflt_value
      }));
      
      console.log('📋 Current vendor_payments columns:', columns);
      
      // Check for critical columns
      const requiredColumns = ['receiving_id', 'payment_number', 'vendor_id', 'amount', 'net_amount'];
      const missingColumns = requiredColumns.filter(col => 
        !columns.some(c => c.name === col)
      );
      
      if (missingColumns.length > 0) {
        console.log('❌ Missing columns in vendor_payments:', missingColumns);
        console.log('💡 This explains why payment history is not working properly!');
        
        // Show what should be added
        if (missingColumns.includes('receiving_id')) {
          console.log('🔧 Need to add: receiving_id INTEGER (for linking payments to stock receiving)');
        }
      } else {
        console.log('✅ All required columns exist in vendor_payments table');
      }
      
      // Check foreign key constraints
      const foreignKeys = await db.dbConnection.select('PRAGMA foreign_key_list(vendor_payments)');
      console.log('🔗 Foreign keys in vendor_payments:', foreignKeys.map(fk => ({
        table: fk.table,
        from: fk.from,
        to: fk.to
      })));
      
    } catch (error) {
      console.error('❌ Error checking vendor_payments schema:', error);
    }
  }

  async checkPaymentsSchema() {
    console.log('\n💳 Checking payments table schema...');
    
    try {
      const schema = await db.dbConnection.select('PRAGMA table_info(payments)');
      const columns = schema.map(col => col.name);
      
      console.log('📋 Current payments table columns:', columns);
      
      // Check for CHECK constraints
      const createSql = await db.dbConnection.select(
        `SELECT sql FROM sqlite_master WHERE type='table' AND name='payments'`
      );
      
      if (createSql && createSql[0]) {
        console.log('🔒 Payments table CHECK constraints:');
        const sql = createSql[0].sql;
        
        // Extract CHECK constraints
        const checkMatches = sql.match(/CHECK\s*\([^)]+\)/gi);
        if (checkMatches) {
          checkMatches.forEach(check => console.log('  -', check));
        } else {
          console.log('  - No CHECK constraints found');
        }
      }
      
    } catch (error) {
      console.error('❌ Error checking payments schema:', error);
    }
  }

  async checkStockReceivingSchema() {
    console.log('\n📦 Checking stock_receiving table schema...');
    
    try {
      const schema = await db.dbConnection.select('PRAGMA table_info(stock_receiving)');
      const columns = schema.map(col => col.name);
      
      console.log('📋 Current stock_receiving table columns:', columns);
      
      // Check for payment-related columns
      const paymentColumns = ['payment_status', 'payment_method', 'remaining_balance'];
      const hasPaymentColumns = paymentColumns.filter(col => columns.includes(col));
      
      console.log('💰 Payment-related columns found:', hasPaymentColumns);
      
    } catch (error) {
      console.error('❌ Error checking stock_receiving schema:', error);
    }
  }

  async testPaymentCreation() {
    console.log('\n🧪 Testing payment creation process...');
    
    try {
      // Get a sample stock receiving record
      const receivingRecords = await db.getStockReceivingList();
      if (receivingRecords.length === 0) {
        console.log('⚠️ No stock receiving records found for testing');
        return;
      }
      
      const testReceiving = receivingRecords[0];
      console.log('📝 Using receiving record for test:', {
        id: testReceiving.id,
        vendor_id: testReceiving.vendor_id,
        vendor_name: testReceiving.vendor_name
      });
      
      // Test if we can create a vendor payment
      console.log('💳 Testing vendor payment creation...');
      
      // Build test payment data
      const testPayment = {
        vendor_id: testReceiving.vendor_id,
        vendor_name: testReceiving.vendor_name,
        receiving_id: testReceiving.id,
        amount: 100,
        payment_channel_id: 1,
        payment_channel_name: 'Cash',
        reference_number: `TEST-${Date.now()}`,
        notes: 'Schema verification test payment',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('en-PK', { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: true 
        }),
        created_by: 'schema-tool'
      };
      
      console.log('🔄 Attempting to create test payment...');
      
      try {
        // Try to create the payment
        const paymentId = await db.createVendorPayment(testPayment);
        console.log('✅ Test payment created successfully with ID:', paymentId);
        
        // Verify it shows up in payment history
        const paymentHistory = await db.getReceivingPaymentHistory(testReceiving.id);
        const testPaymentFound = paymentHistory.some(p => p.reference_number === testPayment.reference_number);
        
        if (testPaymentFound) {
          console.log('✅ Test payment appears in payment history - system working correctly!');
        } else {
          console.log('❌ Test payment NOT appearing in payment history - issue confirmed!');
        }
        
        // Clean up test payment
        try {
          await db.dbConnection.execute('DELETE FROM vendor_payments WHERE reference_number = ?', [testPayment.reference_number]);
          console.log('🧹 Test payment cleaned up');
        } catch (cleanupError) {
          console.log('⚠️ Could not clean up test payment:', cleanupError.message);
        }
        
      } catch (paymentError) {
        console.log('❌ Test payment creation failed:', paymentError.message);
        
        // Analyze the error
        if (paymentError.message.includes('FOREIGN KEY constraint failed')) {
          console.log('💡 Issue: Foreign key constraint - vendor or receiving record missing');
        } else if (paymentError.message.includes('no such column')) {
          console.log('💡 Issue: Missing column in database schema');
        } else if (paymentError.message.includes('CHECK constraint failed')) {
          console.log('💡 Issue: Data does not meet CHECK constraints');
        }
      }
      
    } catch (error) {
      console.error('❌ Payment creation test failed:', error);
    }
  }
}

// Auto-run if in browser console
if (typeof window !== 'undefined' && window.db) {
  console.log('🔧 Schema Verification Tool Ready - Run: new SchemaVerificationTool().verifySchemas()');
  
  // Also make it available globally
  window.SchemaVerifier = SchemaVerificationTool;
} else {
  console.log('⚠️ Database not available in current context');
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SchemaVerificationTool;
}
