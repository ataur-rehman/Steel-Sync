/**
 * Database Performance Test
 * Tests the startup time of the database initialization
 */

import { DatabaseService } from '../src/services/database';

async function testDatabasePerformance() {
  console.log('🧪 Starting Database Performance Test...');
  
  const startTime = Date.now();
  
  try {
    const db = DatabaseService.getInstance();
    
    console.log('📊 Testing database initialization speed...');
    const initStartTime = Date.now();
    
    const isInitialized = await db.initialize();
    
    const initEndTime = Date.now();
    const initDuration = initEndTime - initStartTime;
    
    console.log(`✅ Database initialization completed in ${initDuration}ms`);
    console.log(`📈 Initialization result: ${isInitialized}`);
    
    // Test basic operations
    console.log('🧪 Testing basic database operations...');
    
    const testStartTime = Date.now();
    
    // Test customers table
    try {
      const customers = await db.getCustomers();
      console.log(`📊 Found ${customers.length} customers`);
    } catch (error) {
      console.log('⚠️ Customers table not ready yet (background loading)');
    }
    
    // Test products table
    try {
      const products = await db.getProducts();
      console.log(`📊 Found ${products.length} products`);
    } catch (error) {
      console.log('⚠️ Products table not ready yet (background loading)');
    }
    
    const testEndTime = Date.now();
    const testDuration = testEndTime - testStartTime;
    
    console.log(`✅ Basic operations completed in ${testDuration}ms`);
    
    const totalTime = Date.now() - startTime;
    console.log(`🎉 Total test time: ${totalTime}ms`);
    
    // Performance thresholds
    console.log('\n📊 Performance Analysis:');
    if (initDuration < 1000) {
      console.log('🚀 EXCELLENT: Database initialization < 1 second');
    } else if (initDuration < 3000) {
      console.log('✅ GOOD: Database initialization < 3 seconds');
    } else if (initDuration < 5000) {
      console.log('⚠️ SLOW: Database initialization > 3 seconds');
    } else {
      console.log('❌ VERY SLOW: Database initialization > 5 seconds');
    }
    
  } catch (error) {
    console.error('❌ Database performance test failed:', error);
  }
}

// Run the test
testDatabasePerformance().catch(console.error);
