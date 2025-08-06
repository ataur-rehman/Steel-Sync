/**
 * VENDOR DELETION DIAGNOSTIC TOOL
 * 
 * This tool helps diagnose and verify vendor deletion safety checks
 * Use this to test if the vendor deletion fix is working properly
 * 
 * To use: Copy and paste this entire script into browser console
 */

async function diagnoseVendorDeletion(vendorId) {
  console.log(`🔍 DIAGNOSTIC: Starting vendor deletion analysis for vendor ${vendorId}...`);
  
  try {
    const db = window.dbService || DatabaseService.getInstance();
    
    if (!db) {
      console.error('❌ Database service not found!');
      return { error: 'Database service not available' };
    }

    // Test 1: Check current safety check method
    console.log('📋 TEST 1: Running safety check...');
    const safetyCheck = await db.checkVendorDeletionSafety(vendorId);
    console.log('Safety check result:', safetyCheck);

    // Test 2: Manual database query to verify data
    console.log('📋 TEST 2: Manual verification of pending payments...');
    
    // Test with both execute and select methods to see format differences
    let executeResult, selectResult;
    
    try {
      executeResult = await db.dbConnection.execute(
        `SELECT COUNT(*) as count, SUM(remaining_balance) as total_pending 
         FROM stock_receiving 
         WHERE vendor_id = ? AND (payment_status != 'paid' OR remaining_balance > 0)`,
        [vendorId]
      );
      console.log('Execute method result:', executeResult);
    } catch (e) {
      console.log('Execute method error:', e);
    }

    try {
      selectResult = await db.dbConnection.select(
        `SELECT COUNT(*) as count, SUM(remaining_balance) as total_pending 
         FROM stock_receiving 
         WHERE vendor_id = ? AND (payment_status != 'paid' OR remaining_balance > 0)`,
        [vendorId]
      );
      console.log('Select method result:', selectResult);
    } catch (e) {
      console.log('Select method error:', e);
    }

    // Test 3: Check if fix handles both formats correctly
    console.log('📋 TEST 3: Testing format handling...');
    
    // Test execute result handling
    const executeRows = executeResult?.rows || executeResult || [];
    const selectRows = Array.isArray(selectResult) ? selectResult : (selectResult?.rows || []);
    
    console.log('Execute rows after fix:', executeRows);
    console.log('Select rows after fix:', selectRows);

    // Test 4: Check actual vendor data
    console.log('📋 TEST 4: Checking vendor data...');
    const vendorData = await db.dbConnection.select('SELECT * FROM vendors WHERE id = ?', [vendorId]);
    console.log('Vendor data:', vendorData);

    // Test 5: Check stock receiving data
    console.log('📋 TEST 5: Checking stock receiving data...');
    const stockReceivingData = await db.dbConnection.select(
      'SELECT * FROM stock_receiving WHERE vendor_id = ?', 
      [vendorId]
    );
    console.log('Stock receiving data:', stockReceivingData);

    // Summary
    const hasPendingPayments = (executeRows.length > 0 && executeRows[0]?.count > 0) || 
                              (selectRows.length > 0 && selectRows[0]?.count > 0);

    const summary = {
      vendorId,
      safetyCheck,
      hasPendingPayments,
      executeMethod: {
        result: executeResult,
        processedRows: executeRows,
        foundPending: executeRows.length > 0 && executeRows[0]?.count > 0
      },
      selectMethod: {
        result: selectResult,
        processedRows: selectRows,
        foundPending: selectRows.length > 0 && selectRows[0]?.count > 0
      },
      recommendation: hasPendingPayments ? 
        'SAFE: Vendor has pending payments and should NOT be deleted' :
        'WARNING: No pending payments found - deletion would proceed'
    };

    console.log('🎯 DIAGNOSTIC SUMMARY:', summary);
    return summary;

  } catch (error) {
    console.error('❌ DIAGNOSTIC ERROR:', error);
    return { error: error.message };
  }
}

// Test the vendor that was reported as having issues
console.log('🚀 VENDOR DELETION DIAGNOSTIC TOOL LOADED');
console.log('📝 To test a vendor, run: await diagnoseVendorDeletion(VENDOR_ID)');
console.log('📝 Example: await diagnoseVendorDeletion(1)');

// Auto-test if we can find the problematic vendor
async function autoTestProblematicVendor() {
  try {
    const db = window.dbService || DatabaseService.getInstance();
    
    // Find vendors with name "del" as mentioned in the error
    const vendors = await db.dbConnection.select(
      'SELECT id, name FROM vendors WHERE name LIKE ?', 
      ['%del%']
    );
    
    if (vendors && vendors.length > 0) {
      console.log('🎯 Found potential problematic vendor(s):', vendors);
      
      for (const vendor of vendors) {
        console.log(`\n🔍 Testing vendor: ${vendor.name} (ID: ${vendor.id})`);
        await diagnoseVendorDeletion(vendor.id);
      }
    } else {
      console.log('ℹ️ No vendors with "del" in name found. Try manually with specific vendor ID.');
    }
  } catch (error) {
    console.log('ℹ️ Auto-test failed, use manual testing:', error.message);
  }
}

// Run auto-test
autoTestProblematicVendor();

// Make diagnostic function globally available
window.diagnoseVendorDeletion = diagnoseVendorDeletion;
