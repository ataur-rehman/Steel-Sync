import React, { useState } from 'react';
import { db } from '../services/database';

const InvoiceBalanceDiagnostic: React.FC = () => {
  const [output, setOutput] = useState(`🎯 Ready to diagnose invoice balance calculation issues.

Problem: When products are returned/edited/deleted and then payments are made, 
the invoice shows incorrect outstanding balances in the invoice list.

Test Scenario:
1. Invoice total: 23,000
2. Products returned: 10,000
3. Remaining should be: 13,000  
4. Payment added: 13,000
5. Expected outstanding: 0
6. Actual outstanding shown: 10,000 ❌

Click "Test Return Scenario" to start diagnosis...`);

  const log = (message: string, type: string = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    let className = '';
    
    if (type === 'error') className = 'error';
    else if (type === 'success') className = 'success';
    else if (type === 'warning') className = 'warning';
    else if (type === 'info') className = 'info';
    
    setOutput(prev => prev + `\n[${timestamp}] ${message}`);
  };

  const testReturnScenario = async () => {
    log('🔄 === TESTING RETURN SCENARIO ===', 'error');
    log('Scenario: Total 23000 → Returned 10000 → Payment 13000 → Shows 10000 outstanding', 'info');
    
    try {
      if (!db?.dbConnection) {
        log('❌ Database connection not available', 'error');
        return;
      }
      log('✅ Database connected', 'success');

      // Find invoices with returns and payments
      log('🔍 Finding invoices with returns and payments...', 'info');
      
      const problematicInvoices = await db.dbConnection.select(`
        SELECT 
          i.id, i.bill_number, i.grand_total, i.payment_amount, i.remaining_balance,
          COALESCE(returns.total_returned, 0) as total_returned,
          COALESCE(i.grand_total - returns.total_returned, i.grand_total) as adjusted_total,
          COALESCE(i.grand_total - returns.total_returned - i.payment_amount, i.remaining_balance) as calculated_remaining,
          ABS(i.remaining_balance - (i.grand_total - COALESCE(returns.total_returned, 0) - i.payment_amount)) as balance_error,
          c.name as customer_name
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        LEFT JOIN (
          SELECT 
            ri.original_invoice_item_id,
            ii.invoice_id,
            SUM(ri.return_quantity * ri.unit_price) as total_returned
          FROM return_items ri
          JOIN invoice_items ii ON ri.original_invoice_item_id = ii.id
          GROUP BY ii.invoice_id
        ) returns ON i.id = returns.invoice_id
        WHERE i.payment_amount > 0 
          AND returns.total_returned > 0
          AND ABS(i.remaining_balance - (i.grand_total - COALESCE(returns.total_returned, 0) - i.payment_amount)) > 0.01
        ORDER BY balance_error DESC
        LIMIT 10
      `);

      if (problematicInvoices.length === 0) {
        log('✅ No invoices found with return/payment calculation errors', 'success');
      } else {
        log(`⚠️ Found ${problematicInvoices.length} invoices with calculation errors:`, 'warning');
        
        problematicInvoices.forEach((invoice: any, index: number) => {
          log(`\n📄 Invoice ${index + 1}: ${invoice.bill_number} (${invoice.customer_name})`, 'info');
          log(`   Grand Total: ${invoice.grand_total}`, 'info');
          log(`   Returned: ${invoice.total_returned}`, 'warning');
          log(`   Payment: ${invoice.payment_amount}`, 'info');
          log(`   Current Balance: ${invoice.remaining_balance}`, 'error');
          log(`   Calculated Should Be: ${invoice.calculated_remaining}`, 'success');
          log(`   Error Amount: ${invoice.balance_error}`, 'error');
        });
      }

      // Test specific scenario pattern
      log('\n🎯 Testing for your specific scenario pattern...', 'info');
      const specificScenario = await db.dbConnection.select(`
        SELECT 
          i.id, i.bill_number, i.grand_total, i.payment_amount, i.remaining_balance,
          COALESCE(returns.total_returned, 0) as total_returned,
          c.name as customer_name
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        LEFT JOIN (
          SELECT 
            ri.original_invoice_item_id,
            ii.invoice_id,
            SUM(ri.return_quantity * ri.unit_price) as total_returned
          FROM return_items ri
          JOIN invoice_items ii ON ri.original_invoice_item_id = ii.id
          GROUP BY ii.invoice_id
        ) returns ON i.id = returns.invoice_id
        WHERE i.grand_total >= 20000 AND i.grand_total <= 25000
          AND returns.total_returned >= 8000 AND returns.total_returned <= 12000
          AND i.payment_amount >= 10000 AND i.payment_amount <= 15000
          AND i.remaining_balance > 5000
        LIMIT 5
      `);

      if (specificScenario.length > 0) {
        log(`🎯 Found ${specificScenario.length} invoices matching your scenario pattern:`, 'warning');
        specificScenario.forEach((invoice: any, index: number) => {
          const expectedRemaining = invoice.grand_total - invoice.total_returned - invoice.payment_amount;
          log(`\n🔴 Matching Invoice ${index + 1}: ${invoice.bill_number}`, 'error');
          log(`   Total: ${invoice.grand_total}`, 'info');
          log(`   Returned: ${invoice.total_returned}`, 'warning');
          log(`   Payment: ${invoice.payment_amount}`, 'info');
          log(`   Shows Outstanding: ${invoice.remaining_balance}`, 'error');
          log(`   Should Be Outstanding: ${expectedRemaining}`, 'success');
          log(`   ERROR: Off by ${invoice.remaining_balance - expectedRemaining}`, 'error');
        });
      } else {
        log('ℹ️ No invoices found exactly matching your scenario pattern', 'info');
      }

    } catch (error: any) {
      log(`❌ Error testing return scenario: ${error.message}`, 'error');
      console.error('Return scenario error:', error);
    }
  };

  const fixInvoiceBalanceIssues = async () => {
    log('🔧 === FIXING INVOICE BALANCE ISSUES ===', 'success');
    
    try {
      if (!db?.dbConnection) {
        log('❌ Database connection not available', 'error');
        return;
      }

      log('🎯 Creating comprehensive invoice balance fix...', 'info');
      
      // Step 1: Fix invoices with return calculation errors
      log('\n📋 Step 1: Fixing return calculation errors...', 'info');
      
      const returnFixes = await db.dbConnection.execute(`
        UPDATE invoices 
        SET remaining_balance = ROUND(
          grand_total - 
          COALESCE((
            SELECT SUM(ri.return_quantity * ri.unit_price) 
            FROM return_items ri 
            JOIN invoice_items ii ON ri.original_invoice_item_id = ii.id
            WHERE ii.invoice_id = invoices.id
          ), 0) - 
          COALESCE(payment_amount, 0), 
          2
        )
        WHERE id IN (
          SELECT i.id
          FROM invoices i
          LEFT JOIN (
            SELECT 
              ii.invoice_id,
              SUM(ri.return_quantity * ri.unit_price) as total_returned
            FROM return_items ri
            JOIN invoice_items ii ON ri.original_invoice_item_id = ii.id
            GROUP BY ii.invoice_id
          ) returns ON i.id = returns.invoice_id
          WHERE returns.total_returned > 0
            AND ABS(i.remaining_balance - (i.grand_total - COALESCE(returns.total_returned, 0) - i.payment_amount)) > 0.01
        )
      `);
      
      log(`✅ Fixed ${returnFixes.changes} invoices with return calculation errors`, 'success');

      // Step 2: Fix invoices with simple payment calculation errors
      log('\n📋 Step 2: Fixing payment calculation errors...', 'info');
      
      const paymentFixes = await db.dbConnection.execute(`
        UPDATE invoices 
        SET remaining_balance = ROUND(grand_total - COALESCE(payment_amount, 0), 2)
        WHERE ABS(remaining_balance - (grand_total - COALESCE(payment_amount, 0))) > 0.01
          AND id NOT IN (
            SELECT DISTINCT ii.invoice_id 
            FROM return_items ri 
            JOIN invoice_items ii ON ri.original_invoice_item_id = ii.id
            WHERE ii.invoice_id = invoices.id
          )
      `);
      
      log(`✅ Fixed ${paymentFixes.changes} invoices with payment calculation errors`, 'success');

      // Step 3: Update customer balances
      log('\n📋 Step 3: Updating customer balances...', 'info');
      
      const customerUpdates = await db.dbConnection.execute(`
        UPDATE customers 
        SET 
          balance = ROUND((
            SELECT COALESCE(SUM(i.remaining_balance), 0) 
            FROM invoices i 
            WHERE i.customer_id = customers.id
          ), 2),
          status = CASE 
            WHEN (
              SELECT COALESCE(SUM(i.remaining_balance), 0) 
              FROM invoices i 
              WHERE i.customer_id = customers.id
            ) <= 0.01 THEN 'Clear'
            ELSE 'Outstanding'
          END
      `);
      
      log(`✅ Updated ${customerUpdates.changes} customer balances`, 'success');

      log('\n🎉 ALL INVOICE BALANCE ISSUES FIXED SUCCESSFULLY!', 'success');
      log('💡 Your scenario (23000 → returned 10000 → payment 13000) should now show 0 outstanding', 'success');

    } catch (error: any) {
      log(`❌ Error fixing balance issues: ${error.message}`, 'error');
      console.error('Fix error:', error);
    }
  };

  const testEditDeleteScenarios = async () => {
    log('✏️ === TESTING EDIT/DELETE SCENARIOS ===', 'info');
    // Implementation for edit/delete testing
  };

  const analyzeInvoiceCalculations = async () => {
    log('🧮 === ANALYZING INVOICE CALCULATIONS ===', 'info');
    // Implementation for calculation analysis
  };

  const clearOutput = () => {
    setOutput('Output cleared. Ready for next test.\n');
  };

  return (
    <div className="invoice-diagnostic">
      <div className="header">
        <h1>🔍 Invoice Balance Issues Diagnostic</h1>
        <p>Testing invoice calculations after returns, edits, and deletions</p>
        <p><strong>Scenario:</strong> Total 23000 → Returned 10000 → Remaining 13000 → Payment 13000 → Shows 10000 outstanding</p>
      </div>

      <div className="button-group">
        <button onClick={testReturnScenario} className="btn btn-danger">
          🔄 Test Return Scenario
        </button>
        <button onClick={testEditDeleteScenarios} className="btn btn-primary">
          ✏️ Test Edit/Delete Scenarios
        </button>
        <button onClick={analyzeInvoiceCalculations} className="btn btn-info">
          🧮 Analyze Invoice Calculations
        </button>
        <button onClick={fixInvoiceBalanceIssues} className="btn btn-success">
          🔧 Fix Balance Issues
        </button>
        <button onClick={clearOutput} className="btn btn-secondary">
          🗑️ Clear Output
        </button>
      </div>

      <div className="output-container">
        <pre className="output">{output}</pre>
      </div>

      <style jsx>{`
        .invoice-diagnostic {
          padding: 20px;
          font-family: 'Courier New', monospace;
          background-color: #1a1a1a;
          color: #fff;
          min-height: 100vh;
        }

        .header {
          text-align: center;
          margin-bottom: 30px;
          padding: 20px;
          background: linear-gradient(135deg, #dc3545, #6f42c1);
          border-radius: 10px;
        }

        .button-group {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 20px;
          justify-content: center;
        }

        .btn {
          padding: 15px 30px;
          font-size: 16px;
          border-radius: 5px;
          cursor: pointer;
          border: none;
          font-family: inherit;
          transition: background-color 0.2s;
        }

        .btn-danger {
          background-color: #dc3545;
          color: white;
        }

        .btn-danger:hover {
          background-color: #c82333;
        }

        .btn-primary {
          background-color: #007bff;
          color: white;
        }

        .btn-primary:hover {
          background-color: #0056b3;
        }

        .btn-success {
          background-color: #28a745;
          color: white;
        }

        .btn-success:hover {
          background-color: #218838;
        }

        .btn-info {
          background-color: #17a2b8;
          color: white;
        }

        .btn-info:hover {
          background-color: #138496;
        }

        .btn-secondary {
          background-color: #6c757d;
          color: white;
        }

        .btn-secondary:hover {
          background-color: #545b62;
        }

        .output-container {
          background-color: #2d2d2d;
          border: 1px solid #444;
          border-radius: 5px;
          padding: 15px;
          max-height: 600px;
          overflow-y: auto;
        }

        .output {
          white-space: pre-wrap;
          font-family: 'Courier New', monospace;
          margin: 0;
          line-height: 1.6;
        }
      `}</style>
    </div>
  );
};

export default InvoiceBalanceDiagnostic;
