/**
 * TEST DATA GENERATOR LOADER
 * 
 * This script provides easy access to all test data generators.
 * Load this in your browser console for immediate access to all generators.
 */

// Load all test data generators
(function () {
    console.log('🚀 Loading all test data generators...');

    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
        console.error('❌ This script is designed for browser use only');
        return;
    }

    // Utility to load script dynamically
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.type = 'module';
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Load all generators
    async function loadAllGenerators() {
        try {
            // Load the integrated generator (main one)
            await loadScript('/src/scripts/integrated-large-scale-test-data-generator.js');

            // Load the comprehensive generator (full featured)
            await loadScript('/src/scripts/comprehensive-large-scale-test-data-generator.js');

            // Small delay to ensure scripts are loaded
            await new Promise(resolve => setTimeout(resolve, 500));

            console.log('✅ All test data generators loaded successfully!');
            console.log('\n📋 Available Commands:');
            console.log('==========================================');
            console.log('🎯 Main Commands:');
            console.log('   • generateLargeScaleTestData() - Generate complete large dataset');
            console.log('   • quickDataCheck() - Check current data counts');
            console.log('   • validateTestData() - Validate data integrity');
            console.log('');
            console.log('🔧 Alternative Commands:');
            console.log('   • runProductionTestDataGeneration() - Same as main generator');
            console.log('   • new IntegratedLargeScaleTestDataGenerator() - Custom generator instance');
            console.log('');
            console.log('📊 Quick Examples:');
            console.log('   await generateLargeScaleTestData();  // Generate everything');
            console.log('   await quickDataCheck();             // Check what exists');
            console.log('   await validateTestData();           // Validate integrity');
            console.log('==========================================');

        } catch (error) {
            console.error('❌ Failed to load test data generators:', error);
        }
    }

    // Auto-load if database is available
    if (window.db) {
        loadAllGenerators();
    } else {
        console.log('⏳ Waiting for database to be available...');

        // Wait for database to be available
        const checkDB = setInterval(() => {
            if (window.db) {
                clearInterval(checkDB);
                loadAllGenerators();
            }
        }, 1000);

        // Timeout after 30 seconds
        setTimeout(() => {
            clearInterval(checkDB);
            console.log('⚠️ Database not available after 30 seconds. You can manually load generators later.');
        }, 30000);
    }

    // Make this loader available globally
    window.loadTestDataGenerators = loadAllGenerators;

})();

// Manual loader function for console use
window.loadAllTestGenerators = function () {
    console.log('🔄 Manually loading test data generators...');

    const script = document.createElement('script');
    script.innerHTML = `
        // Load integrated generator
        import('/src/scripts/integrated-large-scale-test-data-generator.js')
            .then(() => {
                console.log('✅ Test data generators loaded!');
                console.log('📋 Available: generateLargeScaleTestData(), quickDataCheck(), validateTestData()');
            })
            .catch(error => {
                console.error('❌ Failed to load generators:', error);
            });
    `;
    script.type = 'module';
    document.head.appendChild(script);
};

console.log('💡 Test data generator loader ready!');
console.log('📋 Manual loading: loadAllTestGenerators()');
