/**
 * VENDOR DELETION FLOW DIAGNOSTIC
 * 
 * This script monitors and logs every step of the vendor deletion process
 * to identify exactly where the protection is failing
 * 
 * Run this before attempting vendor deletion to see the complete flow:
 */

console.log('🔍 VENDOR DELETION FLOW DIAGNOSTIC - STARTING...');

async function fullVendorDeletionDiagnostic(vendorId) {
  console.log(`\n🎯 DIAGNOSTIC: Full vendor deletion analysis for vendor ${vendorId}`);
  console.log('=' .repeat(60));
  
  try {
    const db = window.dbService || DatabaseService.getInstance();
    
    if (!db) {
      console.error('❌ Database service not found!');
      return { error: 'Database service not available' };
    }

    // STEP 1: Check current vendor status
    console.log('\n📋 STEP 1: Current vendor status');
    console.log('-'.repeat(30));
    
    const vendorData = await db.dbConnection.select('SELECT * FROM vendors WHERE id = ?', [vendorId]);
    const vendorRows = Array.isArray(vendorData) ? vendorData : (vendorData.rows || []);
    
    if (vendorRows.length === 0) {
      console.log('❌ Vendor not found in database');
      return { error: 'Vendor not found' };
    }
    
    console.log('✅ Vendor found:', vendorRows[0]);

    // STEP 2: Check pending payments with BOTH methods
    console.log('\n📋 STEP 2: Pending payments check (both methods)');
    console.log('-'.repeat(30));
    
    // Method 1: execute
    const executeResult = await db.dbConnection.execute(
      `SELECT COUNT(*) as count, SUM(remaining_balance) as total_pending 
       FROM stock_receiving 
       WHERE vendor_id = ? AND (payment_status != 'paid' OR remaining_balance > 0)`,
      [vendorId]
    );
    
    // Method 2: select  
    const selectResult = await db.dbConnection.select(
      `SELECT COUNT(*) as count, SUM(remaining_balance) as total_pending 
       FROM stock_receiving 
       WHERE vendor_id = ? AND (payment_status != 'paid' OR remaining_balance > 0)`,
      [vendorId]
    );
    
    console.log('Execute method result:', executeResult);
    console.log('Select method result:', selectResult);
    
    const executeRows = executeResult.rows || executeResult || [];
    const selectRows = Array.isArray(selectResult) ? selectResult : (selectResult.rows || []);
    
    console.log('Processed execute rows:', executeRows);
    console.log('Processed select rows:', selectRows);
    
    const executeHasPending = executeRows.length > 0 && executeRows[0]?.count > 0;
    const selectHasPending = selectRows.length > 0 && selectRows[0]?.count > 0;
    
    console.log('Execute method detects pending:', executeHasPending);
    console.log('Select method detects pending:', selectHasPending);

    // STEP 3: Check outstanding balance
    console.log('\n📋 STEP 3: Outstanding balance check');
    console.log('-'.repeat(30));
    
    const balance = vendorRows[0].outstanding_balance || 0;
    console.log('Outstanding balance:', balance);

    // STEP 4: Run safety check method
    console.log('\n📋 STEP 4: Safety check method');
    console.log('-'.repeat(30));
    
    const safetyCheck = await db.checkVendorDeletionSafety(vendorId);
    console.log('Safety check result:', safetyCheck);

    // STEP 5: Simulate deletion attempt
    console.log('\n📋 STEP 5: Deletion simulation');
    console.log('-'.repeat(30));
    
    let deletionWouldProceed = true;
    let blockingReasons = [];
    
    if (!safetyCheck.canDelete) {
      deletionWouldProceed = false;
      blockingReasons.push('Safety check failed');
    }
    
    if (executeHasPending || selectHasPending) {
      deletionWouldProceed = false;
      blockingReasons.push('Pending payments detected');
    }
    
    if (balance > 0) {
      deletionWouldProceed = false;
      blockingReasons.push('Outstanding balance exists');
    }
    
    console.log('Would deletion proceed?', deletionWouldProceed);
    console.log('Blocking reasons:', blockingReasons);

    // STEP 6: Check if vendor deletion method exists and what it does
    console.log('\n📋 STEP 6: Method availability check');
    console.log('-'.repeat(30));
    
    console.log('deleteVendor method exists:', typeof db.deleteVendor === 'function');
    console.log('checkVendorDeletionSafety method exists:', typeof db.checkVendorDeletionSafety === 'function');
    
    // STEP 7: Check for protection scripts
    console.log('\n📋 STEP 7: Protection scripts status');
    console.log('-'.repeat(30));
    
    console.log('Vendor deletion fix applied:', !!window.vendorDeletionFixApplied);
    console.log('Ultimate protection applied:', !!window.ultimateVendorProtection);

    // STEP 8: Check stock receiving data
    console.log('\n📋 STEP 8: Stock receiving data');
    console.log('-'.repeat(30));
    
    const stockReceivingData = await db.dbConnection.select(
      'SELECT * FROM stock_receiving WHERE vendor_id = ? AND (payment_status != \'paid\' OR remaining_balance > 0)', 
      [vendorId]
    );
    
    const stockRows = Array.isArray(stockReceivingData) ? stockReceivingData : (stockReceivingData.rows || []);
    console.log('Pending stock receiving records:', stockRows);

    // SUMMARY
    console.log('\n🎯 DIAGNOSTIC SUMMARY');
    console.log('='.repeat(60));
    
    const summary = {
      vendorId,
      vendorExists: vendorRows.length > 0,
      vendorData: vendorRows[0],
      pendingPayments: {
        executeMethod: executeHasPending,
        selectMethod: selectHasPending,
        count: executeRows[0]?.count || selectRows[0]?.count || 0,
        amount: executeRows[0]?.total_pending || selectRows[0]?.total_pending || 0
      },
      outstandingBalance: balance,
      safetyCheck,
      wouldDelete: deletionWouldProceed,
      blockingReasons,
      protectionScripts: {
        vendorDeletionFix: !!window.vendorDeletionFixApplied,
        ultimateProtection: !!window.ultimateVendorProtection
      },
      stockReceivingRecords: stockRows.length
    };
    
    console.log('Final summary:', summary);
    
    // RECOMMENDATION
    console.log('\n💡 RECOMMENDATION');
    console.log('-'.repeat(30));
    
    if (deletionWouldProceed) {
      console.log('🟢 SAFE: Vendor can be deleted (no pending payments or balance)');
    } else {
      console.log('🔴 UNSAFE: Vendor should NOT be deleted');
      console.log('Reasons:', blockingReasons.join(', '));
      console.log('Alternatives:');
      console.log('  1. Complete all pending payments');
      console.log('  2. Settle outstanding balance');
      console.log('  3. Mark vendor as inactive instead');
    }
    
    return summary;

  } catch (error) {
    console.error('❌ DIAGNOSTIC ERROR:', error);
    return { error: error.message };
  }
}

