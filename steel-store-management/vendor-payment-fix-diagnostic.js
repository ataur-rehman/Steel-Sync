/**
 * VENDOR PAYMENT STATUS FIX DIAGNOSTIC
 * Run this in browser console to fix vendor payment status issues
 */

async function fixVendorPaymentStatusIssues() {
  console.log('🔧 Starting Vendor Payment Status Fix...');
  
  try {
    // Fix 1: Update all stock receiving payment status calculations
    console.log('📝 Fixing stock receiving payment status calculations...');
    
    const updateResult = await db.executeRawQuery(`
      UPDATE stock_receiving 
      SET payment_status = CASE
        WHEN (
          SELECT COALESCE(SUM(amount), 0) FROM vendor_payments 
          WHERE receiving_id = stock_receiving.id
        ) >= total_cost THEN 'paid'
        WHEN (
          SELECT COALESCE(SUM(amount), 0) FROM vendor_payments 
          WHERE receiving_id = stock_receiving.id
        ) > 0 THEN 'partial'
        ELSE 'pending'
      END
    `);
    
    console.log('✅ Payment status calculations fixed');
    
    // Fix 2: Get all stock receiving records to verify fixes
    console.log('📊 Verifying stock receiving payment statuses...');
    
    const stockReceivings = await db.executeRawQuery(`
      SELECT 
        sr.id,
        sr.receiving_number,
        sr.vendor_name,
        sr.total_cost,
        COALESCE((SELECT SUM(amount) FROM vendor_payments WHERE receiving_id = sr.id), 0) as total_paid,
        (sr.total_cost - COALESCE((SELECT SUM(amount) FROM vendor_payments WHERE receiving_id = sr.id), 0)) as remaining,
        sr.payment_status,
        CASE 
          WHEN COALESCE((SELECT SUM(amount) FROM vendor_payments WHERE receiving_id = sr.id), 0) >= sr.total_cost 
          THEN 'paid'
          WHEN COALESCE((SELECT SUM(amount) FROM vendor_payments WHERE receiving_id = sr.id), 0) > 0 
          THEN 'partial'
          ELSE 'pending'
        END as correct_status
      FROM stock_receiving sr
      ORDER BY sr.id DESC
      LIMIT 10
    `);
    
    console.table(stockReceivings);
    
    // Fix 3: Identify mismatched payment statuses
    const mismatchedStatuses = stockReceivings.filter(sr => 
      sr.payment_status !== sr.correct_status
    );
    
    if (mismatchedStatuses.length > 0) {
      console.warn('⚠️ Found mismatched payment statuses:', mismatchedStatuses);
    } else {
      console.log('✅ All payment statuses are correct');
    }
    
    // Fix 4: Show vendor payment summary
    console.log('💰 Vendor payment summary:');
    
    const vendorSummary = await db.executeRawQuery(`
      SELECT 
        v.id,
        v.name as vendor_name,
        COALESCE(SUM(sr.total_cost), 0) as total_purchases,
        COALESCE(SUM(vp.amount), 0) as total_payments,
        (COALESCE(SUM(sr.total_cost), 0) - COALESCE(SUM(vp.amount), 0)) as outstanding_balance,
        COUNT(DISTINCT sr.id) as total_receivings,
        COUNT(DISTINCT vp.id) as total_payments_count,
        CASE 
          WHEN COALESCE(SUM(vp.amount), 0) >= COALESCE(SUM(sr.total_cost), 0) THEN 'Fully Paid'
          WHEN COALESCE(SUM(vp.amount), 0) > 0 THEN 'Partial Payment'
          ELSE 'No Payments'
        END as payment_score
      FROM vendors v
      LEFT JOIN stock_receiving sr ON v.id = sr.vendor_id
      LEFT JOIN vendor_payments vp ON sr.id = vp.receiving_id
      GROUP BY v.id, v.name
      HAVING total_purchases > 0 OR total_payments > 0
      ORDER BY total_purchases DESC
    `);
    
    console.table(vendorSummary);
    
    // Fix 5: Test a specific stock receiving if provided
    const testReceivingId = prompt('Enter a Stock Receiving ID to test (or press Cancel to skip):');
    if (testReceivingId && !isNaN(testReceivingId)) {
      console.log(`🔍 Testing Stock Receiving ID: ${testReceivingId}`);
      
      const testResult = await db.getStockReceivingById(parseInt(testReceivingId));
      console.log('📋 Stock Receiving Details:', testResult);
      
      // Show payments for this receiving
      const payments = await db.executeRawQuery(`
        SELECT * FROM vendor_payments WHERE receiving_id = ?
      `, [testReceivingId]);
      
      console.log('💳 Payments for this receiving:', payments);
    }
    
    console.log('✅ Vendor Payment Status Fix Complete!');
    
    return {
      success: true,
      fixedRecords: stockReceivings.length,
      mismatchedStatuses: mismatchedStatuses.length,
      vendorSummary: vendorSummary
    };
    
  } catch (error) {
    console.error('❌ Error fixing vendor payment status:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the fix automatically
console.log('🚀 Running Vendor Payment Status Fix Diagnostic...');
fixVendorPaymentStatusIssues().then(result => {
  if (result.success) {
    console.log('🎉 All fixes applied successfully!');
  } else {
    console.error('💥 Fix failed:', result.error);
  }
});
