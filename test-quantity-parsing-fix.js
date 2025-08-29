// Test the fixed parsing logic for returnable quantity
console.log('🧪 Testing Fixed Quantity Parsing Logic...\n');

function parseQuantityFixed(originalQuantityRaw) {
    let originalQuantity;
    if (typeof originalQuantityRaw === 'string') {
        // Handle different quantity formats:
        // "12-980" (kg-grams): 12 kg + 980 grams = 12.98 kg
        // "180" (T-Iron): simple number  
        // "12.5" (decimal): simple decimal

        const kgGramsMatch = originalQuantityRaw.match(/^(\d+(?:\.\d+)?)-(\d+)$/);
        if (kgGramsMatch) {
            // Format: "12-980" = 12 kg + 980 grams = 12.98 kg
            const kg = parseFloat(kgGramsMatch[1]);
            const grams = parseFloat(kgGramsMatch[2]);

            // Validate grams should be less than 1000
            if (grams >= 1000) {
                console.warn(`⚠️ [QUANTITY-PARSING] Invalid grams value: ${grams}`);
                originalQuantity = kg; // Use just the kg part as fallback
            } else {
                originalQuantity = kg + (grams / 1000); // Convert grams to kg fraction
            }
        } else {
            // Try to parse as regular number
            const parsed = parseFloat(originalQuantityRaw);
            if (!isNaN(parsed)) {
                originalQuantity = parsed;
            } else {
                // If it contains non-numeric characters, extract the first number as fallback
                const match = originalQuantityRaw.match(/^(\d+(?:\.\d+)?)/);
                originalQuantity = match ? parseFloat(match[1]) : 0;
            }
        }
    } else {
        originalQuantity = Number(originalQuantityRaw) || 0;
    }

    return originalQuantity;
}

function parseQuantityOld(originalQuantityRaw) {
    let originalQuantity;
    if (typeof originalQuantityRaw === 'string') {
        // Try to parse as number first (OLD BUGGY LOGIC)
        const parsed = parseFloat(originalQuantityRaw);
        if (!isNaN(parsed)) {
            originalQuantity = parsed;
        } else {
            const kgGramsMatch = originalQuantityRaw.match(/^(\d+(?:\.\d+)?)-(\d+)$/);
            if (kgGramsMatch) {
                const kg = parseFloat(kgGramsMatch[1]);
                const grams = parseFloat(kgGramsMatch[2]);
                originalQuantity = kg + (grams / 1000);
            } else {
                const match = originalQuantityRaw.match(/^(\d+(?:\.\d+)?)/);
                originalQuantity = match ? parseFloat(match[1]) : 0;
            }
        }
    } else {
        originalQuantity = Number(originalQuantityRaw) || 0;
    }

    return originalQuantity;
}

// Test cases
const testCases = [
    { input: '12-990', expectedFixed: 12.99, description: 'User case: "12-990" should be 12.99' },
    { input: '5-500', expectedFixed: 5.5, description: '"5-500" should be 5.5' },
    { input: '0-250', expectedFixed: 0.25, description: '"0-250" should be 0.25' },
    { input: '10-0', expectedFixed: 10, description: '"10-0" should be 10' },
    { input: '12.5', expectedFixed: 12.5, description: '"12.5" should be 12.5' },
    { input: '15', expectedFixed: 15, description: '"15" should be 15' },
    { input: 12.99, expectedFixed: 12.99, description: 'Number 12.99 should be 12.99' },
];

console.log('Comparison: Old vs Fixed Logic');
console.log('==============================');

testCases.forEach((test, index) => {
    const oldResult = parseQuantityOld(test.input);
    const fixedResult = parseQuantityFixed(test.input);
    const oldCorrect = Math.abs(oldResult - test.expectedFixed) < 0.001;
    const fixedCorrect = Math.abs(fixedResult - test.expectedFixed) < 0.001;

    console.log(`Test ${index + 1}: ${test.description}`);
    console.log(`  Input: ${JSON.stringify(test.input)}`);
    console.log(`  Expected: ${test.expectedFixed}`);
    console.log(`  Old Logic: ${oldResult} ${oldCorrect ? '✅' : '❌'}`);
    console.log(`  Fixed Logic: ${fixedResult} ${fixedCorrect ? '✅' : '❌'}`);
    console.log('');
});

// Specific test for user issue
console.log('🎯 User Issue Analysis:');
console.log('=======================');
const userInput = '12-990';
const oldResult = parseQuantityOld(userInput);
const fixedResult = parseQuantityFixed(userInput);

console.log(`Input from database: "${userInput}"`);
console.log(`Old parsing (buggy): ${oldResult} (shows as "${oldResult} kg")`);
console.log(`Fixed parsing: ${fixedResult} (should show as "12-990 kg")`);
console.log('');
console.log('This explains why "Available for Return" was showing "12 kg" instead of "12-990 kg"!');
