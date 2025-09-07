/**
 * Test script to verify Products category filter functionality
 * Run this in browser console on the Products page
 */

// Function to check category filter functionality
function checkProductCategoryFilter() {
    console.log('🔍 Checking Products Category Filter...\n');

    // Get the category select element
    const categorySelect = document.querySelector('select');

    if (!categorySelect) {
        console.log('❌ Category select element not found. Make sure you\'re on the Products page.');
        return;
    }

    console.log('📊 Category Filter Analysis:');
    console.log('============================');

    // Get all options
    const options = Array.from(categorySelect.options);

    console.log(`Total options: ${options.length}`);

    let validCategories = 0;
    let invalidCategories = 0;

    options.forEach((option, index) => {
        const value = option.value;
        const text = option.textContent;

        if (index === 0) {
            // First option should be "All Categories"
            console.log(`${index + 1}. "${text}" (value: "${value}") - ${value === '' ? '✅ Default option' : '❌ Should be empty'}`);
        } else {
            // Check if the option shows numbers or proper category names
            const isNumber = /^\d+$/.test(text.trim());
            const hasParentheses = /\([^)]+\)/.test(text);

            if (isNumber) {
                console.log(`${index + 1}. "${text}" (value: "${value}") - ❌ SHOWING NUMBERS INSTEAD OF CATEGORY NAME`);
                invalidCategories++;
            } else if (hasParentheses) {
                console.log(`${index + 1}. "${text}" (value: "${value}") - ✅ Proper category with count`);
                validCategories++;
            } else {
                console.log(`${index + 1}. "${text}" (value: "${value}") - ⚠️ Category without count`);
                validCategories++;
            }
        }
    });

    console.log('\n📈 Summary:');
    console.log(`✅ Valid categories: ${validCategories}`);
    console.log(`❌ Invalid categories (numbers): ${invalidCategories}`);

    if (invalidCategories > 0) {
        console.log('\n🔧 Issue Detected:');
        console.log('The category filter is showing numbers instead of category names.');
        console.log('This suggests a data mapping issue in the component.');

        console.log('\n💡 Expected Fix:');
        console.log('- Categories should display as: "Electronics (5)" not just "1"');
        console.log('- Check the category loading query and data mapping');
        console.log('- Verify the category dropdown is using correct property names');
    } else {
        console.log('\n✅ Category filter appears to be working correctly!');
    }

    // Test category selection
    console.log('\n🧪 Testing Category Selection:');
    const testCategory = options[1]; // Select second option (first category)
    if (testCategory) {
        console.log(`Selecting category: "${testCategory.textContent}"`);
        categorySelect.value = testCategory.value;
        categorySelect.dispatchEvent(new Event('change', { bubbles: true }));

        setTimeout(() => {
            console.log('✅ Category selection test completed');
            console.log('Check if the products list filtered correctly');
        }, 1000);
    }

    return {
        totalOptions: options.length,
        validCategories,
        invalidCategories,
        isWorking: invalidCategories === 0,
        options: options.map(opt => ({ value: opt.value, text: opt.textContent }))
    };
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
    console.log('🔧 Products Category Filter Checker loaded!');
    console.log('📋 Run checkProductCategoryFilter() to analyze the category filter');

    // Make function globally available
    window.checkProductCategoryFilter = checkProductCategoryFilter;

    // Auto-run after a short delay to ensure page is loaded
    setTimeout(() => {
        console.log('🚀 Auto-running category filter check...');
        checkProductCategoryFilter();
    }, 2000);
} else {
    // Export for Node.js usage
    module.exports = { checkProductCategoryFilter };
}
