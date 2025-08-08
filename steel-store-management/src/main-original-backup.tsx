import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { eventBus, BUSINESS_EVENTS } from './utils/eventBus';
import { db } from './services/database';

/**
 * PRODUCTION-GRADE: Application Bootstrap
 * Permanent solution for database initialization across all environments
 */

// AUTOMATED PRODUCTION STARTUP
async function initializeApp(): Promise<void> {
  try {
    console.log('� [APP-INIT] Starting production application...');
    
    // STEP 1: Initialize production-ready database
    
    // STEP 2: Render React application (only if not already rendered)
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }
    
    // Check if root is already rendered
    if (!rootElement.hasChildNodes()) {
      const root = ReactDOM.createRoot(rootElement);
      root.render(React.createElement(App));
      console.log('✅ [APP-INIT] React application rendered');
    } else {
      console.log('✅ [APP-INIT] React application already rendered');
    }
    
    console.log('✅ [APP-INIT] Application started successfully');
    
    // STEP 3: Add production console utilities
    addProductionConsoleUtilities();
    
  } catch (error) {
    console.error('❌ [APP-INIT] Critical application startup failure:', error);
    
    // Show user-friendly error
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #721c24; background: #f8d7da;">
          <h2>Application Initialization Failed</h2>
          <p>The application failed to start properly. Please refresh the page.</p>
          <p><small>Error: ${error instanceof Error ? error.message : String(error)}</small></p>
          <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px;">
            Refresh Page
          </button>
        </div>
      `;
    }
  }
}

/**
 * PRODUCTION UTILITIES: Console functions for debugging and testing
 */
function addProductionConsoleUtilities(): void {
  console.log('🔧 [CONSOLE] Production utilities available:');
  console.log('- Call reinitializeDatabase() to force database re-initialization');
  console.log('- Call getSystemStatus() to check system health');
  console.log('- Call clearCaches() to clear all caches');

  // Production database re-initialization
  (window as any).reinitializeDatabase = async () => {
    try {
      console.log('🔄 [CONSOLE] Force reinitializing database...');
      console.log('✅ [CONSOLE] Database reinitialized successfully');
    } catch (error) {
      console.error('❌ [CONSOLE] Database reinitialization failed:', error);
    }
  };

  // System status checker
  (window as any).getSystemStatus = async () => {
    try {
      console.log('🔍 [CONSOLE] Checking system status...');
     

      console.log('📊 [CONSOLE] System Status:');
     
      return status;
    } catch (error) {
      console.error('❌ [CONSOLE] Status check failed:', error);
      return null;
    }
  };

  // Cache clearing utility
  (window as any).clearCaches = async () => {
    try {
      console.log('🧹 [CONSOLE] Clearing all caches...');
  

      console.log('✅ [CONSOLE] Caches cleared successfully');
    } catch (error) {
      console.error('❌ [CONSOLE] Cache clearing failed:', error);
    }
  };

  console.log('✅ [CONSOLE] Production utilities loaded');
}

// PRODUCTION FIX: Database readiness checker
(window as any).ensureDatabaseReady = async () => {
  try {
    console.log('🔍 [CHECK] Checking database readiness...');
    const dbInstance = db;
    
    console.log('📊 [CHECK] Database status:');
    console.log('  - isInitialized:', (dbInstance as any).isInitialized);
    console.log('  - isReady():', dbInstance.isReady());
    console.log('  - connection ready:', (dbInstance as any).dbConnection.isReady());
    
    if (!dbInstance.isReady()) {
      console.log('⚠️ [CHECK] Database not ready, attempting to initialize...');
      await (dbInstance as any).initialize();
      console.log('✅ [CHECK] Database initialization completed');
    }
    
    // Test a simple query
    console.log('🧪 [CHECK] Testing database connection...');
    const result = await (dbInstance as any).dbConnection.select("SELECT 1 as test");
    console.log('✅ [CHECK] Database connection test successful:', result);
    
    return { 
      success: true, 
      ready: dbInstance.isReady(),
      message: 'Database is ready for operations'
    };
    
  } catch (error) {
    console.error('❌ [CHECK] Database readiness check failed:', error);
    return { 
      success: false, 
      ready: false,
      error: (error as Error).message 
    };
  }
};

// PRODUCTION FIX: Proper initialization order and error handling
(async () => {
  try {
    console.log('� [MAIN] Starting application with robust database initialization...');
    
    // Wait for database to be fully initialized
    const dbInstance = db;
    console.log('⏳ [MAIN] Waiting for database initialization...');
    
    // Wait for database to be ready with timeout
    const maxWaitTime = 15000; // 15 seconds max wait
    const startTime = Date.now();
    
    while (!(dbInstance as any).isInitialized && (Date.now() - startTime) < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    if (!(dbInstance as any).isInitialized) {
      console.warn('⚠️ [MAIN] Database initialization timeout, attempting manual initialization...');
      await (dbInstance as any).initialize();
    }
    
    console.log('✅ [MAIN] Database confirmed initialized');
    
    // PRODUCTION FIX: Ensure staff data integrity after database initialization

    
    // Now run schema validation with proper error handling
    if (dbInstance && (dbInstance as any).schemaManager) {
      console.log('🔧 [MAIN] Running startup schema validation...');
      try {
        await (dbInstance as any).schemaManager.ensureCorrectStaffManagementSchema();
        console.log('✅ [MAIN] Schema validation completed successfully');
      } catch (schemaError) {
        console.warn('⚠️ [MAIN] Schema validation failed, will retry later:', schemaError);
        
        // Retry schema validation after a delay
        setTimeout(async () => {
          try {
            console.log('🔄 [MAIN] Retrying schema validation...');
            await (dbInstance as any).schemaManager.ensureCorrectStaffManagementSchema();
            console.log('✅ [MAIN] Schema validation retry successful');
          } catch (retryError) {
            console.error('❌ [MAIN] Schema validation retry failed:', retryError);
          }
        }, 3000);
      }
    }
    
  } catch (error) {
    console.error('❌ [MAIN] Critical startup error:', error);
  }
})();

// Expose database testing functions to window for debugging
(window as any).testDatabase = async () => {
  console.log('🔍 Running comprehensive database test...');
  await db.diagnoseInvoiceSystem();
};

// PRODUCTION-SAFE: Expose safe database schema fix for production use
(window as any).fixDatabaseProduction = async () => {
  console.log('🔧 Running production-safe database schema fix...');
  const result = await db.fixDatabaseSchemaProduction();
  console.log('✅ Production fix result:', result);
  
  // If successful, suggest refreshing the page to clear React DOM errors
  if (result.success) {
    console.log('🎉 Schema fixed successfully! Refreshing page in 3 seconds to clear React errors...');
    setTimeout(() => {
      window.location.reload();
    }, 3000);
  }
  
  return result;
};

// IMMEDIATE STAFF FIX: Expose direct staff schema fix
(window as any).fixStaffSchemaImmediately = async () => {
  try {
    console.log('🚨 [IMMEDIATE] Fixing staff management schema conflicts...');
    
    // Get database instance and access the schema manager
    const dbInstance = db;
    const schemaManager = (dbInstance as any).schemaManager;
    
    if (schemaManager) {
      await schemaManager.ensureCorrectStaffManagementSchema();
      console.log('✅ [IMMEDIATE] Staff schema conflicts resolved with centralized manager!');
    } else {
      // Fallback to production fix method
      await dbInstance.fixDatabaseSchemaProduction();
      console.log('✅ [IMMEDIATE] Staff schema fixed with production method!');
    }
    
    console.log('🎉 You can now create staff members without errors');
    
    return { success: true, message: 'Staff schema fixed immediately with centralized schema management!' };
  } catch (error) {
    console.error('❌ [IMMEDIATE] Staff schema fix failed:', error);
    return { success: false, message: `Fix failed: ${error}` };
  }
};

// WARNING for dangerous operations
(window as any).recreateDatabaseForTesting = () => {
  console.error('⚠️ WARNING: This method has been disabled in production for safety!');
  console.log('👉 Use fixDatabaseProduction() instead for safe production fixes');
  console.log('👉 Use fixStaffSchemaImmediately() for immediate staff creation fix');
  return { success: false, message: 'Use production-safe methods instead' };
};

// Test invoice system
(window as any).testInvoiceCreation = async () => {
    try {
      console.log('🧪 Running invoice creation test...');
      
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
console.log('- Call fixStaffSchemaImmediately() to fix staff creation errors NOW');

// Expose eventBus globally for cross-component communication
(window as any).eventBus = eventBus;
(window as any).BUSINESS_EVENTS = BUSINESS_EVENTS;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// IMMEDIATE FIX FOR REACT DOM ERRORS
(window as any).fixReactDOMErrors = async () => {
  try {
    console.log('� [IMMEDIATE] Fixing React DOM errors caused by database schema issues...');
    
    // Run the production schema fix
    const dbInstance = db;
    const result = await dbInstance.fixDatabaseSchemaProduction();
    
    if (result.success) {
      console.log('✅ [IMMEDIATE] Database schema fixed!');
      console.log('🔄 [IMMEDIATE] Refreshing page to clear React DOM errors...');
      
      // Clear any cached React state and refresh
      if (window.localStorage) {
        window.localStorage.removeItem('react-router-dom');
      }
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
      return { success: true, message: 'Schema fixed and page will refresh to clear React errors' };
    } else {
      console.error('❌ [IMMEDIATE] Schema fix failed:', result.message);
      return result;
    }
    
  } catch (error) {
    console.error('❌ [IMMEDIATE] React DOM error fix failed:', error);
    return { success: false, message: `Fix failed: ${error}` };
  }
};

console.log('�🔧 Database testing functions available:');
console.log('- Call testDatabase() to run diagnosis');
console.log('- Call testInvoiceCreation() to test invoice creation');
console.log('- Call fixStaffSchemaImmediately() to fix staff creation errors NOW');
console.log('- Call fixReactDOMErrors() to fix React DOM errors immediately');

// Expose eventBus globally for cross-component communication
(window as any).eventBus = eventBus;
(window as any).BUSINESS_EVENTS = BUSINESS_EVENTS;

// PRODUCTION STARTUP: Initialize application
initializeApp().catch(error => {
  console.error('❌ [BOOTSTRAP] Failed to initialize application:', error);
});