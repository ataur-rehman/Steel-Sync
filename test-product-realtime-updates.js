/**
 * 🧪 REAL-TIME PRODUCT UPDATE TEST FOR INVOICE FORM
 * 
 * This script tests the event listeners and real-time updates
 * in the Invoice Form when products are edited.
 * 
 * To test:
 * 1. Open the application in browser (http://localhost:5174/)
 * 2. Navigate to Invoice Form
 * 3. Open browser console (F12)
 * 4. Paste this script and run it
 * 5. Watch for real-time updates in the product dropdown
 */

console.log(`
🧪 INVOICE FORM REAL-TIME UPDATE TEST
====================================
Testing event listeners and product dropdown updates...
`);

// Test function to simulate product updates
window.testInvoiceFormRealTime = {
    // Test event bus connectivity
    async testEventBus() {
        console.log('🔄 Testing Event Bus connectivity...');

        try {
            // Get the event bus from the application
            const { eventBus, BUSINESS_EVENTS } = await import('/src/utils/eventBus.js');

            console.log('✅ Event Bus imported successfully');
            console.log('📋 Available Events:', Object.keys(BUSINESS_EVENTS));

            return { eventBus, BUSINESS_EVENTS };
        } catch (error) {
            console.error('❌ Failed to import Event Bus:', error);
            return null;
        }
    },

    // Test product update event
    async testProductUpdate() {
        console.log('📦 Testing PRODUCT_UPDATED event...');

        const eventSystem = await this.testEventBus();
        if (!eventSystem) return;

        const { eventBus, BUSINESS_EVENTS } = eventSystem;

        // Emit a test product update event
        const testData = {
            productId: 1,
            productName: 'Test Product Update',
            category: 'Test Category',
            timestamp: Date.now()
        };

        console.log('🚀 Emitting PRODUCT_UPDATED event...', testData);
        eventBus.emit(BUSINESS_EVENTS.PRODUCT_UPDATED, testData);

        console.log('✅ Event emitted! Check Invoice Form for updates...');
    },

    // Test stock update event  
    async testStockUpdate() {
        console.log('📊 Testing STOCK_UPDATED event...');

        const eventSystem = await this.testEventBus();
        if (!eventSystem) return;

        const { eventBus, BUSINESS_EVENTS } = eventSystem;

        // Emit a test stock update event
        const testData = {
            productId: 1,
            productName: 'Test Stock Update',
            type: 'adjustment',
            newStock: '500-0', // 500kg format
            timestamp: Date.now()
        };

        console.log('🚀 Emitting STOCK_UPDATED event...', testData);
        eventBus.emit(BUSINESS_EVENTS.STOCK_UPDATED, testData);

        console.log('✅ Event emitted! Check Invoice Form for stock updates...');
    },

    // Monitor events being received
    async monitorEvents() {
        console.log('👁️ Starting event monitoring...');

        const eventSystem = await this.testEventBus();
        if (!eventSystem) return;

        const { eventBus, BUSINESS_EVENTS } = eventSystem;

        // Monitor all relevant events
        const eventsToMonitor = [
            'PRODUCT_CREATED',
            'PRODUCT_UPDATED',
            'PRODUCT_DELETED',
            'STOCK_UPDATED',
            'STOCK_MOVEMENT_CREATED',
            'PRODUCTS_UPDATED',
            'UI_REFRESH_REQUESTED'
        ];

        eventsToMonitor.forEach(eventName => {
            const handler = (data) => {
                console.log(`📡 [MONITOR] ${eventName} received:`, data);
            };

            eventBus.on(eventName, handler);
            console.log(`✅ Monitoring: ${eventName}`);
        });

        console.log('🎯 Event monitoring active. Events will be logged here...');
    },

    // Check if Invoice Form event listeners are active
    checkInvoiceFormListeners() {
        console.log('🔍 Checking if Invoice Form event listeners are active...');

        // Check for Invoice Form specific logs
        const originalConsoleLog = console.log;
        let listenerCount = 0;

        console.log = (...args) => {
            const message = args.join(' ');
            if (message.includes('InvoiceForm') && message.includes('event listener')) {
                listenerCount++;
                originalConsoleLog(`📍 Found: ${message}`);
            }
            originalConsoleLog(...args);
        };

        // Restore console.log after 1 second
        setTimeout(() => {
            console.log = originalConsoleLog;
            console.log(`🎯 Found ${listenerCount} Invoice Form event listeners`);
        }, 1000);

        console.log('✅ Listener check initiated');
    },

    // 🔧 NEW: Test cache invalidation specifically
    async testCacheInvalidation() {
        console.log('🗂️ Testing cache invalidation...');

        try {
            // Get database instance
            const { db } = await import('/src/services/database.js');

            console.log('✅ Database imported successfully');

            // Test if invalidateProductCache method exists
            if (typeof db.invalidateProductCache === 'function') {
                console.log('✅ invalidateProductCache method exists');
                db.invalidateProductCache();
                console.log('✅ Product cache invalidated manually');
            } else {
                console.log('⚠️ invalidateProductCache method not found');
            }

            // Test direct cache clearing
            if (window.clearCaches && typeof window.clearCaches === 'function') {
                console.log('✅ Global clearCaches function found');
                window.clearCaches();
                console.log('✅ All caches cleared globally');
            } else {
                console.log('⚠️ Global clearCaches function not found');
            }

            // Force database reinitialization
            await db.initialize();
            console.log('✅ Database reinitialized');

            return db;
        } catch (error) {
            console.error('❌ Cache invalidation test failed:', error);
            return null;
        }
    },

    // 🔧 NEW: Force refresh product data bypassing all caches
    async forceProductRefresh() {
        console.log('🔄 Forcing complete product refresh...');

        try {
            const db = await this.testCacheInvalidation();
            if (!db) return;

            // Method 1: Direct SQL query bypassing executeSmartQuery
            console.log('📊 Method 1: Direct SQL query...');
            const directResult = await db.dbConnection.execute(`
                SELECT * FROM products WHERE status = 'active' ORDER BY name ASC
            `);
            console.log(`✅ Direct query returned ${directResult.length} products`);

            // Method 2: Using executeSmartQuery with cache bypass
            console.log('📊 Method 2: executeSmartQuery...');
            const smartResult = await db.executeSmartQuery(`
                SELECT * FROM products WHERE status = 'active' ORDER BY name ASC
            `);
            console.log(`✅ Smart query returned ${smartResult.length} products`);

            // Method 3: Using getProducts method
            console.log('📊 Method 3: getProducts method...');
            const getProductsResult = await db.getProducts();
            console.log(`✅ getProducts returned ${getProductsResult.length} products`);

            // Compare results
            if (directResult.length === smartResult.length && smartResult.length === getProductsResult.length) {
                console.log('✅ All methods returned consistent results - no cache issues');
            } else {
                console.log('⚠️ CACHE ISSUE DETECTED - Different methods returned different counts:');
                console.log(`   Direct: ${directResult.length}, Smart: ${smartResult.length}, getProducts: ${getProductsResult.length}`);
            }

            return {
                direct: directResult,
                smart: smartResult,
                getProducts: getProductsResult
            };

        } catch (error) {
            console.error('❌ Force refresh failed:', error);
            return null;
        }
    },

    // 🔧 NEW: Test complete end-to-end update flow
    async testCompleteUpdateFlow() {
        console.log('🔄 Testing complete update flow with cache handling...');

        const eventSystem = await this.testEventBus();
        if (!eventSystem) return;

        const { eventBus, BUSINESS_EVENTS } = eventSystem;

        // Step 1: Clear all caches
        console.log('🗂️ Step 1: Clearing caches...');
        await this.testCacheInvalidation();

        // Step 2: Get initial product data
        console.log('📊 Step 2: Getting initial product data...');
        const initialData = await this.forceProductRefresh();

        // Step 3: Emit update event with cache clearing
        console.log('🚀 Step 3: Emitting update event...');
        const testData = {
            productId: 1,
            productName: 'Cache Test Product',
            category: 'Test Category',
            timestamp: Date.now(),
            forceCacheRefresh: true
        };

        // Emit multiple events to ensure all listeners catch it
        eventBus.emit(BUSINESS_EVENTS.PRODUCT_UPDATED, testData);
        eventBus.emit('PRODUCTS_UPDATED', testData);
        eventBus.emit('UI_REFRESH_REQUESTED', testData);
        eventBus.emit('FORCE_PRODUCT_RELOAD', testData);
        eventBus.emit('PRODUCTS_CACHE_INVALIDATED', testData);
        eventBus.emit('COMPREHENSIVE_DATA_REFRESH', testData);

        console.log('✅ All update events emitted');

        // Step 4: Wait and verify
        setTimeout(async () => {
            console.log('🔍 Step 4: Verifying after 500ms...');
            const finalData = await this.forceProductRefresh();
            console.log('✅ Complete update flow test finished');
        }, 500);
    }
};

