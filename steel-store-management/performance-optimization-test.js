// Performance Optimization Test for Staff Management & Business Finance
console.log('🚀 Testing Staff Management and Business Finance Performance Optimizations...');

async function testPerformanceOptimizations() {
  try {
    // Get database instance
    const db = window.db;
    if (!db) {
      console.error('❌ Database not available. Make sure window.db is exposed.');
      return;
    }

    console.log('📊 Starting performance optimization test...');
    const overallStart = performance.now();

    // Test 1: Apply Staff Management Optimization
    console.log('\n👥 Testing Staff Management Optimization...');
    const staffStart = performance.now();
    
    try {
      const staffResult = await db.optimizeStaffManagementPerformance();
      const staffTime = performance.now() - staffStart;
      
      console.log(`✅ Staff Management Optimization: ${staffTime.toFixed(0)}ms`);
      console.log(`📈 Indexes Created: ${staffResult.performance.indexesCreated}`);
      console.log(`💾 Cache Size: ${staffResult.performance.cacheSize}`);
      
      if (staffResult.success && staffTime < 2000) {
        console.log('🎉 Staff Management optimization: EXCELLENT performance!');
      } else {
        console.log('⚠️ Staff Management optimization: Needs improvement');
      }
    } catch (error) {
      console.error('❌ Staff Management optimization failed:', error);
    }

    // Test 2: Apply Business Finance Optimization
    console.log('\n💰 Testing Business Finance Optimization...');
    const financeStart = performance.now();
    
    try {
      const financeResult = await db.optimizeBusinessFinancePerformance();
      const financeTime = performance.now() - financeStart;
      
      console.log(`✅ Business Finance Optimization: ${financeTime.toFixed(0)}ms`);
      console.log(`📈 Indexes Created: ${financeResult.performance.indexesCreated}`);
      console.log(`💾 Cache Size: ${financeResult.performance.cacheSize}`);
      
      if (financeResult.success && financeTime < 2000) {
        console.log('🎉 Business Finance optimization: EXCELLENT performance!');
      } else {
        console.log('⚠️ Business Finance optimization: Needs improvement');
      }
    } catch (error) {
      console.error('❌ Business Finance optimization failed:', error);
    }

    // Test 3: Full Page Loading Optimization
    console.log('\n⚡ Testing Complete Page Loading Optimization...');
    const pageOptStart = performance.now();
    
    try {
      const pageResult = await db.optimizePageLoadingPerformance();
      const pageOptTime = performance.now() - pageOptStart;
      
      console.log(`✅ Page Loading Optimization: ${pageOptTime.toFixed(0)}ms`);
      console.log(`📊 Total Optimizations Applied: ${pageResult.totalTime}ms`);
      
      if (pageResult.success && pageOptTime < 5000) {
        console.log('🎉 Page loading optimization: SUCCESS!');
      } else {
        console.log('⚠️ Page loading optimization: Performance warning');
      }
    } catch (error) {
      console.error('❌ Page loading optimization failed:', error);
    }

    // Test 4: Performance Validation
    console.log('\n🔍 Running Performance Validation...');
    
    try {
      const validationStart = performance.now();
      const validation = await db.validateAllFunctionality();
      const validationTime = performance.now() - validationStart;
      
      console.log(`✅ Validation completed in ${validationTime.toFixed(0)}ms`);
      console.log(`📋 Validations passed: ${validation.validations.length}`);
      console.log(`⚠️ Issues found: ${validation.issues.length}`);
      
      if (validation.success) {
        console.log('🎉 All functionality validated successfully!');
      } else {
        console.log('⚠️ Some validation issues found:');
        validation.issues.forEach(issue => console.log(`  • ${issue}`));
      }
    } catch (error) {
      console.error('❌ Validation failed:', error);
    }

    // Test 5: System Metrics Check
    console.log('\n📊 Checking System Performance Metrics...');
    
    try {
      const metrics = db.getSystemMetrics();
      console.log('📈 Performance Metrics:');
      console.log(`  • Cache Size: ${metrics.cache.size}/${metrics.cache.maxSize}`);
      console.log(`  • Cache Hit Rate: ${(metrics.cache.hitRate * 100).toFixed(1)}%`);
      console.log(`  • Operations Count: ${metrics.performance.operationsCount}`);
      console.log(`  • Average Response Time: ${metrics.performance.averageResponseTime.toFixed(1)}ms`);
      console.log(`  • Error Count: ${metrics.performance.errorCount}`);
      
      if (metrics.cache.hitRate > 0.8) {
        console.log('🎉 Cache performance: EXCELLENT (>80% hit rate)');
      } else if (metrics.cache.hitRate > 0.6) {
        console.log('✅ Cache performance: Good (>60% hit rate)');
      } else {
        console.log('⚠️ Cache performance: Needs improvement (<60% hit rate)');
      }
    } catch (error) {
      console.error('❌ Could not retrieve system metrics:', error);
    }

    // Performance Summary
    const totalTime = performance.now() - overallStart;
    console.log(`\n🎯 PERFORMANCE TEST SUMMARY`);
    console.log(`⏱️ Total Test Time: ${totalTime.toFixed(0)}ms`);
    
    if (totalTime < 10000) {
      console.log('🎉 EXCELLENT: All optimizations completed quickly!');
      console.log('✅ Your Staff Management and Business Finance should now load much faster.');
    } else if (totalTime < 20000) {
      console.log('✅ GOOD: Optimizations applied successfully.');
      console.log('📈 You should see improved loading times.');
    } else {
      console.log('⚠️ WARNING: Optimization took longer than expected.');
      console.log('🔧 Consider checking database health and clearing browser cache.');
    }

    console.log('\n📋 Next Steps:');
    console.log('1. Navigate to Staff Management - should load in <1 second');
    console.log('2. Navigate to Business Finance - should load in <1 second');
    console.log('3. If still slow, run: await window.db.optimizePageLoadingPerformance()');
    console.log('4. For issues, run: await window.db.getHealthReport()');

    return {
      success: true,
      totalTime,
      message: 'Performance optimization test completed'
    };

  } catch (error) {
    console.error('❌ Performance test failed:', error);
    return {
      success: false,
      error: error.message,
      message: 'Performance optimization test failed'
    };
  }
}

// Auto-run if in browser environment
if (typeof window !== 'undefined') {
  window.testPerformanceOptimizations = testPerformanceOptimizations;
  console.log('🔧 Performance test loaded. Run testPerformanceOptimizations() to execute.');
  
  // Auto-run after 2 seconds if database is available
  setTimeout(() => {
    if (window.db) {
      console.log('🚀 Auto-running performance optimization test...');
      testPerformanceOptimizations();
    } else {
      console.log('⏳ Database not ready yet. Run testPerformanceOptimizations() manually when ready.');
    }
  }, 2000);
}

export { testPerformanceOptimizations };
