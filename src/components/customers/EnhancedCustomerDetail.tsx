// Enhanced Customer Detail with Financial Summary
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Phone, CreditCard, MapPin, Calendar, FileText, DollarSign, Edit, ShoppingCart } from 'lucide-react';
import CustomerNavigation from './CustomerNavigation';
import { useDatabase } from '../../hooks/useDatabase';
import { useSmartNavigation } from '../../hooks/useSmartNavigation';
import { formatCurrency } from '../../utils/calculations';
import { formatDate } from '../../utils/formatters';
import FIFOPaymentForm from '../payments/FIFOPaymentForm';

const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<any>(null);
  const [financialSummary, setFinancialSummary] = useState<any>(null);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFIFOPayment, setShowFIFOPayment] = useState(false);
  const { db } = useDatabase();
  const { navigateTo } = useSmartNavigation();

  useEffect(() => {
    loadCustomerData();
  }, [id]);

  const loadCustomerData = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const [customerData, summary, invoices] = await Promise.all([
        db.getCustomer(parseInt(id)),
        db.getCustomerBalance(parseInt(id)),
        db.getInvoices({ customer_id: parseInt(id), limit: 5 })
      ]);

      setCustomer(customerData);
      setFinancialSummary(summary);
      setRecentInvoices(invoices || []);
    } catch (error) {
      console.error('Error loading customer:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!customer) return <div>Customer not found</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerNavigation
        customerId={customer.id}
        customerName={customer.name}
        currentPage="detail"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer Information */}
          <div className="lg:col-span-2">
            <CustomerBasicInfo customer={customer} />
            <CustomerRecentActivity customerId={customer.id} recentInvoices={recentInvoices} navigateTo={navigateTo} />
          </div>

          {/* Financial Summary Sidebar */}
          <div className="lg:col-span-1">
            <CustomerFinancialSummary
              summary={financialSummary}
              customerId={customer.id}
              navigateTo={navigateTo}
            />
            <CustomerQuickActions
              customerId={customer.id}
              summary={financialSummary}
              navigateTo={navigateTo}
              onShowFIFOPayment={() => setShowFIFOPayment(true)}
            />
          </div>
        </div>
      </div>

      {/* FIFO Payment Form - Moved to main component to avoid nested modal issues */}
      <FIFOPaymentForm
        customerId={parseInt(id!)}
        customerName={customer?.name || ''}
        customerBalance={financialSummary?.outstanding || 0}
        customerPhone={customer?.phone}
        isOpen={showFIFOPayment}
        onClose={() => setShowFIFOPayment(false)}
        onPaymentSuccess={() => {
          setShowFIFOPayment(false);
          // Reload customer data to reflect updated balance
          loadCustomerData();
        }}
      />
    </div>
  );
};

const CustomerFinancialSummary: React.FC<{ summary: any; customerId: number; navigateTo: any }> = ({
  summary,
  customerId,
  navigateTo
}) => {
  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h3>

      <div className="space-y-4">
        <div className="flex justify-between">
          <span className="text-gray-600">Outstanding Balance</span>
          <span className={`font-semibold ${summary?.outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(summary?.outstanding || 0)}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Total Invoiced</span>
          <span className="font-semibold">{formatCurrency(summary?.total_invoiced || 0)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Total Paid</span>
          <span className="font-semibold text-green-600">{formatCurrency(summary?.total_paid || 0)}</span>
        </div>

        <div className="pt-4 border-t">
          <button
            onClick={() => navigateTo(`/customers/${customerId}/ledger`)}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            View Complete Ledger
          </button>
        </div>
      </div>
    </div>
  );
};

const CustomerBasicInfo: React.FC<{ customer: any }> = ({ customer }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
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
                {customer.created_at ? formatDate(customer.created_at) : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CustomerRecentActivity: React.FC<{ customerId: number; recentInvoices: any[]; navigateTo: any }> = ({
  customerId,
  recentInvoices,
  navigateTo
}) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Recent Invoices</h3>
        <button
          onClick={() => navigateTo(`/invoices?customer=${customerId}`)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          View All
        </button>
      </div>

      {recentInvoices.length > 0 ? (
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
                    {formatDate(invoice.created_at)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {formatCurrency(invoice.total_amount)}
                </p>
                <p className={`text-xs ${invoice.status === 'paid' ? 'text-green-600' :
                  invoice.status === 'partial' ? 'text-orange-600' : 'text-red-600'
                  }`}>
                  {invoice.status?.charAt(0).toUpperCase() + (invoice.status?.slice(1) || '') || 'Unpaid'}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-4">No recent invoices found</p>
      )}
    </div>
  );
};

const CustomerQuickActions: React.FC<{
  customerId: number;
  summary: any;
  navigateTo: any;
  onShowFIFOPayment: () => void;
}> = ({ customerId, navigateTo, onShowFIFOPayment }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>

      <div className="space-y-3">
        <button
          onClick={() => navigateTo(`/invoices/new?customer=${customerId}`)}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Create Invoice
        </button>

        <button
          onClick={onShowFIFOPayment}
          className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center"
        >
          <DollarSign className="h-4 w-4 mr-2" />
          Add Payment (FIFO)
        </button>

        <button
          onClick={() => navigateTo(`/customers/${customerId}/edit`)}
          className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors flex items-center justify-center"
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit Customer
        </button>
      </div>
    </div>
  );
};

export default CustomerDetail;
