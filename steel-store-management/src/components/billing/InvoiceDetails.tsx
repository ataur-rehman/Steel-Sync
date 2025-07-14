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
  AlertTriangle
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-green-600 bg-green-100';
      case 'partially_paid': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-red-600 bg-red-100';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Modal isOpen={true} onClose={onClose} title="Loading Invoice...">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </Modal>
    );
  }

  if (!invoice) {
    return (
      <Modal isOpen={true} onClose={onClose} title="Invoice Not Found">
        <div className="text-center py-8">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Invoice could not be loaded.</p>
        </div>
      </Modal>
    );
  }

  const status = getPaymentStatus();

  return (
    <Modal 
      isOpen={true} 
      onClose={onClose} 
      title={`Invoice ${invoice.bill_number}`}
      size="xl"
    >
      <div className="space-y-6">
        {/* Invoice Header */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">Customer</p>
                <p className="font-semibold">{invoice.customer_name}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">Date</p>
                <p className="font-semibold">{formatDate(invoice.created_at)}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(status)}`}>
                  {status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Items */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Items ({invoice.items?.length || 0})
            </h3>
            <button
              onClick={() => setShowAddItem(true)}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              disabled={saving}
            >
              <Plus className="h-4 w-4" />
              <span>Add Item</span>
            </button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoice.items?.map((item: InvoiceItem) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">{item.product_name}</td>
                    <td className="px-4 py-3">
                      {editingItem === item.id ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={editQuantity}
                            onChange={(e) => setEditQuantity(e.target.value)}
                            className="w-20 px-2 py-1 border rounded text-sm"
                          />
                          <button
                            onClick={() => handleUpdateItemQuantity(item.id, editQuantity)}
                            className="text-green-600 hover:text-green-800"
                            disabled={saving}
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingItem(null)}
                            className="text-gray-600 hover:text-gray-800"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span>{item.quantity}</span>
                          <button
                            onClick={() => {
                              setEditingItem(item.id);
                              setEditQuantity(item.quantity.toString());
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">{formatCurrency(item.unit_price)}</td>
                    <td className="px-4 py-3 font-semibold">{formatCurrency(item.total_price)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-red-600 hover:text-red-800"
                        disabled={saving}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invoice Totals */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="space-y-2 max-w-md ml-auto">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Discount ({invoice.discount}%):</span>
              <span>-{formatCurrency(invoice.discount_amount || 0)}</span>
            </div>
            <div className="flex justify-between font-semibold text-lg border-t pt-2">
              <span>Grand Total:</span>
              <span>{formatCurrency(invoice.grand_total)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Paid Amount:</span>
              <span>{formatCurrency(invoice.payment_amount || 0)}</span>
            </div>
            <div className="flex justify-between font-semibold text-red-600">
              <span>Remaining Balance:</span>
              <span>{formatCurrency(invoice.remaining_balance)}</span>
            </div>
          </div>
        </div>

        {/* Payment History */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              Payment History ({invoice.payments?.length || 0})
            </h3>
            {invoice.remaining_balance > 0 && (
              <button
                onClick={() => setShowAddPayment(true)}
                className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                disabled={saving}
              >
                <Plus className="h-4 w-4" />
                <span>Add Payment</span>
              </button>
            )}
          </div>

          {invoice.payments && invoice.payments.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invoice.payments.map((payment: Payment) => (
                    <tr key={payment.id}>
                      <td className="px-4 py-3">{formatDate(payment.date)}</td>
                      <td className="px-4 py-3 font-semibold text-green-600">{formatCurrency(payment.amount)}</td>
                      <td className="px-4 py-3 capitalize">{payment.payment_method.replace('_', ' ')}</td>
                      <td className="px-4 py-3">{payment.reference || '-'}</td>
                      <td className="px-4 py-3">{payment.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CreditCard className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>No payments recorded yet</p>
            </div>
          )}
        </div>

        {/* Add Item Modal */}
        {showAddItem && (
          <Modal
            isOpen={showAddItem}
            onClose={() => setShowAddItem(false)}
            title="Add Item to Invoice"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                <select
                  value={selectedProduct?.id || ''}
                  onChange={(e) => {
                    const product = products.find(p => p.id === parseInt(e.target.value));
                    setSelectedProduct(product || null);
                    setNewItemPrice(product?.rate_per_unit.toString() || '');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity ({getUnitTypeConfig(selectedProduct.unit_type as any).symbol})
                    </label>
                    <input
                      type="text"
                      value={newItemQuantity}
                      onChange={(e) => setNewItemQuantity(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder={`e.g., ${getUnitTypeConfig(selectedProduct.unit_type as any).examples[0]}`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (Rs.)</label>
                    <input
                      type="number"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      step="0.01"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowAddItem(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddItem}
                  disabled={saving || !selectedProduct || !newItemQuantity || !newItemPrice}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Adding...' : 'Add Item'}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Add Payment Modal */}
        {showAddPayment && (
          <Modal
            isOpen={showAddPayment}
            onClose={() => setShowAddPayment(false)}
            title="Add Payment"
          >
            <div className="space-y-4">
              <div className="bg-yellow-50 p-3 rounded-lg">
                <p className="text-sm">
                  <span className="font-semibold">Remaining Balance: </span>
                  <span className="text-red-600">{formatCurrency(invoice.remaining_balance)}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount (Rs.)</label>
                <input
                  type="number"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  step="0.01"
                  max={invoice.remaining_balance}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  value={newPayment.payment_method}
                  onChange={(e) => setNewPayment({ ...newPayment, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="card">Card Payment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                <input
                  type="text"
                  value={newPayment.reference}
                  onChange={(e) => setNewPayment({ ...newPayment, reference: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Cheque number, transaction ID, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={newPayment.notes}
                  onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newPayment.date}
                  onChange={(e) => setNewPayment({ ...newPayment, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowAddPayment(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPayment}
                  disabled={saving || !newPayment.amount}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? 'Adding...' : 'Add Payment'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </Modal>
  );
};

export default InvoiceDetails;
