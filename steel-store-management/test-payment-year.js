// Test payment_year column fix
console.log('🧪 Testing payment_year column fix...');

// Test in browser console
setTimeout(async () => {
  try {
    const { DatabaseService } = await import('./src/services/database.ts');
    const db = DatabaseService.getInstance();
    
    console.log('🔧 Initializing database...');
    const result = await db.initializeDatabase();
    
    if (result.success) {
      console.log('✅ Database initialization successful');
      
      // Check salary_payments table structure
      console.log('📋 Checking salary_payments table...');
      const tableInfo = await db.executeRawQuery('PRAGMA table_info(salary_payments)', []);
      console.log('Salary payments table columns:', tableInfo.map(col => col.name));
      
      const hasPaymentYear = tableInfo.some(col => col.name === 'payment_year');
      console.log(`📅 payment_year column exists: ${hasPaymentYear ? '✅ Yes' : '❌ No'}`);
      
      if (hasPaymentYear) {
        // Test query that was failing
        console.log('🔍 Testing payment_year query...');
        const currentYear = new Date().getFullYear();
        const yearData = await db.executeRawQuery(`
          SELECT COALESCE(SUM(payment_amount), 0) as total
          FROM salary_payments 
          WHERE payment_year = ?
        `, [currentYear]);
        console.log('✅ Payment year query successful:', yearData);
      }
      
    } else {
      console.error('❌ Database initialization failed:', result.message);
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}, 2000);
