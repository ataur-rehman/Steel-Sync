/**
 * EMERGENCY VENDOR DELETION FIX
 * 
 * CRITICAL ISSUE: Database method inconsistency causing vendor deletions to proceed 
 * despite having pending payments
 * 
 * ROOT CAUSE: Same issue as customer code generation - dbConnection.execute() vs dbConnection.select()
 * return different formats, causing null pointer access to .rows property
 * 
 * SOLUTION: Apply defensive programming to handle both return formats
 * 
 * To apply this fix immediately, run in browser console:
 * 
 * fetch('/emergency-vendor-deletion-fix.js')
 *   .then(r => r.text())
 *   .then(code => eval(code))
 *   .then(() => console.log('✅ Emergency vendor deletion fix applied!'))
 */

console.log('🚨 EMERGENCY: Applying vendor deletion safety fix...');

// Get the database service instance
const db = window.dbService || DatabaseService.getInstance();

if (!db) {
  console.error('❌ Database service not found!');
  throw new Error('Database service not available');
}

// Store original methods for restoration if needed
const originalDeleteVendor = db.deleteVendor;
const originalCheckVendorDeletionSafety = db.checkVendorDeletionSafety;

// CRITICAL FIX: Enhanced vendor deletion safety check with null-safe database method handling
db.checkVendorDeletionSafety = async function(vendorId) {
  try {
    console.log(`🔍 [FIXED] Checking vendor deletion safety for vendor ${vendorId}...`);
    
    const reasons = [];
    const warnings = [];
    const alternatives = [];

    // Check for stock receivings with pending payments - FIXED: Null-safe handling
    const stockReceivings = await this.dbConnection.select(
      `SELECT COUNT(*) as count, SUM(CASE WHEN payment_status != 'paid' THEN remaining_balance ELSE 0 END) as pending_amount
       FROM stock_receiving 
       WHERE vendor_id = ? AND (payment_status != 'paid' OR remaining_balance > 0)`,
      [vendorId]
    );

    // CRITICAL FIX: Handle different database method return formats
    const stockReceivingRows = Array.isArray(stockReceivings) ? stockReceivings : (stockReceivings.rows || []);
    console.log(`📊 [FIXED] Stock receiving check:`, { stockReceivingRows, rawResult: stockReceivings });
    
    if (stockReceivingRows.length > 0 && stockReceivingRows[0]?.count > 0) {
      const count = stockReceivingRows[0].count;
      const amount = stockReceivingRows[0].pending_amount?.toFixed(2) || '0';
      console.log(`❌ [FIXED] Found ${count} pending payments totaling ₹${amount}`);
      
      reasons.push(`${count} stock receiving(s) with pending payments (₹${amount})`);
      alternatives.push("Mark vendor as inactive instead of deleting");
      alternatives.push("Complete all pending payments before deletion");
    }

    // Check for vendor payments - FIXED: Null-safe handling
    const vendorPayments = await this.dbConnection.select(
      `SELECT COUNT(*) as count FROM vendor_payments WHERE vendor_id = ?`,
      [vendorId]
    );

    const vendorPaymentRows = Array.isArray(vendorPayments) ? vendorPayments : (vendorPayments.rows || []);
    if (vendorPaymentRows.length > 0 && vendorPaymentRows[0]?.count > 0) {
      warnings.push(`${vendorPaymentRows[0].count} payment record(s) exist for this vendor`);
      alternatives.push("Consider archiving vendor data instead of permanent deletion");
    }

    // Check for outstanding balance - FIXED: Null-safe handling
    const vendor = await this.dbConnection.select(
      `SELECT outstanding_balance FROM vendors WHERE id = ?`,
      [vendorId]
    );

    const vendorRows = Array.isArray(vendor) ? vendor : (vendor.rows || []);
    if (vendorRows.length > 0 && (vendorRows[0]?.outstanding_balance || 0) > 0) {
      const balance = vendorRows[0].outstanding_balance?.toFixed(2) || '0';
      reasons.push(`Outstanding balance of ₹${balance}`);
      alternatives.push("Settle outstanding balance before deletion");
    }

    const result = {
      canDelete: reasons.length === 0,
      reasons,
      warnings,
      alternatives
    };

    console.log(`🎯 [FIXED] Vendor deletion safety result:`, result);
    return result;

  } catch (error) {
    console.error('❌ [FIXED] Error checking vendor deletion safety:', error);
    return {
      canDelete: false,
      reasons: ['Unable to verify deletion safety due to database error'],
      warnings: [],
      alternatives: ['Contact system administrator']
    };
  }
};

