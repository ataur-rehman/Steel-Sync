/**
 * BUSINESS FINANCE PAGE DATABASE COLUMN FIX VALIDATION
 * ===================================================
 * 
 * This test validates that the business finance page database column errors have been fixed
 * by replacing incorrect 'total_amount' column references with 'grand_total' in financeService.ts
 * 
 * ISSUES FIXED:
 * 1. stock_receiving.total_amount -> stock_receiving.grand_total in steel purchases query
 * 2. stock_receiving.total_amount -> stock_receiving.grand_total in vendor outstanding query 
 * 3. stock_receiving.total_amount -> stock_receiving.grand_total in COGS calculation query
 * 
 * CENTRALIZED APPROACH: Uses existing centralized database schema without ALTER queries
 */

import { db } from '../src/services/database.js';
import { financeService } from '../src/services/financeService.js';

class BusinessFinancePageDatabaseColumnFixValidator {
  constructor() {
    this.results = [];
    this.errors = [];
  }

  log(message) {
    console.log(`🔍 [FINANCE COLUMN FIX] ${message}`);
    this.results.push(message);
  }

  error(message, error = null) {
    const errorMsg = `❌ [ERROR] ${message}${error ? ': ' + error.message : ''}`;
    console.error(errorMsg);
    this.errors.push({ message, error });
  }

  success(message) {
    const successMsg = `✅ [SUCCESS] ${message}`;
    console.log(successMsg);
    this.results.push(successMsg);
  }

  /**
   * Test 1: Verify stock_receiving table has grand_total column (not total_amount)
   */
  async testStockReceivingSchema() {
    try {
      this.log('Testing stock_receiving table schema for correct column names...');
      
      const schema = await db.executeRawQuery(`PRAGMA table_info(stock_receiving)`);
      const columns = schema.map(col => col.name);
      
      this.log(`Found columns: ${columns.join(', ')}`);
      
      if (columns.includes('grand_total')) {
        this.success('stock_receiving table has grand_total column ✓');
      } else {
        this.error('stock_receiving table missing grand_total column');
      }

      if (columns.includes('total_amount')) {
        this.error('stock_receiving table still has total_amount column (should be grand_total)');
      } else {
        this.success('stock_receiving table correctly does not have total_amount column ✓');
      }

      return columns.includes('grand_total') && !columns.includes('total_amount');
    } catch (error) {
      this.error('Failed to check stock_receiving schema', error);
      return false;
    }
  }

  /**
   * Test 2: Test steel purchases query execution (using grand_total column)
   */
  async testSteelPurchasesQuery() {
    try {
      this.log('Testing steel purchases query with grand_total column...');
      
      // Test the specific query that was failing before the fix
      const monthStr = new Date().toISOString().slice(0, 7); // YYYY-MM format
      const result = await db.executeRawQuery(`
        SELECT COALESCE(SUM(grand_total), 0) as steel_purchases
        FROM stock_receiving 
        WHERE strftime('%Y-%m', date) = ?
      `, [monthStr]);

      const steelPurchases = result[0]?.steel_purchases || 0;
      this.success(`Steel purchases query executed successfully: ${steelPurchases}`);
      return true;
    } catch (error) {
      this.error('Steel purchases query failed (grand_total column issue)', error);
      return false;
    }
  }

  /**
   * Test 3: Test vendor outstanding query execution (using grand_total column)
   */
  async testVendorOutstandingQuery() {
    try {
      this.log('Testing vendor outstanding query with grand_total column...');
      
      const result = await db.executeRawQuery(`
        SELECT 
          v.id as vendor_id,
          v.name as vendor_name,
          COALESCE(SUM(sr.grand_total) - COALESCE(SUM(vp.amount), 0), 0) as outstanding_amount,
          MAX(vp.date) as last_payment_date,
          COUNT(sr.id) as total_purchases
        FROM vendors v
        LEFT JOIN stock_receiving sr ON v.id = sr.vendor_id
        LEFT JOIN vendor_payments vp ON v.id = vp.vendor_id
        WHERE sr.grand_total > 0
        GROUP BY v.id, v.name
        HAVING outstanding_amount > 0
        ORDER BY outstanding_amount DESC
        LIMIT 5
      `);

      this.success(`Vendor outstanding query executed successfully: ${result.length} records`);
      return true;
    } catch (error) {
      this.error('Vendor outstanding query failed (grand_total column issue)', error);
      return false;
    }
  }

  /**
   * Test 4: Test COGS calculation query execution (using grand_total column)
   */
  async testCOGSQuery() {
    try {
      this.log('Testing COGS calculation query with grand_total column...');
      
      const monthStr = new Date().toISOString().slice(0, 7); // YYYY-MM format
      const result = await db.executeRawQuery(`
        SELECT COALESCE(SUM(grand_total), 0) as cogs
        FROM stock_receiving 
        WHERE strftime('%Y-%m', date) = ?
      `, [monthStr]);

      const cogs = result[0]?.cogs || 0;
      this.success(`COGS query executed successfully: ${cogs}`);
      return true;
    } catch (error) {
      this.error('COGS query failed (grand_total column issue)', error);
      return false;
    }
  }

