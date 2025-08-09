/**
 * QUICK VERIFICATION SCRIPT
 * Test specific vendor and stock receiving issues
 */

async function quickVerifyFixes() {
  console.log('🔍 Quick Verification of Vendor Payment Fixes...');
  
  try {
    // Test 1: Check all stock receivings with payment status issues
    console.log('📊 Checking stock receiving payment statuses...');
    
    const problematicReceivings = await db.executeRawQuery(`
      SELECT 
        sr.id,
        sr.receiving_number,
        sr.vendor_name,
        sr.total_cost as total_amount,
        sr.payment_status as current_status,
        COALESCE((SELECT SUM(amount) FROM vendor_payments WHERE receiving_id = sr.id), 0) as actual_paid,
        (sr.total_cost - COALESCE((SELECT SUM(amount) FROM vendor_payments WHERE receiving_id = sr.id), 0)) as actual_outstanding,
        CASE 
          WHEN COALESCE((SELECT SUM(amount) FROM vendor_payments WHERE receiving_id = sr.id), 0) >= sr.total_cost 
          THEN 'paid'
          WHEN COALESCE((SELECT SUM(amount) FROM vendor_payments WHERE receiving_id = sr.id), 0) > 0 
          THEN 'partial'
          ELSE 'pending'
        END as correct_status
      FROM stock_receiving sr
      WHERE sr.payment_status != CASE 
        WHEN COALESCE((SELECT SUM(amount) FROM vendor_payments WHERE receiving_id = sr.id), 0) >= sr.total_cost 
        THEN 'paid'
        WHEN COALESCE((SELECT SUM(amount) FROM vendor_payments WHERE receiving_id = sr.id), 0) > 0 
        THEN 'partial'
        ELSE 'pending'
      END
      ORDER BY sr.id DESC
    `);
    
    if (problematicReceivings.length > 0) {
      console.warn('⚠️ Found stock receivings with incorrect payment status:');
      console.table(problematicReceivings);
      
      // Fix them immediately
      console.log('🔧 Fixing problematic payment statuses...');
      await db.executeRawQuery(`
        UPDATE stock_receiving 
        SET payment_status = CASE
          WHEN (SELECT COALESCE(SUM(amount), 0) FROM vendor_payments WHERE receiving_id = stock_receiving.id) >= total_cost 
          THEN 'paid'
          WHEN (SELECT COALESCE(SUM(amount), 0) FROM vendor_payments WHERE receiving_id = stock_receiving.id) > 0 
          THEN 'partial'
          ELSE 'pending'
        END
      `);
      console.log('✅ Fixed all payment statuses');
    } else {
      console.log('✅ All stock receiving payment statuses are correct');
    }
    
    // Test 2: Show recent stock receivings with their correct payment details
    console.log('📋 Recent Stock Receivings (showing correct payment details):');
    
    const recentReceivings = await db.executeRawQuery(`
      SELECT 
        sr.id,
        sr.receiving_number,
        sr.vendor_name,
        sr.total_cost as total_amount,
        COALESCE((SELECT SUM(amount) FROM vendor_payments WHERE receiving_id = sr.id), 0) as paid_amount,
        (sr.total_cost - COALESCE((SELECT SUM(amount) FROM vendor_payments WHERE receiving_id = sr.id), 0)) as outstanding,
        sr.payment_status,
        sr.created_at
      FROM stock_receiving sr
      ORDER BY sr.id DESC
      LIMIT 5
    `);
    
    console.table(recentReceivings);
    
    // Test 3: Vendor financial summaries
    console.log('💰 Vendor Financial Summaries:');
    
    const vendorFinancials = await db.executeRawQuery(`
      SELECT 
        v.name as vendor_name,
        COUNT(DISTINCT sr.id) as total_purchases,
        COALESCE(SUM(sr.total_cost), 0) as total_purchase_amount,
        COALESCE(SUM(vp.amount), 0) as total_payments,
        (COALESCE(SUM(sr.total_cost), 0) - COALESCE(SUM(vp.amount), 0)) as outstanding_balance,
        ROUND(
          CASE 
            WHEN COALESCE(SUM(sr.total_cost), 0) > 0 
            THEN (COALESCE(SUM(vp.amount), 0) * 100.0 / COALESCE(SUM(sr.total_cost), 0))
            ELSE 0
          END, 2
        ) as payment_score_percentage
      FROM vendors v
      LEFT JOIN stock_receiving sr ON v.id = sr.vendor_id
      LEFT JOIN vendor_payments vp ON sr.id = vp.receiving_id
      GROUP BY v.id, v.name
      HAVING total_purchase_amount > 0 OR total_payments > 0
      ORDER BY total_purchase_amount DESC
      LIMIT 10
    `);
    
    console.table(vendorFinancials);
    
    console.log('✅ Quick verification completed successfully!');
    
    return {
      success: true,
      problematicReceivings: problematicReceivings.length,
      recentReceivings: recentReceivings.length,
      vendorFinancials: vendorFinancials.length
    };
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Auto-run the verification
quickVerifyFixes();
