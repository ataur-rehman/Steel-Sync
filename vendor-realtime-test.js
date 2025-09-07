/**
 * 🔧 VENDOR REAL-TIME UPDATE SYSTEM TEST
 * 
 * This script tests the complete vendor real-time update system across all components:
 * - VendorManagement: Statistics and list updates
 * - VendorDetail: Individual vendor data updates  
 * - StockReceivingNew: Vendor dropdown updates
 * - Event bus integration and cross-component synchronization
 */

console.log(`
🧪 VENDOR REAL-TIME UPDATE SYSTEM TEST
======================================

This test will verify:
✅ Event bus integration across components
✅ Vendor status update propagation  
✅ Real-time statistics synchronization
✅ Cross-component data consistency
✅ Boolean data type handling

Please open your browser's Developer Console (F12) to see detailed logs.

Instructions:
1. Open the Vendor Management page
2. Open the Browser Console (F12 → Console)
3. Edit a vendor's active status
4. Check for real-time updates across all pages
5. Monitor console logs for event flow

`);

// Global test utilities for browser console
window.vendorTestUtils = {

    // Test event bus connectivity
    testEventBus() {
        console.log('🔄 Testing Event Bus connectivity...');

        try {
            // Import the event bus
            import('/src/utils/eventBus.js').then(({ eventBus, BUSINESS_EVENTS }) => {
                console.log('✅ Event bus imported successfully');
                console.log('📋 Available vendor events:', {
                    VENDOR_CREATED: BUSINESS_EVENTS.VENDOR_CREATED,
                    VENDOR_UPDATED: BUSINESS_EVENTS.VENDOR_UPDATED
                });

                // Test event emission
                const testData = {
                    vendorId: 999,
                    vendorName: 'Test Vendor',
                    isActive: true,
                    timestamp: Date.now()
                };

                console.log('📤 Emitting test VENDOR_UPDATED event:', testData);
                eventBus.emit(BUSINESS_EVENTS.VENDOR_UPDATED, testData);
                console.log('✅ Test event emitted successfully');

            }).catch(err => {
                console.error('❌ Failed to import event bus:', err);
            });

        } catch (error) {
            console.error('❌ Event bus test failed:', error);
        }
    },

    // Test vendor boolean consistency
    async testVendorBoolean() {
        console.log('🔍 Testing vendor boolean data consistency...');

        try {
            // Import database service
            const { db } = await import('/src/services/database.js');

            console.log('📊 Checking vendor boolean data types...');
            const vendors = await db.getVendors();

            vendors.forEach(vendor => {
                const isConsistent = (vendor.is_active === 0 || vendor.is_active === 1) &&
                    typeof vendor.is_active === 'number';

                console.log(`${isConsistent ? '✅' : '❌'} Vendor ${vendor.id} (${vendor.name}):`, {
                    is_active: vendor.is_active,
                    type: typeof vendor.is_active,
                    consistent: isConsistent
                });
            });

        } catch (error) {
            console.error('❌ Vendor boolean test failed:', error);
        }
    },

    // Test real-time update flow
    async testRealTimeFlow() {
        console.log('🔄 Testing real-time update flow...');

        try {
            const { eventBus, BUSINESS_EVENTS } = await import('/src/utils/eventBus.js');

            // Create test listener
            const testListener = (data) => {
                console.log('🎯 Received VENDOR_UPDATED event:', data);
            };

            // Add listener
            eventBus.on(BUSINESS_EVENTS.VENDOR_UPDATED, testListener);
            console.log('👂 Added test listener for VENDOR_UPDATED events');

            // Wait for user action
            console.log('📝 Now please edit a vendor\'s status and watch for events...');

            // Cleanup after 30 seconds
            setTimeout(() => {
                eventBus.off(BUSINESS_EVENTS.VENDOR_UPDATED, testListener);
                console.log('🧹 Test listener removed');
            }, 30000);

        } catch (error) {
            console.error('❌ Real-time flow test failed:', error);
        }
    },

    // Monitor all vendor events
    monitorVendorEvents() {
        console.log('👀 Starting vendor event monitoring...');

        import('/src/utils/eventBus.js').then(({ eventBus, BUSINESS_EVENTS }) => {

            const events = [
                'VENDOR_CREATED',
                'VENDOR_UPDATED',
                'VENDOR_PAYMENT_CREATED',
                'VENDOR_BALANCE_UPDATED'
            ];

            events.forEach(eventName => {
                if (BUSINESS_EVENTS[eventName]) {
                    eventBus.on(BUSINESS_EVENTS[eventName], (data) => {
                        console.log(`🔔 [${eventName}]`, data);
                    });
                    console.log(`📡 Monitoring ${eventName}`);
                }
            });

            console.log('✅ Monitoring all vendor events. Edit vendors to see live updates!');

        }).catch(err => {
            console.error('❌ Failed to start monitoring:', err);
        });
    },

    // Run all tests
    runAllTests() {
        console.log('🚀 Running comprehensive vendor update tests...');
        this.testEventBus();
        setTimeout(() => this.testVendorBoolean(), 1000);
        setTimeout(() => this.testRealTimeFlow(), 2000);
        setTimeout(() => this.monitorVendorEvents(), 3000);
    }
};

// Auto-run tests if in browser
if (typeof window !== 'undefined') {
    console.log('🌐 Browser environment detected. Tests available via window.vendorTestUtils');
    console.log('💡 Run: vendorTestUtils.runAllTests()');
} else {
    console.log('📄 Script loaded. Copy the vendorTestUtils code to browser console.');
}
