/**
 * SYSTEM INCONSISTENCY DIAGNOSTIC
 * 
 * This script will identify ALL the inconsistencies in the vendor deletion system
 * Run this to find the REAL root cause
 */

console.log('🔍 SYSTEM INCONSISTENCY DIAGNOSTIC - STARTING...');

async function deepSystemAnalysis() {
  console.log('\n🎯 DEEP SYSTEM ANALYSIS');
  console.log('='.repeat(50));
  
  try {
    const db = window.dbService || DatabaseService.getInstance();
    
    // 1. CHECK DATABASE SERVICE INSTANCES
    console.log('\n📋 1. DATABASE SERVICE INSTANCES');
    console.log('-'.repeat(30));
    
    console.log('Main db service:', typeof db);
    console.log('Window.db:', typeof window.db);
    console.log('DatabaseService:', typeof DatabaseService);
    console.log('EnhancedDatabaseService exists:', typeof window.EnhancedDatabaseService);
    
    // 2. CHECK TABLE EXISTENCE AND STRUCTURE
    console.log('\n📋 2. TABLE STRUCTURE ANALYSIS');
    console.log('-'.repeat(30));
    
    // Check if stock_receiving table exists
    try {
      const tables = await db.dbConnection.execute("SELECT name FROM sqlite_master WHERE type='table'");
      const tableList = (tables.rows || tables || []).map(t => t.name);
      console.log('All tables:', tableList);
      console.log('stock_receiving exists:', tableList.includes('stock_receiving'));
      console.log('vendors exists:', tableList.includes('vendors'));
    } catch (error) {
      console.error('Error checking tables:', error);
    }
    
    // Check stock_receiving table schema
    try {
      const schema = await db.dbConnection.execute("PRAGMA table_info(stock_receiving)");
      const columns = (schema.rows || schema || []).map(col => col.name);
      console.log('stock_receiving columns:', columns);
      console.log('Has payment_status:', columns.includes('payment_status'));
      console.log('Has remaining_balance:', columns.includes('remaining_balance'));
      console.log('Has vendor_id:', columns.includes('vendor_id'));
    } catch (error) {
      console.error('Error checking stock_receiving schema:', error);
    }
    
    // 3. CHECK DATA CONSISTENCY
    console.log('\n📋 3. DATA CONSISTENCY CHECK');
    console.log('-'.repeat(30));
    
    // Get all vendors
    try {
      const vendors = await db.dbConnection.select('SELECT id, name, company_name, contact_person FROM vendors LIMIT 10');
      const vendorList = Array.isArray(vendors) ? vendors : (vendors.rows || []);
      console.log(`Found ${vendorList.length} vendors`);
      
      for (const vendor of vendorList.slice(0, 3)) {
        console.log(`\nVendor ${vendor.id}:`, vendor.name || vendor.company_name || vendor.contact_person);
        
        // Check stock receiving records
        const stockCheck = await db.dbConnection.select(
          'SELECT * FROM stock_receiving WHERE vendor_id = ?', 
          [vendor.id]
        );
        const stockRows = Array.isArray(stockCheck) ? stockCheck : (stockCheck.rows || []);
        console.log(`  Stock receiving records: ${stockRows.length}`);
        
        if (stockRows.length > 0) {
          const pending = stockRows.filter(r => r.payment_status !== 'paid' || (r.remaining_balance || 0) > 0);
          console.log(`  Pending payments: ${pending.length}`);
          if (pending.length > 0) {
            console.log(`  Pending details:`, pending.map(p => ({
              id: p.id,
              payment_status: p.payment_status,
              remaining_balance: p.remaining_balance,
              total_amount: p.total_amount
            })));
          }
        }
      }
    } catch (error) {
      console.error('Error checking data consistency:', error);
    }
    
    // 4. CHECK METHOD CONSISTENCY
    console.log('\n📋 4. METHOD CONSISTENCY CHECK');
    console.log('-'.repeat(30));
    
    console.log('deleteVendor method exists:', typeof db.deleteVendor === 'function');
    console.log('checkVendorDeletionSafety exists:', typeof db.checkVendorDeletionSafety === 'function');
    
    // Test method behavior with a safe vendor (if any)
    try {
      const safeVendor = await db.dbConnection.select(
        `SELECT v.id, v.name, v.company_name, 
         COUNT(sr.id) as stock_count,
         SUM(CASE WHEN sr.payment_status != 'paid' OR sr.remaining_balance > 0 THEN 1 ELSE 0 END) as pending_count
         FROM vendors v 
         LEFT JOIN stock_receiving sr ON v.id = sr.vendor_id 
         GROUP BY v.id 
         HAVING pending_count = 0 
         LIMIT 1`
      );
      
      const safeVendorRows = Array.isArray(safeVendor) ? safeVendor : (safeVendor.rows || []);
      if (safeVendorRows.length > 0) {
        const vendor = safeVendorRows[0];
        console.log(`Testing with safe vendor ${vendor.id}:`, vendor.name || vendor.company_name);
        
        const safetyCheck = await db.checkVendorDeletionSafety(vendor.id);
        console.log('Safety check result:', safetyCheck);
      } else {
        console.log('No safe vendors found for testing');
      }
    } catch (error) {
      console.error('Error testing method consistency:', error);
    }
    
    // 5. CHECK DATABASE CONNECTION CONSISTENCY
    console.log('\n📋 5. DATABASE CONNECTION CONSISTENCY');
    console.log('-'.repeat(30));
    
    // Test execute vs select methods
    try {
      const executeResult = await db.dbConnection.execute('SELECT COUNT(*) as count FROM vendors');
      const selectResult = await db.dbConnection.select('SELECT COUNT(*) as count FROM vendors');
      
      console.log('Execute method result format:', executeResult);
      console.log('Select method result format:', selectResult);
      
      const executeRows = executeResult.rows || executeResult || [];
      const selectRows = Array.isArray(selectResult) ? selectResult : (selectResult.rows || []);
      
      console.log('Execute processed rows:', executeRows);
      console.log('Select processed rows:', selectRows);
      
      console.log('Results match:', JSON.stringify(executeRows) === JSON.stringify(selectRows));
    } catch (error) {
      console.error('Error testing connection consistency:', error);
    }
    
    // 6. CHECK FOR CONCURRENT MODIFICATION
    console.log('\n📋 6. CONCURRENT MODIFICATION CHECK');
    console.log('-'.repeat(30));
    
    // Check if there are any background processes modifying data
    console.log('Active timeouts:', Object.keys(window).filter(key => key.includes('timeout') || key.includes('interval')));
    console.log('Active intervals:', Object.keys(window).filter(key => key.includes('interval')));
    
    return {
      status: 'completed',
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ DIAGNOSTIC ERROR:', error);
    return { error: error.message };
  }
}

// Make function globally available
window.deepSystemAnalysis = deepSystemAnalysis;

console.log('🔍 SYSTEM DIAGNOSTIC LOADED');
console.log('📝 Run: await deepSystemAnalysis()');

// Auto-run the analysis
deepSystemAnalysis();