// CRITICAL FIX: Enhanced vendor deletion with null-safe database method handling
db.deleteVendor = async function(id) {
  try {
    console.log(`🗑️ [FIXED] Attempting to delete vendor ${id}...`);
    
    if (!this.isInitialized) {
      await this.initialize();
    }

    // PRODUCTION-LEVEL SAFETY: Comprehensive deletion safety check
    const safetyCheck = await this.checkVendorDeletionSafety(id);
    console.log(`🔒 [FIXED] Safety check result:`, safetyCheck);
    
    if (!safetyCheck.canDelete) {
      const errorMessage = `Cannot delete vendor: ${safetyCheck.reasons.join(', ')}`;
      console.error('❌ [FIXED] Vendor deletion blocked:', errorMessage);
      console.log('💡 [FIXED] Alternatives:', safetyCheck.alternatives);
      
      // Throw error with detailed information for UI handling
      const error = new Error(errorMessage);
      error.alternatives = safetyCheck.alternatives;
      error.warnings = safetyCheck.warnings;
      throw error;
    }

    // CRITICAL: Double-check with direct database query before deletion - FIXED
    const pendingPayments = await this.dbConnection.execute(
      `SELECT COUNT(*) as count, SUM(remaining_balance) as total_pending 
       FROM stock_receiving 
       WHERE vendor_id = ? AND (payment_status != 'paid' OR remaining_balance > 0)`,
      [id]
    );

    // CRITICAL FIX: Handle different database method return formats
    const pendingRows = pendingPayments.rows || pendingPayments || [];
    console.log(`🔍 [FIXED] Double-check pending payments:`, { pendingRows, rawResult: pendingPayments });
    
    if (pendingRows.length > 0 && pendingRows[0]?.count > 0) {
      const count = pendingRows[0].count;
      const total = pendingRows[0].total_pending || 0;
      const errorMessage = `CRITICAL: Vendor has ${count} pending payments totaling ₹${total}. Cannot delete.`;
      console.error('❌ [FIXED] Double-check failed:', errorMessage);
      throw new Error(errorMessage);
    }

    console.log('✅ [FIXED] All safety checks passed, proceeding with deletion...');

    // PRODUCTION SAFETY: Use transaction for atomic deletion
    await this.dbConnection.execute('BEGIN TRANSACTION');
    
    try {
      // Delete vendor with database-level constraints enforced
      const result = await this.dbConnection.execute(`DELETE FROM vendors WHERE id = ?`, [id]);
      
      if (result.rowsAffected === 0) {
        throw new Error('Vendor not found or already deleted');
      }

      await this.dbConnection.execute('COMMIT');
      console.log(`✅ [FIXED] Vendor ${id} successfully deleted`);

      // REAL-TIME UPDATE: Emit vendor delete event
      try {
        if (window.eventBus) {
          window.eventBus.emit('vendor:deleted', { vendorId: id });
          console.log(`✅ [FIXED] VENDOR_DELETED event emitted for vendor ID: ${id}`);
        }
      } catch (eventError) {
        console.warn('⚠️ [FIXED] Could not emit VENDOR_DELETED event:', eventError);
      }

    } catch (deleteError) {
      console.error('❌ [FIXED] Deletion failed, rolling back:', deleteError);
      await this.dbConnection.execute('ROLLBACK');
      throw deleteError;
    }

  } catch (error) {
    console.error('❌ [FIXED] Error deleting vendor:', error);
    
    // Enhanced error handling for UI
    if (typeof error === 'object' && error !== null && 'message' in error && 
        typeof error.message === 'string' && error.message.includes('ABORT')) {
      throw new Error('Database constraint prevents vendor deletion: Has pending payments or outstanding balance');
    }
    
    throw error;
  }
};

console.log('✅ EMERGENCY: Vendor deletion safety fix applied successfully!');
console.log('🔧 The vendor deletion bug has been patched with null-safe database method handling');
console.log('🛡️ Vendors with pending payments will now be properly protected from deletion');

// Export fix info for verification
window.vendorDeletionFixApplied = {
  timestamp: new Date().toISOString(),
  version: '1.0.0',
  description: 'Emergency fix for vendor deletion safety - handles database method return format inconsistency',
  originalMethods: {
    deleteVendor: originalDeleteVendor,
    checkVendorDeletionSafety: originalCheckVendorDeletionSafety
  }
};
