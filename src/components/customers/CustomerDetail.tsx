import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDatabase } from '../../hooks/useDatabase';
import { useSmartNavigation } from '../../hooks/useSmartNavigation';
import { useActivityLogger } from '../../hooks/useActivityLogger';
import { ActivityType, ModuleType } from '../../services/activityLogger';
import type { Customer } from '../../types';
import { toast } from 'react-hot-toast';
import { Edit, Trash2, FileText, DollarSign, Calendar, MapPin, Phone, CreditCard, TrendingUp, ShoppingCart, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../../utils/calculations';
import SmartDetailHeader from '../common/SmartDetailHeader';
import CustomerNavigation from './CustomerNavigation';

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const { db } = useDatabase();
  const { navigateTo, goBack, getFromPage } = useSmartNavigation();
  const activityLogger = useActivityLogger();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [financialSummary, setFinancialSummary] = useState<any>(null);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomerData();
  }, [id]);

  const loadCustomerData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const [customerData, balanceData, invoices] = await Promise.all([
        db.getCustomer(parseInt(id)),
        db.getCustomerBalance(parseInt(id)),
        db.getInvoices({ customer_id: parseInt(id), limit: 5 })
      ]);
      
      setCustomer(customerData);
      // Transform balance data to match our financial summary structure
      setFinancialSummary({
        totalBalance: balanceData?.outstanding || customerData?.total_balance || 0,
        totalSales: balanceData?.total_invoiced || 0,
        totalInvoices: invoices?.length || 0
      });
      setRecentInvoices(invoices || []);
    } catch (error) {
      toast.error('Failed to load customer details');
      console.error('Error loading customer:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigateTo(`/customers/${id}/edit`);
  };

  const handleDelete = async () => {
    if (!customer || !window.confirm(`Are you sure you want to delete ${customer.name}?`)) return;
    
    try {
      await db.deleteCustomer(customer.id);
      
      // Log the customer deletion activity
      activityLogger.logCustomActivity(
        ActivityType.DELETE,
        ModuleType.CUSTOMERS,
        customer.id,
        `Deleted customer: ${customer.name} (Phone: ${customer.phone})`
      );
      
      toast.success('Customer deleted successfully');
      navigateTo('/customers');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete customer');
    }
  };

  const handleViewInvoices = () => {
    navigateTo(`/invoices?customer=${id}`);
  };

  const handleViewLedger = () => {
    navigateTo(`/customers/${id}/ledger`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <SmartDetailHeader 
          title="Loading Customer..." 
          subtitle="Please wait while we load the customer details"
          onBack={() => goBack('/customers')}
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
          onBack={() => goBack('/customers')}
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
        subtitle={`Customer ID: ${customer.id} • ${customer.phone || 'No phone'}`}
        fromPage={getFromPage() || undefined}
        actions={
          <div className="flex space-x-3">
            <button
              onClick={handleEdit}
              className="btn btn-secondary flex items-center px-4 py-2 text-sm"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </button>
            <button
              onClick={handleViewInvoices}
              className="btn btn-primary flex items-center px-4 py-2 text-sm"
            >
              <FileText className="h-4 w-4 mr-2" />
              View Invoices
            </button>
            <button
              onClick={handleDelete}
              className="btn btn-danger flex items-center px-4 py-2 text-sm"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </button>
          </div>
        }
      />

      {/* Customer Navigation */}
      <CustomerNavigation 
        customerId={customer.id} 
        customerName={customer.name}
        currentPage="detail"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Customer Information */}
          <div className="lg:col-span-2 space-y-8">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Phone</p>
                      <p className="text-sm text-gray-600">{customer.phone || 'N/A'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <CreditCard className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">CNIC</p>
                      <p className="text-sm text-gray-600">{customer.cnic || 'N/A'}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Address</p>
                      <p className="text-sm text-gray-600">{customer.address || 'N/A'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Created</p>
                      <p className="text-sm text-gray-600">
                        {customer.created_at ? new Date(customer.created_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-900">Total Balance</p>
                      <p className="text-xl font-bold text-blue-900">
                        {formatCurrency(financialSummary?.totalBalance || customer.total_balance || 0)}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-blue-500" />
                  </div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-900">Total Sales</p>
                      <p className="text-xl font-bold text-green-900">
                        {formatCurrency(financialSummary?.totalSales || 0)}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  </div>
                </div>
                
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-900">Total Invoices</p>
                      <p className="text-xl font-bold text-orange-900">
                        {financialSummary?.totalInvoices || recentInvoices.length}
                      </p>
                    </div>
                    <FileText className="h-8 w-8 text-orange-500" />
                  </div>
                </div>
              </div>

              {(financialSummary?.totalBalance || customer.total_balance || 0) > 0 && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                    <p className="text-sm font-medium text-red-800">
                      Outstanding balance requires attention
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Recent Invoices */}
            {recentInvoices.length > 0 && (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Invoices</h3>
                  <button
                    onClick={handleViewInvoices}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View All
                  </button>
                </div>
                
                <div className="space-y-3">
                  {recentInvoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Invoice #{invoice.invoice_number}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(invoice.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(invoice.total_amount)}
                        </p>
                        <p className={`text-xs ${
                          invoice.status === 'paid' ? 'text-green-600' : 
                          invoice.status === 'partial' ? 'text-orange-600' : 'text-red-600'
                        }`}>
                          {invoice.status?.charAt(0).toUpperCase() + (invoice.status?.slice(1) || '') || 'Unpaid'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Balance and Actions */}
          <div className="space-y-6">
            {/* Balance Card */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Account Balance</h3>
                <DollarSign className="h-5 w-5 text-gray-400" />
              </div>
              
              <div className="text-center">
                <p className={`text-3xl font-bold ${
                  (customer.total_balance || 0) > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {formatCurrency(customer.total_balance || 0)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {(customer.total_balance || 0) > 0 ? 'Outstanding Balance' : 'Clear Balance'}
                </p>
              </div>
              
              <button
                onClick={handleViewLedger}
                className="w-full mt-4 btn btn-secondary text-sm"
              >
                View Ledger
              </button>
            </div>

            {/* Quick Actions */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              
              <div className="space-y-3">
                <button
                  onClick={() => navigateTo(`/invoices/new?customer=${customer.id}`)}
                  className="w-full btn btn-primary text-sm justify-start"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Create Invoice
                </button>
                
                <button
                  onClick={() => navigateTo(`/payments/new?customer=${customer.id}`)}
                  className="w-full btn btn-secondary text-sm justify-start"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Record Payment
                </button>
                
                <button
                  onClick={handleEdit}
                  className="w-full btn btn-secondary text-sm justify-start"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Customer
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>    </div>  );}