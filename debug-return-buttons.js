// Quick Return System Status Check
// Navigate to any invoice and run this in the browser console

console.log('🔍 RETURN SYSTEM DEBUG CHECK');
console.log('============================');

// Check if we're on an invoice page
const currentPath = window.location.pathname;
console.log('Current page:', currentPath);

if (currentPath.includes('/billing/invoice/')) {
    console.log('✅ On invoice page - checking return system...');

    // Wait a moment for the page to load, then check return button status
    setTimeout(() => {
        const returnButtons = document.querySelectorAll('button[title*="Return"]');
        const disabledReturnButtons = document.querySelectorAll('button[title*="Return"][disabled]');

        console.log('📊 Return Button Analysis:');
        console.log('Total return buttons found:', returnButtons.length);
        console.log('Disabled return buttons:', disabledReturnButtons.length);
        console.log('Enabled return buttons:', returnButtons.length - disabledReturnButtons.length);

        if (disabledReturnButtons.length > 0) {
            console.log('🔍 Checking disabled button reasons:');
            disabledReturnButtons.forEach((btn, index) => {
                console.log(`Button ${index + 1} title:`, btn.title);
            });
        }

        // Check if invoice data is loaded in React DevTools
        if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
            console.log('✅ React DevTools available - check component state for more details');
        }

    }, 2000);

} else {
    console.log('❌ Not on invoice page. Navigate to an invoice first.');
    console.log('Example: /billing/invoice/123');
}

console.log('\n📝 Steps to debug:');
console.log('1. Navigate to an invoice with products');
console.log('2. Open browser console (F12)');
console.log('3. Look for [RETURN-DEBUG] messages');
console.log('4. Check payment status and returnable quantities');

export default {};
