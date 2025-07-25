import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDatabase } from '../../hooks/useDatabase';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../../utils/calculations';
import { useNavigation } from '../../hooks/useNavigation';
import { useAutoRefresh } from '../../hooks/useRealTimeUpdates';

export default function CustomerProfile() {
  const { id } = useParams();
  const { navigateTo } = useNavigation();
  const { db } = useDatabase();
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<{ outstanding: number; total_paid: number; total_invoiced: number } | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      loadCustomer(parseInt(id));
    }
  }, [id]);

  // Real-time updates: Refresh customer data when relevant events occur
  useAutoRefresh(
    () => {
      if (id) {
        console.log('🔄 CustomerProfile: Auto-refreshing due to real-time event');
        loadCustomer(parseInt(id));
      }
    },
    [
      'CUSTOMER_UPDATED',
      'CUSTOMER_BALANCE_UPDATED', 
      'INVOICE_CREATED',
      'INVOICE_UPDATED',
      'INVOICE_PAYMENT_RECEIVED',
      'PAYMENT_RECORDED',
      'CUSTOMER_LEDGER_UPDATED'
    ],
    [id] // Re-subscribe if customer ID changes
  );

  const loadCustomer = async (customerId: number) => {
    try {
      console.log(`🔍 Loading customer details for ID: ${customerId}`);
      
      // Initialize database first
      await db.initialize();
      console.log('✅ Database initialized');
      
      // Get customer data step by step with error logging
      console.log('📋 Getting customer with balance...');
      const data = await db.getCustomerWithBalance(customerId);
      if (!data) {
        throw new Error(`Customer with ID ${customerId} not found`);
      }
      console.log('✅ Customer data loaded:', data);
      
      console.log('📄 Getting customer invoices...');
      const invoices = await db.getInvoices({ customer_id: customerId, limit: 10 });
      console.log('✅ Customer invoices loaded:', invoices?.length || 0);
      
      console.log('💰 Getting customer balance...');
      const bal = await db.getCustomerBalance(customerId);
      console.log('✅ Customer balance loaded:', bal);
      
      console.log('💳 Getting customer payments...');
      const pays = await db.getCustomerPayments(customerId);
      console.log('✅ Customer payments loaded:', pays?.length || 0);
      
      console.log('📊 Getting customer ledger...');
      const ledg = await db.getCustomerLedger(customerId, { limit: 3 });
      console.log('✅ Customer ledger loaded:', ledg);
      
      setCustomer({
        ...data,
        invoices: invoices || [],
      });
      setBalance(bal);
      setPayments(pays?.slice(0, 3) || []);
      setLedger(ledg?.transactions || []);
      
      console.log('🎉 Customer details loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load customer details:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Provide more helpful error messages
      if (errorMessage.includes('not found')) {
        toast.error('Customer not found. Please check the customer ID.');
      } else if (errorMessage.includes('database')) {
        toast.error('Database connection issue. Please try again.');
      } else {
        toast.error(`Failed to load customer details: ${errorMessage}`);
      }
      
      navigateTo('/customers');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="lg:col-span-2 h-64 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{customer.name}</h1>
          <p className="mt-1 text-sm text-gray-500">Customer overview and activity <span className="font-medium text-gray-700">({(customer.invoices?.length || 0)} invoices)</span></p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigateTo(`/billing/new?customer=${customer.id}`)}
            className="btn btn-primary flex items-center px-3 py-1.5 text-sm"
          >
            New Invoice
          </button>
          <button
            onClick={() => navigateTo('/reports/customer', { state: { customerId: customer.id } })}
            className="btn btn-secondary flex items-center px-3 py-1.5 text-sm"
          >
            Full Ledger
          </button>
        </div>
      </div>

      {/* Enhanced Customer Summary Card */}
      <div className="card p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Basic Info */}
          <div className="md:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
            <div className="space-y-3">
              <div>
                <span className="text-s font-medium text-gray-900">{customer.name}</span>
              </div>
              {customer.phone && (
                <div>
                  <span className="text-sm text-gray-800"> {customer.phone}</span>
                </div>
              )}
              {customer.address && (
                <div>
                  <span className="text-sm text-gray-800"> {customer.address}</span>
                </div>
              )}
              {customer.cnic && (
                <div>
                  <span className="text-sm text-gray-800"> {customer.cnic}</span>
                </div>
              )}
              {customer.created_at && (
                <div>
                  <span className="block text-sm font-medium text-gray-500 mb-1">Date of Creation</span>
                  <span className="text-sm text-gray-900">{new Date(customer.created_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Financial Summary */}
          <div className="md:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h2>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Total Invoiced:</span>
                <span>{balance ? formatCurrency(balance.total_invoiced) : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Total Paid:</span>
                <span>{balance ? formatCurrency(balance.total_paid) : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Outstanding:</span>
                <span className={balance && balance.outstanding > 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
                  {balance ? formatCurrency(balance.outstanding) : '-'}
                </span>
              </div>
            </div>
            {/* Recent Payments */}
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Recent Payments</h3>
              {payments.length === 0 ? (
                <div className="text-xs text-gray-400">No payments found</div>
              ) : (
                <ul className="text-xs space-y-1">
                  {payments.map((p) => (
                    <li key={p.id} className="flex justify-between">
                      <span>{new Date(p.date).toLocaleDateString()}</span>
                      <span>{formatCurrency(p.amount)}</span>
                      <span>{p.payment_method}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {/* Recent Activity */}
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Recent Activity</h3>
              {ledger.length === 0 ? (
                <div className="text-xs text-gray-400">No recent activity</div>
              ) : (
                <ul className="text-xs space-y-1">
                  {ledger.map((l) => (
                    <li key={l.id} className="flex justify-between">
                      <span>{l.date}</span>
                      <span>{l.type === 'invoice' ? 'Invoice' : 'Payment'}</span>
                      <span>{formatCurrency(l.debit_amount || l.credit_amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Recent Invoices</h2>
        </div>
        
        <div className="overflow-x-auto">
          {!customer.invoices || customer.invoices.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="h-12 w-12 text-gray-300 mx-auto mb-4 flex items-center justify-center text-2xl font-bold border-2 border-dashed border-gray-300 rounded">
                #
              </div>
              <p className="text-gray-500">No invoices found</p>
              <p className="text-sm text-gray-400 mt-1">Create the first invoice for this customer</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {customer.invoices.slice(0, 10).map((invoice: any) => (
                  <tr 
                    key={invoice.id} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigateTo(`/billing/invoice/${invoice.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        #{invoice.bill_number || invoice.id}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invoice.created_at ? new Date(invoice.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(invoice.grand_total || invoice.total_amount || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        invoice.status === 'paid' 
                          ? 'text-green-600 bg-green-100'
                          : invoice.status === 'partially_paid'
                          ? 'text-orange-600 bg-orange-100'
                          : 'text-red-600 bg-red-100'
                      }`}>
                        {invoice.status && typeof invoice.status === 'string' 
                          ? invoice.status.replace('_', ' ').charAt(0).toUpperCase() + invoice.status.replace('_', ' ').slice(1)
                          : 'Pending'
                        }
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}