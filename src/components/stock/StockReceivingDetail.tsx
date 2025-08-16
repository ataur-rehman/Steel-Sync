import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../services/database';
import { formatCurrency } from '../../utils/formatters';
import { formatUnitString } from '../../utils/unitUtils';
import { formatReceivingNumber } from '../../utils/numberFormatting';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';
import { useSmartNavigation } from '../../hooks/useSmartNavigation';
import SmartDetailHeader from '../common/SmartDetailHeader';

const StockReceivingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { navigateTo, getFromPage } = useSmartNavigation();
  const [receiving, setReceiving] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [vendor, setVendor] = useState<any>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadDetail(parseInt(id));
  }, [id]);

  const loadDetail = async (receivingId: number) => {
    try {
      setLoading(true);
      const [receivingList, vendors, items, payments] = await Promise.all([
        db.getStockReceivingList(),
        db.getVendors(),
        db.getStockReceivingItems(receivingId),
        db.getReceivingPaymentHistory(receivingId)
      ]);
      
      const rec = receivingList.find((r: any) => r.id === receivingId);
      
      // Items now include unit_type from the enhanced database query
      setReceiving(rec);
      setItems(items);
      setVendor(vendors.find((v: any) => v.id === rec?.vendor_id));
      setPaymentHistory(payments);
    } catch (error) {
      console.error('Error loading receiving detail:', error);
      toast.error('Failed to load receiving details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'paid':
        return { 
          label: 'Fully Paid', 
          color: 'text-green-600 bg-green-100'
        };
      case 'partial':
        return { 
          label: 'Partially Paid', 
          color: 'text-orange-600 bg-orange-100'
        };
      case 'pending':
        return { 
          label: 'Payment Pending', 
          color: 'text-red-600 bg-red-100'
        };
      default:
        return { 
          label: 'Unknown Status', 
          color: 'text-gray-600 bg-gray-100'
        };
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!receiving) {
    return (
      <div className="min-h-screen bg-gray-50">
        <SmartDetailHeader
          title="Receiving Record Not Found"
          subtitle="The requested receiving record could not be found"
          backToListPath="/stock/receiving"
          backToListLabel="Back to Receiving List"
          backButtonMode="list"
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-500">The receiving record you're looking for doesn't exist.</p>
          </div>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(receiving.payment_status);

  return (
    <div className="min-h-screen bg-gray-50">
      <SmartDetailHeader
        title={`Receiving #${formatReceivingNumber(receiving.receiving_number)}`}
        subtitle={`Received on ${new Date(receiving.date).toLocaleDateString()} • ${items.length} items`}
        fromPage={getFromPage() || undefined}
        backButtonMode="auto"
        actions={
          <div className="flex items-center gap-3">
            {receiving.payment_status !== 'paid' && (
              <button
                onClick={() => navigateTo(`/stock/receiving/${receiving.id}/add-payment`)}
                className="btn btn-success flex items-center px-3 py-1.5 text-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Payment
              </button>
            )}
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">

      {/* Status and Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Payment Status</p>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold mt-2 ${statusInfo.color}`}>
                {statusInfo.label}
              </div>
            </div>
          </div>
        </div>
        
        <div className="card p-6">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Amount</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatCurrency(receiving.total_amount)}
            </p>
          </div>
        </div>
        
        <div className="card p-6">
          <div>
            <p className="text-sm font-medium text-gray-500">Paid Amount</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {formatCurrency(receiving.payment_amount)}
            </p>
          </div>
        </div>
        
        <div className="card p-6">
          <div>
            <p className="text-sm font-medium text-gray-500">Outstanding</p>
            <p className={`text-2xl font-bold mt-1 ${receiving.remaining_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(receiving.remaining_balance)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items Section */}
          <div className="card p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">Items Received</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Unit Price</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                  
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="h-12 w-12 text-gray-300 mx-auto mb-4 flex items-center justify-center text-2xl font-bold border-2 border-dashed border-gray-300 rounded">
                          📦
                        </div>
                        <p className="text-gray-500">No items found</p>
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.product_name}</div>
                            {item.notes && (
                              <div className="text-xs text-gray-500 mt-1">{item.notes}</div>
                            )}
                            {(item.category || item.size || item.grade) && (
                              <div className="text-xs text-gray-500 mt-1">
                                {[item.category, item.size, item.grade].filter(Boolean).join(' • ')}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatUnitString(item.quantity, item.unit_type || 'kg-grams')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {formatCurrency(item.total_price)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {items.length > 0 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Total Amount:</span>
                  <span className="text-xl font-bold text-gray-900">
                    {formatCurrency(items.reduce((sum, item) => sum + item.total_price, 0))}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Payment History */}
          <div className="card p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
                {receiving.payment_status !== 'paid' && (
                  <button
                    onClick={() => navigateTo(`/stock/receiving/${receiving.id}/add-payment`)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Add Payment
                  </button>
                )}
              </div>
            </div>
            
            {paymentHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Method</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Reference</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {paymentHistory.map((payment, idx) => (
                      <tr key={payment.id || idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payment.date ? new Date(payment.date).toLocaleDateString() : '-'}
                          {payment.time && (
                            <div className="text-xs text-gray-500">{payment.time}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payment.payment_channel_name || payment.payment_method || (
                            <span className="text-gray-400 italic">Not specified</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payment.reference_number || payment.cheque_number || (
                            <span className="text-gray-400 italic">No reference</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                          {payment.notes || (
                            <span className="text-gray-400 italic">No notes</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-6 py-12 text-center">
                <div className="h-12 w-12 text-gray-300 mx-auto mb-4 flex items-center justify-center text-2xl font-bold border-2 border-dashed border-gray-300 rounded">
                  $
                </div>
                <p className="text-gray-500">No Payments Recorded</p>
                <p className="text-sm text-gray-400 mt-1 mb-6">
                  {receiving.payment_status === 'pending' 
                    ? 'This receiving has no payment records yet.' 
                    : 'Payment history will appear here once payments are recorded.'}
                </p>
                {receiving.payment_status !== 'paid' && (
                  <button
                    onClick={() => navigateTo(`/stock/receiving/${receiving.id}/add-payment`)}
                    className="btn btn-primary"
                  >
                    Record First Payment
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Receiving Information */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Receiving Details</h3>
            <div className="space-y-4">
              <div>
                <span className="block text-sm font-medium text-gray-500 mb-1">Receiving Number</span>
                <span className="text-sm text-gray-900 font-mono">{formatReceivingNumber(receiving.receiving_number)}</span>
              </div>
              <div>
                <span className="block text-sm font-medium text-gray-500 mb-1">Date</span>
                <span className="text-sm text-gray-900">{new Date(receiving.date).toLocaleDateString()}</span>
                  <div className="space-x-4"></div>
                <span className="text-sm text-gray-800">{typeof receiving.time === 'string' && receiving.time.trim() ? receiving.time : '-'}</span>
              </div>
              {receiving.notes && (
                <div>
                  <span className="block text-sm font-medium text-gray-500 mb-1">Notes</span>
                  <span className="text-sm text-gray-900">{receiving.notes}</span>
                </div>
              )}
              {receiving.truck_number && (
                <div>
                  <span className="block text-sm font-medium text-gray-500 mb-1">Truck Number</span>
                  <span className="text-sm text-gray-900">{receiving.truck_number}</span>
                </div>
              )}
              {receiving.reference_number && (
                <div>
                  <span className="block text-sm font-medium text-gray-500 mb-1">Reference Number</span>
                  <span className="text-sm text-gray-900">{receiving.reference_number}</span>
                </div>
              )}
            </div>
          </div>

          {/* Vendor Information */}
          {vendor && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendor Information</h3>
              <div className="space-y-4">
                <div>
                  <span className="block text-sm font-medium text-gray-500 mb-1">Vendor Name</span>
                  <span className="text-sm text-gray-900">{vendor.name}</span>
                </div>
                {vendor.company_name && (
                  <div>
                    <span className="block text-sm font-medium text-gray-500 mb-1">Company</span>
                    <span className="text-sm text-gray-900">{vendor.company_name}</span>
                  </div>
                )}
                {vendor.phone && (
                  <div>
                    <span className="block text-sm font-medium text-gray-500 mb-1">Phone</span>
                    <span className="text-sm text-gray-900">{vendor.phone}</span>
                  </div>
                )}
                {vendor.address && (
                  <div>
                    <span className="block text-sm font-medium text-gray-500 mb-1">Address</span>
                    <span className="text-sm text-gray-900">{vendor.address}</span>
                  </div>
                )}
                {vendor.contact_person && (
                  <div>
                    <span className="block text-sm font-medium text-gray-500 mb-1">Contact Person</span>
                    <span className="text-sm text-gray-900">{vendor.contact_person}</span>
                  </div>
                )}
                {vendor.payment_terms && (
                  <div>
                    <span className="block text-sm font-medium text-gray-500 mb-1">Payment Terms</span>
                    <span className="text-sm text-gray-900">{vendor.payment_terms}</span>
                  </div>
                )}
                {vendor.notes && (
                  <div>
                    <span className="block text-sm font-medium text-gray-500 mb-1">Vendor Notes</span>
                    <span className="text-sm text-gray-900">{vendor.notes}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default StockReceivingDetail;