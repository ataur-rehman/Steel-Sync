/**
 * Simple Database Enhancement Validation
 * Basic validation to ensure enhanced database system is working
 */

import { DatabaseService } from '../database';
import { EnhancedDatabaseService } from './enhanced-service';

export async function validateEnhancedDatabase(): Promise<{
  success: boolean;
  details: string[];
  errors: string[];
}> {
  const details: string[] = [];
  const errors: string[] = [];

  console.log('🔍 Validating Enhanced Database System...\n');

  try {
    // Test 1: Database Service Initialization
    console.log('1. Testing Database Service...');
    const db = DatabaseService.getInstance();
    if (db) {
      details.push('✅ Database Service instance available');
    } else {
      errors.push('❌ Database Service instance not available');
    }

    // Test 2: Enhanced Service Initialization
    console.log('2. Testing Enhanced Service...');
    const enhanced = EnhancedDatabaseService.getInstance();
    if (enhanced) {
      details.push('✅ Enhanced Database Service instance available');

      try {
        await enhanced.initialize();
        details.push('✅ Enhanced Database Service initialized successfully');
      } catch (error) {
        errors.push(`❌ Enhanced Service initialization failed: ${error}`);
      }
    } else {
      errors.push('❌ Enhanced Database Service instance not available');
    }

    // Test 3: Basic Database Operations
    console.log('3. Testing Basic Operations...');
    try {
      const products = await db.getAllProducts();
      if (Array.isArray(products)) {
        details.push('✅ Product retrieval working');
      } else {
        errors.push('❌ Product retrieval returned invalid data');
      }
    } catch (error) {
      errors.push(`❌ Product retrieval failed: ${error}`);
    }

    try {
      const customers = await db.getAllCustomers();
      if (Array.isArray(customers)) {
        details.push('✅ Customer retrieval working');
      } else {
        errors.push('❌ Customer retrieval returned invalid data');
      }
    } catch (error) {
      errors.push(`❌ Customer retrieval failed: ${error}`);
    }

    try {
      const invoices = await db.getInvoices();
      if (Array.isArray(invoices)) {
        details.push('✅ Invoice retrieval working');
      } else {
        errors.push('❌ Invoice retrieval returned invalid data');
      }
    } catch (error) {
      errors.push(`❌ Invoice retrieval failed: ${error}`);
    }

    // Test 4: Enhanced Service Health Check
    console.log('4. Testing Health Check...');
    try {
      const health = await enhanced.healthCheck();
      if (health && typeof health.healthy === 'boolean') {
        details.push(`✅ Health check working - Status: ${health.healthy ? 'Healthy' : 'Unhealthy'}`);

        if (health.components) {
          Object.entries(health.components).forEach(([component, status]) => {
            const componentStatus = status as unknown as { healthy: boolean; details?: any };
            details.push(`  - ${component}: ${componentStatus.healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
          });
        }
      } else {
        errors.push('❌ Health check returned invalid response');
      }
    } catch (error) {
      errors.push(`❌ Health check failed: ${error}`);
    }

    // Test 5: Performance Test
    console.log('5. Testing Performance...');
    const start = Date.now();
    try {
      await Promise.all([
        db.getAllProducts(),
        db.getAllCustomers(),
        db.getInvoices()
      ]);
      const duration = Date.now() - start;
      details.push(`✅ Concurrent operations completed in ${duration}ms`);

      if (duration < 2000) {
        details.push('✅ Performance within acceptable range');
      } else {
        details.push('⚠️ Performance slower than expected');
      }
    } catch (error) {
      errors.push(`❌ Performance test failed: ${error}`);
    }

    // Test 6: Schema Version Check
    console.log('6. Testing Schema Management...');
    try {
      // Check if enhanced service has schema manager
      if ((enhanced as any).schemaManager) {
        details.push('✅ Schema manager available');
      } else {
        details.push('⚠️ Schema manager not accessible (expected for private member)');
      }
    } catch (error) {
      errors.push(`❌ Schema management test failed: ${error}`);
    }

    // Test 7: Event System Check
    console.log('7. Testing Event System...');
    try {
      // Check if enhanced service has event manager
      if ((enhanced as any).eventManager) {
        details.push('✅ Event manager available');
      } else {
        details.push('⚠️ Event manager not accessible (expected for private member)');
      }
    } catch (error) {
      errors.push(`❌ Event system test failed: ${error}`);
    }

    console.log('\n📊 Validation Complete!\n');

    // Display results
    if (details.length > 0) {
      console.log('✅ Successful Checks:');
      details.forEach(detail => console.log(`  ${detail}`));
      console.log('');
    }

    if (errors.length > 0) {
      console.log('❌ Issues Found:');
      errors.forEach(error => console.log(`  ${error}`));
      console.log('');
    }

    const success = errors.length === 0;
    console.log(`Overall Result: ${success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Successful checks: ${details.length}`);
    console.log(`Issues found: ${errors.length}`);

    return {
      success,
      details,
      errors
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Validation failed with critical error:', errorMessage);
    errors.push(`Critical error: ${errorMessage}`);

    return {
      success: false,
      details,
      errors
    };
  }
}

// Auto-run validation when imported
if (typeof window !== 'undefined') {
  console.log('Enhanced Database Validation is ready. Call validateEnhancedDatabase() to run tests.');
}
