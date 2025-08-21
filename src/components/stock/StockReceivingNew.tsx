import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Search } from 'lucide-react';
import { db } from '../../services/database';
import { eventBus } from '../../utils/eventBus';
import { formatCurrency, formatDate, formatTime } from '../../utils/formatters';
import { getCurrentSystemDateTime } from '../../utils/systemDateTime';
import { parseUnit, formatUnitString } from '../../utils/unitUtils';
import toast from 'react-hot-toast';
import { useActivityLogger } from '../../hooks/useActivityLogger';

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
  truck_number?: string;
  reference_number?: string;
  items: StockReceivingItem[];
}

const StockReceivingNew: React.FC = () => {
  const navigate = useNavigate();
  const activityLogger = useActivityLogger();
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
    truck_number: '',
    reference_number: '',
    items: []
  });

  const [newItem, setNewItem] = useState<StockReceivingItem>({
    product_id: 0,
    product_name: '',
    quantity: '',
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
    const handleKeyboardShortcuts = (e: KeyboardEvent) => {
      // Handle Ctrl+S - some users might be pressing this thinking it will save/update
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault(); // Prevent browser save dialog
        console.log('⚠️ Ctrl+S pressed - Stock should auto-update when you create the receiving!');
        toast.success('Stock automatically updates when you create the receiving - no need to press Ctrl+S!');
        return;
      }

      // Handle Escape key
      if (e.key === 'Escape') {
        setShowProductSearch(false);
      }
    };

    document.addEventListener('keydown', handleKeyboardShortcuts);
    return () => document.removeEventListener('keydown', handleKeyboardShortcuts);
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

    // Auto-calculate if quantity exists
    if (newItem.quantity) {
      const quantity = parseUnit(newItem.quantity);
      const totalPrice = (quantity.numericValue / 1000) * (product.rate_per_unit || 0);
      setNewItem(prev => ({ ...prev, total_price: totalPrice }));
    }
  };

  const handleQuantityChange = (quantity: string) => {
    try {
      const quantityData = parseUnit(quantity);
      const totalPrice = (quantityData.numericValue / 1000) * newItem.unit_price;
      setNewItem(prev => ({
        ...prev,
        quantity,
        total_price: totalPrice
      }));
    } catch (error) {
      setNewItem(prev => ({
        ...prev,
        quantity,
        total_price: 0
      }));
    }
  };

  const handleUnitPriceChange = (unitPrice: number) => {
    try {
      const quantity = parseUnit(newItem.quantity);
      const totalPrice = (quantity.numericValue / 1000) * unitPrice;
      setNewItem(prev => ({
        ...prev,
        unit_price: unitPrice,
        total_price: totalPrice
      }));
    } catch (error) {
      setNewItem(prev => ({
        ...prev,
        unit_price: unitPrice,
        total_price: 0
      }));
    }
  };

  const addItem = () => {
    if (!newItem.product_id || !newItem.quantity || newItem.unit_price <= 0) {
      toast.error('Please fill in Product, Quantity and Unit Price');
      return;
    }

    const existingItemIndex = form.items.findIndex(item => item.product_id === newItem.product_id);

    if (existingItemIndex !== -1) {
      // Update existing item
      const updatedItems = [...form.items];
      const existingItem = updatedItems[existingItemIndex];

      try {
        const existingQuantity = parseUnit(existingItem.quantity);
        const newQuantity = parseUnit(newItem.quantity);
        const totalQuantity = existingQuantity.numericValue + newQuantity.numericValue;

        const kg = Math.floor(totalQuantity / 1000);
        const grams = totalQuantity % 1000;
        const combinedQuantity = grams > 0 ? `${kg}-${grams}` : `${kg}`;

        updatedItems[existingItemIndex] = {
          ...existingItem,
          quantity: combinedQuantity,
          unit_price: newItem.unit_price,
          total_price: existingItem.total_price + newItem.total_price,
          notes: existingItem.notes && newItem.notes ? `${existingItem.notes}; ${newItem.notes}` : existingItem.notes || newItem.notes
        };

        setForm(prev => ({ ...prev, items: updatedItems }));
        toast.success('Item quantity updated');
      } catch (error) {
        toast.error('Error updating item quantity');
        return;
      }
    } else {
      setForm(prev => ({
        ...prev,
        items: [...prev.items, { ...newItem }]
      }));
      toast.success('Item added');
    }

    // Reset form
    setNewItem({
      product_id: 0,
      product_name: '',
      quantity: '',
      unit_price: 0,
      total_price: 0,
      expiry_date: '',
      batch_number: '',
      notes: ''
    });
    setProductSearch('');
  };

  const removeItem = (index: number) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
    toast.success('Item removed');
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

      // Enhanced stock receiving creation with proper payment integration
      const result = await db.createStockReceiving({
        vendor_id: form.vendor_id,
        vendor_name: form.vendor_name,
        total_amount: form.total_amount,
        payment_amount: form.payment_amount,
        payment_method: form.payment_amount > 0 ? 'cash' : undefined,
        notes: form.notes,
        truck_number: form.truck_number,
        reference_number: form.reference_number,
        created_by: 'admin',
        items: form.items
      });

      console.log('📦 Stock receiving created with ID:', result);

      // CRITICAL FIX 1: Log activity for activity logger
      try {
        await activityLogger.logStockReceivingCreated(result, form.vendor_name, form.total_amount);
        console.log('✅ Activity logged successfully');
      } catch (activityError) {
        console.error('⚠️ Activity logging failed:', activityError);
        // Don't fail the whole operation for activity logging
      }

      // CRITICAL FIX 2: Create payment if payment_amount > 0
      if (form.payment_amount > 0) {
        try {
          console.log('💰 Creating vendor payment for amount:', form.payment_amount);

          // Get default payment channel (Cash)
          const paymentChannels = await db.getPaymentChannels();
          const defaultChannel = paymentChannels.find(c => c.name.toLowerCase() === 'cash') || paymentChannels[0];

          if (defaultChannel) {
            await db.createVendorPayment({
              vendor_id: form.vendor_id,
              vendor_name: form.vendor_name,
              receiving_id: result,
              amount: form.payment_amount,
              payment_channel_id: defaultChannel.id,
              payment_channel_name: defaultChannel.name,
              reference_number: form.reference_number || `Stock Receiving #${result}`,
              notes: `Payment for stock receiving from ${form.vendor_name}`,
              date: getCurrentSystemDateTime().dbDate,
              time: getCurrentSystemDateTime().dbTime,
              created_by: 'admin'
            });
            console.log('✅ Vendor payment created successfully');
          } else {
            console.warn('⚠️ No payment channels found - payment not recorded');
          }
        } catch (paymentError) {
          console.error('❌ Failed to create vendor payment:', paymentError);
          toast.error('Stock receiving created but payment recording failed');
        }
      }

      // CRITICAL FIX 3: Force real-time updates for Business Finance and dashboard
      try {
        // Import and clear finance service cache
        const { financeService } = await import('../../services/financeService');
        financeService.clearCache();

        // Import BUSINESS_EVENTS for consistent event naming
        const { BUSINESS_EVENTS } = await import('../../utils/eventBus');

        // Emit events for real-time updates using proper event system
        // Use statically imported eventBus for all emits
        eventBus.emit('STOCK_RECEIVING_COMPLETED', {
          receivingId: result,
          vendorId: form.vendor_id,
          vendorName: form.vendor_name,
          totalAmount: form.total_amount,
          paymentAmount: form.payment_amount
        });

        // Emit stock updated events for each product to trigger UI refresh
        form.items.forEach(item => {
          eventBus.emit(BUSINESS_EVENTS.STOCK_UPDATED, {
            productId: item.product_id,
            productName: item.product_name,
            type: 'receiving',
            receivingId: result,
            quantityAdded: item.quantity
          });
        });

        // Emit stock movement event
        eventBus.emit(BUSINESS_EVENTS.STOCK_MOVEMENT_CREATED, {
          type: 'receiving',
          receivingId: result,
          products: form.items.map(item => ({
            productId: item.product_id,
            productName: item.product_name,
            quantity: item.quantity
          }))
        });

        if (form.payment_amount > 0) {
          eventBus.emit('VENDOR_PAYMENT_RECORDED', {
            vendorId: form.vendor_id,
            amount: form.payment_amount,
            receivingId: result
          });
        }

        eventBus.emit('BUSINESS_FINANCE_UPDATE', {
          reason: 'stock_receiving',
          vendorPurchase: form.total_amount,
          vendorPayment: form.payment_amount
        });

        console.log('✅ Real-time events emitted for dashboard update (with correct BUSINESS_EVENTS)');

        // CRITICAL FIX 4: Force immediate UI refresh for all stock-related components
        setTimeout(() => {
          console.log('🔄 Forcing immediate UI refresh after stock receiving');

          // Emit additional refresh events for any components that might be missed
          eventBus.emit('UI_REFRESH_REQUESTED', { type: 'stock_update' });
          eventBus.emit('PRODUCTS_UPDATED', { reason: 'stock_receiving' });

          // Force reload of product data in all components
          eventBus.emit('FORCE_PRODUCT_RELOAD', {
            reason: 'stock_receiving_completed',
            affectedProducts: form.items.map(item => item.product_id)
          });

          // Clear any local storage or session storage that might cache product data
          try {
            localStorage.removeItem('product_cache');
            localStorage.removeItem('stock_data_cache');
            sessionStorage.removeItem('product_list_cache');
            console.log('🧹 Local/session storage caches cleared');
          } catch (storageError) {
            console.log('ℹ️ Storage cache clearing skipped');
          }

        }, 100);

        // CRITICAL FIX 5: Force page refresh for components that might not respond to events
        setTimeout(() => {
          console.log('🔄 Emitting comprehensive refresh events');
          eventBus.emit('COMPREHENSIVE_DATA_REFRESH', {
            type: 'stock_receiving',
            timestamp: getCurrentSystemDateTime().dateTime
          });
        }, 500);

      } catch (eventError) {
        console.error('⚠️ Event emission failed:', eventError);
      }

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
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Add Stock Receiving</h1>
          <p className="mt-1 text-sm text-gray-500">Record stock received from vendors</p>
        </div>
        <button
          onClick={() => navigate('/stock/receiving')}
          className="btn btn-secondary flex items-center px-3 py-1.5 text-sm"
        >
          Back to List
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
        {/* Step 1: Vendor Selection - Simple Card */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">1. Select Vendor</h3>

          <div className="max-w-md">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700">
                Choose Vendor <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => navigate('/vendors/new')}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                + Add New
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
        </div>

        {/* Step 2: Add Items - Clean Layout */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">2. Add Items</h3>

          {/* Simple Add Item Form */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              {/* Product Search */}
              <div className="md:col-span-2 relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
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
                    <div className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredProducts.map(product => (
                        <div
                          key={product.id}
                          onClick={() => handleProductSelect(product)}
                          className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-sm">{product.name}</div>
                          <div className="text-xs text-gray-500">
                            {product.category} • Current: {formatUnitString(product.current_stock, product.unit_type)} • Rate: {formatCurrency(product.rate_per_unit)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="text"
                  value={newItem.quantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  placeholder="e.g., 100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Unit Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                <input
                  type="number"
                  value={newItem.unit_price}
                  onChange={(e) => handleUnitPriceChange(parseFloat(e.target.value) || 0)}
                  step="0.1"
                  min="0"
                  placeholder="0.0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Add Button */}
              <div>
                <button
                  type="button"
                  onClick={addItem}
                  disabled={!newItem.product_id || !newItem.quantity || newItem.unit_price <= 0}
                  className="btn btn-primary w-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </button>
              </div>
            </div>

            {/* Show calculated total for current item */}
            {newItem.total_price > 0 && (
              <div className="mt-3 text-right">
                <span className="text-sm text-gray-600">Item Total: </span>
                <span className="text-lg font-semibold text-blue-600">
                  {formatCurrency(newItem.total_price)}
                </span>
              </div>
            )}
          </div>

          {/* Items List - Simple Table */}
          {form.items.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-700">
                  Added Items ({form.items.length})
                </span>
              </div>

              <div className="divide-y divide-gray-200">
                {form.items.map((item, index) => (
                  <div key={index} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{item.product_name}</div>
                      <div className="text-sm text-gray-500">
                        {formatUnitString(item.quantity, 'kg-grams')} × {formatCurrency(item.unit_price)} = {formatCurrency(item.total_price)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="ml-4 p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                      title="Remove Item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="bg-blue-50 px-4 py-3 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Total Amount:</span>
                  <span className="text-xl font-bold text-blue-600">
                    {formatCurrency(form.total_amount)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Payment & Additional Details - Simple Layout */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">3. Payment & Additional Details</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Amount (Optional)
              </label>
              <input
                type="number"
                value={form.payment_amount}
                onChange={(e) => setForm(prev => ({ ...prev, payment_amount: parseFloat(e.target.value) || 0 }))}
                step="0.1"
                min="0"
                max={form.total_amount}
                placeholder="0.0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              <p className="mt-1 text-sm text-gray-500">
                Leave empty if paying later
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                placeholder="Additional notes..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Optional Fields - Collapsible */}
          <div className="mt-6">
            <button
              type="button"
              className="flex items-center w-full justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              onClick={() => setShowOptional(!showOptional)}
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Truck/Vehicle Number</label>
                  <input
                    type="text"
                    value={form.truck_number || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, truck_number: e.target.value }))}
                    placeholder="e.g., ABC-123"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Reference Number</label>
                  <input
                    type="text"
                    value={form.reference_number || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, reference_number: e.target.value }))}
                    placeholder="Invoice/PO reference"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Preview */}
          {form.total_amount > 0 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Total Amount:</span>
                  <span className="font-semibold">{formatCurrency(form.total_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Now:</span>
                  <span className="font-semibold">{formatCurrency(form.payment_amount)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-1">
                  <span>Remaining Balance:</span>
                  <span className="font-semibold text-orange-600">
                    {formatCurrency(form.total_amount - form.payment_amount)}
                  </span>
                </div>
                {form.truck_number && (
                  <div className="flex justify-between text-xs text-gray-600 pt-1 border-t border-gray-200">
                    <span>Truck/Vehicle:</span>
                    <span>{form.truck_number}</span>
                  </div>
                )}
                {form.reference_number && (
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Reference:</span>
                    <span>{form.reference_number}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions - Simple Button Layout */}
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
            disabled={submitting || form.items.length === 0 || !form.vendor_id}
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