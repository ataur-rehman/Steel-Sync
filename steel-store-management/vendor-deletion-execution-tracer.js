/**
 * VENDOR DELETION EXECUTION TRACER
 * 
 * This script will trace EVERY step of the vendor deletion process
 * to identify exactly where the inconsistency occurs
 */

console.log('🕵️ VENDOR DELETION EXECUTION TRACER - ACTIVATING...');

// Get the database service instance
const db = window.dbService || DatabaseService.getInstance();

if (!db) {
  console.error('❌ Database service not found!');
  throw new Error('Database service not available');
}

// Store original methods for tracing
const originalDeleteVendor = db.deleteVendor;
const originalCheckSafety = db.checkVendorDeletionSafety;
const originalExecute = db.dbConnection.execute;
const originalSelect = db.dbConnection.select;

// TRACE LAYER 1: Database connection methods
db.dbConnection.execute = async function(query, params) {
  const queryStart = Date.now();
  console.log(`🔧 [DB-EXECUTE] Query: ${query.substring(0, 100)}...`);
  console.log(`🔧 [DB-EXECUTE] Params:`, params);
  
  try {
    const result = await originalExecute.call(this, query, params);
    const queryTime = Date.now() - queryStart;
    console.log(`✅ [DB-EXECUTE] Success (${queryTime}ms):`, result);
    return result;
  } catch (error) {
    const queryTime = Date.now() - queryStart;
    console.error(`❌ [DB-EXECUTE] Error (${queryTime}ms):`, error);
    throw error;
  }
};

db.dbConnection.select = async function(query, params) {
  const queryStart = Date.now();
  console.log(`🔍 [DB-SELECT] Query: ${query.substring(0, 100)}...`);
  console.log(`🔍 [DB-SELECT] Params:`, params);
  
  try {
    const result = await originalSelect.call(this, query, params);
    const queryTime = Date.now() - queryStart;
    console.log(`✅ [DB-SELECT] Success (${queryTime}ms):`, result);
    return result;
  } catch (error) {
    const queryTime = Date.now() - queryStart;
    console.error(`❌ [DB-SELECT] Error (${queryTime}ms):`, error);
    throw error;
  }
};

// TRACE LAYER 2: Safety check method
db.checkVendorDeletionSafety = async function(vendorId) {
  console.log(`\n🛡️ [SAFETY-CHECK] Starting safety check for vendor ${vendorId}`);
  
  try {
    const result = await originalCheckSafety.call(this, vendorId);
    console.log(`🛡️ [SAFETY-CHECK] Result:`, result);
    
    if (!result.canDelete) {
      console.log(`🚫 [SAFETY-CHECK] DELETION BLOCKED - Reasons:`, result.reasons);
      console.log(`💡 [SAFETY-CHECK] Alternatives:`, result.alternatives);
    } else {
      console.log(`✅ [SAFETY-CHECK] DELETION ALLOWED - No blocking issues found`);
    }
    
    return result;
  } catch (error) {
    console.error(`❌ [SAFETY-CHECK] Error during safety check:`, error);
    throw error;
  }
};

// TRACE LAYER 3: Main deletion method
db.deleteVendor = async function(vendorId) {
  console.log(`\n🗑️ [DELETE-VENDOR] ========== STARTING DELETION PROCESS ==========`);
  console.log(`🗑️ [DELETE-VENDOR] Vendor ID: ${vendorId}`);
  console.log(`🗑️ [DELETE-VENDOR] Timestamp: ${new Date().toISOString()}`);
  
  const executionTrace = {
    vendorId,
    startTime: Date.now(),
    steps: [],
    errors: []
  };
  
  try {
    executionTrace.steps.push('Method called');
    
    // Call original method and trace every step
    console.log(`🗑️ [DELETE-VENDOR] Calling original deleteVendor method...`);
    const result = await originalDeleteVendor.call(this, vendorId);
    
    executionTrace.steps.push('Method completed successfully');
    const totalTime = Date.now() - executionTrace.startTime;
    
    console.log(`🗑️ [DELETE-VENDOR] ========== DELETION COMPLETED ==========`);
    console.log(`🗑️ [DELETE-VENDOR] Total time: ${totalTime}ms`);
    console.log(`🗑️ [DELETE-VENDOR] Execution trace:`, executionTrace);
    
    // POST-DELETION VERIFICATION
    console.log(`\n🔍 [POST-DELETE] Verifying deletion result...`);
    
    setTimeout(async () => {
      try {
        // Check if vendor still exists
        const vendorCheck = await originalSelect.call(this, 'SELECT * FROM vendors WHERE id = ?', [vendorId]);
        const vendorRows = Array.isArray(vendorCheck) ? vendorCheck : (vendorCheck.rows || []);
        
        if (vendorRows.length === 0) {
          console.log(`✅ [POST-DELETE] Vendor ${vendorId} successfully deleted from database`);
        } else {
          console.error(`❌ [POST-DELETE] CRITICAL: Vendor ${vendorId} still exists in database!`, vendorRows[0]);
        }
        
        // Check if there were pending payments
        const pendingCheck = await originalSelect.call(this, 
          'SELECT * FROM stock_receiving WHERE vendor_id = ? AND (payment_status != ? OR remaining_balance > 0)', 
          [vendorId, 'paid']
        );
        const pendingRows = Array.isArray(pendingCheck) ? pendingCheck : (pendingCheck.rows || []);
        
        if (pendingRows.length > 0) {
          console.error(`🚨 [POST-DELETE] CRITICAL: Vendor had ${pendingRows.length} pending payments but was deleted anyway!`);
          console.error(`🚨 [POST-DELETE] Pending payments:`, pendingRows);
        } else {
          console.log(`✅ [POST-DELETE] No pending payments found - deletion was safe`);
        }
        
      } catch (error) {
        console.error(`❌ [POST-DELETE] Error during post-deletion verification:`, error);
      }
    }, 500);
    
    return result;
    
  } catch (error) {
    executionTrace.errors.push({
      step: 'Error caught',
      error: error.message,
      timestamp: Date.now() - executionTrace.startTime
    });
    
    const totalTime = Date.now() - executionTrace.startTime;
    console.error(`❌ [DELETE-VENDOR] ========== DELETION FAILED ==========`);
    console.error(`❌ [DELETE-VENDOR] Error: ${error.message}`);
    console.error(`❌ [DELETE-VENDOR] Total time: ${totalTime}ms`);
    console.error(`❌ [DELETE-VENDOR] Execution trace:`, executionTrace);
    
    // This should prevent deletion
    throw error;
  }
};

console.log('🕵️ VENDOR DELETION EXECUTION TRACER ACTIVATED!');
console.log('📝 Now try to delete a vendor to see the complete execution trace');
console.log('🔍 Every database query and method call will be logged');

// Export tracer info for verification
window.vendorDeletionTracer = {
  timestamp: new Date().toISOString(),
  version: '1.0.0',
  description: 'Complete execution tracer for vendor deletion process',
  originalMethods: {
    deleteVendor: originalDeleteVendor,
    checkSafety: originalCheckSafety,
    execute: originalExecute,
    select: originalSelect
  }
};
