// Quick test to verify guest customer payment tracking in daily ledger
// Run this in browser console after creating a guest invoice

async function testGuestPaymentTracking() {
  console.log('🔍 Testing guest customer payment tracking...');
  
  // Query daily ledger entries for today
  const today = new Date().toISOString().split('T')[0];
  
  // This would need to be adapted to the actual database query structure
  // For now, we'll check via browser dev tools
  
  console.log('📋 Steps to verify:');
  console.log('1. Create a guest invoice with payment');
  console.log('2. Check Daily Ledger page for the payment entry');
  console.log('3. Check Payment Channels page for the payment tracking');
  console.log('4. Verify cash flow shows the sale amount');
  
  console.log('✅ Manual verification steps listed above');
}

// Run the test
testGuestPaymentTracking();