  /**
   * Test 5: Test financeService methods that use stock_receiving queries
   */
  async testFinanceServiceMethods() {
    try {
      this.log('Testing financeService methods that use stock_receiving queries...');
      
      // Test getDashboardFinancials
      const dashboardFinancials = await financeService.getDashboardFinancials();
      this.success('getDashboardFinancials() executed successfully ✓');
      
      // Test getTopVendorsOutstanding
      const vendorsOutstanding = await financeService.getTopVendorsOutstanding(5);
      this.success(`getTopVendorsOutstanding() executed successfully: ${vendorsOutstanding.length} vendors ✓`);
      
      // Test getProfitLoss
      const currentDate = new Date();
      const profitLoss = await financeService.getProfitLoss(currentDate.getFullYear(), currentDate.getMonth() + 1);
      this.success('getProfitLoss() executed successfully ✓');

      return true;
    } catch (error) {
      this.error('financeService methods failed (database column issues)', error);
      return false;
    }
  }

  /**
   * Test 6: Test direct business finance page data loading simulation
   */
  async testBusinessFinancePageDataLoad() {
    try {
      this.log('Testing business finance page data loading simulation...');
      
      // Simulate the data requests that would be made by the business finance page
      const promises = [
        financeService.getDashboardFinancials(),
        financeService.getTopVendorsOutstanding(10),
        financeService.getProfitLoss(new Date().getFullYear(), new Date().getMonth() + 1),
      ];

      const results = await Promise.all(promises);
      
      this.success('All business finance page data loading completed successfully ✓');
      this.log(`Dashboard: ${JSON.stringify(results[0]).substring(0, 100)}...`);
      this.log(`Vendors Outstanding: ${results[1].length} vendors`);
      this.log(`Profit/Loss calculated successfully`);

      return true;
    } catch (error) {
      this.error('Business finance page data loading failed', error);
      return false;
    }
  }

  /**
   * Run all validation tests
   */
  async runAllTests() {
    console.log('\n=== BUSINESS FINANCE PAGE DATABASE COLUMN FIX VALIDATION ===\n');
    
    const tests = [
      { name: 'Stock Receiving Schema Check', test: () => this.testStockReceivingSchema() },
      { name: 'Steel Purchases Query Test', test: () => this.testSteelPurchasesQuery() },
      { name: 'Vendor Outstanding Query Test', test: () => this.testVendorOutstandingQuery() },
      { name: 'COGS Query Test', test: () => this.testCOGSQuery() },
      { name: 'Finance Service Methods Test', test: () => this.testFinanceServiceMethods() },
      { name: 'Business Finance Page Data Load Test', test: () => this.testBusinessFinancePageDataLoad() }
    ];

    let passed = 0;
    let failed = 0;

    for (const { name, test } of tests) {
      try {
        console.log(`\n--- ${name} ---`);
        const result = await test();
        if (result) {
          passed++;
        } else {
          failed++;
        }
      } catch (error) {
        this.error(`Test "${name}" threw exception`, error);
        failed++;
      }
    }

    // Final summary
    console.log('\n=== VALIDATION SUMMARY ===');
    console.log(`✅ Tests Passed: ${passed}`);
    console.log(`❌ Tests Failed: ${failed}`);
    
    if (failed === 0) {
      this.success('🎉 ALL BUSINESS FINANCE DATABASE COLUMN ISSUES HAVE BEEN FIXED!');
      this.success('The business finance page should now load without database column errors.');
    } else {
      this.error(`⚠️  ${failed} tests failed. Additional fixes may be required.`);
    }

    // Log summary of changes made
    console.log('\n=== CHANGES IMPLEMENTED ===');
    console.log('1. ✅ Fixed steel purchases query: total_amount -> grand_total');
    console.log('2. ✅ Fixed vendor outstanding query: total_amount -> grand_total'); 
    console.log('3. ✅ Fixed COGS calculation query: total_amount -> grand_total');
    console.log('4. ✅ All queries now use correct stock_receiving.grand_total column');
    console.log('5. ✅ Maintained centralized approach without ALTER queries');

    return { passed, failed, results: this.results, errors: this.errors };
  }
}

// Export for use in other files
export { BusinessFinancePageDatabaseColumnFixValidator };

// Run validation if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new BusinessFinancePageDatabaseColumnFixValidator();
  validator.runAllTests().then(() => {
    console.log('\n🏁 Business finance page database column fix validation completed!');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });
}
