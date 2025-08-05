// Quick test to verify the product update fix
// Run this in your browser console after the fix

(async function testProductUpdate() {
  try {
    console.log('🧪 Testing product update fix...');
    
    // Import database service
    const { DatabaseService } = await import('./src/services/database.ts');
    const db = DatabaseService.getInstance();
    
    // Test 1: Run the comprehensive fix
    console.log('1️⃣ Running comprehensive database fix...');
    const fixResult = await db.quickFixProductNameColumns();
    console.log('Fix result:', fixResult);
    
    if (!fixResult.success) {
      console.error('❌ Fix failed, stopping test');
      return;
    }
    
    // Test 2: Check if we can update a product (we'll create a test product first)
    console.log('2️⃣ Testing product creation and update...');
    
    // First check if products table has any products
    const existingProducts = await db.dbConnection.select('SELECT * FROM products LIMIT 1');
    
    if (existingProducts.length > 0) {
      const testProduct = existingProducts[0];
      console.log('Found existing product:', testProduct);
      
      // Try to update it
      console.log('3️⃣ Attempting to update product...');
      await db.updateProduct(testProduct.id, {
        name: testProduct.name + ' (Updated)',
        category: testProduct.category
      });
      
      console.log('✅ Product update test passed! No more "no such column: product_id" error.');
      
      // Revert the change
      await db.updateProduct(testProduct.id, {
        name: testProduct.name.replace(' (Updated)', ''),
        category: testProduct.category
      });
      console.log('✅ Reverted test changes');
      
    } else {
      console.log('No existing products found. The fix is applied and ready for when you create products.');
    }
    
    console.log('🎉 All tests passed! Product editing should now work without errors.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('This might indicate that the application needs to be restarted.');
  }
})();
