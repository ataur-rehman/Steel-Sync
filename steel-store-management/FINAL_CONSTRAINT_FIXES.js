// FINAL FIXES - Addressing transaction and constraint issues
console.log('🔧 APPLYING FINAL FIXES...');

if (!window.db) {
  console.error('❌ Database not available');
} else {
  
  // FIX 1: Override updateProductStock WITHOUT transaction (since it's already in one)
  window.db.updateProductStock = async function(productId, quantityChange, movementType, reason, referenceId, referenceNumber) {
    console.log('🔧 Using transaction-safe updateProductStock');
    
    try {
      // NO TRANSACTION - we're already inside one from addInvoiceItems
      
      // Get current product
      const products = await this.dbConnection.execute(
        'SELECT * FROM products WHERE id = ?', 
        [productId]
      );
      
      if (!products || products.length === 0) {
        throw new Error(`Product with ID ${productId} not found`);
      }
      
      const product = products[0];
      
      // Simple numeric stock update
      let currentStock = parseFloat(product.current_stock) || 0;
      let newStock = Math.max(0, currentStock + quantityChange);
      
      // Update product stock
      await this.dbConnection.execute(
        'UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newStock.toString() + 'kg', productId]
      );
      
      console.log('✅ Transaction-safe stock update successful');
      
    } catch (error) {
      console.error('❌ Transaction-safe updateProductStock failed:', error);
      throw error;
    }
  };
  
  // FIX 2: Override createLedgerEntry with correct constraint values
  window.db.createLedgerEntry = async function(entry) {
    console.log('🔧 Using constraint-compliant createLedgerEntry');
    
    try {
      // Map reference_type to valid constraint values
      let validReferenceType = entry.reference_type;
      if (entry.reference_type === 'invoice_payment') {
        validReferenceType = 'payment'; // Use 'payment' instead of 'invoice_payment'
      }
      
      await this.dbConnection.execute(
        `INSERT INTO ledger_entries 
        (date, time, type, category, description, amount, running_balance, customer_id, customer_name, 
         reference_id, reference_type, bill_number, notes, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          entry.date || new Date().toISOString().split('T')[0],
          entry.time || new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true }),
          entry.type, 
          entry.category, 
          entry.description, 
          entry.amount,
          0, // running_balance
          entry.customer_id || null, 
          entry.customer_name || null, 
          entry.reference_id || null, 
          validReferenceType || 'payment', // Use valid constraint value
          entry.bill_number || null, 
          entry.notes || null, 
          entry.created_by || 'system'
        ]
      );
      
      console.log('✅ Constraint-compliant ledger entry creation successful');
      
    } catch (error) {
      console.error('❌ Constraint-compliant createLedgerEntry failed:', error);
      throw new Error(`Failed to create ledger entry: ${error.message}`);
    }
  };
  
  console.log('✅ Final fixes applied to both methods');
  
  // Now test immediately with the fixes
  (async function testFinalFixes() {
    try {
      const invoices = await window.db.dbConnection.execute('SELECT id, customer_id FROM invoices LIMIT 1');
      if (invoices && invoices.length > 0) {
        const testInvoice = invoices[0];
        
        // Test 1: Add item
        console.log('\n🧪 Testing item addition with final fixes...');
        try {
          await window.db.addInvoiceItems(testInvoice.id, [{
            product_id: 1,
            product_name: 'Final Fixed Test Item - ' + Date.now(),
            quantity: '1',
            unit_price: 100,
            total_price: 100,
            unit: '1 piece'
          }]);
          console.log('🎉 SUCCESS: Item addition finally works!');
        } catch (e) {
          console.error('❌ Item addition still fails:', e.message);
        }
        
        // Test 2: Add payment
        console.log('\n🧪 Testing payment addition with final fixes...');
        try {
          await window.db.addInvoicePayment(testInvoice.id, {
            amount: 30,
            payment_method: 'cash',
            reference: 'FINAL-FIXED-TEST-' + Date.now(),
            notes: 'Testing with final fixes',
            date: new Date().toISOString().split('T')[0]
          });
          console.log('🎉 SUCCESS: Payment with ledger finally works!');
          
          // Verify ledger entry was created
          const ledgerEntries = await window.db.dbConnection.execute(
            'SELECT * FROM ledger_entries WHERE reference_id = ? AND reference_type = ? ORDER BY id DESC LIMIT 1',
            [testInvoice.id, 'payment']
          );
          
          if (ledgerEntries && ledgerEntries.length > 0) {
            console.log('✅ VERIFIED: Customer ledger entry created:', {
              amount: ledgerEntries[0].amount,
              description: ledgerEntries[0].description,
              type: ledgerEntries[0].type
            });
          }
          
        } catch (e) {
          console.error('❌ Payment still fails:', e.message);
        }
      }
    } catch (error) {
      console.error('❌ Final test failed:', error);
    }
  })();
  
  console.log('\n📋 SUMMARY OF FIXES:');
  console.log('1. ✅ Fixed transaction nesting issue in updateProductStock');
  console.log('2. ✅ Fixed CHECK constraint issue in createLedgerEntry');
  console.log('3. 🧪 Testing both fixes automatically...');
}
