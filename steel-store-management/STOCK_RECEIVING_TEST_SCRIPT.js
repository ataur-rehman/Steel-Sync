/**
 * STOCK RECEIVING UPDATE TEST SCRIPT
 * 
 * Run this in the browser console to test if the stock receiving update process works
 */

// Test function to create a stock receiving and verify the full flow
window.testStockReceivingUpdate = async function(productId = 1, quantity = "5") {
  console.log('🧪 === STARTING STOCK RECEIVING UPDATE TEST ===');
  
  try {
    // Step 1: Get initial product state
    console.log(`📊 Step 1: Getting initial state for product ${productId}`);
    const initialProduct = await window.db.getProduct(productId);
    console.log('Initial product data:', initialProduct);
    console.log(`Initial stock: ${initialProduct.current_stock}`);
    
    // Step 2: Create a test stock receiving
    console.log(`📦 Step 2: Creating stock receiving with ${quantity} quantity`);
    
    const testReceiving = {
      vendor_id: 1,
      vendor_name: "Test Vendor",
      total_amount: 100,
      payment_amount: 0,
      payment_method: "cash",
      status: "pending",
      notes: "Test receiving for debugging",
      truck_number: "TEST123",
      reference_number: "TEST-REF-001",
      created_by: "system-test",
      items: [{
        product_id: productId,
        product_name: initialProduct.name,
        quantity: quantity,
        unit_price: 20,
        total_price: 100,
        notes: "Test item"
      }]
    };
    
    console.log('Creating receiving with data:', testReceiving);
    const receivingId = await window.db.createStockReceiving(testReceiving);
    console.log(`✅ Stock receiving created with ID: ${receivingId}`);
    
    // Step 3: Wait a moment for events to propagate
    console.log('⏳ Step 3: Waiting for events to propagate...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 4: Get updated product state
    console.log(`📊 Step 4: Getting updated state for product ${productId}`);
    const updatedProduct = await window.db.getProduct(productId);
    console.log('Updated product data:', updatedProduct);
    console.log(`Updated stock: ${updatedProduct.current_stock}`);
    
    // Step 5: Verify the change
    console.log('🔍 Step 5: Verifying the change...');
    if (initialProduct.current_stock !== updatedProduct.current_stock) {
      console.log('✅ SUCCESS: Stock was updated in database!');
      console.log(`   ${initialProduct.current_stock} → ${updatedProduct.current_stock}`);
      
      // Check if UI has updated
      console.log('👀 Step 6: Check your UI now - the stock should be updated automatically');
      console.log('   - Check Stock Report if open');
      console.log('   - Check Products list if open'); 
      console.log('   - If not updated, there\'s a UI refresh issue');
      
      return {
        success: true,
        initialStock: initialProduct.current_stock,
        finalStock: updatedProduct.current_stock,
        receivingId: receivingId
      };
      
    } else {
      console.log('❌ FAILURE: Stock was NOT updated in database');
      console.log('   This indicates a problem with the createStockReceiving function');
      
      return {
        success: false,
        error: 'Database not updated',
        initialStock: initialProduct.current_stock,
        finalStock: updatedProduct.current_stock
      };
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return {
      success: false,
      error: error.message || error
    };
  }
};

// Test function to manually trigger events
window.testEventEmission = function() {
  console.log('🧪 Testing event emission...');
  
  console.log('🚀 Emitting STOCK_UPDATED event...');
  eventBus.emit('stock:updated', { 
    productId: 1, 
    test: true,
    timestamp: new Date().toISOString()
  });
  
  console.log('🚀 Emitting PRODUCT_UPDATED event...');
  eventBus.emit('product:updated', { 
    productId: 1, 
    test: true,
    timestamp: new Date().toISOString()
  });
  
  console.log('🚀 Emitting UI_REFRESH_REQUESTED event...');
  eventBus.emit('UI_REFRESH_REQUESTED', { 
    type: 'test',
    timestamp: new Date().toISOString()
  });
  
  console.log('✅ Test events emitted. Check console for listener responses.');
};

// Test function to check event listeners
window.checkEventListeners = function() {
  console.log('🔍 Checking event listeners...');
  
  if (eventBus._events) {
    const events = eventBus._events;
    console.log('📋 Active event listeners:');
    
    Object.keys(events).forEach(eventName => {
      const listenerCount = events[eventName].length;
      console.log(`   ${eventName}: ${listenerCount} listeners`);
    });
    
    // Check specific events we care about
    const importantEvents = [
      'stock:updated',
      'product:updated', 
      'stock:movement_created',
      'UI_REFRESH_REQUESTED',
      'PRODUCTS_UPDATED'
    ];
    
    console.log('🎯 Important events status:');
    importantEvents.forEach(event => {
      const hasListeners = events[event] && events[event].length > 0;
      console.log(`   ${event}: ${hasListeners ? '✅ HAS LISTENERS' : '❌ NO LISTENERS'}`);
    });
    
    return events;
  } else {
    console.log('❌ Cannot access event bus listeners');
    return null;
  }
};

console.log('🧪 Stock receiving test functions loaded:');
console.log('   - testStockReceivingUpdate(productId, quantity) - Test full flow');
console.log('   - testEventEmission() - Test if events are working'); 
console.log('   - checkEventListeners() - Check what listeners are active');
console.log('');
console.log('💡 Usage example:');
console.log('   testStockReceivingUpdate(1, "10") // Test with product ID 1, add 10kg');

export {};
