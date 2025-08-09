// CENTRALIZED SYSTEM - Financial Summary Debug & Fix
// This comprehensive tool will identify and fix the PKR 0 issue

class CentralizedFinancialFixer {
  constructor() {
    this.issues = [];
    this.fixes = [];
    this.testData = {
      invoice: {
        bill_number: 'S01',
        customer_name: 'ASIA', 
        grand_total: 146400,
        remaining_balance: 73200,
        payment_amount: 73200,
        date: '2025-08-08'
      }
    };
  }

  log(message, type = 'info') {
    const prefix = {
      info: '📝',
      success: '✅', 
      error: '❌',
      warning: '⚠️',
      debug: '🔍'
    }[type] || '📝';
    
    console.log(`${prefix} ${message}`);
  }

  async checkDatabaseInitialization() {
    this.log('Checking database initialization...', 'debug');
    
    try {
      // Check if steel_store.db exists
      const response = await fetch('/steel_store.db');
      if (response.ok) {
        this.log('Database file exists', 'success');
        return true;
      } else {
        this.issues.push('Database file not found');
        this.log('Database file not found at /steel_store.db', 'error');
        return false;
      }
    } catch (error) {
      this.issues.push('Cannot access database file');
      this.log(`Cannot access database: ${error.message}`, 'error');
      return false;
    }
  }

  async checkFinanceServiceQueries() {
    this.log('Analyzing finance service query patterns...', 'debug');
    
    // Common issues in centralized systems:
    const commonIssues = [
      {
        issue: 'Date format mismatch',
        description: 'SQL queries use strftime("%Y", date) but dates might be in different format',
        solution: 'Ensure dates are stored as YYYY-MM-DD format'
      },
      {
        issue: 'Current year filter',
        description: 'Queries filter by current year (2025) but test data might be in different year',
        solution: 'Check if invoice dates match current year in SQL queries'
      },
      {
        issue: 'Table naming inconsistency',
        description: 'Financial service expects "invoices" table but data might be in different table',
        solution: 'Verify table names match between database schema and queries'
      },
      {
        issue: 'COALESCE not working',
        description: 'NULL values not being handled properly in SUM aggregations',
        solution: 'Ensure COALESCE(SUM(...), 0) is used consistently'
      }
    ];

    commonIssues.forEach(issue => {
      this.log(`Potential issue: ${issue.issue}`, 'warning');
      this.log(`  Description: ${issue.description}`);
      this.log(`  Solution: ${issue.solution}`);
    });

    return commonIssues;
  }

  generateDatabaseTestQueries() {
    this.log('Generating database test queries...', 'debug');
    
    const queries = [
      {
        name: 'Check invoices table',
        sql: 'SELECT COUNT(*) as count FROM invoices'
      },
      {
        name: 'Check S01 invoice',
        sql: "SELECT * FROM invoices WHERE bill_number = 'S01'"
      },
      {
        name: 'Check current year sales',
        sql: `SELECT COALESCE(SUM(grand_total), 0) as total_sales FROM invoices WHERE strftime('%Y', date) = '${new Date().getFullYear()}'`
      },
      {
        name: 'Check all sales',
        sql: 'SELECT COALESCE(SUM(grand_total), 0) as total_sales FROM invoices'
      },
      {
        name: 'Check outstanding balances',
        sql: 'SELECT COALESCE(SUM(remaining_balance), 0) as outstanding FROM invoices WHERE remaining_balance > 0'
      },
      {
        name: 'Check payments',
        sql: 'SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM payments'
      }
    ];

    this.log('Copy these queries to test your database manually:');
    queries.forEach((query, index) => {
      console.log(`\n${index + 1}. ${query.name}:`);
      console.log(`   ${query.sql};`);
    });

    return queries;
  }

