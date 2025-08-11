// CUSTOMER LEDGER AUTO-SELECTION DEBUG TOOL
// Helps debug why customer auto-selection might not be working

console.log('🔍 CUSTOMER LEDGER AUTO-SELECTION DEBUG - Starting...');

async function debugCustomerAutoSelection() {
  try {
    console.log('\n📋 Step 1: Checking Current Page State...');
    
    const currentPath = window.location.pathname;
    console.log('📍 Current path:', currentPath);
    console.log('🔗 Current search params:', window.location.search);
    console.log('📤 Current state:', window.history.state);
    
    // Check if we have location.state from React Router
    if (typeof window.React !== 'undefined') {
      console.log('⚛️ React available');
    }
    
    console.log('\n📋 Step 2: Checking Navigation Data...');
    
    // Simulate the data that should be passed
    const testNavigation = {
      title: 'Test Customer - Customer Ledger',
      state: { customerId: 1, customerName: 'Test Customer' }
    };
    console.log('📤 Expected navigation data:', testNavigation);
    
    console.log('\n📋 Step 3: Checking Database Connection...');
    
    if (window.db) {
      console.log('✅ Database service available');
      
      // Get first customer for testing
      try {
        const customers = await window.db.getAllCustomers();
        console.log(`📊 Found ${customers.length} customers in database`);
        
        if (customers.length > 0) {
          const firstCustomer = customers[0];
          console.log('👤 First customer:', { id: firstCustomer.id, name: firstCustomer.name });
          console.log('💡 Test this customer ID in navigation');
        }
      } catch (error) {
        console.error('❌ Error loading customers:', error);
      }
    } else {
      console.log('❌ Database service not available');
    }
    
    console.log('\n📋 Step 4: Testing Manual Customer Selection...');
    
    // Check if we're on the customer ledger page
    if (currentPath.includes('customer-ledger')) {
      console.log('✅ Currently on Customer Ledger page');
      
      // Look for customer list elements
      const customerButtons = document.querySelectorAll('[data-testid*="customer"], .customer-item, button[title*="customer"]');
      console.log(`🔍 Found ${customerButtons.length} potential customer elements`);
      
      // Look for loading indicators
      const loadingElements = document.querySelectorAll('[role="status"], .loading, .spinner');
      console.log(`⏳ Found ${loadingElements.length} loading indicators`);
      
      // Check for customer data in page
      const customerData = document.querySelectorAll('tr, .customer-row');
      console.log(`📊 Found ${customerData.length} potential customer data rows`);
      
    } else {
      console.log('ℹ️ Not currently on Customer Ledger page');
      console.log('💡 Navigate to /reports/customer-ledger to test auto-selection');
    }
    
    console.log('\n📋 Step 5: Manual Test Instructions...');
    console.log('=' .repeat(60));
    console.log('To manually test the customer ledger navigation:');
    console.log('');
    console.log('1. Go to Customer List page (/customers)');
    console.log('2. Click the "Customer Ledger" button (FileText icon)');
    console.log('3. Check console for auto-selection debug messages:');
    console.log('   - "🎯 Auto-selecting customer ID: X"');  
    console.log('   - "✅ Found customer for auto-selection: Name"');
    console.log('   - "⏳ Waiting for customers to load..."');
    console.log('');
    console.log('4. If not working, check:');
    console.log('   - Navigation state is passed correctly');
    console.log('   - Customer list loads before auto-selection');
    console.log('   - Customer ID exists in database');
    
    console.log('\n🔧 Debug Functions Available:');
    console.log('- window.debugCustomerAutoSelection() - This function');
    console.log('- window.testCustomerListIntegration() - Test customer list buttons');
    console.log('- window.db.getAllCustomers() - Check available customers');
    
    return true;
    
  } catch (error) {
    console.error('❌ DEBUG CUSTOMER AUTO-SELECTION FAILED:', error);
    return false;
  }
}

// Create a helper to simulate navigation with customer data
function simulateCustomerNavigation(customerId, customerName) {
  console.log(`🧪 Simulating navigation to customer ${customerName} (ID: ${customerId})`);
  
  // This would be done by the useDetailNavigation hook
  const navigationData = {
    pathname: '/reports/customer-ledger',
    state: { customerId: customerId, customerName: customerName }
  };
  
  console.log('📤 Navigation data that should be passed:', navigationData);
  console.log('💡 Check if CustomerLedger component receives this state');
  
  return navigationData;
}

// Auto-run the debug
debugCustomerAutoSelection().then(success => {
  if (success) {
    console.log('\n🎉 CUSTOMER LEDGER AUTO-SELECTION DEBUG COMPLETED!');
    console.log('✅ Debug information gathered');
    console.log('✅ Test instructions provided');
  }
}).catch(error => {
  console.error('\n💥 CUSTOMER LEDGER AUTO-SELECTION DEBUG CRASHED:', error);
});

// Expose functions
if (typeof window !== 'undefined') {
  window.debugCustomerAutoSelection = debugCustomerAutoSelection;
  window.simulateCustomerNavigation = simulateCustomerNavigation;
}

console.log('🔧 DEBUG TOOL: Available as window.debugCustomerAutoSelection()');
