// QUICK FINANCIAL VERIFICATION
// Copy this into your browser console while on your Steel Store Management system

console.log('🔍 QUICK FINANCIAL DATA VERIFICATION');
console.log('====================================');
console.log('Checking if Rs 146,400 appears in the correct place...');

// Method 1: Check if financeService is available in window
async function quickFinancialCheck() {
  try {
    console.log('\n1. 📊 Checking current financial calculations...');
    
    // Try to access the finance service directly from window/global scope
    if (window.financeService) {
      const metrics = await window.financeService.getBusinessMetrics();
      console.log('✅ Found financeService in global scope');
      
      console.log('\n📈 Business Metrics:');
      console.log(`   💰 Total Sales: Rs ${metrics.totalSales.toLocaleString()}`);
      console.log(`   🏭 Steel Purchases: Rs ${metrics.totalPurchases.toLocaleString()}`);
      console.log(`   📊 Outstanding Receivables: Rs ${metrics.outstandingReceivables.toLocaleString()}`);
      console.log(`   📋 Outstanding Payables: Rs ${metrics.outstandingPayables.toLocaleString()}`);
      console.log(`   💵 Cash in Hand: Rs ${metrics.cashInHand.toLocaleString()}`);
      console.log(`   📈 Net Profit: Rs ${metrics.netProfit.toLocaleString()}`);
      
      if (metrics.totalPurchases > 0) {
        console.log('\n🎉 SUCCESS! Your vendor purchase data is being calculated!');
        console.log(`   Your Rs 146,400 should show as "Steel Purchases": Rs ${metrics.totalPurchases.toLocaleString()}`);
      } else {
        console.log('\n❌ Steel Purchases showing Rs 0 - need to investigate further');
      }
      
      return metrics;
    }
    
    // Method 2: Try to import the service
    console.log('🔄 Trying to import financeService...');
    const { financeService } = await import('/src/services/financeService.ts');
    
    const metrics = await financeService.getBusinessMetrics();
    console.log('✅ Successfully imported and called financeService');
    
    console.log('\n📈 Business Metrics:');
    console.log(`   💰 Total Sales: Rs ${metrics.totalSales.toLocaleString()}`);
    console.log(`   🏭 Steel Purchases: Rs ${metrics.totalPurchases.toLocaleString()}`);
    console.log(`   📊 Outstanding Receivables: Rs ${metrics.outstandingReceivables.toLocaleString()}`);
    console.log(`   📋 Outstanding Payables: Rs ${metrics.outstandingPayables.toLocaleString()}`);
    console.log(`   💵 Cash in Hand: Rs ${metrics.cashInHand.toLocaleString()}`);
    console.log(`   📈 Net Profit: Rs ${metrics.netProfit.toLocaleString()}`);
    
    if (metrics.totalPurchases > 0) {
      console.log('\n🎉 SUCCESS! Your vendor purchase data is being calculated!');
      console.log(`   Your data should show as "Steel Purchases": Rs ${metrics.totalPurchases.toLocaleString()}`);
      
      if (metrics.totalPurchases >= 146000) {
        console.log('✅ Found your Rs 146,400 data in Steel Purchases!');
      }
    } else {
      console.log('\n❌ Steel Purchases showing Rs 0 - checking database directly...');
      await checkDatabaseDirectly();
    }
    
    return metrics;
    
  } catch (error) {
    console.error('❌ Error accessing financeService:', error);
    console.log('\n🔄 Trying alternative methods...');
    await checkDatabaseDirectly();
  }
}

