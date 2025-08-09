/**
 * BUSINESS FINANCE DATABASE COLUMN FIX TEST
 * =========================================
 * 
 * Simple validation test for fixed database column references in financeService.ts
 * This directly tests the problematic queries that were causing "no such column: total_amount" errors
 */

const path = require('path');
const fs = require('fs');

// Simple test to verify the column name fixes
class FinanceServiceColumnFixTest {
  constructor() {
    this.results = [];
    this.errors = [];
    this.financeServicePath = path.join(__dirname, 'src', 'services', 'financeService.ts');
  }

  log(message) {
    console.log(`🔍 [COLUMN FIX TEST] ${message}`);
    this.results.push(message);
  }

  error(message) {
    console.error(`❌ [ERROR] ${message}`);
    this.errors.push(message);
  }

  success(message) {
    console.log(`✅ [SUCCESS] ${message}`);
    this.results.push(message);
  }

  /**
   * Test that financeService.ts no longer contains problematic total_amount references
   */
  async testColumnReferencesFixed() {
    try {
      this.log('Checking financeService.ts for fixed column references...');
      
      if (!fs.existsSync(this.financeServicePath)) {
        this.error(`financeService.ts not found at ${this.financeServicePath}`);
        return false;
      }

      const content = fs.readFileSync(this.financeServicePath, 'utf8');
      
      // Check for problematic patterns that would cause database errors
      const problematicPatterns = [
        /FROM\s+stock_receiving.*total_amount/gi,
        /sr\.total_amount/gi,
        /stock_receiving.*total_amount/gi
      ];

      let hasProblematicReferences = false;
      for (const pattern of problematicPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          this.error(`Found problematic total_amount reference: ${matches[0]}`);
          hasProblematicReferences = true;
        }
      }

      // Check for correct patterns
      const correctPatterns = [
        /FROM\s+stock_receiving.*grand_total/gi,
        /sr\.grand_total/gi,
        /stock_receiving.*grand_total/gi
      ];

      let hasCorrectReferences = false;
      for (const pattern of correctPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          this.success(`Found correct grand_total reference: ${matches[0]}`);
          hasCorrectReferences = true;
        }
      }