// Test specific vendor that was mentioned as problematic
async function testProblematicVendor() {
  try {
    const db = window.dbService || DatabaseService.getInstance();
    
    // Find vendor with name containing "del"
    const vendors = await db.dbConnection.select('SELECT id, name FROM vendors WHERE name LIKE ?', ['%del%']);
    const vendorRows = Array.isArray(vendors) ? vendors : (vendors.rows || []);
    
    if (vendorRows.length > 0) {
      console.log('🎯 Found vendors with "del" in name:', vendorRows);
      
      for (const vendor of vendorRows) {
        await fullVendorDeletionDiagnostic(vendor.id);
      }
    } else {
      console.log('ℹ️ No vendors with "del" in name found');
    }
  } catch (error) {
    console.log('ℹ️ Auto-test failed:', error.message);
  }
}

// Make functions globally available
window.fullVendorDeletionDiagnostic = fullVendorDeletionDiagnostic;
window.testProblematicVendor = testProblematicVendor;

console.log('🔍 VENDOR DELETION DIAGNOSTIC LOADED');
console.log('📝 Usage:');
console.log('  - await fullVendorDeletionDiagnostic(VENDOR_ID)');
console.log('  - await testProblematicVendor()');

// Auto-run test for problematic vendor
testProblematicVendor();
