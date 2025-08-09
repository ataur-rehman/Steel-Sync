/**
 * Test script to validate 1-decimal place currency precision
 * Run this in the browser console to verify all calculations work correctly
 */

// Test the updated parseCurrency function
const testParseCurrency = () => {
  console.log('=== Testing parseCurrency ===');
  
  // Import the function (for testing - normally this would be imported)
  const parseCurrency = (value) => {
    if (typeof value === 'number') {
      return Math.round((value + Number.EPSILON) * 10) / 10;
    }
    const cleaned = value.toString().replace(/[^0-9.-]/g, '');
    const numValue = parseFloat(cleaned);
    return isNaN(numValue) ? 0 : Math.round((numValue + Number.EPSILON) * 10) / 10;
  };
  
  // Test cases that previously caused issues
  const testCases = [
    { input: 3853.8, expected: 3853.8, desc: "Direct number input" },
    { input: 3853.7999999999993, expected: 3853.8, desc: "Floating point artifact" },
    { input: "3853.8", expected: 3853.8, desc: "String input" },
    { input: "1926.8999999999996", expected: 1926.9, desc: "String with floating point" },
    { input: 3853.8 / 2, expected: 1926.9, desc: "Division result" },
    { input: 7707.6 / 2, expected: 3853.8, desc: "Another division result" }
  ];
  
  testCases.forEach(test => {
    const result = parseCurrency(test.input);
    const passed = Math.abs(result - test.expected) < 0.01;
    console.log(`${passed ? '✅' : '❌'} ${test.desc}: ${test.input} -> ${result} (expected ${test.expected})`);
  });
};

// Test the updated formatCurrency function  
const testFormatCurrency = () => {
  console.log('\n=== Testing formatCurrency ===');
  
  const formatCurrency = (amount) => {
    const safeAmount = amount ?? 0;
    return `Rs. ${safeAmount.toFixed(1).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };
  
  const testCases = [
    { input: 3853.8, expected: "Rs. 3,853.8", desc: "Normal amount" },
    { input: 3853.7999999999993, expected: "Rs. 3,853.8", desc: "Floating point artifact" },
    { input: 1926.9, expected: "Rs. 1,926.9", desc: "Half amount" },
    { input: 0, expected: "Rs. 0.0", desc: "Zero amount" },
    { input: 123456.7, expected: "Rs. 123,456.7", desc: "Large amount with comma" }
  ];
  
  testCases.forEach(test => {
    const result = formatCurrency(test.input);
    const passed = result === test.expected;
    console.log(`${passed ? '✅' : '❌'} ${test.desc}: ${test.input} -> ${result} (expected ${test.expected})`);
  });
};

// Test half/full amount calculations
const testHalfFullCalculations = () => {
  console.log('\n=== Testing Half/Full Amount Calculations ===');
  
  const calculateHalf = (amount) => {
    return Math.round(((amount / 2) + Number.EPSILON) * 10) / 10;
  };
  
  const calculateFull = (amount) => {
    return Math.round((amount + Number.EPSILON) * 10) / 10;
  };
  
  const testAmounts = [3853.8, 7707.6, 1000.0, 999.9, 50.5];
  
  testAmounts.forEach(amount => {
    const half = calculateHalf(amount);
    const full = calculateFull(amount);
    
    console.log(`Amount: ${amount.toFixed(1)}`);
    console.log(`  Half: ${half.toFixed(1)} (formatted: ${half.toFixed(1)})`);
    console.log(`  Full: ${full.toFixed(1)} (formatted: ${full.toFixed(1)})`);
    
    // Validate that half + half equals full (within precision)
    const doubleHalf = Math.round(((half * 2) + Number.EPSILON) * 10) / 10;
    const matches = Math.abs(doubleHalf - full) < 0.01;
    console.log(`  Half × 2 = ${doubleHalf.toFixed(1)} ${matches ? '✅' : '❌'} (should equal full)`);
    console.log('');
  });
};

// Test comparison operations
const testComparisons = () => {
  console.log('=== Testing Amount Comparisons ===');
  
  const safeCompare = (a, b, tolerance = 0.01) => {
    const roundedA = Math.round((a + Number.EPSILON) * 10) / 10;
    const roundedB = Math.round((b + Number.EPSILON) * 10) / 10;
    return Math.abs(roundedA - roundedB) <= tolerance;
  };
  
  const testCases = [
    { a: 3853.8, b: 3853.7999999999993, desc: "Floating point vs clean number" },
    { a: 1926.9, b: 3853.8 / 2, desc: "Expected vs calculated half" },
    { a: 3853.8, b: 1926.9 * 2, desc: "Expected vs doubled half" }
  ];
  
  testCases.forEach(test => {
    const equal = safeCompare(test.a, test.b);
    const directEqual = test.a === test.b;
    console.log(`${equal ? '✅' : '❌'} ${test.desc}:`);
    console.log(`  Safe compare: ${test.a.toFixed(1)} vs ${test.b.toFixed(1)} = ${equal}`);
    console.log(`  Direct compare: ${directEqual} (${directEqual ? 'OK' : 'Expected to fail'})`);
  });
};

// Run all tests
const runAllTests = () => {
  console.log('🧪 Currency Precision Test Suite');
  console.log('=================================');
  
  testParseCurrency();
  testFormatCurrency();
  testHalfFullCalculations();
  testComparisons();
  
  console.log('\n🎉 All tests completed!');
  console.log('💡 If you see ✅ for all critical tests, the currency precision fixes are working correctly.');
};

// Auto-run if in browser
if (typeof window !== 'undefined') {
  runAllTests();
} else {
  console.log('Run runAllTests() in the browser console to test currency precision.');
}