async function checkDatabaseDirectly() {
  try {
    console.log('\n2. 🗄️ Checking database directly...');
    
    const { db } = await import('/src/services/database.ts');
    const currentYear = new Date().getFullYear();
    
    // Check stock receiving data
    const purchasesQuery = `
      SELECT COALESCE(SUM(total_amount), 0) as total_purchases
      FROM stock_receiving 
      WHERE strftime('%Y', date) = '${currentYear}'
    `;
    
    const result = await db.executeRawQuery(purchasesQuery);
    const totalPurchases = result[0].total_purchases;
    
    console.log(`📦 Direct database query result:`);
    console.log(`   Steel Purchases: Rs ${totalPurchases.toLocaleString()}`);
    
    if (totalPurchases > 0) {
      console.log('✅ Found purchase data in database!');
      console.log('🔄 The issue might be in how the UI is displaying the data');
      
      // Get individual records
      const records = await db.executeRawQuery(`
        SELECT receiving_number, vendor_name, total_amount, date
        FROM stock_receiving 
        ORDER BY created_at DESC
        LIMIT 5
      `);
      
      console.log('\n📋 Recent stock receiving records:');
      records.forEach(r => {
        console.log(`   ${r.receiving_number}: ${r.vendor_name} - Rs ${r.total_amount.toLocaleString()} (${r.date})`);
      });
      
    } else {
      console.log('❌ No purchase data found in stock_receiving table');
      console.log('💡 Your data might be in a different table or different date format');
    }
    
  } catch (error) {
    console.error('❌ Error checking database directly:', error);
    console.log('\n💡 Manual verification steps:');
    console.log('1. Go to your Stock Receiving page');
    console.log('2. Check if S0001 (Rs 146,400) and S0002 (Rs 122) are visible there');
    console.log('3. If yes, then the data exists but UI might not be refreshing');
    console.log('4. Try refreshing the financial dashboard page');
  }
}

// Method 3: Check localStorage for any cached data
function checkLocalStorage() {
  console.log('\n3. 💾 Checking localStorage for cached financial data...');
  
  const keys = Object.keys(localStorage).filter(key => 
    key.includes('financial') || key.includes('vendor') || key.includes('business')
  );
  
  if (keys.length > 0) {
    console.log('📋 Found financial data in localStorage:');
    keys.forEach(key => {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        console.log(`   ${key}:`, data);
      } catch (e) {
        console.log(`   ${key}: ${localStorage.getItem(key)}`);
      }
    });
  } else {
    console.log('❌ No financial data found in localStorage');
  }
}

// Method 4: Check if data appears in the DOM
function checkDOMElements() {
  console.log('\n4. 🌐 Checking DOM for financial display elements...');
  
  // Look for elements that might contain financial data
  const selectors = [
    '[data-testid*="sales"]',
    '[data-testid*="purchase"]',
    '.kpi-card',
    '.financial-metric',
    'div:contains("Total Sales")',
    'div:contains("Steel Purchases")',
    'div:contains("146")',
    'div:contains("146400")'
  ];
  
  selectors.forEach(selector => {
    try {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`✅ Found ${elements.length} elements matching "${selector}"`);
        elements.forEach((el, i) => {
          console.log(`   Element ${i + 1}:`, el.textContent?.trim() || el.innerHTML.trim());
        });
      }
    } catch (e) {
      // Selector might not be valid, skip
    }
  });
}

// Run all checks
console.log('🚀 Starting financial data verification...');

quickFinancialCheck().then(metrics => {
  console.log('\n🔍 Additional checks...');
  checkLocalStorage();
  checkDOMElements();
  
  console.log('\n📋 VERIFICATION SUMMARY:');
  console.log('========================');
  
  if (metrics && metrics.totalPurchases > 0) {
    console.log('✅ Financial service is working correctly');
    console.log(`✅ Steel Purchases: Rs ${metrics.totalPurchases.toLocaleString()}`);
    console.log('');
    console.log('💡 Where to find your data:');
    console.log('   1. Look for "Steel Purchases" card in your dashboard');
    console.log('   2. Should NOT be in "Total Sales" (that\'s for customer invoices)');
    console.log('   3. Your Rs 146,400 is vendor purchase data, not customer sales');
  } else {
    console.log('❌ Financial calculations showing Rs 0');
    console.log('🔧 Possible solutions:');
    console.log('   1. Refresh the financial dashboard page');
    console.log('   2. Check if stock receiving data exists in the database');
    console.log('   3. Verify date formats in stock_receiving table');
  }
  
  console.log('\n🎯 KEY INSIGHT:');
  console.log('Your Rs 146,400 should appear under "Steel Purchases" or "Vendor Purchases"');
  console.log('NOT under "Total Sales" (which is for customer invoices)');
}).catch(error => {
  console.error('❌ Verification failed:', error);
  console.log('💡 Try manual verification by going to Stock Receiving page');
});
