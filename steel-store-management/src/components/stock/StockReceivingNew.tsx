import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Search } from 'lucide-react';
import { db } from '../../services/database';
import { formatCurrency } from '../../utils/formatters';
import { parseUnit, formatUnitString } from '../../utils/unitUtils';
import toast from 'react-hot-toast';

interface StockReceivingItem {
  product_id: number;
  product_name: string;
  quantity: string;
  unit_price: number;
  total_price: number;
  expiry_date?: string;
  batch_number?: string;
  notes?: string;
}

interface StockReceivingForm {
  vendor_id: number;
  vendor_name: string;
  total_amount: number;
  payment_amount: number;
  notes: string;
  items: StockReceivingItem[];
}

const StockReceivingNew: React.FC = () => {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [form, setForm] = useState<StockReceivingForm>({
    vendor_id: 0,
    vendor_name: '',
    total_amount: 0,
    payment_amount: 0,
    notes: '',
    items: []
  });

  const [newItem, setNewItem] = useState<StockReceivingItem>({
    product_id: 0,
    product_name: '',
    quantity: '0',
    unit_price: 0,
    total_price: 0,
    expiry_date: '',
    batch_number: '',
    notes: ''
  });

  const [showProductSearch, setShowProductSearch] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [showOptional, setShowOptional] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowProductSearch(false);
      }
    };

    // Prevent backspace from navigating back when focus is on form elements
    const handleBackspace = (e: KeyboardEvent) => {
      if (e.key === 'Backspace') {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
          e.stopPropagation();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('keydown', handleBackspace);
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleBackspace);
    };
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    calculateTotal();
  }, [form.items]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [vendorData, productData] = await Promise.all([
        db.getVendors(),
        db.getAllProducts()
      ]);
      
      setVendors(vendorData);
      setProducts(productData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    const total = form.items.reduce((sum, item) => sum + item.total_price, 0);
    setForm(prev => ({ ...prev, total_amount: total }));
  };

  const handleVendorChange = (vendorId: number) => {
    const vendor = vendors.find(v => v.id === vendorId);
    if (vendor) {
      setForm(prev => ({
        ...prev,
        vendor_id: vendorId,
        vendor_name: vendor.name
      }));
    }
  };

  const handleProductSelect = (product: any) => {
    setNewItem(prev => ({
      ...prev,
      product_id: product.id,
      product_name: product.name,
      unit_price: product.rate_per_unit || 0
    }));
    setShowProductSearch(false);
    setProductSearch('');
    
    // Calculate total price when quantity or unit price changes
    const quantity = parseUnit(newItem.quantity);
    const totalPrice = (quantity.numericValue / 1000) * (product.rate_per_unit || 0);
    setNewItem(prev => ({ ...prev, total_price: totalPrice }));
  };

  const handleQuantityChange = (quantity: string) => {
    setNewItem(prev => {
      const quantityData = parseUnit(quantity);
      const totalPrice = (quantityData.numericValue / 1000) * prev.unit_price;
      return {
        ...prev,
        quantity,
        total_price: totalPrice
      };
    });
  };

  const handleUnitPriceChange = (unitPrice: number) => {
    setNewItem(prev => {
      const quantity = parseUnit(prev.quantity);
      const totalPrice = (quantity.numericValue / 1000) * unitPrice;
      return {
        ...prev,
        unit_price: unitPrice,
        total_price: totalPrice
      };
    });
  };

  const addItem = () => {
    if (!newItem.product_id || !newItem.quantity || newItem.unit_price <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Check if product already exists in items
    const existingItemIndex = form.items.findIndex(item => item.product_id === newItem.product_id);
    
    if (existingItemIndex !== -1) {
      // Update existing item
      const updatedItems = [...form.items];
      const existingItem = updatedItems[existingItemIndex];
      const existingQuantity = parseUnit(existingItem.quantity);
      const newQuantity = parseUnit(newItem.quantity);
      const totalQuantity = existingQuantity.numericValue + newQuantity.numericValue;
      
      // Convert back to unit format
      const kg = Math.floor(totalQuantity / 1000);
      const grams = totalQuantity % 1000;
      const combinedQuantity = grams > 0 ? `${kg}-${grams}` : `${kg}`;
      
      updatedItems[existingItemIndex] = {
        ...existingItem,
        quantity: combinedQuantity,
        unit_price: newItem.unit_price, // Use latest unit price
        total_price: existingItem.total_price + newItem.total_price,
        notes: existingItem.notes ? `${existingItem.notes}; ${newItem.notes}` : newItem.notes
      };
      
      setForm(prev => ({ ...prev, items: updatedItems }));
      toast.success('Item quantity updated');
    } else {
      // Add new item
      setForm(prev => ({
        ...prev,
        items: [...prev.items, { ...newItem }]
      }));
      toast.success('Item added to receiving list');
    }

    // Reset new item form
    setNewItem({
      product_id: 0,
      product_name: '',
      quantity: '0',
      unit_price: 0,
      total_price: 0,
      expiry_date: '',
      batch_number: '',
      notes: ''
    });
    setProductSearch('');
    setShowOptional(false);
  };

  const removeItem = (index: number) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
    toast.success('Item removed from receiving list');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.vendor_id) {
      toast.error('Please select a vendor');
      return;
    }
    
    if (form.items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    try {
      setSubmitting(true);
      
      await db.createStockReceiving({
        vendor_id: form.vendor_id,
        vendor_name: form.vendor_name,
        total_amount: form.total_amount,
        payment_amount: form.payment_amount,
        notes: form.notes,
        created_by: 'admin', // In real app, get from auth context
        items: form.items
      });

      toast.success('Stock receiving created successfully!');
      navigate('/stock/receiving');
    } catch (error) {
      console.error('Error creating stock receiving:', error);
      toast.error('Failed to create stock receiving');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    product.category.toLowerCase().includes(productSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-8 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="h-96 bg-gray-200 rounded-lg animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">New Stock Receiving</h1>
          <p className="mt-1 text-sm text-gray-500">Record stock received from vendors</p>
        </div>
        <button
          onClick={() => navigate('/stock/receiving')}
          className="btn btn-secondary flex items-center px-3 py-1.5 text-sm"
        >
          Back to List
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Vendor Selection */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Vendor Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Vendor <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => navigate('/vendors/new')}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  + Add New Vendor
                </button>
              </div>
              <select
                value={form.vendor_id}
                onChange={(e) => handleVendorChange(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                required
              >
                <option value="">Select Vendor</option>
                {vendors.map(vendor => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name} {vendor.company_name && `(${vendor.company_name})`}
                  </option>
                ))}
              </select>
              {vendors.length === 0 && (
                <p className="mt-1 text-sm text-gray-500">
                  No vendors found. <button type="button" onClick={() => navigate('/vendors/new')} className="text-blue-600 hover:text-blue-800 underline">Create your first vendor</button>
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Additional notes about this receiving..."
              />
            </div>
          </div>
        </div>

        {/* Add Items */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Add Items</h3>
          
          <div className="space-y-4">
            {/* Main row with essential fields */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Product <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={newItem.product_name || productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setShowProductSearch(true);
                      setNewItem(prev => ({ ...prev, product_name: '', product_id: 0 }));
                    }}
                    onFocus={() => setShowProductSearch(true)}
                    placeholder="Search products..."
                    className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                  
                  {showProductSearch && filteredProducts.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredProducts.map(product => (
                        <div
                          key={product.id}
                          onClick={() => handleProductSelect(product)}
                          className="px-3 py-2 hover:bg-gray-50 cursor-pointer"
                        >
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-gray-500">
                            {product.category} - Stock: {formatUnitString(product.current_stock, product.unit_type)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newItem.quantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  placeholder="e.g., 100 or 50-500"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Unit Price <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={newItem.unit_price}
                  onChange={(e) => handleUnitPriceChange(parseFloat(e.target.value) || 0)}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={addItem}
                  disabled={!newItem.product_id || !newItem.quantity || newItem.unit_price <= 0}
                  className="btn btn-primary w-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </button>
              </div>
            </div>

            {/* Total Price Display */}
            {newItem.total_price > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-700">Item Total:</span>
                  <span className="text-lg font-bold text-blue-900">
                    {formatCurrency(newItem.total_price)}
                  </span>
                </div>
              </div>
            )}

            {/* Optional Fields: Batch Number and Notes (Collapsible) */}
            <div>
              <button
                type="button"
                className="flex items-center w-full justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                onClick={() => setShowOptional((v) => !v)}
                aria-expanded={showOptional}
              >
                <span className="tracking-wide">Optional Details</span>
                <svg
                  className={`h-5 w-5 ml-2 transition-transform duration-200 ${showOptional ? 'rotate-90' : 'rotate-0'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 bg-white border-x border-b border-gray-200 rounded-b-lg ${showOptional ? 'max-h-[500px] p-4 opacity-100' : 'max-h-0 p-0 opacity-0'}`}
                style={{ pointerEvents: showOptional ? 'auto' : 'none' }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Batch Number</label>
                    <input
                      type="text"
                      value={newItem.batch_number}
                      onChange={(e) => setNewItem(prev => ({ ...prev, batch_number: e.target.value }))}
                      placeholder="Optional"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Item Notes</label>
                    <input
                      type="text"
                      value={newItem.notes}
                      onChange={(e) => setNewItem(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Optional notes for this item"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Items List */}
        {form.items.length > 0 && (
          <div className="card p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">Items to Receive ({form.items.length})</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Unit Price</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Price</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Batch</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {form.items.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{item.product_name}</div>
                        {item.notes && (
                          <div className="text-sm text-gray-500">{item.notes}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatUnitString(item.quantity, 'kg-grams')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {formatCurrency(item.total_price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.batch_number || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="btn btn-danger flex items-center px-2 py-1 text-xs"
                          title="Remove Item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Total Amount:</span>
                <span className="text-xl font-bold text-gray-900">
                  {formatCurrency(form.total_amount)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Payment Information */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Payment Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Payment Amount
              </label>
              <input
                type="number"
                value={form.payment_amount}
                onChange={(e) => setForm(prev => ({ ...prev, payment_amount: parseFloat(e.target.value) || 0 }))}
                step="0.01"
                min="0"
                max={form.total_amount}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              <p className="mt-1 text-sm text-gray-500">
                Leave 0 for no immediate payment
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Remaining Balance
              </label>
              <input
                type="text"
                value={formatCurrency(form.total_amount - form.payment_amount)}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
              {form.total_amount - form.payment_amount > 0 && (
                <div className="mt-2 p-3 bg-orange-50 text-orange-700 rounded-lg text-sm">
                  ⚠ This will be marked as partial payment
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/stock/receiving')}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || form.items.length === 0}
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating...' : 'Create Receiving'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StockReceivingNew;