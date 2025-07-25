/**
 * Database Method Verification Script
 * Checks that all commonly used database methods are available and working
 */

import { db } from '../database';

export async function verifyDatabaseMethods(): Promise<{
  success: boolean;
  availableMethods: string[];
  missingMethods: string[];
  testResults: Record<string, any>;
}> {
  console.log('🔍 Verifying Database Methods...\n');

  const testResults: Record<string, any> = {};
  const availableMethods: string[] = [];
  const missingMethods: string[] = [];

  // List of methods that should be available
  const expectedMethods = [
    // Product methods
    'getAllProducts',
    'getProducts', 
    'getProduct',
    'createProduct',
    'updateProduct',
    'deleteProduct',
    
    // Customer methods
    'getAllCustomers',
    'getCustomers',
    'getCustomer',
    'createCustomer', 
    'updateCustomer',
    'deleteCustomer',
    'getCustomerInvoices',
    'getCustomerLedger',
    'getCustomerBalance',
    
    // Invoice methods
    'getInvoices',
    'getInvoiceDetails',
    'getInvoiceWithDetails',
    'createInvoice',
    'updateInvoice',
    'deleteInvoice',
    
    // Stock methods
    'getStockMovements',
    'getProductStockRegister',
    'updateStock',
    
    // Loan methods
    'getCustomerLoans',
    'createLoanTransaction',
    'getLoanLedger',
    
    // Payment methods
    'createPayment',
    'getPayments',
    'getCustomerPayments',
    
    // Category methods
    'getCategories',
    'createCategory',
    
    // Dashboard methods
    'getDashboardStats',
    'getLowStockProducts',
    
    // Utility methods
    'initialize',
    'testConnection'
  ];

  // Check method availability
  for (const methodName of expectedMethods) {
    if (typeof (db as any)[methodName] === 'function') {
      availableMethods.push(methodName);
    } else {
      missingMethods.push(methodName);
    }
  }

  console.log(`✅ Available methods: ${availableMethods.length}/${expectedMethods.length}`);
  console.log(`❌ Missing methods: ${missingMethods.length}`);

  if (missingMethods.length > 0) {
    console.log('\n❌ Missing Methods:');
    missingMethods.forEach(method => console.log(`  - ${method}`));
  }

  // Test basic functionality
  console.log('\n🧪 Testing Basic Functionality...');

  try {
    // Test database connection
    testResults.connection = await db.testConnection();
    console.log('✅ Database connection: OK');
  } catch (error) {
    testResults.connection = false;
    console.log('❌ Database connection failed:', error);
  }

  try {
    // Test product retrieval
    const products = await db.getAllProducts();
    testResults.products = Array.isArray(products) ? products.length : 0;
    console.log(`✅ Product retrieval: ${testResults.products} products found`);
  } catch (error) {
    testResults.products = false;
    console.log('❌ Product retrieval failed:', error);
  }

  try {
    // Test customer retrieval
    const customers = await db.getAllCustomers();
    testResults.customers = Array.isArray(customers) ? customers.length : 0;
    console.log(`✅ Customer retrieval: ${testResults.customers} customers found`);
  } catch (error) {
    testResults.customers = false;
    console.log('❌ Customer retrieval failed:', error);
  }

  try {
    // Test invoice retrieval
    const invoices = await db.getInvoices();
    testResults.invoices = Array.isArray(invoices) ? invoices.length : 0;
    console.log(`✅ Invoice retrieval: ${testResults.invoices} invoices found`);
  } catch (error) {
    testResults.invoices = false;
    console.log('❌ Invoice retrieval failed:', error);
  }

  try {
    // Test categories
    const categories = await db.getCategories();
    testResults.categories = Array.isArray(categories) ? categories.length : 0;
    console.log(`✅ Category retrieval: ${testResults.categories} categories found`);
  } catch (error) {
    testResults.categories = false;
    console.log('❌ Category retrieval failed:', error);
  }

  try {
    // Test dashboard stats
    const stats = await db.getDashboardStats();
    testResults.dashboard = stats ? 'OK' : 'No data';
    console.log('✅ Dashboard stats: OK');
  } catch (error) {
    testResults.dashboard = false;
    console.log('❌ Dashboard stats failed:', error);
  }

  const success = missingMethods.length === 0 && 
                 testResults.connection && 
                 testResults.products !== false &&
                 testResults.customers !== false &&
                 testResults.invoices !== false;

  console.log(`\n📊 Overall Status: ${success ? '✅ PASSED' : '❌ FAILED'}`);

  return {
    success,
    availableMethods,
    missingMethods,
    testResults
  };
}

// Export for console access
if (typeof window !== 'undefined') {
  (window as any).verifyDatabaseMethods = verifyDatabaseMethods;
  console.log('🔧 Database verification available at window.verifyDatabaseMethods()');
}
