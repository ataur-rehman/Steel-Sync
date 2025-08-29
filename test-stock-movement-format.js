// Test the stock movement quantity formatting
console.log('🧪 Testing Stock Movement Quantity Formatting...\n');

// Test the formatStockQuantityDisplay function
function formatStockQuantityDisplay(quantity, unit) {
    if (unit === 'kg') {
        // For kg units, check if we should display in kg-grams format
        const kg = Math.floor(quantity);
        const grams = Math.round((quantity - kg) * 1000);

        if (grams > 0) {
            return `${kg}-${String(grams).padStart(3, '0')} kg`;
        } else {
            return `${kg} kg`;
        }
    } else if (unit === 'piece' || unit === 'pcs') {
        return `${quantity} pcs`;
    } else if (unit === 'bag') {
        return `${quantity} bags`;
    } else {
        return `${quantity} ${unit || 'units'}`;
    }
}

// Test cases for stock movement formatting
const testCases = [
    { quantity: 12.99, unit: 'kg', expected: '12-990 kg', description: 'User case: 12.99 kg should show as 12-990 kg' },
    { quantity: 5.5, unit: 'kg', expected: '5-500 kg', description: '5.5 kg should show as 5-500 kg' },
    { quantity: 10, unit: 'kg', expected: '10 kg', description: '10 kg should show as 10 kg (no grams)' },
    { quantity: 0.25, unit: 'kg', expected: '0-250 kg', description: '0.25 kg should show as 0-250 kg' },
    { quantity: 180, unit: 'piece', expected: '180 pcs', description: '180 pieces should show as 180 pcs' },
    { quantity: 5, unit: 'bag', expected: '5 bags', description: '5 bags should show as 5 bags' },
];

console.log('Stock Movement Quantity Formatting Tests:');
console.log('=======================================');

testCases.forEach((test, index) => {
    const result = formatStockQuantityDisplay(test.quantity, test.unit);
    const passed = result === test.expected;

    console.log(`Test ${index + 1}: ${test.description}`);
    console.log(`  Input: ${test.quantity} ${test.unit}`);
    console.log(`  Expected: "${test.expected}"`);
    console.log(`  Got: "${result}"`);
    console.log(`  Result: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    console.log('');
});

// Test stock movement quantity format with sign
console.log('Stock Movement Storage Format Tests:');
console.log('===================================');

function createStockMovementQuantity(quantity, unit, unitType) {
    if (unit === 'kg' && unitType === 'kg-grams') {
        // Convert decimal kg back to proper display format for storage
        const kg = Math.floor(quantity);
        const grams = Math.round((quantity - kg) * 1000);
        // Store as formatted string for kg-grams units
        return grams > 0 ? `+${kg}-${String(grams).padStart(3, '0')} kg` : `+${kg} kg`;
    } else {
        // For other unit types, use the sign prefix
        return `+${quantity}`;
    }
}

const storageTests = [
    { quantity: 12.99, unit: 'kg', unitType: 'kg-grams', expected: '+12-990 kg' },
    { quantity: 5.5, unit: 'kg', unitType: 'kg-grams', expected: '+5-500 kg' },
    { quantity: 10, unit: 'kg', unitType: 'kg-grams', expected: '+10 kg' },
    { quantity: 180, unit: 'piece', unitType: 'piece', expected: '+180' },
];

storageTests.forEach((test, index) => {
    const result = createStockMovementQuantity(test.quantity, test.unit, test.unitType);
    const passed = result === test.expected;

    console.log(`Storage Test ${index + 1}:`);
    console.log(`  Input: ${test.quantity} ${test.unit} (${test.unitType})`);
    console.log(`  Expected: "${test.expected}"`);
    console.log(`  Got: "${result}"`);
    console.log(`  Result: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    console.log('');
});

// Example description
console.log('🎯 Example Stock Movement Description:');
console.log('====================================');
const customerName = 'Naveena';
const invoiceNumber = 'I3';
const productName = '12mm G60';
const quantity = 12.99;
const unit = 'kg';

const description = `Return: ${productName} (${formatStockQuantityDisplay(quantity, unit)}) from ${customerName} - Invoice ${invoiceNumber}`;
console.log(description);
console.log('');
console.log('This should replace:');
console.log('❌ "Return - Customer - Invoice I3"');
console.log('✅ "Return: 12mm G60 (12-990 kg) from Naveena - Invoice I3"');
