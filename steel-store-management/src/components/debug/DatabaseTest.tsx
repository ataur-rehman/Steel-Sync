import React, { useState } from 'react';
import { db } from '../../services/database';

interface TestResult {
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  details?: string;
}

const DatabaseTest: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (type: TestResult['type'], title: string, message: string, details?: string) => {
    setResults(prev => [...prev, { type, title, message, details }]);
  };

  const clearResults = () => {
    setResults([]);
  };

  const runDatabaseDiagnosis = async () => {
    clearResults();
    setLoading(true);
    addResult('info', 'Starting Database Diagnosis', 'Checking database structure and invoice integration...');
    
    try {
      // Initialize database
      await db.initialize();
      addResult('success', 'Database Initialization', 'Database initialized successfully');
      
      // Check payment channels table structure
      await checkPaymentChannelsStructure();
      
      // Check invoice creation flow
      await checkInvoiceCreationFlow();
      
      // Test customer ledger integration
      await testCustomerLedgerIntegration();
      
      addResult('success', 'Diagnosis Complete', 'All checks completed successfully');
      
    } catch (error: any) {
      addResult('error', 'Diagnosis Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentChannelsStructure = async () => {
    try {
      addResult('info', 'Checking Payment Channels', 'Verifying payment channels table structure...');
      
      // Check if table exists
      const tableExists = await db.tableExists('payment_channels');
      if (!tableExists) {
        addResult('error', 'Payment Channels Table Missing', 'payment_channels table does not exist');
        return;
      }
      
      // Get table structure
      const structure = await db.executeRawQuery('PRAGMA table_info(payment_channels)');
      const columns = structure.map((col: any) => col.name);
      
      addResult('info', 'Payment Channels Structure', 'Table structure retrieved', 
        `Columns: ${columns.join(', ')}`);
      
      // Check if is_active column exists
      if (!columns.includes('is_active')) {
        addResult('warning', 'Missing is_active Column', 'Adding is_active column to payment_channels table...');
        
        try {
          await db.executeRawQuery('ALTER TABLE payment_channels ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1');
          addResult('success', 'is_active Column Added', 'Successfully added is_active column');
        } catch (alterError: any) {
          addResult('error', 'Failed to Add Column', alterError.message);
        }
      } else {
        addResult('success', 'is_active Column Exists', 'payment_channels table has correct structure');
      }
      
      // Test payment channels query
      try {
        const channels = await db.getPaymentChannels();
        addResult('success', 'Payment Channels Query', `Found ${channels?.length || 0} payment channels`);
      } catch (channelError: any) {
        addResult('error', 'Payment Channels Query Failed', channelError.message);
      }
      
    } catch (error: any) {
      addResult('error', 'Payment Channels Check Failed', error.message);
    }
  };

  const checkInvoiceCreationFlow = async () => {
    try {
      addResult('info', 'Checking Invoice Flow', 'Testing invoice creation and integration...');
      
      // Check for customers
      const customers = await db.getAllCustomers();
      if (!customers || customers.length === 0) {
        addResult('warning', 'No Customers Found', 'Create customers first to test invoice creation');
        return;
      }
      
      // Check for products
      const products = await db.getAllProducts();
      if (!products || products.length === 0) {
        addResult('warning', 'No Products Found', 'Create products first to test invoice creation');
        return;
      }
      
      // Get recent invoices
      const invoices = await db.getInvoices({ limit: 5 });
      addResult('info', 'Recent Invoices', `Found ${invoices?.length || 0} recent invoices`);
      
      if (invoices && invoices.length > 0) {
        const lastInvoice = invoices[0];
        
        // Check customer ledger for this invoice
        const customerLedger = await db.getCustomerLedger(lastInvoice.customer_id, {});
        const ledgerEntries = customerLedger.transactions || [];
        const invoiceEntries = ledgerEntries.filter((entry: any) => 
          entry.reference_number === lastInvoice.bill_number
        );
        
        if (invoiceEntries.length > 0) {
          addResult('success', 'Customer Ledger Integration', 
            `Found ${invoiceEntries.length} ledger entries for invoice ${lastInvoice.bill_number}`);
        } else {
          addResult('error', 'Missing Ledger Entries', 
            `No customer ledger entries found for invoice ${lastInvoice.bill_number}`);
        }
      }
      
    } catch (error: any) {
      addResult('error', 'Invoice Flow Check Failed', error.message);
    }
  };

  const testCustomerLedgerIntegration = async () => {
    try {
      addResult('info', 'Testing Customer Ledger', 'Checking customer ledger integration...');
      
      const customers = await db.getAllCustomers();
      if (!customers || customers.length === 0) {
        addResult('warning', 'No Customers', 'No customers available for ledger testing');
        return;
      }
      
      const customer = customers[0];
      const ledger = await db.getCustomerLedger(customer.id, {});
      
      addResult('success', 'Customer Ledger Retrieved', 
        `Customer: ${customer.name}, Balance: Rs.${ledger.current_balance}, Transactions: ${ledger.transactions.length}`);
      
      // Show recent transactions
      if (ledger.transactions.length > 0) {
        const recent = ledger.transactions.slice(0, 3);
        const transactionDetails = recent.map((t: any) => 
          `${t.date} - ${t.entry_type} - Rs.${t.amount} - ${t.description}`
        ).join('\n');
        
        addResult('info', 'Recent Transactions', 'Latest customer transactions', transactionDetails);
      }
      
    } catch (error: any) {
      addResult('error', 'Customer Ledger Test Failed', error.message);
    }
  };

  const createTestInvoice = async () => {
    try {
      setLoading(true);
      addResult('info', 'Creating Test Invoice', 'Creating a test invoice to verify integration fixes...');
      
      const customers = await db.getAllCustomers();
      const products = await db.getAllProducts();
      
      if (!customers || customers.length === 0) {
        addResult('error', 'No Customers', 'Please create customers first');
        return;
      }
      
      if (!products || products.length === 0) {
        addResult('error', 'No Products', 'Please create products first');
        return;
      }
      
      const testCustomer = customers[0];
      const testProduct = products[0];
      
      const testInvoice = {
        customer_id: testCustomer.id,
        items: [
          {
            product_id: testProduct.id,
            product_name: testProduct.name,
            quantity: "1",
            unit_price: 100,
            total_price: 100
          }
        ],
        discount: 0,
        payment_amount: 50,
        payment_method: 'cash',
        notes: 'Test invoice to verify database integration'
      };
      
      const createdInvoice = await db.createInvoice(testInvoice);
      addResult('success', 'Test Invoice Created', 
        `Invoice ${createdInvoice.bill_number} created successfully!`);
      
      // Wait a moment then verify integration
      setTimeout(async () => {
        try {
          // Check customer ledger
          const ledger = await db.getCustomerLedger(testCustomer.id, {});
          const invoiceEntries = ledger.transactions.filter((t: any) => 
            t.reference_number === createdInvoice.bill_number
          );
          
          if (invoiceEntries.length > 0) {
            addResult('success', 'Integration Verified', 
              `Found ${invoiceEntries.length} ledger entries for new invoice`);
          } else {
            addResult('error', 'Integration Failed', 
              'No ledger entries created for new invoice');
          }
          
          // Check customer balance
          const customer = await db.getCustomer(testCustomer.id);
          addResult('info', 'Customer Balance Updated', 
            `Customer balance: Rs.${customer.balance}`);
            
        } catch (verifyError: any) {
          addResult('error', 'Verification Failed', verifyError.message);
        }
      }, 1000);
      
    } catch (error: any) {
      addResult('error', 'Test Invoice Creation Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const fixPaymentChannelsTable = async () => {
    try {
      setLoading(true);
      addResult('info', 'Fixing Payment Channels', 'Updating payment channels table structure...');
      
      // Check current structure
      const structure = await db.executeRawQuery('PRAGMA table_info(payment_channels)');
      const columns = structure.map((col: any) => col.name);
      
      if (!columns.includes('is_active')) {
        await db.executeRawQuery('ALTER TABLE payment_channels ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1');
        addResult('success', 'Column Added', 'Added is_active column to payment_channels table');
      }
      
      // Ensure default payment channels exist
      await db.ensurePaymentChannels();
      addResult('success', 'Default Channels Created', 'Ensured default payment channels exist');
      
      // Test the fixed query
      const channels = await db.getPaymentChannels();
      addResult('success', 'Payment Channels Fixed', `Query now returns ${channels.length} channels`);
      
    } catch (error: any) {
      addResult('error', 'Fix Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const ResultCard: React.FC<{ result: TestResult }> = ({ result }) => {
    const getColorClass = () => {
      switch (result.type) {
        case 'success': return 'bg-green-50 border-green-200 text-green-800';
        case 'error': return 'bg-red-50 border-red-200 text-red-800';
        case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
        case 'info': return 'bg-blue-50 border-blue-200 text-blue-800';
        default: return 'bg-gray-50 border-gray-200 text-gray-800';
      }
    };

    return (
      <div className={`border-l-4 p-4 mb-4 rounded-r-lg ${getColorClass()}`}>
        <div className="font-semibold">{result.title}</div>
        <div className="mt-1">{result.message}</div>
        {result.details && (
          <pre className="mt-2 text-sm bg-white p-3 rounded overflow-x-auto max-h-40">
            {result.details}
          </pre>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">🔧 Database Diagnostics & Fixes</h1>
      <p className="text-gray-600 mb-8">
        This tool diagnoses and fixes database issues including missing columns and invoice integration problems.
      </p>
      
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">🚀 Test Controls</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={runDatabaseDiagnosis}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Running...' : 'Run Diagnosis'}
          </button>
          
          <button
            onClick={fixPaymentChannelsTable}
            disabled={loading}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            Fix Payment Channels
          </button>
          
          <button
            onClick={createTestInvoice}
            disabled={loading}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            Create Test Invoice
          </button>
          
          <button
            onClick={clearResults}
            className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
          >
            Clear Results
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">📊 Test Results</h2>
        {results.length === 0 ? (
          <p className="text-gray-500 italic">No test results yet. Click a test button to start.</p>
        ) : (
          <div className="space-y-2">
            {results.map((result, index) => (
              <ResultCard key={index} result={result} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseTest;