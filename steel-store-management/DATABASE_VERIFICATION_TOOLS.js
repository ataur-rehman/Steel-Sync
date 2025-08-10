/**
 * DIRECT DATABASE STOCK VERIFICATION SCRIPT
 * 
 * This script allows you to directly check what's in the database
 * to verify if the issue is with database updates or UI caching.
 */

// Function to directly query database for a product's current stock
window.verifyDatabaseStock = async function(productId) {
  try {
    console.log('🔍 Direct database verification for product:', productId);
    
    if (!window.db) {
      console.error('❌ Database not available');
      return;
    }
    
    // Get product directly from database (bypasses all caching)
    const product = await window.db.getProduct(productId);
    
    if (!product) {
      console.error('❌ Product not found');
      return;
    }
    
    console.log('📊 Direct database result:');
    console.log(`   Product: ${product.name}`);
    console.log(`   Current Stock: ${product.current_stock}`);
    console.log(`   Updated At: ${product.updated_at}`);
    console.log(`   Raw Product Data:`, product);
    
    // Also get recent stock movements
    const movements = await window.db.getStockMovements({
      productId: productId,
      limit: 5
    });
    
    console.log('📈 Recent stock movements:');
    movements.forEach((movement, index) => {
      console.log(`   ${index + 1}. ${movement.date} ${movement.time}: ${movement.movement_type === 'in' ? '+' : '-'}${movement.quantity} (${movement.reason})`);
    });
    
    return {
      product,
      movements,
      currentStock: product.current_stock,
      lastUpdated: product.updated_at
    };
    
  } catch (error) {
    console.error('❌ Database verification failed:', error);
    return null;
  }
};

// Function to compare UI display vs database value
window.compareStockValues = async function(productId) {
  try {
    console.log('🔍 Comparing UI vs Database values for product:', productId);
    
    // Get from database
    const dbResult = await window.verifyDatabaseStock(productId);
    if (!dbResult) {
      console.error('❌ Could not get database result');
      return;
    }
    
    // Try to find the product in current UI data (if stock report is open)
    const stockReportData = document.querySelector('[data-testid="stock-report-data"]');
    
    console.log('📊 COMPARISON RESULTS:');
    console.log(`   Database Stock: ${dbResult.currentStock}`);
    console.log(`   Database Updated: ${dbResult.lastUpdated}`);
    
    if (stockReportData) {
      console.log('   UI Stock Report: (check manually in the table)');
    } else {
      console.log('   UI Data: Not available (stock report not visible)');
    }
    
    return dbResult;
    
  } catch (error) {
    console.error('❌ Comparison failed:', error);
    return null;
  }
};

// Function to test stock receiving update flow
window.testStockReceivingFlow = async function(productId, testQuantity = "5") {
  try {
    console.log('🚀 Testing stock receiving flow for product:', productId);
    
    // Step 1: Get initial stock
    const initialStock = await window.verifyDatabaseStock(productId);
    if (!initialStock) {
      console.error('❌ Could not get initial stock');
      return;
    }
    
    console.log('📦 STEP 1 - Initial state:');
    console.log(`   Initial Stock: ${initialStock.currentStock}`);
    
    // Step 2: Simulate what happens during stock receiving
    console.log('📦 STEP 2 - Manual verification required:');
    console.log('   1. Create a stock receiving with this product');
    console.log(`   2. Add quantity: ${testQuantity}`);
    console.log('   3. Complete the receiving');
    console.log('   4. Check console for update events');
    console.log('   5. Run: verifyDatabaseStock(' + productId + ') to check result');
    
    return initialStock;
    
  } catch (error) {
    console.error('❌ Test setup failed:', error);
    return null;
  }
};

console.log('🛠️ Database verification tools loaded:');
console.log('   - verifyDatabaseStock(productId) - Check database directly');
console.log('   - compareStockValues(productId) - Compare UI vs Database');
console.log('   - testStockReceivingFlow(productId) - Test the full flow');
console.log('');
console.log('💡 Usage example:');
console.log('   verifyDatabaseStock(1) // Check product ID 1');

export {};