// Instructions for manual testing
console.log(`
📋 MANUAL TESTING INSTRUCTIONS:
==============================

1. Navigate to Invoice Form in the application
2. Open the product dropdown by clicking the search field
3. In this console, run these commands:

   // Test event bus
   testInvoiceFormRealTime.testEventBus()
   
   // Monitor events
   testInvoiceFormRealTime.monitorEvents()
   
   // 🔧 NEW: Test cache invalidation
   testInvoiceFormRealTime.testCacheInvalidation()
   
   // 🔧 NEW: Force product refresh (bypasses caches)
   testInvoiceFormRealTime.forceProductRefresh()
   
   // Test product updates
   testInvoiceFormRealTime.testProductUpdate()
   
   // Test stock updates  
   testInvoiceFormRealTime.testStockUpdate()
   
   // 🔧 NEW: Complete end-to-end test with cache handling
   testInvoiceFormRealTime.testCompleteUpdateFlow()

4. Watch for:
   ✅ Toast notifications saying "Product list updated"
   ✅ Console logs showing event reception
   ✅ Product dropdown refreshing
   ✅ Stock levels updating
   ✅ Cache invalidation confirmations
   ⚠️ Cache inconsistency warnings

Expected Behavior:
- Events should be received within 100ms
- Product dropdown should refresh automatically
- Toast notifications should appear
- Console should show detailed logging
- Cache should be properly invalidated

5. To verify listeners are active:
   testInvoiceFormRealTime.checkInvoiceFormListeners()

6. 🔧 CACHE TROUBLESHOOTING:
   If updates aren't working, try:
   - testInvoiceFormRealTime.testCacheInvalidation()
   - testInvoiceFormRealTime.forceProductRefresh()
   - testInvoiceFormRealTime.testCompleteUpdateFlow()
`);

// Auto-run basic connectivity test
if (typeof window !== 'undefined') {
    console.log('🚀 Auto-running basic connectivity test...');
    window.testInvoiceFormRealTime.testEventBus().then(() => {
        console.log('✅ Basic test complete. Follow manual instructions above.');
    });
}
