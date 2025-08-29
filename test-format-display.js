// Test formatQuantityDisplay function
console.log('🧪 Testing formatQuantityDisplay function...\n');

function formatQuantityDisplay(quantity, showUnit = true) {
    if (typeof quantity === 'string' && quantity.includes('-')) {
        // Already in kg-grams format like "12-990"
        return showUnit ? `${quantity} kg` : quantity;
    }

    const numericQuantity = typeof quantity === 'string' ? parseFloat(quantity) : quantity;

    // For decimal quantities, convert back to kg-grams format when appropriate
    if (numericQuantity > 0) {
        const kg = Math.floor(numericQuantity);
        const gramsDecimal = numericQuantity - kg;

        if (gramsDecimal > 0.001) { // Add small tolerance for floating point precision
            const grams = Math.round(gramsDecimal * 1000);
            if (grams > 0 && grams < 1000) {
                // Format with proper zero padding for grams
                const gramsStr = grams.toString().padStart(3, '0');
                return showUnit ? `${kg}-${gramsStr} kg` : `${kg}-${gramsStr}`;
            }
        }

        // If grams is 0 or very small, just show kg
        return showUnit ? `${kg} kg` : `${kg}`;
    }

    return showUnit ? `${numericQuantity} kg` : `${numericQuantity}`;
}

// Test cases based on the user's issue
const testCases = [
    { input: 12.99, expected: '12-990 kg', description: 'User case: 12.99 should show as 12-990 kg' },
    { input: '12-990', expected: '12-990 kg', description: 'String kg-grams format' },
    { input: 12, expected: '12 kg', description: 'Whole number' },
    { input: 5.5, expected: '5-500 kg', description: '5.5 should show as 5-500 kg' },
    { input: 0.25, expected: '0-250 kg', description: '0.25 should show as 0-250 kg' },
    { input: 10.0, expected: '10 kg', description: '10.0 should show as 10 kg (no grams)' },
    { input: 12.999, expected: '12-999 kg', description: '12.999 should show as 12-999 kg' },
];

console.log('Test Results:');
console.log('=============');

testCases.forEach((test, index) => {
    const result = formatQuantityDisplay(test.input);
    const passed = result === test.expected;

    console.log(`Test ${index + 1}: ${test.description}`);
    console.log(`  Input: ${test.input}`);
    console.log(`  Expected: "${test.expected}"`);
    console.log(`  Got: "${result}"`);
    console.log(`  Result: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    console.log('');
});

// Specific test for the user's case
console.log('🎯 User Issue Test:');
console.log('===================');
console.log('User says: Available for Return shows "12 kg" but should show "12-990 kg"');
console.log('This means the function receives 12.99 and should output "12-990 kg"');
console.log('');
console.log('Test: formatQuantityDisplay(12.99)');
console.log('Result:', formatQuantityDisplay(12.99));
console.log('Expected: "12-990 kg"');
console.log('Match:', formatQuantityDisplay(12.99) === '12-990 kg' ? '✅' : '❌');
