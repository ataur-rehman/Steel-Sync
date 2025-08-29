// Test script for kg-grams parsing functionality
console.log('🧪 Testing kg-grams parsing functionality...\n');

// Copy of the parseQuantityInput function from InvoiceDetails.tsx
function parseQuantityInput(input) {
    if (!input || input.trim() === '') {
        return 0;
    }

    const trimmedInput = input.trim();
    console.log('🔍 [PARSE-DEBUG] Input:', trimmedInput);

    // Check for kg-grams format: "12-990"
    const kgGramsMatch = trimmedInput.match(/^(\d+(?:\.\d+)?)-(\d+)$/);
    if (kgGramsMatch) {
        const kg = parseFloat(kgGramsMatch[1]);
        const grams = parseFloat(kgGramsMatch[2]);

        console.log('🔍 [PARSE-DEBUG] Matched kg-grams:', { kg, grams });

        // Validate grams should be less than 1000
        if (grams >= 1000) {
            throw new Error(`Invalid grams value: ${grams}. Grams should be less than 1000.`);
        }

        const result = kg + (grams / 1000);
        console.log('🔍 [PARSE-DEBUG] Calculated result:', result);
        return result;
    } else {
        // Handle regular decimal input
        const parsed = parseFloat(trimmedInput);
        console.log('🔍 [PARSE-DEBUG] Parsed as decimal:', parsed);
        return isNaN(parsed) ? 0 : parsed;
    }
}

// Test cases
const testCases = [
    '12-990',  // 12.99 kg
    '5-500',   // 5.5 kg
    '0-250',   // 0.25 kg
    '10-0',    // 10 kg exactly
    '7.5',     // 7.5 kg decimal
    '15',      // 15 kg whole number
    '12-1000', // Invalid - grams >= 1000
    '12-999',  // 12.999 kg
    '',        // Empty
    '   ',     // Whitespace
    'abc',     // Invalid
    '12-abc',  // Invalid grams
    'abc-500'  // Invalid kg
];

console.log('Testing various input formats:\n');

testCases.forEach((testCase, index) => {
    console.log(`Test ${index + 1}: "${testCase}"`);
    try {
        const result = parseQuantityInput(testCase);
        console.log(`✅ Result: ${result} kg\n`);
    } catch (error) {
        console.log(`❌ Error: ${error.message}\n`);
    }
});

console.log('🎯 Key test cases:');
console.log('12-990 should = 12.99 kg');
console.log('Actual result:', parseQuantityInput('12-990'));
console.log('');
console.log('5-500 should = 5.5 kg');
console.log('Actual result:', parseQuantityInput('5-500'));