      if (!hasProblematicReferences && hasCorrectReferences) {
        this.success('All stock_receiving column references have been fixed to use grand_total ✓');
        return true;
      } else if (hasProblematicReferences) {
        this.error('Still found problematic total_amount references that need fixing');
        return false;
      } else {
        this.error('No grand_total references found - may need to verify fixes');
        return false;
      }

    } catch (error) {
      this.error(`Failed to check financeService.ts: ${error.message}`);
      return false;
    }
  }

  /**
   * Test specific query patterns that were causing errors
   */
  async testSpecificQueryPatterns() {
    try {
      this.log('Checking specific query patterns that were causing errors...');
      
      const content = fs.readFileSync(this.financeServicePath, 'utf8');
      
      // Pattern 1: Steel purchases query
      const steelPurchasesPattern = /SELECT\s+COALESCE\(SUM\((grand_total|total_amount)\),\s*0\)\s+as\s+steel_purchases\s+FROM\s+stock_receiving/gi;
      const steelPurchasesMatch = content.match(steelPurchasesPattern);
      
      if (steelPurchasesMatch) {
        if (steelPurchasesMatch[0].includes('grand_total')) {
          this.success('Steel purchases query uses correct grand_total column ✓');
        } else {
          this.error('Steel purchases query still uses incorrect total_amount column');
          return false;
        }
      }

      // Pattern 2: COGS query
      const cogsPattern = /SELECT\s+COALESCE\(SUM\((grand_total|total_amount)\),\s*0\)\s+as\s+cogs\s+FROM\s+stock_receiving/gi;
      const cogsMatch = content.match(cogsPattern);
      
      if (cogsMatch) {
        if (cogsMatch[0].includes('grand_total')) {
          this.success('COGS calculation query uses correct grand_total column ✓');
        } else {
          this.error('COGS calculation query still uses incorrect total_amount column');
          return false;
        }
      }

      // Pattern 3: Vendor outstanding query
      const vendorOutstandingPattern = /SUM\(sr\.(grand_total|total_amount)\)/gi;
      const vendorOutstandingMatch = content.match(vendorOutstandingPattern);
      
      if (vendorOutstandingMatch) {
        const hasCorrectColumn = vendorOutstandingMatch.some(match => match.includes('grand_total'));
        const hasIncorrectColumn = vendorOutstandingMatch.some(match => match.includes('total_amount'));
        
        if (hasCorrectColumn && !hasIncorrectColumn) {
          this.success('Vendor outstanding query uses correct grand_total column ✓');
        } else if (hasIncorrectColumn) {
          this.error('Vendor outstanding query still uses incorrect total_amount column');
          return false;
        }
      }

      return true;
    } catch (error) {
      this.error(`Failed to check specific query patterns: ${error.message}`);
      return false;
    }
  }

  /**
   * Check centralized database schema reference
   */
  async testCentralizedSchemaReference() {
    try {
      this.log('Checking centralized database schema for stock_receiving table...');
      
      const schemaPath = path.join(__dirname, 'src', 'services', 'centralized-database-tables.ts');
      
      if (!fs.existsSync(schemaPath)) {
        this.error(`Centralized database schema not found at ${schemaPath}`);
        return false;
      }

      const content = fs.readFileSync(schemaPath, 'utf8');
      
      // Check stock_receiving table definition
      const stockReceivingMatch = content.match(/stock_receiving:\s*`[\s\S]*?`/g);
      
      if (stockReceivingMatch) {
        const tableDefinition = stockReceivingMatch[0];
        
        if (tableDefinition.includes('grand_total REAL')) {
          this.success('Centralized schema correctly defines grand_total column ✓');
        } else {
          this.error('Centralized schema missing grand_total column definition');
          return false;
        }

        if (tableDefinition.includes('total_amount')) {
          this.error('Centralized schema incorrectly contains total_amount column');
          return false;
        } else {
          this.success('Centralized schema correctly does not have total_amount column ✓');
        }
      } else {
        this.error('Could not find stock_receiving table definition in centralized schema');
        return false;
      }

      return true;
    } catch (error) {
      this.error(`Failed to check centralized schema: ${error.message}`);
      return false;
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('\n=== BUSINESS FINANCE DATABASE COLUMN FIX VALIDATION ===\n');
    
    const tests = [
      { name: 'Column References Fix Test', test: () => this.testColumnReferencesFixed() },
      { name: 'Specific Query Patterns Test', test: () => this.testSpecificQueryPatterns() },
      { name: 'Centralized Schema Reference Test', test: () => this.testCentralizedSchemaReference() }
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
        this.error(`Test "${name}" threw exception: ${error.message}`);
        failed++;
      }
    }

    // Final summary
    console.log('\n=== TEST SUMMARY ===');
    console.log(`✅ Tests Passed: ${passed}`);
    console.log(`❌ Tests Failed: ${failed}`);
    
    if (failed === 0) {
      this.success('🎉 ALL DATABASE COLUMN REFERENCES HAVE BEEN FIXED!');
      this.success('The business finance page should now load without "no such column: total_amount" errors.');
      console.log('\n=== FIXES APPLIED ===');
      console.log('1. ✅ Steel purchases query: total_amount -> grand_total');
      console.log('2. ✅ Vendor outstanding query: total_amount -> grand_total'); 
      console.log('3. ✅ COGS calculation query: total_amount -> grand_total');
      console.log('4. ✅ All stock_receiving references use correct grand_total column');
      console.log('5. ✅ Centralized database schema validated');
    } else {
      this.error(`⚠️  ${failed} tests failed. Check the error messages above.`);
    }

    return { passed, failed, results: this.results, errors: this.errors };
  }
}

// Run the test
const test = new FinanceServiceColumnFixTest();
test.runAllTests().then((results) => {
  console.log('\n🏁 Column fix validation completed!');
  process.exit(results.failed === 0 ? 0 : 1);
}).catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});
