import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDatabase } from '../../hooks/useDatabase';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../../utils/calculations';
import { useNavigation } from '../../hooks/useNavigation';
import { useAutoRefresh } from '../../hooks/useRealTimeUpdates';
import { useSmartNavigation } from '../../hooks/useSmartNavigation';
import SmartDetailHeader from '../common/SmartDetailHeader';
import { 
  FileText, 
  DollarSign, 
  Calendar,
  Phone,
  MapPin,
  User,
  CreditCard,
  TrendingUp,
  Clock,
  Receipt,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

export default function CustomerProfile() {
  const { id } = useParams();
  const { navigateTo } = useNavigation();
  const { getFromPage } = useSmartNavigation();
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
      <div className="min-h-screen bg-gray-50">
        <SmartDetailHeader 
          title="Loading Customer..." 
          subtitle="Please wait while we load the customer details"
          backToListPath="/customers"
          backToListLabel="Back to Customers"
          backButtonMode="list"
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50">
        <SmartDetailHeader 
          title="Customer Not Found" 
          subtitle="The requested customer could not be found"
          backToListPath="/customers"
          backToListLabel="Back to Customers"
          backButtonMode="list"
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-500">The customer you're looking for doesn't exist or has been deleted.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SmartDetailHeader
        title={customer.name}
        subtitle={`Customer ID: ${customer.id} • ${customer.phone || 'No phone'} • ${(customer.invoices?.length || 0)} invoices`}
        fromPage={getFromPage() || undefined}
        backButtonMode="auto"
        actions={
          <div className="flex space-x-3">
            {balance && balance.outstanding > 0 && (
              <button
                onClick={() => navigateTo(`/payment?customer_id=${customer.id}&source=customer_profile`)}
                className="flex items-center px-4 py-2 text-sm bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Record Payment
              </button>
            )}
            <button
              onClick={() => navigateTo(`/billing/new?customer=${customer.id}`)}
              className="flex items-center px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
            >
              <FileText className="h-4 w-4 mr-2" />
              New Invoice
            </button>
            <button
              onClick={() => navigateTo('/reports/customer', { state: { customerId: customer.id } })}
              className="flex items-center px-4 py-2 text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Full Report
            </button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">

          {/* Customer Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Contact Information */}
            <div className="bg-white rounded-lg shadow border p-6">
              <div className="flex items-center mb-4">
                <User className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600">Name:</span>
                  <div className="text-sm text-gray-900">{customer.name}</div>
                </div>
                {customer.phone && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Phone:</span>
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 text-gray-400 mr-2" />
                      <button
                        onClick={() => window.open(`tel:${customer.phone}`)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        {customer.phone}
                      </button>
                    </div>
                  </div>
                )}
                {customer.address && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Address:</span>
                    <div className="flex items-start">
                      <MapPin className="h-4 w-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-900">{customer.address}</span>
                    </div>
                  </div>
                )}
                {customer.cnic && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">CNIC:</span>
                    <div className="text-sm text-gray-900">{customer.cnic}</div>
                  </div>
                )}
                {customer.created_at && (
                  <div className="pt-3 border-t border-gray-100">
                    <span className="text-sm font-medium text-gray-600">Customer Since:</span>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{new Date(customer.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-white rounded-lg shadow border p-6">
              <div className="flex items-center mb-4">
                <DollarSign className="h-5 w-5 text-green-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Financial Summary</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Total Invoiced:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {balance ? formatCurrency(balance.total_invoiced) : '₹0.00'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Total Paid:</span>
                  <span className="text-sm font-semibold text-green-600">
                    {balance ? formatCurrency(balance.total_paid) : '₹0.00'}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-100">
                  <span className="text-sm font-medium text-gray-600">Outstanding:</span>
                  <span className={`text-lg font-bold ${
                    balance && balance.outstanding > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {balance ? formatCurrency(balance.outstanding) : '₹0.00'}
                  </span>
                </div>
                
                {balance && balance.outstanding > 0 && (
                  <div className="flex items-center mt-3 p-3 bg-red-50 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                    <span className="text-sm text-red-700">Payment pending</span>
                  </div>
                )}
                {balance && balance.outstanding === 0 && balance.total_invoiced > 0 && (
                  <div className="flex items-center mt-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-green-700">All payments current</span>
                  </div>
                )}
              </div>
            </div>

            {/* Activity Summary */}
            <div className="bg-white rounded-lg shadow border p-6">
              <div className="flex items-center mb-4">
                <TrendingUp className="h-5 w-5 text-purple-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Activity Summary</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Total Invoices:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {customer.invoices?.length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Total Payments:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {payments.length}
                  </span>
                </div>

                {customer.invoices && customer.invoices.length > 0 && (
                  <div className="pt-3 border-t border-gray-100">
                    <div className="flex items-center mb-2">
                      <Clock className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-600">Last Invoice:</span>
                    </div>
                    <div className="text-sm text-gray-900">
                      {new Date(customer.invoices[0].created_at).toLocaleDateString()}
                    </div>
                  </div>
                )}
                
                {payments.length > 0 && (
                  <div>
                    <div className="flex items-center mb-2">
                      <CreditCard className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-600">Last Payment:</span>
                    </div>
                    <div className="text-sm text-gray-900">
                      {new Date(payments[0].date).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Recent Payments */}
            <div className="bg-white rounded-lg shadow border">
              <div className="px-6 py-4 border-b">
                <div className="flex items-center">
                  <CreditCard className="h-5 w-5 text-green-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Recent Payments</h3>
                </div>
              </div>
              <div className="p-6">
                {payments.length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-sm text-gray-500">No payments recorded</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {payments.slice(0, 5).map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                        <div className="flex items-center">
                          <div className="p-2 bg-green-100 rounded-lg mr-3">
                            <CreditCard className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {formatCurrency(payment.amount)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(payment.date).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-400">
                              {payment.payment_method || 'Cash'}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                          Received
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Account Activity */}
            <div className="bg-white rounded-lg shadow border">
              <div className="px-6 py-4 border-b">
                <div className="flex items-center">
                  <Receipt className="h-5 w-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Account Activity</h3>
                </div>
              </div>
              <div className="p-6">
                {ledger.length === 0 ? (
                  <div className="text-center py-8">
                    <Receipt className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-sm text-gray-500">No recent activity</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ledger.slice(0, 5).map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                        <div className="flex items-center">
                          <div className={`p-2 rounded-lg mr-3 ${
                            entry.type === 'invoice' 
                              ? 'bg-blue-100' 
                              : 'bg-green-100'
                          }`}>
                            {entry.type === 'invoice' ? (
                              <FileText className="h-4 w-4 text-blue-600" />
                            ) : (
                              <CreditCard className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {entry.type === 'invoice' ? 'Invoice Created' : 'Payment Received'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(entry.date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className={`text-sm font-semibold ${
                          entry.type === 'invoice' ? 'text-blue-600' : 'text-green-600'
                        }`}>
                          {entry.type === 'invoice' ? '+' : '-'}{formatCurrency(entry.debit_amount || entry.credit_amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Invoice History */}
          <div className="bg-white rounded-lg shadow border">
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Invoice History</h3>
                </div>
                <span className="text-sm text-gray-500">
                  {customer.invoices?.length || 0} total invoices
                </span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              {!customer.invoices || customer.invoices.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">No invoices found</p>
                  <p className="text-sm text-gray-500 mb-4">Create the first invoice for this customer</p>
                  <button
                    onClick={() => navigateTo(`/billing/new?customer=${customer.id}`)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create Invoice
                  </button>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Invoice
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {customer.invoices.slice(0, 10).map((invoice: any) => (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="p-2 bg-blue-100 rounded-lg mr-3">
                              <FileText className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                #{invoice.bill_number || invoice.id}
                              </div>
                              <div className="text-xs text-gray-500">
                                ID: {invoice.id}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {invoice.created_at ? new Date(invoice.created_at).toLocaleDateString() : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-gray-900">
                            {formatCurrency(invoice.grand_total || invoice.total_amount || 0)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            invoice.status === 'paid' 
                              ? 'text-green-700 bg-green-100'
                              : invoice.status === 'partially_paid'
                              ? 'text-orange-700 bg-orange-100'
                              : 'text-red-700 bg-red-100'
                          }`}>
                            {invoice.status && typeof invoice.status === 'string' 
                              ? invoice.status.replace('_', ' ').charAt(0).toUpperCase() + invoice.status.replace('_', ' ').slice(1)
                              : 'Pending'
                            }
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => navigateTo(`/billing/invoice/${invoice.id}`)}
                              className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-600 rounded transition-colors"
                            >
                              View
                            </button>
                            {invoice.status !== 'paid' && (
                              <button
                                onClick={() => navigateTo(`/payment?customer_id=${customer.id}&invoice_id=${invoice.id}`)}
                                className="px-3 py-1 text-sm text-white bg-green-600 hover:bg-green-700 rounded transition-colors"
                              >
                                Pay
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            {customer.invoices && customer.invoices.length > 10 && (
              <div className="px-6 py-4 border-t bg-gray-50">
                <div className="text-center">
                  <button
                    onClick={() => navigateTo('/reports/customer', { state: { customerId: customer.id } })}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View all {customer.invoices.length} invoices
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}