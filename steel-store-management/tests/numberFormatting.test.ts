/**
 * Test file to verify number formatting functionality
 * Run this to ensure the formatting is working correctly
 */

import { 
  formatDisplayNumber, 
  formatInvoiceNumber, 
  formatReceivingNumber,
  formatPaymentCode,
  formatCustomerCode,
  extractNumberFromId,
  matchesSearchTerm
} from '../src/utils/numberFormatting';

// Test cases
const testCases = [
  // Basic formatting tests
  { input: 'I00001', expected: 'I01' },
  { input: 'I00099', expected: 'I99' },
  { input: 'I00100', expected: 'I100' },
  { input: 'S0001', expected: 'S01' },
  { input: 'S0022', expected: 'S22' },
  { input: 'S0100', expected: 'S100' },
  { input: 'P0001', expected: 'P01' },
  { input: 'C0001', expected: 'C01' },
  
  // Edge cases
  { input: 'I1', expected: 'I01' },
  { input: 'I9', expected: 'I09' },
  { input: 'I10', expected: 'I10' },
  { input: 'ABC123', expected: 'ABC123' },
  { input: '', expected: '' },
  { input: 'INVALID', expected: 'INVALID' },
];

const searchTestCases = [
  // Test search functionality
  { id: 'I00001', searchTerm: '1', shouldMatch: true },
  { id: 'I00001', searchTerm: '01', shouldMatch: true },
  { id: 'I00001', searchTerm: 'I01', shouldMatch: true },
  { id: 'I00001', searchTerm: 'I00001', shouldMatch: true },
  { id: 'S0022', searchTerm: '22', shouldMatch: true },
  { id: 'S0022', searchTerm: 'S22', shouldMatch: true },
  { id: 'S0022', searchTerm: '23', shouldMatch: false },
];

// Run tests
console.log('🧪 Testing Number Formatting Utility');
console.log('=====================================');

console.log('\n📋 Format Display Tests:');
testCases.forEach(({ input, expected }) => {
  const result = formatDisplayNumber(input);
  const status = result === expected ? '✅' : '❌';
  console.log(`${status} ${input} -> ${result} (expected: ${expected})`);
});

console.log('\n🔍 Search Functionality Tests:');
searchTestCases.forEach(({ id, searchTerm, shouldMatch }) => {
  const result = matchesSearchTerm(id, searchTerm);
  const status = result === shouldMatch ? '✅' : '❌';
  console.log(`${status} "${id}" matches "${searchTerm}": ${result} (expected: ${shouldMatch})`);
});

console.log('\n🎯 Specific Function Tests:');
console.log(`Invoice: ${formatInvoiceNumber('I00001')} (expected: I01)`);
console.log(`Receiving: ${formatReceivingNumber('S0001')} (expected: S01)`);
console.log(`Payment: ${formatPaymentCode('P0001')} (expected: P01)`);
console.log(`Customer: ${formatCustomerCode('C0001')} (expected: C01)`);

console.log('\n🔢 Number Extraction Tests:');
console.log(`Extract from I00001: ${extractNumberFromId('I00001')} (expected: 1)`);
console.log(`Extract from S0022: ${extractNumberFromId('S0022')} (expected: 22)`);
console.log(`Extract from ABC123: ${extractNumberFromId('ABC123')} (expected: 123)`);

export {};
