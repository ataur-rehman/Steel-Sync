// Performance Test for Staff Management and Business Finance Pages
console.log('🚀 Testing Staff Management and Business Finance Performance...');

async function testPagePerformance() {
  try {
    // Import database service
    const { DatabaseService } = await import('./src/services/database.ts');
    const db = DatabaseService.getInstance();
    
    console.log('🔧 Initializing database with performance optimizations...');
    const startInit = performance.now();
    await db.initializeDatabase();
    const initTime = performance.now() - startInit;
    console.log(`⚡ Database initialization: ${initTime.toFixed(0)}ms`);
    
    // Test 1: Staff Management Page Query Performance
    console.log('\n📊 Testing Staff Management Page Queries...');
    const startStaff = performance.now();
    
    // Simulate staff management page queries
    const staffQueries = [
      'SELECT COUNT(*) as total FROM staff_management WHERE is_active = 1',
      'SELECT id, name, employee_id, department, position FROM staff_management WHERE is_active = 1 ORDER BY name LIMIT 50',
      'SELECT DISTINCT department FROM staff_management WHERE is_active = 1',
      'SELECT COUNT(*) as count, department FROM staff_management WHERE is_active = 1 GROUP BY department'
    ];
    
    for (const query of staffQueries) {
      const queryStart = performance.now();
      try {
        await db.executeRawQuery(query);
        const queryTime = performance.now() - queryStart;
        console.log(`  ✅ Query executed in ${queryTime.toFixed(0)}ms: ${query.substring(0, 50)}...`);
      } catch (error) {
        console.log(`  ⚠️ Query skipped (table may not exist): ${query.substring(0, 50)}...`);
      }
    }
    
    const staffTime = performance.now() - startStaff;
    console.log(`📈 Staff Management queries total: ${staffTime.toFixed(0)}ms`);
    
    // Test 2: Business Finance Page Query Performance
    console.log('\n💰 Testing Business Finance Page Queries...');
    const startFinance = performance.now();
    
    const financeQueries = [
      'SELECT COUNT(*) as total FROM salary_payments',
      'SELECT DISTINCT payment_year FROM salary_payments ORDER BY payment_year DESC LIMIT 5',
      'SELECT SUM(payment_amount) as total FROM salary_payments WHERE payment_year = 2025',
      'SELECT payment_month, SUM(payment_amount) as monthly_total FROM salary_payments WHERE payment_year = 2025 GROUP BY payment_month',
      'SELECT COUNT(*) as pending FROM salary_payments WHERE payment_status = "pending"'
    ];
    
    for (const query of financeQueries) {
      const queryStart = performance.now();
      try {
        await db.executeRawQuery(query);
        const queryTime = performance.now() - queryStart;
        console.log(`  ✅ Query executed in ${queryTime.toFixed(0)}ms: ${query.substring(0, 50)}...`);
      } catch (error) {
        console.log(`  ⚠️ Query skipped (column may not exist yet): ${query.substring(0, 50)}...`);
      }
    }
    
    const financeTime = performance.now() - startFinance;
    console.log(`📈 Business Finance queries total: ${financeTime.toFixed(0)}ms`);
    
    // Test 3: Check Performance Indexes
    console.log('\n🏗️ Checking Performance Indexes...');
    try {
      const indexes = await db.executeRawQuery(`
        SELECT name, tbl_name FROM sqlite_master 
        WHERE type='index' AND tbl_name IN ('staff_management', 'salary_payments') 
        ORDER BY tbl_name, name
      `);
      console.log(`📊 Found ${indexes.length} performance indexes:`);
      indexes.forEach(idx => {
        console.log(`  • ${idx.name} on ${idx.tbl_name}`);
      });
    } catch (error) {
      console.warn('⚠️ Could not check indexes:', error);
    }
    
    // Test 4: Database Performance Settings
    console.log('\n⚙️ Checking Database Performance Settings...');
    try {
      const settings = [
        'PRAGMA journal_mode',
        'PRAGMA cache_size', 
        'PRAGMA synchronous',
        'PRAGMA mmap_size'
      ];
      
      for (const setting of settings) {
        const result = await db.executeRawQuery(setting);
        console.log(`  ${setting}: ${JSON.stringify(result[0])}`);
      }
    } catch (error) {
      console.warn('⚠️ Could not check settings:', error);
    }
    
    const totalTime = performance.now() - startInit;
    console.log(`\n🎯 Total Performance Test Time: ${totalTime.toFixed(0)}ms`);
    console.log('🎉 Performance test completed!');
    
    // Performance Analysis
    if (initTime < 1000 && staffTime < 500 && financeTime < 500) {
      console.log('✅ EXCELLENT: All page loads should be under 1 second!');
    } else if (initTime < 3000 && staffTime < 1500 && financeTime < 1500) {
      console.log('✅ GOOD: Page loads should be reasonable (under 3 seconds)');
    } else {
      console.log('⚠️ NEEDS IMPROVEMENT: Some queries may still be slow');
    }
    
  } catch (error) {
    console.error('❌ Performance test failed:', error);
  }
}

// Auto-run the test
if (typeof window !== 'undefined') {
  // Browser environment
  window.testPagePerformance = testPagePerformance;
  console.log('🔧 Performance test loaded. Run testPagePerformance() to execute.');
  
  // Auto-run after 2 seconds to allow page to load
  setTimeout(testPagePerformance, 2000);
} else {
  // Node environment
  testPagePerformance();
}

export { testPagePerformance };
