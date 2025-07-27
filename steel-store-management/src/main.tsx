import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { db } from './services/database';
import { eventBus, BUSINESS_EVENTS } from './utils/eventBus';

// Initialize database and expose to window for developer access
console.log('🔄 [MAIN] Starting database initialization...');

db.initialize().then(() => {
  console.log('✅ [MAIN] Database initialized and ready');
  
  // Expose database testing functions to window for debugging
  (window as any).testDatabase = async () => {
    console.log('🔍 Running comprehensive database test...');
    await db.diagnoseInvoiceSystem();
  };
  
  (window as any).testInvoiceCreation = async () => {
    console.log('✨ Testing invoice creation...');
    
    try {
      // Get or create test customer
      let customers = await db.getCustomers();
      let testCustomer = customers.find(c => c.name === 'Test Customer');
      
      if (!testCustomer) {
        console.log('Creating test customer...');
        await db.createCustomer({
          name: 'Test Customer',
          contact: '1234567890',
          address: 'Test Address',
          opening_balance: 0
        });
        customers = await db.getCustomers();
        testCustomer = customers.find(c => c.name === 'Test Customer');
      }
      
      // Get or create test product
      let products = await db.getProducts();
      let testProduct = products.find(p => p.name === 'Test Product');
      
      if (!testProduct) {
        console.log('Creating test product...');
        await db.createProduct({
          name: 'Test Product',
          stock: '100 kg',
          price: 150
        });
        products = await db.getProducts();
        testProduct = products.find(p => p.name === 'Test Product');
      }
      
      console.log('Creating test invoice...');
      const result = await db.createInvoice({
        customer_id: testCustomer.id,
        items: [{
          product_id: testProduct.id,
          product_name: testProduct.name,
          quantity: '5 kg',
          unit_price: 150,
          total_price: 750
        }]
      });
      
      console.log('✅ Invoice created:', result);
      
      // Test if invoice appears in all related systems
      console.log('Checking invoice visibility...');
      const invoices = await db.getInvoices();
      console.log(`📋 Total invoices: ${invoices.length}`);
      
      const customerLedger = await db.getCustomerLedger(testCustomer.id, { limit: 10, offset: 0 });
      console.log(`📋 Customer ledger entries: ${customerLedger.transactions.length}`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Invoice test failed:', error);
      throw error;
    }
  };
  
  console.log('🔧 Database testing functions available:');
  console.log('- Call testDatabase() to run diagnosis');
  console.log('- Call testInvoiceCreation() to test invoice creation');
  
}).catch(error => {
  console.error('❌ [MAIN] Database initialization failed:', error);
  console.error('❌ [MAIN] Error details:', error.stack);
});

// Expose eventBus globally for cross-component communication
(window as any).eventBus = eventBus;
(window as any).BUSINESS_EVENTS = BUSINESS_EVENTS;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);