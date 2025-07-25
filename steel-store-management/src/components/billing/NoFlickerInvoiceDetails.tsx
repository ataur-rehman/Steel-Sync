// FLICKERING-FREE INVOICE DETAILS COMPONENT
// This replaces the original InvoiceDetails with a stable, non-flickering implementation

import React from 'react';
import { db } from '../../services/database';
import { formatCurrency } from '../../utils/calculations';
import FlickeringFixedDetailView from '../common/FlickeringFixedDetailView';
import { 
  Package, 
  DollarSign, 
  User, 
  Phone, 
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  CreditCard
} from 'lucide-react';

interface NoFlickerInvoiceDetailsProps {
  invoiceId: number;
  onClose: () => void;
  onUpdate?: () => void;
}

const NoFlickerInvoiceDetails: React.FC<NoFlickerInvoiceDetailsProps> = ({
  invoiceId,
  onClose,
  onUpdate
}) => {
  return (
    <FlickeringFixedDetailView
      id={invoiceId}
      title="Invoice Details"
      onClose={onClose}
      onUpdate={onUpdate}
      loadMainData={async (id) => {
        console.log(`🔄 Loading invoice details for ID: ${id}`);
        const details = await db.getInvoiceWithDetails(Number(id));
        console.log(`✅ Invoice details loaded for ID: ${id}`, details);
        return details;
      }}
      loadRelatedData={[
        {
          key: 'customer',
          loadFn: async () => {
            console.log('🔄 Loading customer details');
            const invoice = await db.getInvoiceWithDetails(invoiceId);
            if (invoice?.customer_id) {
              return await db.getCustomer(invoice.customer_id);
            }
            return null;
          }
        }
      ]}
      renderContent={(invoiceData, relatedData, { isLoading }) => {
        if (!invoiceData) {
          return (
            <div className="p-8 text-center">
              <div className="text-gray-400 text-6xl mb-4">📄</div>
              <p className="text-gray-600">Invoice not found</p>
            </div>
          );
        }

        const { customer } = relatedData || {};
        const getStatusColor = (status: string) => {
          switch (status) {
            case 'paid': return 'bg-green-100 text-green-800';
            case 'partially_paid': return 'bg-yellow-100 text-yellow-800';
            case 'pending': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
          }
        };

        const getStatusIcon = (status: string) => {
          switch (status) {
            case 'paid': return <CheckCircle className="h-4 w-4" />;
            case 'partially_paid': return <Clock className="h-4 w-4" />;
            case 'pending': return <AlertTriangle className="h-4 w-4" />;
            default: return <AlertTriangle className="h-4 w-4" />;
          }
        };

        return (
          <div className="p-6 space-y-6">
            {/* Invoice Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    Invoice #{invoiceData.bill_number}
                  </h3>
                  <p className="text-gray-600 mt-1">
                    Created: {new Date(invoiceData.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium ${getStatusColor(invoiceData.status)}`}>
                  {getStatusIcon(invoiceData.status)}
                  <span className="capitalize">{invoiceData.status?.replace('_', ' ')}</span>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-600">Grand Total</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900 mt-1">
                    {formatCurrency(invoiceData.grand_total)}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-600">Paid Amount</span>
                  </div>
                  <p className="text-xl font-bold text-green-600 mt-1">
                    {formatCurrency(invoiceData.payment_amount || 0)}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <span className="text-sm font-medium text-gray-600">Remaining</span>
                  </div>
                  <p className="text-xl font-bold text-red-600 mt-1">
                    {formatCurrency(invoiceData.remaining_balance || 0)}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="flex items-center space-x-2">
                    <Package className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium text-gray-600">Items</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900 mt-1">
                    {invoiceData.items?.length || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Customer Information */}
            {customer && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <User className="h-5 w-5 mr-2 text-blue-600" />
                  Customer Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Name</p>
                    <p className="text-gray-900 font-medium">{customer.name}</p>
                  </div>
                  {customer.phone && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 flex items-center">
                        <Phone className="h-4 w-4 mr-1" />
                        Phone
                      </p>
                      <p className="text-gray-900">{customer.phone}</p>
                    </div>
                  )}
                  {customer.address && (
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-gray-600 flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        Address
                      </p>
                      <p className="text-gray-900">{customer.address}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Invoice Items */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Package className="h-5 w-5 mr-2 text-green-600" />
                  Invoice Items
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoiceData.items?.length > 0 ? (
                      invoiceData.items.map((item: any, index: number) => (
                        <tr key={item.id || index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {item.product_name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {item.quantity}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatCurrency(item.unit_price)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {formatCurrency(item.total_price)}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                          No items found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment History */}
            {invoiceData.payments && invoiceData.payments.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                    <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
                    Payment History
                  </h4>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {invoiceData.payments.map((payment: any, index: number) => (
                      <div key={payment.id || index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {formatCurrency(payment.amount)}
                          </p>
                          <p className="text-xs text-gray-600">
                            {payment.payment_method} • {new Date(payment.created_at || payment.date).toLocaleDateString()}
                          </p>
                        </div>
                        {payment.notes && (
                          <p className="text-sm text-gray-600 max-w-xs truncate">
                            {payment.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            {invoiceData.notes && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Notes</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{invoiceData.notes}</p>
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

export default NoFlickerInvoiceDetails;
