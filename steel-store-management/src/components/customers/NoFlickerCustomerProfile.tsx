// FLICKERING-FREE CUSTOMER PROFILE COMPONENT
// This replaces the original CustomerProfile with a stable, non-flickering implementation

import React from 'react';
import { db } from '../../services/database';
import { formatCurrency } from '../../utils/calculations';
import FlickeringFixedDetailView from '../common/FlickeringFixedDetailView';
import { 
  User, 
  Phone, 
  MapPin, 
  CreditCard,
  TrendingUp,
  FileText,
  DollarSign,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

interface NoFlickerCustomerProfileProps {
  customerId: number;
  onClose: () => void;
  onUpdate?: () => void;
}

const NoFlickerCustomerProfile: React.FC<NoFlickerCustomerProfileProps> = ({
  customerId,
  onClose,
  onUpdate
}) => {
  return (
    <FlickeringFixedDetailView
      id={customerId}
      title="Customer Profile"
      onClose={onClose}
      onUpdate={onUpdate}
      loadMainData={async (id) => {
        console.log(`🔄 Loading customer profile for ID: ${id}`);
        const customer = await db.getCustomerWithBalance(Number(id));
        console.log(`✅ Customer profile loaded for ID: ${id}`, customer);
        return customer;
      }}
      loadRelatedData={[
        {
          key: 'invoices',
          loadFn: async () => {
            console.log('🔄 Loading customer invoices');
            return await db.getInvoices({ customer_id: customerId, limit: 10 });
          }
        },
        {
          key: 'payments',
          loadFn: async () => {
            console.log('🔄 Loading customer payments');
            return await db.getCustomerPayments(customerId);
          }
        },
        {
          key: 'balance',
          loadFn: async () => {
            console.log('🔄 Loading customer balance');
            return await db.getCustomerBalance(customerId);
          }
        },
        {
          key: 'ledger',
          loadFn: async () => {
            console.log('🔄 Loading customer ledger');
            return await db.getCustomerLedger(customerId, { limit: 5 });
          }
        }
      ]}
      renderContent={(customerData, relatedData, { isLoading }) => {
        if (!customerData) {
          return (
            <div className="p-8 text-center">
              <div className="text-gray-400 text-6xl mb-4">👤</div>
              <p className="text-gray-600">Customer not found</p>
            </div>
          );
        }

        const { invoices = [], payments = [], balance = {}, ledger = [] } = relatedData || {};

        const getBalanceColor = (amount: number) => {
          if (amount > 0) return 'text-green-600';
          if (amount < 0) return 'text-red-600';
          return 'text-gray-600';
        };

        const getStatusColor = (status: string) => {
          switch (status) {
            case 'paid': return 'bg-green-100 text-green-800';
            case 'partially_paid': return 'bg-yellow-100 text-yellow-800';
            case 'pending': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
          }
        };

        return (
          <div className="p-6 space-y-6">
            {/* Customer Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                    <User className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{customerData.name}</h3>
                    <p className="text-gray-600">Customer ID: {customerData.id}</p>
                    {customerData.customer_code && (
                      <p className="text-gray-600">Code: {customerData.customer_code}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {customerData.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-5 w-5 text-blue-600" />
                    <span className="text-gray-700">{customerData.phone}</span>
                  </div>
                )}
                {customerData.address && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    <span className="text-gray-700">{customerData.address}</span>
                  </div>
                )}
                {customerData.cnic && (
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span className="text-gray-700">CNIC: {customerData.cnic}</span>
                  </div>
                )}
              </div>

              {/* Financial Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-600">Current Balance</span>
                  </div>
                  <p className={`text-xl font-bold mt-1 ${getBalanceColor(customerData.balance || 0)}`}>
                    {formatCurrency(customerData.balance || 0)}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-600">Total Invoiced</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900 mt-1">
                    {formatCurrency(balance.total_invoiced || 0)}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-600">Total Paid</span>
                  </div>
                  <p className="text-xl font-bold text-green-600 mt-1">
                    {formatCurrency(balance.total_paid || 0)}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <span className="text-sm font-medium text-gray-600">Outstanding</span>
                  </div>
                  <p className="text-xl font-bold text-red-600 mt-1">
                    {formatCurrency(balance.outstanding || 0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Invoices */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-green-600" />
                  Recent Invoices
                </h4>
              </div>
              <div className="p-6">
                {invoices && invoices.length > 0 ? (
                  <div className="space-y-3">
                    {invoices.slice(0, 5).map((invoice: any) => (
                      <div key={invoice.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            #{invoice.bill_number}
                          </p>
                          <p className="text-xs text-gray-600">
                            {new Date(invoice.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {formatCurrency(invoice.grand_total)}
                          </p>
                          <span className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(invoice.status)}`}>
                            {invoice.status?.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-600">No invoices found</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Payments */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                  <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
                  Recent Payments
                </h4>
              </div>
              <div className="p-6">
                {payments && payments.length > 0 ? (
                  <div className="space-y-3">
                    {payments.slice(0, 5).map((payment: any) => (
                      <div key={payment.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {formatCurrency(payment.amount)}
                          </p>
                          <p className="text-xs text-gray-600">
                            {payment.payment_method} • {new Date(payment.date || payment.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {payment.reference && (
                          <p className="text-sm text-gray-600">
                            Ref: {payment.reference}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-600">No payments found</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Ledger Entries */}
            {ledger && ledger.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-purple-600" />
                    Recent Activity
                  </h4>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {ledger.slice(0, 5).map((entry: any, index: number) => (
                      <div key={entry.id || index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {entry.description}
                          </p>
                          <p className="text-xs text-gray-600">
                            {new Date(entry.date).toLocaleDateString()} • {entry.category}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-medium ${entry.type === 'incoming' ? 'text-green-600' : 'text-red-600'}`}>
                            {entry.type === 'incoming' ? '+' : '-'}{formatCurrency(entry.amount)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="text-center py-4">
                <div className="inline-flex items-center space-x-2 text-blue-600">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span className="text-sm">Refreshing...</span>
                </div>
              </div>
            )}
          </div>
        );
      }}
    />
  );
};

export default NoFlickerCustomerProfile;
