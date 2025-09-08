/**
 * 🔧 CACHE DIAGNOSTIC SCRIPT FOR INVOICE FORM
 * 
 * This script specifically diagnoses cache-related issues
 * that might prevent real-time updates from working.
 */

console.log(`
🔧 CACHE DIAGNOSTIC TOOL
========================
Diagnosing potential cache issues...
`);

window.cacheDiagnostic = {
    // Check all available cache clearing methods
    async checkCacheMethods() {
        console.log('🔍 Checking available cache methods...');

        const methods = [];

        // Check global cache clear
        if (window.clearCaches && typeof window.clearCaches === 'function') {
            methods.push('window.clearCaches()');
            console.log('✅ Found: window.clearCaches()');
        }

        // Check database cache methods
        try {
            const { db } = await import('/src/services/database.js');

            if (typeof db.invalidateProductCache === 'function') {
                methods.push('db.invalidateProductCache()');
                console.log('✅ Found: db.invalidateProductCache()');
            }

            if (typeof db.clearCache === 'function') {
                methods.push('db.clearCache()');
                console.log('✅ Found: db.clearCache()');
            }

            if (typeof db.invalidateCacheByPattern === 'function') {
                methods.push('db.invalidateCacheByPattern()');
                console.log('✅ Found: db.invalidateCacheByPattern()');
            }

        } catch (error) {
            console.warn('⚠️ Could not check database cache methods:', error);
        }

        // Check service caches
        const services = ['optimizedSearchService', 'financeService', 'simpleFinanceService'];
        for (const serviceName of services) {
            try {
                const module = await import(`/src/services/${serviceName}.js`);
                if (module.default && typeof module.default.clearCache === 'function') {
                    methods.push(`${serviceName}.clearCache()`);
                    console.log(`✅ Found: ${serviceName}.clearCache()`);
                }
            } catch (error) {
                // Service doesn't exist or no clearCache method
            }
        }

        console.log(`🎯 Total cache methods found: ${methods.length}`);
        return methods;
    },

    // Force clear all caches
    async clearAllCaches() {
        console.log('🗂️ Force clearing all caches...');
        let clearedCount = 0;

        // Global cache clear
        if (window.clearCaches && typeof window.clearCaches === 'function') {
            try {
                window.clearCaches();
                console.log('✅ Cleared: window.clearCaches()');
                clearedCount++;
            } catch (error) {
                console.warn('⚠️ Failed: window.clearCaches()', error);
            }
        }

        // Database caches
        try {
            const { db } = await import('/src/services/database.js');

            if (typeof db.invalidateProductCache === 'function') {
                db.invalidateProductCache();
                console.log('✅ Cleared: db.invalidateProductCache()');
                clearedCount++;
            }

            // Force database reinitialization
            await db.initialize();
            console.log('✅ Database reinitialized');
            clearedCount++;

        } catch (error) {
            console.warn('⚠️ Database cache clearing failed:', error);
        }

        console.log(`🎯 Successfully cleared ${clearedCount} cache methods`);
        return clearedCount;
    },

    // Test cache consistency
    async testCacheConsistency() {
        console.log('🔍 Testing cache consistency...');

        try {
            const { db } = await import('/src/services/database.js');

            // Get products using different methods
            const methods = [];

            // Method 1: Direct dbConnection
            try {
                const direct = await db.dbConnection.execute(`
                    SELECT COUNT(*) as count FROM products WHERE status = 'active'
                `);
                methods.push({ name: 'Direct dbConnection', count: direct[0]?.count || 0 });
            } catch (error) {
                methods.push({ name: 'Direct dbConnection', count: 'FAILED', error: error.message });
            }

            // Method 2: executeSmartQuery  
            try {
                const smart = await db.executeSmartQuery(`
                    SELECT COUNT(*) as count FROM products WHERE status = 'active'
                `);
                methods.push({ name: 'executeSmartQuery', count: smart[0]?.count || 0 });
            } catch (error) {
                methods.push({ name: 'executeSmartQuery', count: 'FAILED', error: error.message });
            }

            // Method 3: getProducts
            try {
                const products = await db.getProducts();
                methods.push({ name: 'getProducts', count: products.length });
            } catch (error) {
                methods.push({ name: 'getProducts', count: 'FAILED', error: error.message });
            }

            console.log('📊 Cache consistency results:');
            methods.forEach(method => {
                console.log(`   ${method.name}: ${method.count}${method.error ? ` (${method.error})` : ''}`);
            });

            // Check for inconsistencies
            const counts = methods.filter(m => typeof m.count === 'number').map(m => m.count);
            const isConsistent = counts.length > 1 && counts.every(count => count === counts[0]);

            if (isConsistent) {
                console.log('✅ Cache consistency: ALL METHODS CONSISTENT');
            } else {
                console.log('⚠️ Cache consistency: INCONSISTENCY DETECTED!');
                console.log('   This indicates cache problems - try clearAllCaches()');
            }

            return { methods, isConsistent };

        } catch (error) {
            console.error('❌ Cache consistency test failed:', error);
            return null;
        }
    },

    // Force refresh Invoice Form products
    async forceInvoiceFormRefresh() {
        console.log('🔄 Force refreshing Invoice Form products...');

        try {
            // Clear all caches first
            await this.clearAllCaches();

            // Emit refresh events
            const { eventBus, BUSINESS_EVENTS } = await import('/src/utils/eventBus.js');

            const refreshData = {
                type: 'force_cache_refresh',
                timestamp: Date.now(),
                source: 'cache_diagnostic'
            };

            // Emit all possible refresh events
            const eventsToEmit = [
                'PRODUCTS_UPDATED',
                'UI_REFRESH_REQUESTED',
                'FORCE_PRODUCT_RELOAD',
                'PRODUCTS_CACHE_INVALIDATED',
                'COMPREHENSIVE_DATA_REFRESH',
                BUSINESS_EVENTS.PRODUCT_UPDATED
            ];

            eventsToEmit.forEach(eventName => {
                try {
                    eventBus.emit(eventName, refreshData);
                    console.log(`✅ Emitted: ${eventName}`);
                } catch (error) {
                    console.warn(`⚠️ Failed to emit ${eventName}:`, error);
                }
            });

            console.log('🎯 Force refresh completed - check Invoice Form for updates');

        } catch (error) {
            console.error('❌ Force refresh failed:', error);
        }
    },

    // Complete diagnostic
    async runCompleteDiagnostic() {
        console.log('🔍 Running complete cache diagnostic...');

        console.log('\n1️⃣ Checking cache methods...');
        await this.checkCacheMethods();

        console.log('\n2️⃣ Testing cache consistency...');
        await this.testCacheConsistency();

        console.log('\n3️⃣ Clearing all caches...');
        await this.clearAllCaches();

        console.log('\n4️⃣ Re-testing consistency after clear...');
        await this.testCacheConsistency();

        console.log('\n5️⃣ Force refreshing Invoice Form...');
        await this.forceInvoiceFormRefresh();

        console.log('\n✅ Complete diagnostic finished!');
        console.log('📋 Next steps:');
        console.log('   1. Check Invoice Form for product updates');
        console.log('   2. If still not working, there may be event listener issues');
        console.log('   3. Try: testInvoiceFormRealTime.monitorEvents()');
    }
};

console.log(`
📋 CACHE DIAGNOSTIC COMMANDS:
============================

Run these commands to diagnose cache issues:

// Check what cache methods are available
cacheDiagnostic.checkCacheMethods()

// Test if different query methods return consistent results
cacheDiagnostic.testCacheConsistency()

// Force clear all caches
cacheDiagnostic.clearAllCaches()

// Force refresh Invoice Form with cache clearing
cacheDiagnostic.forceInvoiceFormRefresh()

// Run complete diagnostic (recommended)
cacheDiagnostic.runCompleteDiagnostic()

🎯 If real-time updates aren't working, start with:
cacheDiagnostic.runCompleteDiagnostic()
`);

// Auto-run basic cache check
if (typeof window !== 'undefined') {
    console.log('🚀 Auto-running cache methods check...');
    window.cacheDiagnostic.checkCacheMethods().then(() => {
        console.log('✅ Cache check complete. Run cacheDiagnostic.runCompleteDiagnostic() for full test.');
    });
}
