import React, { useState, useEffect } from 'react';
import { db } from '../../services/database';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/calculations';
import { parseCurrency } from '../../utils/currency';
import { formatUnitString, parseUnit, validateUnit, getUnitTypeConfig } from '../../utils/unitUtils';
import Modal from '../common/Modal';
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  DollarSign,
  Package,
  User,
  Calendar,
  CreditCard,
  FileText,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Receipt,
  Phone,
  MapPin,
  Tag,
  TrendingUp,
  ArrowLeft,
  MoreHorizontal,
  Download,
  Printer,
  Copy,
  Eye,
  Minus
} from 'lucide-react';

interface InvoiceDetailsProps {
  invoiceId: number;
  onClose: () => void;
  onUpdate?: () => void;
}

interface InvoiceItem {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  unit?: string;
}

interface Payment {
  id: number;
  amount: number;
  payment_method: string;
  reference?: string;
  notes?: string;
  date: string;
  created_at: string;
}

interface Product {
  id: number;
  name: string;
  unit_type: string;
  rate_per_unit: number;
  current_stock: string;
}

const InvoiceDetails: React.FC<InvoiceDetailsProps> = ({ invoiceId, onClose, onUpdate }) => {
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  
  // Product selection for adding items
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  
  // Payment form
  const [newPayment, setNewPayment] = useState({
    amount: '',
    payment_method: 'cash',
    reference: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Item editing
  const [editQuantity, setEditQuantity] = useState('');

  useEffect(() => {
    loadInvoiceDetails();
    loadProducts();
  }, [invoiceId]);

  const loadInvoiceDetails = async () => {
    try {
      setLoading(true);
      const details = await db.getInvoiceWithDetails(invoiceId);
      setInvoice(details);
    } catch (error) {
      console.error('Error loading invoice details:', error);
      toast.error('Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const productList = await db.getAllProducts();
      setProducts(productList);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handleAddItem = async () => {
    if (!selectedProduct || !newItemQuantity || !newItemPrice) {
      toast.error('Please fill all required fields');
      return;
    }

    // Validate quantity format for the product's unit type
    const quantityValidation = validateUnit(newItemQuantity, selectedProduct.unit_type as any);
    if (!quantityValidation.isValid) {
      toast.error(`Invalid quantity format: ${quantityValidation.error}`);
      return;
    }

    try {
      setSaving(true);
      
      const parsedQuantity = parseUnit(newItemQuantity, selectedProduct.unit_type as any);
      const unitPrice = parseCurrency(newItemPrice);
      
      // CRITICAL FIX: Correct total price calculation based on unit type
      let totalPrice: number;
      if (selectedProduct.unit_type === 'kg-grams' || selectedProduct.unit_type === 'kg') {
        // For weight-based units, convert grams to kg for pricing (divide by 1000)
        totalPrice = (parsedQuantity.numericValue / 1000) * unitPrice;
      } else {
        // For simple units (piece, bag, etc.), use the numeric value directly
        totalPrice = parsedQuantity.numericValue * unitPrice;
      }

      const newItem = {
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        quantity: newItemQuantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        unit: formatUnitString(newItemQuantity, selectedProduct.unit_type as any)
      };

      await db.addInvoiceItems(invoiceId, [newItem]);
      
      toast.success('Item added successfully');
      setShowAddItem(false);
      setSelectedProduct(null);
      setNewItemQuantity('');
      setNewItemPrice('');
      await loadInvoiceDetails();
      
      // CRITICAL: Force parent component to refresh
      if (onUpdate) {
        onUpdate();
      }
      
      // ENHANCED: Emit events for immediate real-time updates
      try {
        if (typeof window !== 'undefined') {
          const eventBus = (window as any).eventBus;
          if (eventBus && eventBus.emit) {
            eventBus.emit('INVOICE_DETAILS_UPDATED', {
              invoiceId,
              action: 'item_added',
              customerId: invoice?.customer_id
            });
          }
        }
      } catch (error) {
        console.warn('Could not emit invoice details update event:', error);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to add item');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateItemQuantity = async (itemId: number, newQuantity: string) => {
    try {
      setSaving(true);
      
      // Find the item to get its unit type
      const item = invoice.items.find((i: InvoiceItem) => i.id === itemId);
      if (!item) return;
      
      const product = products.find(p => p.id === item.product_id);
      if (!product) return;

      // Validate quantity
      const quantityValidation = validateUnit(newQuantity, product.unit_type as any);
      if (!quantityValidation.isValid) {
        toast.error(`Invalid quantity: ${quantityValidation.error}`);
        return;
      }

      const parsedQuantity = parseUnit(newQuantity, product.unit_type as any);
      await db.updateInvoiceItemQuantity(invoiceId, itemId, parsedQuantity.numericValue);
      
      toast.success('Item quantity updated');
      setEditingItem(null);
      await loadInvoiceDetails();
      
      // CRITICAL: Force parent component to refresh
      if (onUpdate) {
        onUpdate();
      }
      
      // ENHANCED: Emit events for immediate real-time updates
      try {
        if (typeof window !== 'undefined') {
          const eventBus = (window as any).eventBus;
          if (eventBus && eventBus.emit) {
            eventBus.emit('INVOICE_DETAILS_UPDATED', {
              invoiceId,
              action: 'quantity_updated',
              customerId: invoice?.customer_id
            });
          }
        }
      } catch (error) {
        console.warn('Could not emit invoice details update event:', error);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update item');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    if (!confirm('Are you sure you want to remove this item?')) return;

    try {
      setSaving(true);
      await db.removeInvoiceItems(invoiceId, [itemId]);
      
      toast.success('Item removed successfully');
      await loadInvoiceDetails();
      
      // CRITICAL: Force parent component to refresh
      if (onUpdate) {
        onUpdate();
      }
      
      // ENHANCED: Emit events for immediate real-time updates
      try {
        if (typeof window !== 'undefined') {
          const eventBus = (window as any).eventBus;
          if (eventBus && eventBus.emit) {
            eventBus.emit('INVOICE_DETAILS_UPDATED', {
              invoiceId,
              action: 'item_removed',
              customerId: invoice?.customer_id
            });
          }
        }
      } catch (error) {
        console.warn('Could not emit invoice details update event:', error);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove item');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPayment = async () => {
    if (!newPayment.amount || parseFloat(newPayment.amount) <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    const paymentAmount = parseCurrency(newPayment.amount);
    if (paymentAmount > invoice.remaining_balance) {
      toast.error('Payment amount cannot exceed remaining balance');
      return;
    }

    try {
      setSaving(true);
      
      await db.addInvoicePayment(invoiceId, {
        amount: paymentAmount,
        payment_method: newPayment.payment_method,
        reference: newPayment.reference,
        notes: newPayment.notes,
        date: newPayment.date
      });
      
      toast.success('Payment added successfully');
      setShowAddPayment(false);
      setNewPayment({
        amount: '',
        payment_method: 'cash',
        reference: '',
        notes: '',
        date: new Date().toISOString().split('T')[0]
      });
      await loadInvoiceDetails();
      
      // CRITICAL: Force parent component to refresh
      if (onUpdate) {
        onUpdate();
      }
      
      // ENHANCED: Emit events for immediate real-time updates
      try {
        if (typeof window !== 'undefined') {
          const eventBus = (window as any).eventBus;
          if (eventBus && eventBus.emit) {
            eventBus.emit('INVOICE_DETAILS_UPDATED', {
              invoiceId,
              action: 'payment_added',
              customerId: invoice?.customer_id
            });
          }
        }
      } catch (error) {
        console.warn('Could not emit invoice details update event:', error);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to add payment');
    } finally {
      setSaving(false);
    }
  };

  const getPaymentStatus = () => {
    if (!invoice) return 'pending';
    if (invoice.remaining_balance <= 0) return 'paid';
    if (invoice.payment_amount > 0) return 'partially_paid';
    return 'pending';
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'paid':
        return { 
          label: 'Paid', 
          color: 'text-green-700 bg-green-50 border-green-200',
          icon: CheckCircle,
          dot: 'bg-green-500'
        };
      case 'partially_paid':
        return { 
          label: 'Partially Paid', 
          color: 'text-yellow-700 bg-yellow-50 border-yellow-200',
          icon: Clock,
          dot: 'bg-yellow-500'
        };
      default:
        return { 
          label: 'Pending', 
          color: 'text-red-700 bg-red-50 border-red-200',
          icon: AlertTriangle,
          dot: 'bg-red-500'
        };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copied to clipboard`);
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 shadow-2xl">
          <div className="flex items-center space-x-3">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-lg font-medium text-gray-900">Loading Invoice...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 shadow-2xl max-w-md w-full mx-4">
          <div className="text-center">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Invoice Not Found</h3>
            <p className="text-gray-600 mb-6">This invoice could not be loaded or doesn't exist.</p>
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const status = getPaymentStatus();
  const statusInfo = getStatusInfo(status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* REDESIGNED: Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onClose}
                className="p-2 hover:bg-blue-500 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold">Invoice {invoice.bill_number}</h1>
                <p className="text-blue-100 text-sm">{formatDate(invoice.created_at)}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className={`flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${statusInfo.color}`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${statusInfo.dot}`}></div>
                {statusInfo.label}
              </div>
              
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => copyToClipboard(invoice.bill_number, 'Invoice number')}
                  className="p-2 hover:bg-blue-500 rounded-lg transition-colors"
                  title="Copy invoice number"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button className="p-2 hover:bg-blue-500 rounded-lg transition-colors" title="Print">
                  <Printer className="h-4 w-4" />
                </button>
                <button className="p-2 hover:bg-blue-500 rounded-lg transition-colors" title="Download">
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* REDESIGNED: Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
            {/* REDESIGNED: Quick Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Customer</p>
                    <p className="text-lg font-bold text-blue-900">{invoice.customer_name}</p>
                    {invoice.customer_phone && (
                      <p className="text-sm text-blue-700">{invoice.customer_phone}</p>
                    )}
                  </div>
                  <User className="h-8 w-8 text-blue-500" />
                </div>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Total Amount</p>
                    <p className="text-lg font-bold text-green-900">{formatCurrency(invoice.grand_total)}</p>
                    {invoice.discount > 0 && (
                      <p className="text-sm text-green-700">{invoice.discount}% discount</p>
                    )}
                  </div>
                  <Receipt className="h-8 w-8 text-green-500" />
                </div>
              </div>
              
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">Paid Amount</p>
                    <p className="text-lg font-bold text-purple-900">{formatCurrency(invoice.payment_amount || 0)}</p>
                    <p className="text-sm text-purple-700 capitalize">{invoice.payment_method?.replace('_', ' ')}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-purple-500" />
                </div>
              </div>
              
              <div className={`border rounded-lg p-4 ${invoice.remaining_balance > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${invoice.remaining_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      Balance Due
                    </p>
                    <p className={`text-lg font-bold ${invoice.remaining_balance > 0 ? 'text-red-900' : 'text-green-900'}`}>
                      {formatCurrency(invoice.remaining_balance)}
                    </p>
                    <p className={`text-sm ${invoice.remaining_balance > 0 ? 'text-red-700' : 'text-green-700'}`}>
                      {invoice.remaining_balance > 0 ? 'Outstanding' : 'Fully Paid'}
                    </p>
                  </div>
                  <TrendingUp className={`h-8 w-8 ${invoice.remaining_balance > 0 ? 'text-red-500' : 'text-green-500'}`} />
                </div>
              </div>
            </div>

            {/* REDESIGNED: Invoice Items */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Package className="h-5 w-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      Invoice Items ({invoice.items?.length || 0})
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowAddItem(true)}
                    disabled={saving}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Item</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Unit Price</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {invoice.items?.length > 0 ? (
                      invoice.items.map((item: InvoiceItem) => (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Package className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{item.product_name}</div>
                                <div className="text-xs text-gray-500">Product ID: {item.product_id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {editingItem === item.id ? (
                              <div className="flex items-center space-x-2">
                                <input
                                  type="text"
                                  value={editQuantity}
                                  onChange={(e) => setEditQuantity(e.target.value)}
                                  className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="Qty"
                                />
                                <button
                                  onClick={() => handleUpdateItemQuantity(item.id, editQuantity)}
                                  disabled={saving}
                                  className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50"
                                  title="Save"
                                >
                                  <Save className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setEditingItem(null)}
                                  className="p-1 text-gray-600 hover:text-gray-800"
                                  title="Cancel"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-900">{item.quantity}</span>
                                <button
                                  onClick={() => {
                                    setEditingItem(item.id);
                                    setEditQuantity(item.quantity.toString());
                                  }}
                                  className="p-1 text-blue-600 hover:text-blue-800"
                                  title="Edit quantity"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-gray-900">{formatCurrency(item.unit_price)}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-bold text-gray-900">{formatCurrency(item.total_price)}</span>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              disabled={saving}
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Remove item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No Items Added</h3>
                          <p className="text-gray-500 mb-4">This invoice doesn't have any items yet.</p>
                          <button
                            onClick={() => setShowAddItem(true)}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add First Item
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* REDESIGNED: Invoice Summary */}
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
                <div className="max-w-md ml-auto space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
                  </div>
                  {invoice.discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount ({invoice.discount}%):</span>
                      <span>-{formatCurrency(invoice.discount_amount || 0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Grand Total:</span>
                    <span>{formatCurrency(invoice.grand_total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* REDESIGNED: Payment History */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CreditCard className="h-5 w-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      Payment History ({invoice.payments?.length || 0})
                    </h3>
                  </div>
                  {invoice.remaining_balance > 0 && (
                    <button
                      onClick={() => setShowAddPayment(true)}
                      disabled={saving}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Payment</span>
                    </button>
                  )}
                </div>
              </div>

              {invoice.payments && invoice.payments.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {invoice.payments.map((payment: any) => {
                    const key = payment.id || payment.payment_id || Math.random();
                    const amount = payment.amount ?? 0;
                    const method = payment.payment_method ?? 'cash';
                    const reference = payment.reference ?? '';
                    const notes = payment.notes ?? payment.payment_notes ?? '';
                    const date = payment.date ?? payment.created_at ?? '';
                    const createdAt = payment.created_at ?? payment.date ?? '';
                    return (
                      <div key={key} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                              <DollarSign className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="text-lg font-bold text-green-600">{formatCurrency(amount)}</span>
                                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full capitalize">
                                  {method.replace('_', ' ')}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600">
                                {formatDate(date)} • {reference || 'No reference'}
                              </div>
                              {notes && (
                                <div className="text-xs text-gray-500 mt-1">{notes}</div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-500">{formatDate(createdAt)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-6 py-12 text-center">
                  <CreditCard className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Payments Recorded</h3>
                  <p className="text-gray-500 mb-4">No payments have been made for this invoice yet.</p>
                  {invoice.remaining_balance > 0 && (
                    <button
                      onClick={() => setShowAddPayment(true)}
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Record First Payment
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* REDESIGNED: Add Item Modal */}
        {showAddItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
              <div className="bg-blue-600 px-6 py-4 text-white rounded-t-xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Add Item to Invoice</h2>
                  <button
                    onClick={() => setShowAddItem(false)}
                    className="p-1 hover:bg-blue-500 rounded transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Product</label>
                  <select
                    value={selectedProduct?.id || ''}
                    onChange={(e) => {
                      const product = products.find(p => p.id === parseInt(e.target.value));
                      setSelectedProduct(product || null);
                      setNewItemPrice(product?.rate_per_unit.toString() || '');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a product</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name} - Stock: {formatUnitString(product.current_stock, product.unit_type as any)}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedProduct && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Quantity ({getUnitTypeConfig(selectedProduct.unit_type as any).symbol})
                      </label>
                      <input
                        type="text"
                        value={newItemQuantity}
                        onChange={(e) => setNewItemQuantity(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={`e.g., ${getUnitTypeConfig(selectedProduct.unit_type as any).examples[0]}`}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Unit Price (Rs.)</label>
                      <input
                        type="number"
                        value={newItemPrice}
                        onChange={(e) => setNewItemPrice(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        step="0.01"
                      />
                    </div>
                  </>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setShowAddItem(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddItem}
                    disabled={saving || !selectedProduct || !newItemQuantity || !newItemPrice}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Adding...</span>
                      </div>
                    ) : (
                      'Add Item'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REDESIGNED: Add Payment Modal */}
        {showAddPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
              <div className="bg-green-600 px-6 py-4 text-white rounded-t-xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Record Payment</h2>
                  <button
                    onClick={() => setShowAddPayment(false)}
                    className="p-1 hover:bg-green-500 rounded transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="text-sm font-semibold text-yellow-800">Outstanding Balance</p>
                      <p className="text-lg font-bold text-yellow-900">{formatCurrency(invoice.remaining_balance)}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Amount (Rs.)</label>
                  <input
                    type="number"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    step="0.01"
                    max={invoice.remaining_balance}
                    placeholder="0.00"
                  />
                  <div className="flex justify-between mt-2">
                    <button
                      type="button"
                      onClick={() => setNewPayment({ ...newPayment, amount: (invoice.remaining_balance / 2).toString() })}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      Half ({formatCurrency(invoice.remaining_balance / 2)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewPayment({ ...newPayment, amount: invoice.remaining_balance.toString() })}
                      className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                    >
                      Full Amount
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'cash', label: 'Cash', icon: '💵' },
                      { value: 'bank_transfer', label: 'Bank Transfer', icon: '🏦' },
                      { value: 'cheque', label: 'Cheque', icon: '📄' },
                      { value: 'card', label: 'Card', icon: '💳' }
                    ].map(method => (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => setNewPayment({ ...newPayment, payment_method: method.value })}
                        className={`p-3 text-sm rounded-lg border transition-colors ${
                          newPayment.payment_method === method.value
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-lg mb-1">{method.icon}</div>
                          <div className="font-medium">{method.label}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Reference (Optional)</label>
                  <input
                    type="text"
                    value={newPayment.reference}
                    onChange={(e) => setNewPayment({ ...newPayment, reference: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Cheque number, transaction ID, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Notes (Optional)</label>
                  <textarea
                    value={newPayment.notes}
                    onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                    rows={2}
                    placeholder="Any additional notes..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Date</label>
                  <input
                    type="date"
                    value={newPayment.date}
                    onChange={(e) => setNewPayment({ ...newPayment, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setShowAddPayment(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddPayment}
                    disabled={saving || !newPayment.amount}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Recording...</span>
                      </div>
                    ) : (
                      'Record Payment'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceDetails;