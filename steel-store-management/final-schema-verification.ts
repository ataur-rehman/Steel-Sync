#!/usr/bin/env tsx

/**
 * Final Schema Verification Script
 * Verifies all 6 database schema fixes are working correctly
 */

import { DatabaseService } from './src/services/database';

const databaseService = DatabaseService.getInstance();

interface ColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: any;
  pk: number;
}

async function verifyDatabaseSchema() {
  console.log('🔍 Final Database Schema Verification');
  console.log('=====================================');
  
  try {
    // Initialize database to ensure all columns are added
    await databaseService.initialize();
    
    const results = {
      totalIssues: 6,
      resolved: 0,
      errors: [] as string[]
    };

    // 1. Check stock_receiving.receiving_code (NOT NULL constraint issue)
    console.log('\n1️⃣ Checking stock_receiving.receiving_code...');
    try {
      const columns = await databaseService.dbConnection.select(`PRAGMA table_info(stock_receiving)`);
      const receivingCodeColumn = columns.find((col: ColumnInfo) => col.name === 'receiving_code');
      
      if (receivingCodeColumn) {
        console.log('✅ receiving_code column exists');
        
        // Check if existing records have receiving_code values
        const recordsWithoutCode = await databaseService.dbConnection.select(`
          SELECT COUNT(*) as count FROM stock_receiving 
          WHERE receiving_code IS NULL OR receiving_code = ''
        `);
        
        if (recordsWithoutCode[0].count === 0) {
          console.log('✅ All records have receiving_code values');
          results.resolved++;
        } else {
          console.log(`⚠️ ${recordsWithoutCode[0].count} records still missing receiving_code`);
          results.errors.push('Some records missing receiving_code values');
        }
      } else {
        console.log('❌ receiving_code column missing');
        results.errors.push('receiving_code column not found');
      }
    } catch (error) {
      console.log('❌ Error checking receiving_code:', error);
      results.errors.push('Error checking receiving_code');
    }

    // 2. Check audit_logs.entity_id (duplicate column issue)
    console.log('\n2️⃣ Checking audit_logs.entity_id...');
    try {
      const columns = await databaseService.dbConnection.select(`PRAGMA table_info(audit_logs)`);
      const entityIdColumns = columns.filter((col: ColumnInfo) => col.name === 'entity_id');
      
      if (entityIdColumns.length === 1) {
        console.log('✅ entity_id column exists (no duplicates)');
        results.resolved++;
      } else if (entityIdColumns.length > 1) {
        console.log('⚠️ Multiple entity_id columns found');
        results.errors.push('Duplicate entity_id columns');
      } else {
        console.log('❌ entity_id column missing');
        results.errors.push('entity_id column not found');
      }
    } catch (error) {
      console.log('❌ Error checking entity_id:', error);
      results.errors.push('Error checking entity_id');
    }

    // 3. Check staff_management.is_active
    console.log('\n3️⃣ Checking staff_management.is_active...');
    try {
      const columns = await databaseService.dbConnection.select(`PRAGMA table_info(staff_management)`);
      const isActiveColumn = columns.find((col: ColumnInfo) => col.name === 'is_active');
      
      if (isActiveColumn) {
        console.log('✅ is_active column exists');
        results.resolved++;
      } else {
        console.log('❌ is_active column missing');
        results.errors.push('is_active column not found');
      }
    } catch (error) {
      console.log('❌ Error checking is_active:', error);
      results.errors.push('Error checking is_active');
    }

    // 4. Check salary_payments.payment_month
    console.log('\n4️⃣ Checking salary_payments.payment_month...');
    try {
      const columns = await databaseService.dbConnection.select(`PRAGMA table_info(salary_payments)`);
      const paymentMonthColumn = columns.find((col: ColumnInfo) => col.name === 'payment_month');
      
      if (paymentMonthColumn) {
        console.log('✅ payment_month column exists');
        results.resolved++;
      } else {
        console.log('❌ payment_month column missing');
        results.errors.push('payment_month column not found');
      }
    } catch (error) {
      console.log('❌ Error checking payment_month:', error);
      results.errors.push('Error checking payment_month');
    }

    // 5. Check stock_receiving.truck_number
    console.log('\n5️⃣ Checking stock_receiving.truck_number...');
    try {
      const columns = await databaseService.dbConnection.select(`PRAGMA table_info(stock_receiving)`);
      const truckNumberColumn = columns.find((col: ColumnInfo) => col.name === 'truck_number');
      
      if (truckNumberColumn) {
        console.log('✅ truck_number column exists');
        results.resolved++;
      } else {
        console.log('❌ truck_number column missing');
        results.errors.push('truck_number column not found');
      }
    } catch (error) {
      console.log('❌ Error checking truck_number:', error);
      results.errors.push('Error checking truck_number');
    }

    // 6. Check stock_receiving.payment_status
    console.log('\n6️⃣ Checking stock_receiving.payment_status...');
    try {
      const columns = await databaseService.dbConnection.select(`PRAGMA table_info(stock_receiving)`);
      const paymentStatusColumn = columns.find((col: ColumnInfo) => col.name === 'payment_status');
      
      if (paymentStatusColumn) {
        console.log('✅ payment_status column exists');
        results.resolved++;
      } else {
        console.log('❌ payment_status column missing');
        results.errors.push('payment_status column not found');
      }
    } catch (error) {
      console.log('❌ Error checking payment_status:', error);
      results.errors.push('Error checking payment_status');
    }

    // Summary
    console.log('\n📊 VERIFICATION SUMMARY');
    console.log('========================');
    console.log(`Total Issues: ${results.totalIssues}`);
    console.log(`Resolved: ${results.resolved}`);
    console.log(`Remaining: ${results.totalIssues - results.resolved}`);
    
    if (results.errors.length > 0) {
      console.log('\n❌ Remaining Issues:');
      results.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    } else {
      console.log('\n🎉 ALL SCHEMA ISSUES RESOLVED!');
    }

    // Test basic table operations
    console.log('\n🧪 Testing Basic Operations...');
    
    // Test stock_receiving insert
    try {
      await databaseService.dbConnection.execute(`
        INSERT INTO stock_receiving (
          receiving_code, vendor_name, item_description, 
          quantity, unit_price, total_amount, payment_status,
          truck_number, reference_number, created_by
        ) VALUES (
          'TEST-001', 'Test Vendor', 'Test Item', 
          10, 100.0, 1000.0, 'pending',
          'TR-001', 'REF-001', 'test_user'
        )
      `);
      
      // Clean up test record
      await databaseService.dbConnection.execute(`
        DELETE FROM stock_receiving WHERE receiving_code = 'TEST-001'
      `);
      
      console.log('✅ stock_receiving operations working');
    } catch (error) {
      console.log('❌ stock_receiving operation failed:', error);
    }

    // Test salary_payments insert
    try {
      await databaseService.dbConnection.execute(`
        INSERT INTO salary_payments (
          staff_id, staff_name, payment_code, salary_month, payment_month,
          basic_salary, total_amount, payment_method, payment_date
        ) VALUES (
          1, 'Test Staff', 'PAY-001', '2024-01', '2024-01',
          50000, 50000, 'cash', '2024-01-31'
        )
      `);
      
      // Clean up test record
      await databaseService.dbConnection.execute(`
        DELETE FROM salary_payments WHERE payment_code = 'PAY-001'
      `);
      
      console.log('✅ salary_payments operations working');
    } catch (error) {
      console.log('❌ salary_payments operation failed:', error);
    }

    return results.resolved === results.totalIssues;

  } catch (error) {
    console.error('❌ Verification failed:', error);
    return false;
  }
}

// Run verification if called directly
if (require.main === module) {
  verifyDatabaseSchema()
    .then((success) => {
      if (success) {
        console.log('\n🎉 Database schema verification completed successfully!');
        process.exit(0);
      } else {
        console.log('\n⚠️ Some issues remain. Check the output above.');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Verification script failed:', error);
      process.exit(1);
    });
}

export { verifyDatabaseSchema };
