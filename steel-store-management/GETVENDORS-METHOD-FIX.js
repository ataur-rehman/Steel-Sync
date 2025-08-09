/**
 * GETVENDORS METHOD FIX
 * 
 * The getVendors method exists but returns empty array while direct queries work.
 * This fix replaces the complex getVendors logic with a simple working implementation.
 */

console.log('🔧 [GETVENDORS FIX] Fixing getVendors method implementation...');

window.GETVENDORS_METHOD_FIX = {

  // Test current getVendors method in detail
  async analyzeGetVendorsMethod() {
    console.log('🔍 [ANALYZE] Analyzing getVendors method in detail...');
    
    const db = window.db || window.database;
    if (!db) {
      throw new Error('Database not available');
    }
    
    console.log('🔍 Checking getVendors method existence and properties...');
    console.log('getVendors exists:', typeof db.getVendors === 'function');
    console.log('getVendors method:', db.getVendors.toString().substring(0, 200) + '...');
    
    try {
      // Test with detailed logging
      console.log('🧪 Calling getVendors with detailed logging...');
      
      // Add temporary logging to understand what's happening inside
      const originalLog = console.log;
      const logs = [];
      console.log = (...args) => {
        logs.push(args.join(' '));
        originalLog(...args);
      };
      
      const result = await db.getVendors();
      
      // Restore console.log
      console.log = originalLog;
      
      console.log('📊 getVendors result analysis:');
      console.log('- Type:', typeof result);
      console.log('- Is Array:', Array.isArray(result));
      console.log('- Length:', result?.length);
      console.log('- Content:', result);
      console.log('- Method logs captured:', logs);
      
      return {
        result,
        logs,
        type: typeof result,
        isArray: Array.isArray(result),
        length: result?.length || 0
      };
      
    } catch (error) {
      console.error('❌ getVendors method failed:', error);
      return {
        error: error.message,
        stack: error.stack
      };
    }
  },

  // Override getVendors method with working implementation
  async fixGetVendorsMethod() {
    console.log('🔧 [FIX] Overriding getVendors method with working implementation...');
    
    const db = window.db || window.database;
    if (!db) {
      throw new Error('Database not available');
    }
    
    // Store original method for reference
    const originalGetVendors = db.getVendors;
    console.log('📦 Original getVendors method stored');
    
    // Create new working implementation
    db.getVendors = async function() {
      console.log('🚀 [FIXED METHOD] Using fixed getVendors implementation...');
      
      try {
        if (!this.dbConnection?.isReady()) {
          console.error('❌ Database connection not ready');
          return [];
        }
        
        // Simple direct query that works
        const vendors = await this.dbConnection.select(`
          SELECT 
            id,
            vendor_code,
            name,
            company_name,
            contact_person,
            phone,
            email,
            address,
            billing_address,
            shipping_address,
            city,
            state,
            country,
            postal_code,
            tax_number,
            registration_number,
            website,
            balance,
            credit_limit,
            credit_days,
            payment_terms,
            discount_percentage,
            category,
            priority,
            rating,
            is_active,
            bank_name,
            bank_account_number,
            bank_account_name,
            notes,
            internal_notes,
            tags,
            last_order_date,
            total_orders,
            total_amount_ordered,
            created_by,
            updated_by,
            created_at,
            updated_at
          FROM vendors 
          WHERE is_active = 1
          ORDER BY name ASC
        `);
        
        console.log(`✅ [FIXED METHOD] Found ${vendors.length} vendors using fixed implementation`);
        
        // Ensure array return and basic data transformation
        if (!Array.isArray(vendors)) {
          console.warn('⚠️ Query returned non-array, converting...');
          return [];
        }
        
        // Basic data transformation to ensure consistency
        return vendors.map(vendor => ({
          ...vendor,
          is_active: Boolean(vendor.is_active === 1 || vendor.is_active === true),
          balance: parseFloat(vendor.balance || 0),
          credit_limit: parseFloat(vendor.credit_limit || 0),
          credit_days: parseInt(vendor.credit_days || 0),
          total_orders: parseInt(vendor.total_orders || 0),
          total_amount_ordered: parseFloat(vendor.total_amount_ordered || 0),
          rating: parseInt(vendor.rating || 0)
        }));
        
      } catch (error) {
        console.error('❌ [FIXED METHOD] Error in fixed getVendors:', error);
        return [];
      }
    };
    
    // Bind the method to preserve 'this' context
    db.getVendors = db.getVendors.bind(db);
    
    console.log('✅ getVendors method successfully overridden with working implementation');
    
    // Test the new method
    console.log('🧪 Testing fixed getVendors method...');
    const testResult = await db.getVendors();
    console.log(`📊 Fixed method test result: Found ${testResult.length} vendors`);
    
    if (testResult.length > 0) {
      console.log('📋 Sample vendor from fixed method:', testResult[0]);
    }
    
    return {
      success: true,
      vendorCount: testResult.length,
      originalMethod: originalGetVendors,
      testResult: testResult[0] || null
    };
  },

  // Complete getVendors method fix
  async completeGetVendorsMethodFix() {
    console.log('🚀 [COMPLETE] Starting complete getVendors method fix...');
    
    try {
      // Step 1: Analyze current method
      console.log('🔍 Step 1: Analyzing current getVendors method...');
      const analysis = await this.analyzeGetVendorsMethod();
      console.log('Analysis result:', analysis);
      
      // Step 2: Fix the method
      console.log('🔧 Step 2: Fixing getVendors method...');
      const fixResult = await this.fixGetVendorsMethod();
      console.log('Fix result:', fixResult);
      
      if (fixResult.success && fixResult.vendorCount > 0) {
        console.log('🎉 [SUCCESS] getVendors method successfully fixed!');
        console.log(`✅ ${fixResult.vendorCount} vendors are now available via getVendors`);
        
        // Test the UI refresh
        if (window.location.pathname.includes('vendor')) {
          console.log('🔄 Refreshing vendor management page...');
          alert(`getVendors method fixed!\n${fixResult.vendorCount} vendors are now available.\nPage will refresh automatically.`);
          setTimeout(() => window.location.reload(), 1000);
        }
        
        return {
          success: true,
          vendorsAvailable: fixResult.vendorCount,
          message: 'getVendors method successfully fixed',
          sampleVendor: fixResult.testResult
        };
      } else {
        throw new Error('getVendors method fix failed or no vendors available');
      }
      
    } catch (error) {
      console.error('❌ [GETVENDORS METHOD FIX FAILED]', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Restore original method if needed
  async restoreOriginalMethod() {
    console.log('🔄 [RESTORE] Restoring original getVendors method...');
    
    const db = window.db || window.database;
    if (!db) {
      throw new Error('Database not available');
    }
    
    // This would need to be implemented if we stored the original method
    console.log('ℹ️ To restore original method, reload the page');
    return { message: 'Please reload the page to restore original getVendors method' };
  }
};

// Auto-run the getVendors method fix
window.GETVENDORS_METHOD_FIX.completeGetVendorsMethodFix().then(result => {
  console.log('🏁 [GETVENDORS FIX FINAL RESULT]', result);
});

console.log(`
🔧 GETVENDORS METHOD FIX LOADED

This fix:
✅ Analyzes the current getVendors method behavior
✅ Replaces complex logic with simple working implementation  
✅ Tests the fixed method immediately
✅ Preserves all vendor data fields
✅ Refreshes the page to show vendors in UI

Running automatically...

Manual commands:
• window.GETVENDORS_METHOD_FIX.analyzeGetVendorsMethod()
• window.GETVENDORS_METHOD_FIX.fixGetVendorsMethod()
• window.GETVENDORS_METHOD_FIX.completeGetVendorsMethodFix()
• window.GETVENDORS_METHOD_FIX.restoreOriginalMethod()
`);
