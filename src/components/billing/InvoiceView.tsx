import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDatabase } from '../../hooks/useDatabase';
import { formatCurrency } from '../../utils/calculations';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { formatUnitString } from '../../utils/unitUtils';
import { formatInvoiceNumber } from '../../utils/numberFormatting';
import { Printer, Edit, Trash2, DollarSign, Package, User } from 'lucide-react';
import toast from 'react-hot-toast';
import SmartDetailHeader from '../common/SmartDetailHeader';

interface Invoice {
  id: number;
  bill_number: string;
  customer_id: number;
  customer_name: string;
  customer_phone?: string;
  customer_address?: string;
  subtotal: number;
  discount: number;
  grand_total: number;
  amount_paid: number;
  payment_status: string;
  date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface InvoiceItem {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  unit?: string;
  unit_type?: string;
  length?: number;
  pieces?: number;
  // T-Iron calculation fields
  t_iron_pieces?: number;
  t_iron_length_per_piece?: number;
  t_iron_total_feet?: number;
  product_description?: string;
  is_non_stock_item?: boolean;
}

export default function InvoiceView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { db, initialized } = useDatabase();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialized && id) {
      loadInvoiceData();
    }
  }, [initialized, id]);

  const loadInvoiceData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!id) {
        setError('Invoice ID is required');
        return;
      }

      const invoiceId = parseInt(id);
      if (isNaN(invoiceId)) {
        setError('Invalid invoice ID');
        return;
      }

      // Load invoice details
      const invoiceData = await db.getInvoice(invoiceId);
      if (!invoiceData) {
        setError('Invoice not found');
        return;
      }

      // Load invoice items
      const itemsData = await db.getInvoiceItems(invoiceId);

      // Debug: Log the items data to check L/pcs values
      console.log('🔍 DEBUG: Invoice items data:', itemsData);
      if (itemsData && itemsData.length > 0) {
        itemsData.forEach((item, index) => {
          console.log(`🔍 Item ${index + 1}:`, {
            product_name: item.product_name,
            length: item.length,
            pieces: item.pieces,
            hasLength: item.hasOwnProperty('length'),
            hasPieces: item.hasOwnProperty('pieces')
          });
        });
      }

      setInvoice(invoiceData);
      setInvoiceItems(itemsData || []);
    } catch (err) {
      console.error('Error loading invoice:', err);
      setError('Failed to load invoice details');
      toast.error('Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleEdit = () => {
    navigate(`/billing/edit/${id}`);
  };

  const handleDelete = async () => {
    if (!invoice) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete Invoice #${formatInvoiceNumber(invoice.bill_number)}? This action cannot be undone.`
    );

    if (confirmed) {
      try {
        await db.deleteInvoice(invoice.id);
        toast.success('Invoice deleted successfully');
        navigate('/billing/list');
      } catch (err) {
        console.error('Error deleting invoice:', err);
        toast.error('Failed to delete invoice');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50">
        <SmartDetailHeader
          title="Invoice Not Found"
          subtitle={error || "The invoice you're looking for doesn't exist"}
          backToListPath="/billing/list"
          backToListLabel="Back to Invoices"
          backButtonMode="list"
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-red-500 text-lg font-semibold mb-2">
              {error || 'Invoice not found'}
            </div>
            <p className="text-gray-600 mb-4">
              The invoice you're looking for doesn't exist or couldn't be loaded.
            </p>
            <button
              onClick={() => navigate('/billing/list')}
              className="btn btn-primary"
            >
              View All Invoices
            </button>
          </div>
        </div>
      </div>
    );
  }

  const remainingBalance = invoice.grand_total - invoice.amount_paid;

  return (
    <div className="min-h-screen bg-gray-50">
      <SmartDetailHeader
        title={`Invoice #${formatInvoiceNumber(invoice.bill_number)}`}
        subtitle={`${invoice.customer_name} • ${formatDate(invoice.created_at)}`}
        backToListPath="/billing/list"
        backToListLabel="Back to Invoices"
        backButtonMode="list"
        actions={
          <div className="flex space-x-2">
            <button
              onClick={handlePrint}
              className="btn btn-secondary flex items-center"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </button>
            <button
              onClick={handleEdit}
              className="btn btn-primary flex items-center"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="btn bg-red-600 text-white hover:bg-red-700 flex items-center"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Invoice Card */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Invoice Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold">Invoice #{formatInvoiceNumber(invoice.bill_number)}</h1>
                <p className="text-blue-100 mt-1">
                  Created on {formatDate(invoice.date)}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">
                  {formatCurrency(invoice.grand_total)}
                </div>
                <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${invoice.payment_status === 'paid'
                  ? 'bg-green-100 text-green-800'
                  : invoice.payment_status === 'partially_paid'
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-red-100 text-red-800'
                  }`}>
                  {invoice.payment_status.replace('_', ' ').charAt(0).toUpperCase() +
                    invoice.payment_status.replace('_', ' ').slice(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="h-5 w-5 mr-2 text-blue-600" />
              Customer Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="text-gray-900 font-semibold">{invoice.customer_name}</p>
              </div>
              {invoice.customer_phone && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="text-gray-900">{invoice.customer_phone}</p>
                </div>
              )}
              {invoice.customer_address && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <p className="text-gray-900">{invoice.customer_address}</p>
                </div>
              )}
            </div>
          </div>

          {/* Invoice Items */}
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Package className="h-5 w-5 mr-2 text-blue-600" />
              Items ({invoiceItems.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 text-sm font-medium text-gray-700">Product</th>
                    <th className="text-right py-3 text-sm font-medium text-gray-700">Quantity</th>
                    <th className="text-right py-3 text-sm font-medium text-gray-700">Unit Price</th>
                    <th className="text-right py-3 text-sm font-medium text-gray-700">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceItems.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="py-3">
                        <div className="font-medium text-gray-900">
                          {item.product_name}
                          {item.t_iron_pieces && item.t_iron_length_per_piece ? (
                            <span className="text-sm text-blue-600 ml-2">
                              ({item.t_iron_pieces}pcs × {item.t_iron_length_per_piece}ft × Rs.{item.unit_price}/ft)
                            </span>
                          ) : (
                            <>
                              {item.length && ` • ${item.length}/L`}
                              {item.pieces && ` • ${item.pieces}/pcs`}
                            </>
                          )}
                        </div>
                        {(item.is_non_stock_item ||
                          item.product_name.toLowerCase().includes('t-iron') ||
                          item.product_name.toLowerCase().includes('tiron') ||
                          item.product_name.toLowerCase().includes('t iron')) && (
                            <div className="text-xs text-green-600 mt-1">
                              Non-Stock Item • Total: {item.t_iron_total_feet || item.quantity} ft
                            </div>
                          )}
                      </td>
                      <td className="py-3 text-right text-gray-900">
                        {item.t_iron_total_feet || formatUnitString(item.quantity.toString(), (item.unit_type || 'piece') as any)}
                      </td>
                      <td className="py-3 text-right text-gray-900">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="py-3 text-right font-semibold text-gray-900">
                        {formatCurrency(item.total_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-blue-600" />
              Payment Summary
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-700">Subtotal:</span>
                <span className="font-semibold">{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-700">Discount:</span>
                  <span className="font-semibold text-red-600">-{formatCurrency(invoice.discount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-200 pt-3">
                <span className="text-lg font-semibold text-gray-900">Grand Total:</span>
                <span className="text-lg font-bold text-gray-900">{formatCurrency(invoice.grand_total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Amount Paid:</span>
                <span className="font-semibold text-green-600">{formatCurrency(invoice.amount_paid)}</span>
              </div>
              {remainingBalance > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-700">Remaining Balance:</span>
                  <span className="font-semibold text-red-600">{formatCurrency(remainingBalance)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Notes</h3>
              <p className="text-gray-700">{invoice.notes}</p>
            </div>
          )}

          {/* Invoice Details */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Created:</span> {formatDateTime(invoice.created_at)}
              </div>
              <div>
                <span className="font-medium">Last Updated:</span> {formatDateTime(invoice.updated_at)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
