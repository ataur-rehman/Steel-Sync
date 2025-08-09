/**
 * REAL-TIME ERROR CAPTURE DIAGNOSTIC
 * 
 * This script captures the exact errors occurring when adding items and recording payments
 * Copy and paste into browser console at http://localhost:5173
 */

console.log('🔍 [REAL-TIME DIAGNOSTIC] Setting up error capture...');

// Store original console methods
const originalError = console.error;
const originalLog = console.log;

// Capture all errors
window.capturedErrors = [];
window.capturedLogs = [];

// Override console.error to capture errors
console.error = function(...args) {
  window.capturedErrors.push({
    timestamp: new Date().toISOString(),
    args: args,
    stack: new Error().stack
  });
  originalError.apply(console, args);
};

// Override console.log to capture important logs
console.log = function(...args) {
  const logText = args.join(' ');
  if (logText.includes('❌') || logText.includes('🔧') || logText.includes('✅') || logText.includes('⚠️')) {
    window.capturedLogs.push({
      timestamp: new Date().toISOString(),
      args: args
    });
  }
  originalLog.apply(console, args);
};

// Test function for adding items with detailed error capture
window.testAddItemWithCapture = async function() {
  console.log('🧪 [DIAGNOSTIC] Testing item addition with error capture...');
  
  window.capturedErrors = []; // Reset
  window.capturedLogs = [];
  
  try {
    // Get test invoice
    const invoices = await db.getInvoices();
    if (!invoices || invoices.length === 0) {
      console.log('❌ No invoices found for testing');
      return;
    }
    
    const testInvoice = invoices[0];
    console.log('📋 Using test invoice:', testInvoice.id, testInvoice.bill_number);
    
    const testItem = {
      product_id: 1,
      product_name: 'Diagnostic Test Item',
      quantity: '1',
      unit_price: 50,
      total_price: 50,
      unit: 'kg'
    };
    
    console.log('➕ Attempting to add item...');
    const result = await db.addInvoiceItems(testInvoice.id, [testItem]);
    
    if (result !== false && result !== null) {
      console.log('✅ Item addition succeeded');
    } else {
      console.log('❌ Item addition returned false/null');
    }
    
  } catch (error) {
    console.error('❌ ITEM ADDITION FAILED:', error);
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    
    // Check for specific patterns
    if (error.message.includes('cannot start a transaction within a transaction')) {
      console.log('🔴 TRANSACTION NESTING DETECTED - updateProductStock issue');
    }
    if (error.message.includes('CHECK constraint failed')) {
      console.log('🔴 CONSTRAINT VIOLATION DETECTED - createLedgerEntry issue');
    }
    if (error.message.includes('no such column')) {
      console.log('🔴 COLUMN MISMATCH DETECTED - schema issue');
    }
  }
  
  console.log('\n📋 CAPTURED ERRORS:', window.capturedErrors.length);
  window.capturedErrors.forEach((error, index) => {
    console.log(`${index + 1}.`, error.args);
  });
  
  console.log('\n📋 CAPTURED LOGS:', window.capturedLogs.length);
  window.capturedLogs.forEach((log, index) => {
    console.log(`${index + 1}.`, log.args);
  });
};

// Test function for recording payments with detailed error capture
window.testAddPaymentWithCapture = async function() {
  console.log('🧪 [DIAGNOSTIC] Testing payment recording with error capture...');
  
  window.capturedErrors = []; // Reset
  window.capturedLogs = [];
  
  try {
    // Get test invoice with remaining balance
    const invoices = await db.getInvoices();
    let testInvoice = invoices.find(inv => (inv.remaining_balance || 0) > 0);
    
    if (!testInvoice && invoices.length > 0) {
      testInvoice = invoices[0]; // Use any invoice for testing
    }
    
    if (!testInvoice) {
      console.log('❌ No invoices found for testing');
      return;
    }
    
    console.log('📋 Using test invoice:', testInvoice.id, testInvoice.bill_number);
    console.log('📊 Remaining balance:', testInvoice.remaining_balance);
    
    const paymentData = {
      amount: 25, // Small test amount
      payment_method: 'cash',
      reference: 'DIAGNOSTIC_' + Date.now(),
      notes: 'Diagnostic test payment'
    };
    
    console.log('💰 Attempting to record payment...');
    const result = await db.addInvoicePayment(testInvoice.id, paymentData);
    
    if (result && result > 0) {
      console.log('✅ Payment recording succeeded, ID:', result);
    } else {
      console.log('❌ Payment recording returned false/null/0');
    }
    
  } catch (error) {
    console.error('❌ PAYMENT RECORDING FAILED:', error);
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    
    // Check for specific patterns
    if (error.message.includes('CHECK constraint failed')) {
      console.log('🔴 CONSTRAINT VIOLATION DETECTED');
      if (error.message.includes('reference_type')) {
        console.log('   - reference_type constraint issue in createLedgerEntry');
      }
      if (error.message.includes('payment_type')) {
        console.log('   - payment_type constraint issue in payments table');
      }
      if (error.message.includes('payment_method')) {
        console.log('   - payment_method constraint issue in payments table');
      }
    }
    if (error.message.includes('no such column')) {
      console.log('🔴 COLUMN MISMATCH DETECTED - schema issue');
    }
    if (error.message.includes('NOT NULL constraint failed')) {
      console.log('🔴 MISSING REQUIRED FIELD - schema requirement not met');
    }
  }
  
  console.log('\n📋 CAPTURED ERRORS:', window.capturedErrors.length);
  window.capturedErrors.forEach((error, index) => {
    console.log(`${index + 1}.`, error.args);
  });
  
  console.log('\n📋 CAPTURED LOGS:', window.capturedLogs.length);
  window.capturedLogs.forEach((log, index) => {
    console.log(`${index + 1}.`, log.args);
  });
};

// Function to check database method integrity
window.checkMethodIntegrity = async function() {
  console.log('🔍 [DIAGNOSTIC] Checking method integrity...');
  
  // Check if methods exist
  const methods = [
    'addInvoiceItems', 'addInvoicePayment', 'updateProductStock', 
    'createLedgerEntry', 'recalculateInvoiceTotals', 'updateCustomerLedgerForInvoice'
  ];
  
  methods.forEach(method => {
    if (typeof db[method] === 'function') {
      console.log(`✅ ${method} - Available`);
    } else {
      console.log(`❌ ${method} - NOT Available`);
    }
  });
  
  // Test createLedgerEntry constraint mapping
  try {
    console.log('🧪 Testing createLedgerEntry constraint mapping...');
    await db.createLedgerEntry({
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true }),
      type: 'incoming',
      category: 'Test',
      description: 'Constraint test',
      amount: 1,
      reference_type: 'invoice_payment', // This should be mapped to 'payment'
      created_by: 'diagnostic'
    });
    console.log('✅ createLedgerEntry constraint mapping working');
  } catch (error) {
    console.error('❌ createLedgerEntry constraint mapping failed:', error.message);
  }
};

console.log('🎯 REAL-TIME ERROR CAPTURE DIAGNOSTIC READY');
console.log('===========================================');
console.log('Available commands:');
console.log('• testAddItemWithCapture() - Test item addition with full error capture');
console.log('• testAddPaymentWithCapture() - Test payment recording with full error capture');
console.log('• checkMethodIntegrity() - Check if all methods are available and working');
console.log('\n📋 All errors and logs will be captured automatically.');
console.log('Run the test functions to see exactly what is failing.');
