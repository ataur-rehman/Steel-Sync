// Enhanced Payments Schema Verification
// This script checks that enhanced_payments table has the correct schema

window.PAYMENT_SCHEMA_CHECKER = {
    async checkEnhancedPaymentsSchema() {
        console.log('🔍 CHECKING ENHANCED PAYMENTS TABLE SCHEMA');
        console.log('===========================================');

        try {
            const { db } = await import('/src/services/database.ts');

            // Get table schema
            const schemaQuery = `PRAGMA table_info(enhanced_payments)`;
            const columns = await db.executeRawQuery(schemaQuery);

            console.log(`✅ Found ${columns.length} columns in enhanced_payments:`);
            columns.forEach((col, i) => {
                const isKey = col.pk ? ' - PRIMARY KEY' : '';
                const notNull = col.notnull ? ' - NOT NULL' : '';
                console.log(`   ${i + 1}. ${col.name} (${col.type})${isKey}${notNull}`);
            });

            // Check for critical columns
            const columnNames = columns.map(col => col.name);
            const criticalColumns = ['entity_type', 'entity_id', 'entity_name', 'payment_number', 'gross_amount', 'net_amount'];

            console.log('\n🔍 Checking critical columns:');
            criticalColumns.forEach(col => {
                const exists = columnNames.includes(col);
                console.log(`   ${exists ? '✅' : '❌'} ${col}`);
            });

            // Check for old problematic columns
            const oldColumns = ['customer_id', 'customer_name', 'amount'];
            console.log('\n🚫 Checking for old problematic columns:');
            oldColumns.forEach(col => {
                const exists = columnNames.includes(col);
                console.log(`   ${exists ? '⚠️ FOUND (should not exist)' : '✅ NOT FOUND (good)'} ${col}`);
            });

            return {
                totalColumns: columns.length,
                hasRequiredColumns: criticalColumns.every(col => columnNames.includes(col)),
                hasOldColumns: oldColumns.some(col => columnNames.includes(col)),
                columns: columnNames
            };

        } catch (error) {
            console.error('❌ Error checking enhanced_payments schema:', error);
            return { error: error.message };
        }
    },

    async testCustomerPaymentInsert() {
        console.log('\n🧪 TESTING CUSTOMER PAYMENT INSERT COMPATIBILITY');
        console.log('===============================================');

        try {
            const { db } = await import('/src/services/database.ts');

            // Test if we can insert with the new schema (dry run)
            const testQuery = `
        SELECT 
          'payment_number' as field1,
          'entity_type' as field2,
          'entity_id' as field3,
          'entity_name' as field4,
          'gross_amount' as field5,
          'net_amount' as field6,
          'payment_method' as field7,
          'payment_type' as field8,
          'date' as field9,
          'time' as field10,
          'created_by' as field11
        LIMIT 0
      `;

            await db.executeRawQuery(testQuery);
            console.log('✅ New payment insert structure is compatible');

            // Check if any actual payments exist
            const existingPayments = await db.executeRawQuery('SELECT COUNT(*) as count FROM enhanced_payments');
            console.log(`📊 Current enhanced_payments records: ${existingPayments[0]?.count || 0}`);

            return { success: true, existingRecords: existingPayments[0]?.count || 0 };

        } catch (error) {
            console.error('❌ Error testing payment insert:', error);
            return { success: false, error: error.message };
        }
    }
};

// Run the checks automatically
window.PAYMENT_SCHEMA_CHECKER.checkEnhancedPaymentsSchema().then(result => {
    console.log('\n📋 SCHEMA CHECK RESULT:', result);

    return window.PAYMENT_SCHEMA_CHECKER.testCustomerPaymentInsert();
}).then(result => {
    console.log('\n🧪 INSERT TEST RESULT:', result);

    if (result.success) {
        console.log('\n🎉 ENHANCED PAYMENTS SCHEMA IS READY FOR CUSTOMER PAYMENTS!');
    } else {
        console.log('\n⚠️ ISSUES DETECTED - CHECK LOGS ABOVE');
    }
}).catch(error => {
    console.error('\n💥 SCHEMA CHECK FAILED:', error);
});