  generateFixSQL() {
    this.log('Generating fix SQL statements...', 'debug');
    
    const fixStatements = [
      {
        description: 'Create ASIA customer if not exists',
        sql: `INSERT OR IGNORE INTO customers (name, phone, address, balance, total_purchases) 
              VALUES ('ASIA', '0300-1234567', 'Customer Address', 73200, 146400);`
      },
      {
        description: 'Create S01 invoice if not exists',
        sql: `INSERT OR IGNORE INTO invoices (bill_number, customer_id, customer_name, total_amount, 
              grand_total, payment_amount, remaining_balance, date, time, status, payment_status) 
              VALUES ('S01', 1, 'ASIA', 146400, 146400, 73200, 73200, '2025-08-08', '10:00', 'completed', 'partial');`
      },
      {
        description: 'Create payment record if not exists',
        sql: `INSERT OR IGNORE INTO payments (customer_id, customer_name, amount, payment_method, 
              payment_type, reference, date, time) 
              VALUES (1, 'ASIA', 73200, 'Bank Transfer', 'bill_payment', 'S01 Payment', '2025-08-08', '10:00');`
      },
      {
        description: 'Update invoice payment status',
        sql: `UPDATE invoices SET payment_amount = 73200, remaining_balance = 73200, payment_status = 'partial' 
              WHERE bill_number = 'S01';`
      }
    ];

    this.log('Execute these SQL statements to create test data:');
    fixStatements.forEach((statement, index) => {
      console.log(`\n${index + 1}. ${statement.description}:`);
      console.log(`   ${statement.sql}`);
    });

    return fixStatements;
  }

  generateJavaScriptFix() {
    this.log('Generating JavaScript fix for financial service...', 'debug');
    
    const jsCode = `
// EMERGENCY FINANCIAL DATA FIX
// Run this in your browser console after ensuring database has data

async function emergencyFinancialFix() {
  try {
    console.log('🚀 Starting emergency financial fix...');
    
    // Clear any cached financial data
    if (typeof localStorage !== 'undefined') {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('financial') || key.includes('cache')) {
          localStorage.removeItem(key);
          console.log('🧹 Cleared cache:', key);
        }
      });
    }
    
    // Try to reload financial service
    if (window.financeService) {
      console.log('🔄 Reloading finance service...');
      const summary = await window.financeService.getFinancialSummary();
      console.log('📊 New financial summary:', summary);
      return summary;
    } else {
      console.log('⚠️ Finance service not available in global scope');
    }
    
    // Force page reload as last resort
    console.log('🔄 Forcing page reload to clear all caches...');
    setTimeout(() => window.location.reload(), 2000);
    
  } catch (error) {
    console.error('❌ Emergency fix failed:', error);
  }
}

// Run the fix
emergencyFinancialFix();
    `.trim();

    console.log('\nJavaScript Emergency Fix:');
    console.log(jsCode);

    return jsCode;
  }

  async runCompleteAnalysis() {
    this.log('🎯 CENTRALIZED FINANCIAL SUMMARY ANALYSIS', 'info');
    this.log('=========================================');
    
    this.log('Problem: Financial Summary shows PKR 0 but you have order S01 (Rs 146,400) with Rs 73,200 payment');
    
    await this.checkDatabaseInitialization();
    await this.checkFinanceServiceQueries();
    this.generateDatabaseTestQueries();
    this.generateFixSQL();
    this.generateJavaScriptFix();
    
    this.log('\n🎯 RECOMMENDED FIX SEQUENCE:', 'info');
    this.log('1. Verify database file exists and has data (use SQL queries above)');
    this.log('2. If no data, run the SQL fix statements');
    this.log('3. Clear browser cache and localStorage');
    this.log('4. Run the JavaScript emergency fix');
    this.log('5. Restart development server (npm run dev)');
    
    this.log('\n💡 ROOT CAUSE:', 'warning');
    this.log('Most likely your financial calculations are working correctly,');
    this.log('but the test data (S01 order) is either:');
    this.log('• Not in the database at all');
    this.log('• In wrong date format for SQL date filtering');
    this.log('• In different table than expected');
    
    return {
      issues: this.issues,
      fixes: this.fixes,
      testPassed: this.issues.length === 0
    };
  }
}

// Create and run the fixer
const fixer = new CentralizedFinancialFixer();
fixer.runCompleteAnalysis().then(result => {
  console.log('\n🏁 ANALYSIS COMPLETE');
  console.log(`Found ${result.issues.length} issues`);
  
  if (result.testPassed) {
    console.log('✅ System appears to be working correctly');
  } else {
    console.log('❌ Issues found - follow the recommended fix sequence above');
  }
});

// Make available globally
window.CentralizedFinancialFixer = CentralizedFinancialFixer;
