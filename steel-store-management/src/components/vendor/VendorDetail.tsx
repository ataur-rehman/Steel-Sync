import Modal from '../../components/common/Modal';
  const [previewType, setPreviewType] = useState<'receiving' | 'payment' | null>(null);
  const [previewRecord, setPreviewRecord] = useState<any>(null);
  // Preview modal open handler
  const openPreview = (type: 'receiving' | 'payment', record: any) => {
    setPreviewType(type);
    setPreviewRecord(record);
  };
  const closePreview = () => {
    setPreviewType(null);
    setPreviewRecord(null);
  };
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { db } from '../../services/database';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR'
  }).format(amount);
};

// Helper to format receiving number as S0001
const formatReceivingNumber = (num: string) => {
  if (!num) return '-';
  if (/^S\d{4,}$/.test(num)) return num;
  const match = num.match(/(\d{4,})$/);
  if (match) {
    return `S${match[1]}`;
  }
  return num;
};

const VendorDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState<any>(null);
  const [vendorPayments, setVendorPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [vendorReceivings, setVendorReceivings] = useState<any[]>([]);
  const [loadingReceivings, setLoadingReceivings] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVendor = async () => {
      setLoading(true);
      try {
        const vendors = await db.getVendors();
        const v = vendors.find((ven: any) => String(ven.id) === String(id));
        setVendor(v || null);
      } catch (err) {
        toast.error('Failed to load vendor');
        setVendor(null);
      } finally {
        setLoading(false);
      }
    };
    fetchVendor();
  }, [id]);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoadingPayments(true);
      setLoadingReceivings(true);
      try {
        const [payments, receivings] = await Promise.all([
          db.getVendorPayments(Number(id)),
          db.getStockReceivingList({ vendor_id: Number(id) })
        ]);
        setVendorPayments(payments);
        setVendorReceivings(receivings);
      } catch (err) {
        setVendorPayments([]);
        setVendorReceivings([]);
      } finally {
        setLoadingPayments(false);
        setLoadingReceivings(false);
      }
    };
    fetchDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-8 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="h-96 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="h-96 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="space-y-8 p-6">
        <div className="card p-12 text-center">
          <div className="h-12 w-12 text-gray-300 mx-auto mb-4 flex items-center justify-center text-2xl font-bold border-2 border-dashed border-gray-300 rounded">
            🏢
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Vendor Not Found</h3>
          <p className="text-gray-500 mb-6">The requested vendor could not be found.</p>
          <button
            onClick={() => navigate('/vendors')}
            className="btn btn-primary"
          >
            Back to Vendors
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{vendor.name}</h1>
        <p className="mt-1 text-sm text-gray-500">Vendor profile and transaction history</p>
      </div>
      <button
        onClick={() => navigate('/vendors')}
        className="btn btn-secondary flex items-center px-3 py-1.5 text-sm"
      >
        Back to Vendors
      </button>
      </div>

      {/* Vendor Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Contact Information */}
      <div className="card p-6 min-w-[380px]">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
        <div className="space-y-4">
        {vendor.contact_person && (
          <div>
          <span className="block text-sm font-medium text-gray-500 mb-1">Contact Person</span>
          <span className="text-sm text-gray-900">{vendor.contact_person}</span>
          </div>
        )}
        {vendor.phone && (
          <div>
          <span className="block text-sm font-medium text-gray-500 mb-1">Phone</span>
          <span className="text-sm text-gray-900">📞 {vendor.phone}</span>
          </div>
        )}
        {vendor.email && (
          <div>
          <span className="block text-sm font-medium text-gray-500 mb-1">Email</span>
          <span className="text-sm text-gray-900">✉️ {vendor.email}</span>
          </div>
        )}
        {vendor.address && (
          <div>
          <span className="block text-sm font-medium text-gray-500 mb-1">Address</span>
          <span className="text-sm text-gray-900">📍 {vendor.address}</span>
          {vendor.city && (
            <div className="text-sm text-gray-600 mt-1">{vendor.city}</div>
          )}
          </div>
        )}
        {vendor.payment_terms && (
          <div>
          <span className="block text-sm font-medium text-gray-500 mb-1">Payment Terms</span>
          <span className="text-sm text-gray-900">{vendor.payment_terms}</span>
          </div>
        )}
        </div>
      </div>

      {/* Financial Summary */}
      <div className="card p-4 min-w-[380px]">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h3>
        <div className="space-y-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-600">Total Purchases</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">
          {typeof vendor.total_purchases === 'number' && !isNaN(vendor.total_purchases)
            ? formatCurrency(vendor.total_purchases)
            : <span className="text-gray-400">-</span>}
          </p>
        </div>
        <div className={`rounded-lg p-4 ${
          vendor.outstanding_balance > 0 
          ? 'bg-red-50' 
          : 'bg-green-50'
        }`}>
          <p className="text-sm font-medium text-gray-600">Outstanding Balance</p>
          <p className={`text-2xl font-bold mt-1 ${
          vendor.outstanding_balance > 0 ? 'text-red-600' : 'text-green-600'
          }`}>
          {typeof vendor.outstanding_balance === 'number' && !isNaN(vendor.outstanding_balance)
            ? formatCurrency(vendor.outstanding_balance)
            : <span className="text-gray-400">-</span>}
          </p>
        </div>
        </div>
      </div>

      {/* Status & Activity */}
      <div className="card p-6 min-w-[380px]">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Status & Activity</h3>
        <div className="space-y-4">
        <div>
          <span className="block text-sm font-medium text-gray-500 mb-2">Current Status</span>
          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
          vendor.is_active
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
          }`}>
          {vendor.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
        {vendor.last_purchase_date && (
          <div>
          <span className="block text-sm font-medium text-gray-500 mb-1">Last Purchase</span>
          <span className="text-sm text-gray-900">
            {new Date(vendor.last_purchase_date).toLocaleDateString()}
          </span>
          </div>
        )}
        <div>
          <span className="block text-sm font-medium text-gray-500 mb-1">Member Since</span>
          <span className="text-sm text-gray-900">
          {new Date(vendor.created_at).toLocaleDateString()}
          </span>
        </div>
        </div>
      </div>
      </div>

      {/* Data Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 px-2">
      {/* Stock Receivings */}
      <div className="card pt-0 pb-0 px-2 overflow-hidden w-full">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Stock Receivings</h3>
          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
          {vendorReceivings.length} records
          </span>
        </div>
        </div>
        <div className="overflow-x-auto">
        {loadingReceivings ? (
          <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading receivings...</span>
          </div>
        ) : vendorReceivings.length === 0 ? (
          <div className="px-6 py-12 text-center">
          <div className="h-12 w-12 text-gray-300 mx-auto mb-4 flex items-center justify-center text-2xl font-bold border-2 border-dashed border-gray-300 rounded">
            📦
          </div>
          <p className="text-gray-500">No receivings found</p>
          </div>
        ) : (
          <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
            <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-normal break-words">Date</th>
            <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-normal break-words">Receiving #</th>
            <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-normal break-words">Total</th>
            <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-normal break-words">Balance</th>
            <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-normal break-words">Status</th>
            <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-normal break-words">Preview</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {vendorReceivings.map((r: any) => (
            <tr key={r.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-2 py-3 text-sm text-gray-900 whitespace-normal break-words">
              {r.date ? new Date(r.date).toLocaleDateString() : '-'}
              </td>
              <td className="px-2 py-3 text-sm text-gray-900 whitespace-normal break-words">
                <button
                  className="font-mono text-blue-600 underline hover:text-blue-800 focus:outline-none"
                  onClick={() => openPreview('receiving', r)}
                  title="Preview Stock Receiving"
                >
                  {formatReceivingNumber(r.receiving_number)}
                </button>
              </td>
              <td className="px-2 py-3 text-sm font-semibold text-gray-900 whitespace-normal break-words">
              {formatCurrency(r.total_amount)}
              </td>
              <td className="px-2 py-3 text-sm whitespace-normal break-words">
              <span className={r.remaining_balance > 0 ? 'text-red-600' : 'text-green-600'}>
                {formatCurrency(r.remaining_balance)}
              </span>
              </td>
              <td className="px-2 py-3 whitespace-normal break-words">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                r.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                r.payment_status === 'partial' ? 'bg-orange-100 text-orange-800' :
                'bg-red-100 text-red-700'
              }`}>
                {r.payment_status.charAt(0).toUpperCase() + r.payment_status.slice(1)}
              </span>
              </td>
              <td className="px-2 py-3">
                <button className="btn btn-xs btn-outline" onClick={() => openPreview('receiving', r)}>Preview</button>
              </td>
            </tr>
            ))}
          </tbody>
          </table>
        )}
        </div>
      </div>

      {/* Payments History */}
      <div className="card pt-0 pb-0 px-2 overflow-hidden w-full">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
          {vendorPayments.length} payments
          </span>
        </div>
        </div>
        <div className="overflow-x-auto">
        {loadingPayments ? (
          <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
          <span className="ml-2 text-gray-600">Loading payments...</span>
          </div>
        ) : vendorPayments.length === 0 ? (
          <div className="px-6 py-12 text-center">
          <div className="h-12 w-12 text-gray-300 mx-auto mb-4 flex items-center justify-center text-2xl font-bold border-2 border-dashed border-gray-300 rounded">
            $
          </div>
          <p className="text-gray-500">No payments found</p>
          </div>
        ) : (
          <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
            <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-normal break-words">Date</th>
            <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-normal break-words">Amount</th>
            <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-normal break-words">Method</th>
            <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-normal break-words">Reference</th>
            <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-normal break-words">Preview</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {vendorPayments.map((p, idx) => (
            <tr key={p.id || idx} className="hover:bg-gray-50 transition-colors">
              <td className="px-2 py-3 text-sm text-gray-900 whitespace-normal break-words">
              {p.date ? new Date(p.date).toLocaleDateString() : '-'}
              </td>
              <td className="px-2 py-3 text-sm font-semibold text-green-600 whitespace-normal break-words">
              {p.amount ? formatCurrency(p.amount) : '-'}
              </td>
              <td className="px-2 py-3 text-sm text-gray-900 whitespace-normal break-words">
              {p.payment_method || (
                <span className="text-gray-400 italic">Not specified</span>
              )}
              </td>
              <td className="px-2 py-3 text-sm text-gray-900 whitespace-normal break-words">
                {p.receiving_number ? (
                  <button
                    className="font-mono text-blue-600 underline hover:text-blue-800 focus:outline-none"
                  onClick={() => {
                    const found = vendorReceivings.find(r => r.receiving_number === p.receiving_number);
                    if (found) {
                      openPreview('receiving', found);
                    } else {
                      openPreview('receiving', {
                        receiving_number: p.receiving_number,
                        date: p.date,
                        total_amount: p.amount,
                        payment_amount: p.amount,
                        remaining_balance: 0,
                        payment_status: 'Unknown',
                        notFound: true
                      });
                    }
                  }}
                    title="Preview Stock Receiving"
                  >
                    {formatReceivingNumber(p.receiving_number)}
                  </button>
                ) : (
                  <span className="text-gray-400 italic">No reference</span>
                )}
              </td>
              <td className="px-2 py-3">
                <button className="btn btn-xs btn-outline" onClick={() => openPreview('payment', p)}>Preview</button>
              </td>
            </tr>
            ))}
          </tbody>
          </table>
        )}
      {/* Preview Modal (moved outside scrollable/table containers) */}
    </div>
    {previewType && previewRecord && (
      <Modal 
        isOpen={!!previewType}
        onClose={closePreview}
        title={previewType === 'receiving' ? 'Stock Receiving Preview' : 'Payment Preview'}
        size="lg"
      >
        <div className="space-y-4">
          {previewType === 'receiving' ? (
            <>
              {previewRecord.notFound && (
                <div className="text-red-600 font-semibold">Stock Receiving record not found. Showing reference details only.</div>
              )}
              <div><b>Date:</b> {previewRecord.date ? new Date(previewRecord.date).toLocaleDateString() : '-'}</div>
              <div><b>Receiving #:</b> {formatReceivingNumber(previewRecord.receiving_number)}</div>
              <div><b>Total Amount:</b> {formatCurrency(previewRecord.total_amount)}</div>
              <div><b>Paid:</b> {formatCurrency(previewRecord.payment_amount)}</div>
              <div><b>Balance:</b> {formatCurrency(previewRecord.remaining_balance)}</div>
              <div><b>Status:</b> {previewRecord.payment_status}</div>
              <div><b>Vendor:</b> {vendor?.name}</div>
            </>
          ) : (
            <>
              <div><b>Date:</b> {previewRecord.date ? new Date(previewRecord.date).toLocaleDateString() : '-'}</div>
              <div><b>Amount:</b> {formatCurrency(previewRecord.amount)}</div>
              <div><b>Method:</b> {previewRecord.payment_method || 'Not specified'}</div>
              <div><b>Reference:</b> {previewRecord.receiving_number ? formatReceivingNumber(previewRecord.receiving_number) : 'No reference'}</div>
              <div><b>Note:</b> {previewRecord.note || '-'}</div>
            </>
          )}
        </div>
      </Modal>
    )}
        </div>
      </div>
      </div>

  );
};

export default VendorDetail;