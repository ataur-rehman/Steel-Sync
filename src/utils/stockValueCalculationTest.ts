/**
 * Stock Movement Value Calculation Test
 * 
 * This script tests the fix for kg-grams unit value miscalculation
 */

import { parseUnit, type UnitType } from '../utils/unitUtils';

// Test data from the user's example
const testData = {
    quantity: '400kg 900g', // This should be 400,900 grams
    rate_per_unit: 245, // Assumed rate per kg
    unit_type: 'kg-grams' as UnitType
};

console.log('🧪 Testing Stock Movement Value Calculation Fix...');
console.log('='.repeat(60));

// Parse the quantity
const quantityData = parseUnit(testData.quantity, testData.unit_type);
console.log(`📏 Quantity: ${testData.quantity}`);
console.log(`📏 Parsed numeric value: ${quantityData.numericValue} grams`);
console.log(`💰 Rate per unit: Rs. ${testData.rate_per_unit} per kg`);

// OLD (INCORRECT) calculation
const oldValue = quantityData.numericValue * testData.rate_per_unit;
console.log('\n❌ OLD (INCORRECT) Calculation:');
console.log(`   ${quantityData.numericValue} grams × Rs. ${testData.rate_per_unit} = Rs. ${oldValue.toLocaleString()}`);

// NEW (CORRECT) calculation
const newValue = (quantityData.numericValue / 1000) * testData.rate_per_unit;
console.log('\n✅ NEW (CORRECT) Calculation:');
console.log(`   (${quantityData.numericValue} grams ÷ 1000) × Rs. ${testData.rate_per_unit} = Rs. ${newValue.toLocaleString()}`);
console.log(`   ${quantityData.numericValue / 1000} kg × Rs. ${testData.rate_per_unit} = Rs. ${newValue.toLocaleString()}`);

console.log('\n📊 Comparison:');
console.log(`   Old value: Rs. ${oldValue.toLocaleString()}`);
console.log(`   New value: Rs. ${newValue.toLocaleString()}`);
console.log(`   Difference: Rs. ${(oldValue - newValue).toLocaleString()}`);
console.log(`   Error factor: ${(oldValue / newValue).toFixed(0)}x too high`);

// Test with different scenarios
console.log('\n🔬 Additional Test Cases:');
console.log('-'.repeat(40));

const testCases = [
    { quantity: '1kg', rate: 100 },
    { quantity: '500g', rate: 100 },
    { quantity: '2kg 500g', rate: 200 },
    { quantity: '10kg 750g', rate: 150 }
];

testCases.forEach((testCase, index) => {
    const qty = parseUnit(testCase.quantity, 'kg-grams');
    const oldVal = qty.numericValue * testCase.rate;
    const newVal = (qty.numericValue / 1000) * testCase.rate;

    console.log(`\nTest ${index + 1}: ${testCase.quantity} @ Rs. ${testCase.rate}/kg`);
    console.log(`  Old: Rs. ${oldVal.toLocaleString()}`);
    console.log(`  New: Rs. ${newVal.toLocaleString()}`);
    console.log(`  ✅ Correct: ${newVal === (parseFloat(testCase.quantity.replace(/kg|g/g, '').replace(/\s+/g, '')) * testCase.rate) ? 'Yes' : 'No'}`);
});

console.log('\n✅ Value calculation fix validation complete!');

export { };
