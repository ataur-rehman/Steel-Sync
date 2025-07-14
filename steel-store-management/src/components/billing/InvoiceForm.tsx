// Helper: Convert a number (grams) to 'kg-grams' string (e.g., 1756200 -> '1756-200')
  const numberToKgGramsString = (value: number): string => {
    if (typeof value !== 'number' || isNaN(value)) return '0-0';
    const kg = Math.floor(value / 1000);
    const grams = Math.round(value % 1000);
    return `${kg}-${grams}`;
  };
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '../../services/database';
import toast from 'react-hot-toast';
import { formatUnitString, parseUnit, hasSufficientStock, getStockAsNumber, getAlertLevelAsNumber } from '../../utils/unitUtils';
import { parseCurrency, roundCurrency, addCurrency, subtractCurrency } from '../../utils/currency';
import { calculateTotal, calculateDiscount } from '../../utils/calculations';
import { 
  Search, 
  Trash2, 
  User, 
  Package, 
  Calculator,
  AlertTriangle,
  CheckCircle,
  X,
  Eye,
  History,
  ShoppingCart,
  TrendingDown,
  RefreshCw
} from 'lucide-react';

// Enhanced interfaces with stock tracking
interface Customer {
  id: number;
  name: string;
  phone?: string;
  address?: string;
  cnic?: string;
  balance: number;
}

interface Product {
  id: number;
  name: string;
  unit_type?: 'kg-grams' | 'piece' | 'bag' | 'kg'; // Unit type determines how unit and stock are handled
  unit: string; // Now stores the unit format like "1600-60"
  rate_per_unit: number;
  current_stock: string; // Now stores stock in same unit format
  min_stock_alert: string; // Alert level in same unit format
  size?: string;
  grade?: string;
}

interface InvoiceItem {
  id: string;
  product_id: number;
  product_name: string;
  quantity: string; // Changed to string to support kg-grams format like "155-20"
  unit_price: number;
  total_price: number;
  unit: string;
  available_stock: number;
  unit_type?: string; // Add unit_type to track the product's unit format
}

interface InvoiceFormData {
  customer_id: number | null;
  items: InvoiceItem[];
  discount: number;
  payment_amount: number;
  payment_method: string;
  notes: string;
}

interface StockPreview {
  product_id: number;
  product_name: string;
  current_stock: number;
  ordered_quantity: number;
  new_stock: number;
  status: 'ok' | 'low' | 'insufficient';
}

// Payment methods
const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'card', label: 'Card Payment' }
];

const InvoiceForm: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Helper function to convert quantity string to numeric value for calculations
  const getQuantityAsNumber = (quantityString: string, unitType?: string): number => {
    try {
      const parsed = parseUnit(quantityString, unitType as any || 'kg-grams');
      // CRITICAL FIX: Use raw numericValue consistently across all unit types
      // This ensures compatibility with getStockAsNumber and all database operations
      return parsed.numericValue;
    } catch {
      // Fallback: try to parse as a simple number
      const numericValue = parseFloat(quantityString);
      return isNaN(numericValue) ? 0 : numericValue;
    }
  };

  // Helper function to check if stock is sufficient
  const isStockSufficient = (currentStock: string, requiredQuantity: string, unitType?: string): boolean => {
    return hasSufficientStock(currentStock, requiredQuantity, unitType as any || 'kg-grams');
  };

  // State management
  const [formData, setFormData] = useState<InvoiceFormData>({
    customer_id: null,
    items: [],
    discount: 0,
    payment_amount: 0,
    payment_method: 'cash',
    notes: ''
  });

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [stockPreview, setStockPreview] = useState<StockPreview[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showStockWarning, setShowStockWarning] = useState(false);

  // Initialize data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Handle pre-selected customer from other components
  useEffect(() => {
    const state = location.state as any;
    if (state?.customerId && customers.length > 0) {
      const customer = customers.find(c => c.id === state.customerId);
      if (customer) {
        selectCustomer(customer);
        setCustomerSearch(customer.name);
      }
    }
  }, [location.state, customers]);

  // Update stock preview when items change
  useEffect(() => {
    updateStockPreview();
  }, [formData.items, products]);

  const loadInitialData = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      await db.initialize();
      
      const [customerList, productList] = await Promise.all([
        db.getCustomers(),
        db.getProducts()
      ]);
      
      setCustomers(customerList);
      setProducts(productList);
      setFilteredCustomers(customerList);
      setFilteredProducts(productList);
      
      console.log('Loaded data:', { customers: customerList.length, products: productList.length });
      console.log('Current product stocks:', productList.map((p: Product) => `${p.name}: ${p.current_stock}`));
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load data');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // CRITICAL FIX: Add refresh function to sync with latest stock data
  const refreshProductData = async () => {
    try {
      setRefreshing(true);
      const productList = await db.getProducts();
      setProducts(productList);
      setFilteredProducts(productList);
      
      // Update available stock in current items
      const updatedItems = formData.items.map((item: InvoiceItem) => {
        const updatedProduct = productList.find((p: Product) => p.id === item.product_id);
        if (updatedProduct) {
          const stockData = parseUnit(updatedProduct.current_stock, updatedProduct.unit_type || 'kg-grams');
          return {
            ...item,
            available_stock: stockData.numericValue || 0
          };
        }
        return item;
      });
      
      setFormData(prev => ({ ...prev, items: updatedItems }));
      
      console.log('Product data refreshed:', productList.map((p: Product) => `${p.name}: ${p.current_stock}`));
      toast.success('Product stock data refreshed');
    } catch (error) {
      console.error('Failed to refresh product data:', error);
      toast.error('Failed to refresh product data');
    } finally {
      setRefreshing(false);
    }
  };

  const updateStockPreview = () => {
    const previews: StockPreview[] = [];
    
    formData.items.forEach(item => {
      const product = products.find(p => p.id === item.product_id);
      if (product) {
        const newStock = getStockAsNumber(product.current_stock, product.unit_type) - getQuantityAsNumber(item.quantity, product.unit_type);
        let status: 'ok' | 'low' | 'insufficient' = 'ok';
        
        if (newStock < 0) {
          status = 'insufficient';
        } else if (newStock <= getAlertLevelAsNumber(product.min_stock_alert, product.unit_type)) {
          status = 'low';
        }
        
        previews.push({
          product_id: item.product_id,
          product_name: item.product_name,
          current_stock: getStockAsNumber(product.current_stock, product.unit_type),
          ordered_quantity: getQuantityAsNumber(item.quantity, product.unit_type),
          new_stock: Math.max(0, newStock),
          status
        });
      }
    });
    
    setStockPreview(previews);
    setShowStockWarning(previews.some(p => p.status === 'insufficient' || p.status === 'low'));
  };

  // Customer search and selection
  const handleCustomerSearch = useCallback((query: string) => {
    setCustomerSearch(query);
    if (query.trim() === '') {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer =>
        customer.name.toLowerCase().includes(query.toLowerCase()) ||
        customer.phone?.includes(query) ||
        customer.cnic?.includes(query)
      );
      setFilteredCustomers(filtered);
    }
    setShowCustomerDropdown(true);
  }, [customers]);

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData(prev => ({ ...prev, customer_id: customer.id }));
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
    setErrors(prev => ({ ...prev, customer_id: '' }));
  };

  // Product search and filtering
  const handleProductSearch = useCallback((query: string) => {
    setProductSearch(query);
    if (query.trim() === '') {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(query.toLowerCase()) ||
        product.name.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  }, [products]);

  // Calculate totals with proper currency precision
  const calculations = React.useMemo(() => {
    // For kg-grams, recalculate total as (kg + grams/1000) * unit_price
    const getItemTotal = (item: InvoiceItem) => {
      if (item.unit_type === 'kg-grams') {
        const parsed = parseUnit(item.quantity, 'kg-grams');
        const kg = typeof parsed.kg === 'number' ? parsed.kg : 0;
        const grams = typeof parsed.grams === 'number' ? parsed.grams : 0;
        return (kg + grams / 1000) * item.unit_price;
      }
      return getQuantityAsNumber(item.quantity, item.unit_type) * item.unit_price;
    };
    // Use reduce with proper currency addition for subtotal
    const subtotal = formData.items.reduce((sum, item) => addCurrency(sum, getItemTotal(item)), 0);
    // Calculate discount amount using proper currency multiplication
    const discountAmount = calculateDiscount(subtotal, formData.discount);
    // Calculate grand total using proper currency subtraction
    const grandTotal = subtractCurrency(subtotal, discountAmount);
    // Calculate remaining balance using proper currency subtraction
    const remainingBalance = subtractCurrency(grandTotal, formData.payment_amount);
    return {
      subtotal: roundCurrency(subtotal),
      discountAmount: roundCurrency(discountAmount),
      grandTotal: roundCurrency(grandTotal),
      remainingBalance: roundCurrency(remainingBalance)
    };
  }, [formData.items, formData.discount, formData.payment_amount]);

  // CRITICAL FIX: Enhanced product addition with real-time stock validation
  const addProduct = (product: Product) => {
    // Get current stock from latest products state
    const currentProduct = products.find(p => p.id === product.id);
    if (!currentProduct) {
      toast.error('Product not found in current inventory');
      return;
    }

    const existingItemIndex = formData.items.findIndex(item => item.product_id === product.id);
    
    if (existingItemIndex >= 0) {
      // Update existing item quantity
      const newItems = [...formData.items];
      const currentQuantity = getQuantityAsNumber(newItems[existingItemIndex].quantity, currentProduct.unit_type);
      const newQuantityNum = currentQuantity + 1;
      const newQuantity = newQuantityNum.toString();
      
      if (!isStockSufficient(currentProduct.current_stock, newQuantity, currentProduct.unit_type)) {
        toast.error(`Cannot add more. Only ${formatUnitString(currentProduct.current_stock, currentProduct.unit_type || 'kg-grams')} available.`);
        return;
      }
      
      newItems[existingItemIndex] = {
        ...newItems[existingItemIndex],
        quantity: newQuantity,
        total_price: calculateTotal(newQuantityNum, currentProduct.rate_per_unit),
        available_stock: getStockAsNumber(currentProduct.current_stock, currentProduct.unit_type || 'kg-grams'),
        unit_type: currentProduct.unit_type
      };
      
      setFormData(prev => ({ ...prev, items: newItems }));
    } else {
      // Add new item
      if (getStockAsNumber(currentProduct.current_stock, currentProduct.unit_type) < 1) {
        toast.error(`${currentProduct.name} is out of stock`);
        return;
      }
      
      const newItem: InvoiceItem = {
        id: `item_${Date.now()}_${Math.random()}`,
        product_id: currentProduct.id,
        product_name: currentProduct.name,
        quantity: "1",
        unit_price: currentProduct.rate_per_unit,
        total_price: calculateTotal(1, currentProduct.rate_per_unit),
        unit: currentProduct.unit,
        available_stock: getStockAsNumber(currentProduct.current_stock, currentProduct.unit_type),
        unit_type: currentProduct.unit_type
      };
      
      setFormData(prev => ({ 
        ...prev, 
        items: [...prev.items, newItem] 
      }));
    }
    
    setProductSearch('');
    setShowProductDropdown(false);
    toast.success(`${currentProduct.name} added to invoice`);
  };

  // CRITICAL FIX: Enhanced quantity update with real-time stock validation
  const updateItemQuantity = (itemId: string, newQuantityString: string) => {
    if (!newQuantityString || newQuantityString.trim() === '') {
      removeItem(itemId);
      return;
    }
    const newItems = formData.items.map(item => {
      if (item.id === itemId) {
        // Get current stock from latest products state
        const currentProduct = products.find(p => p.id === item.product_id);
        if (!currentProduct) return item;
        // Validate the new quantity
        if (!isStockSufficient(currentProduct.current_stock, newQuantityString, currentProduct.unit_type)) {
          toast.error(`Cannot exceed available stock (${formatUnitString(currentProduct.current_stock, currentProduct.unit_type || 'kg-grams')})`);
          return item;
        }
        const newQuantityNum = getQuantityAsNumber(newQuantityString, currentProduct.unit_type);
        const availableStock = getStockAsNumber(currentProduct.current_stock, currentProduct.unit_type || 'kg-grams');
        let newTotalPrice = 0;
        if (currentProduct.unit_type === 'kg-grams') {
          const parsed = parseUnit(newQuantityString, 'kg-grams');
          const kg = typeof parsed.kg === 'number' ? parsed.kg : 0;
          const grams = typeof parsed.grams === 'number' ? parsed.grams : 0;
          newTotalPrice = (kg + grams / 1000) * item.unit_price;
        } else {
          newTotalPrice = newQuantityNum * item.unit_price;
        }
        return {
          ...item,
          quantity: newQuantityString,
          total_price: newTotalPrice,
          available_stock: availableStock,
          unit_type: currentProduct.unit_type
        };
      }
      return item;
    });
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  // Update item unit price
  const updateItemPrice = (itemId: string, newPrice: number) => {
    const newItems = formData.items.map(item => {
      if (item.id === itemId) {
        const currentProduct = products.find(p => p.id === item.product_id);
        let newTotalPrice = 0;
        if (currentProduct?.unit_type === 'kg-grams') {
          const parsed = parseUnit(item.quantity, 'kg-grams');
          const kg = typeof parsed.kg === 'number' ? parsed.kg : 0;
          const grams = typeof parsed.grams === 'number' ? parsed.grams : 0;
          newTotalPrice = (kg + grams / 1000) * newPrice;
        } else {
          const quantityNum = getQuantityAsNumber(item.quantity, currentProduct?.unit_type);
          newTotalPrice = quantityNum * newPrice;
        }
        return {
          ...item,
          unit_price: newPrice,
          total_price: newTotalPrice
        };
      }
      return item;
    });
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  // Remove item
  const removeItem = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };

  // CRITICAL FIX: Enhanced validation with stock checking
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.customer_id) {
      newErrors.customer_id = 'Please select a customer';
    }
    
    if (formData.items.length === 0) {
      newErrors.items = 'Please add at least one item';
    }
    
    if (formData.discount < 0 || formData.discount > 100) {
      newErrors.discount = 'Discount must be between 0 and 100%';
    }
    
    if (formData.payment_amount < 0) {
      newErrors.payment_amount = 'Payment amount cannot be negative';
    }
    
    if (formData.payment_amount > calculations.grandTotal) {
      newErrors.payment_amount = 'Payment cannot exceed invoice total';
    }
    
    // CRITICAL: Validate current stock availability against latest data
    const stockIssues: string[] = [];
    formData.items.forEach(item => {
      const currentProduct = products.find(p => p.id === item.product_id);
      if (currentProduct && !isStockSufficient(currentProduct.current_stock, item.quantity, currentProduct.unit_type)) {
        stockIssues.push(`${item.product_name} (Required: ${formatUnitString(item.quantity, currentProduct.unit_type || 'kg-grams')}, Available: ${formatUnitString(currentProduct.current_stock, currentProduct.unit_type || 'kg-grams')})`);
      }
    });
    
    if (stockIssues.length > 0) {
      newErrors.stock = `Insufficient stock for: ${stockIssues.join(', ')}`;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

// Enhanced product selection with register link
// Removed ProductDropdownItem component since it's not used  

// CRITICAL FIX: Enhanced invoice submission with stock synchronization
  const handleSubmit = async () => {
    // Refresh product data before validation to ensure latest stock levels
    await refreshProductData();
    
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }
    
    setCreating(true);
    
    try {
      const invoiceData = {
        customer_id: formData.customer_id!,
        customer_name: selectedCustomer?.name,
        items: formData.items.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity, // Keep as string for database
          unit_price: item.unit_price,
          total_price: item.total_price
        })),
        discount: formData.discount,
        payment_amount: formData.payment_amount,
        payment_method: formData.payment_method,
        notes: formData.notes
      };
      
      console.log('Creating invoice with automatic stock tracking:', invoiceData);
      const result = await db.createInvoice(invoiceData);
      
      // CRITICAL: Trigger refresh events for all related components
      import('../../utils/eventBus').then(({ triggerInvoiceCreatedRefresh }) => {
        triggerInvoiceCreatedRefresh(result);
      });
      
      toast.success(`Invoice created successfully! Bill Number: ${result.bill_number}`, {
        duration: 5000
      });
      
      // Show stock deduction summary
      const stockSummary = stockPreview.map(p => 
        `${p.product_name}: ${p.current_stock} → ${p.new_stock} (${p.ordered_quantity} sold)`
      ).join('\n');
      
      toast.success(`Stock Updated:\n${stockSummary}`, {
        duration: 8000
      });
      
      // Reset form
      resetForm();
      
      // Refresh product data to show updated stock
      await loadInitialData(false);
      
    } catch (error: any) {
      console.error('Invoice creation error:', error);
      toast.error(`Failed to create invoice: ${error.message || error}`);
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      customer_id: null,
      items: [],
      discount: 0,
      payment_amount: 0,
      payment_method: 'cash',
      notes: ''
    });
    setSelectedCustomer(null);
    setCustomerSearch('');
    setProductSearch('');
    setStockPreview([]);
    setErrors({});
  };

  const viewCustomerLedger = () => {
    if (selectedCustomer) {
      navigate('/reports/customer', {
        state: { customerId: selectedCustomer.id }
      });
    }
  };

  const viewStockReport = () => {
    navigate('/reports/stock');
  };

  // CRITICAL FIX: Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowCustomerDropdown(false);
      setShowProductDropdown(false);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Create New Invoice</h1>
          <p className="mt-1 text-sm text-gray-500">
            Generate invoice with automatic stock tracking and real-time validation
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={refreshProductData}
            disabled={refreshing}
            className="flex items-center px-3 py-2 border border-blue-300 rounded-lg text-blue-700 hover:bg-blue-50 text-sm"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Stock
          </button>
          
          <button
            onClick={viewStockReport}
            className="flex items-center px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
          >
            <Package className="h-4 w-4 mr-1" />
            Stock Report
          </button>
          
          {selectedCustomer && (
            <button
              onClick={viewCustomerLedger}
              className="flex items-center px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
            >
              <History className="h-4 w-4 mr-1" />
              Customer History
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Customer Selection */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <User className="h-5 w-5 mr-2" />
            Customer Information
          </h3>
          
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Customer *
            </label>
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => handleCustomerSearch(e.target.value)}
                onFocus={() => setShowCustomerDropdown(true)}
                placeholder="Search customers by name, phone, or CNIC..."
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.customer_id ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              <Search className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
            
            {errors.customer_id && (
              <p className="mt-1 text-sm text-red-600">{errors.customer_id}</p>
            )}
            
            {/* Customer Dropdown */}
            {showCustomerDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map(customer => (
                    <div
                      key={customer.id}
                      onClick={() => selectCustomer(customer)}
                      className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900">{customer.name}</div>
                      <div className="text-sm text-gray-600">
                        {customer.phone} • Balance: Rs. {customer.balance.toFixed(2)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-gray-500 text-center">No customers found</div>
                )}
              </div>
            )}
          </div>
          
          {/* Selected Customer Display */}
          {selectedCustomer && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-blue-900">{selectedCustomer.name}</h4>
                  <p className="text-sm text-blue-700">
                    {selectedCustomer.phone} • Current Balance: Rs. {selectedCustomer.balance.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={viewCustomerLedger}
                    className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View History
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCustomer(null);
                      setFormData(prev => ({ ...prev, customer_id: null }));
                      setCustomerSearch('');
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Product Selection & Items */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Invoice Items
          </h3>
          
          {/* Product Search */}
          <div className="relative mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Products
            </label>
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={productSearch}
                onChange={(e) => {
                  handleProductSearch(e.target.value);
                  setShowProductDropdown(true);
                }}
                onFocus={() => setShowProductDropdown(true)}
                placeholder="Search products by name or category..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <Search className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
            
            {/* Product Dropdown */}
            {showProductDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map(product => (
                    <div
                      key={product.id}
                      onClick={() => addProduct(product)}
                      className={`p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                        getStockAsNumber(product.current_stock, product.unit_type) === 0 ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-600">
                            {product.size ? `${product.size} • ` : ''}Rs. {product.rate_per_unit.toFixed(2)}/{formatUnitString(product.unit, product.unit_type || 'kg-grams')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-medium ${
                            getStockAsNumber(product.current_stock, product.unit_type) <= getAlertLevelAsNumber(product.min_stock_alert, product.unit_type)
                              ? 'text-red-600' 
                              : 'text-green-600'
                          }`}>
                            {formatUnitString(product.current_stock, product.unit_type || 'kg-grams')}
                          </div>
                          {getStockAsNumber(product.current_stock, product.unit_type) === 0 && (
                            <div className="text-xs text-red-500">Out of Stock</div>
                          )}
                          {getStockAsNumber(product.current_stock, product.unit_type) <= getAlertLevelAsNumber(product.min_stock_alert, product.unit_type) && getStockAsNumber(product.current_stock, product.unit_type) > 0 && (
                            <div className="text-xs text-yellow-600">Low Stock</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-gray-500 text-center">No products found</div>
                )}
              </div>
            )}
          </div>
          
          {/* Stock Warning */}
          {showStockWarning && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">Stock Alert</h4>
                  <div className="mt-2 text-sm text-yellow-700">
                    {stockPreview.filter(p => p.status === 'insufficient').map(p => (
                      <div key={p.product_id} className="text-red-600">
                        ⚠️ {p.product_name}: Insufficient stock (Available: {p.current_stock}, Ordered: {p.ordered_quantity})
                      </div>
                    ))}
                    {stockPreview.filter(p => p.status === 'low').map(p => (
                      <div key={p.product_id} className="text-yellow-600">
                        ⚡ {p.product_name}: Will be low stock after sale ({p.new_stock} remaining)
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {errors.items && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                {errors.items}
              </p>
            </div>
          )}
          
          {errors.stock && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                {errors.stock}
              </p>
            </div>
          )}
          
          {/* Invoice Items Table */}
          {formData.items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock Impact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {formData.items.map((item) => {
                    const stockInfo = stockPreview.find(p => p.product_id === item.product_id);
                    // Helper for formatted quantity display
                    const getDisplayValue = (val: number, unitType?: string) =>
                      unitType === 'kg-grams'
                        ? formatUnitString(numberToKgGramsString(val), unitType as 'kg-grams')
                        : formatUnitString(val.toString(), unitType as any);
                    // Show formatted available stock
                    const formattedAvailableStock = getDisplayValue(item.available_stock, item.unit_type);
                    // Show formatted quantity
                    const formattedQuantity = item.unit_type === 'kg-grams' ? formatUnitString(item.quantity, item.unit_type) : item.quantity;
                    return (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {item.product_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              Available: {formattedAvailableStock} {item.unit}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(item.id, e.target.value)}
                              placeholder={item.unit_type === 'kg-grams' ? 'e.g. 155-20' : 'e.g. 100'}
                              className={`w-24 px-2 py-1 border rounded text-sm ${
                                getQuantityAsNumber(item.quantity, item.unit_type) > item.available_stock ? 'border-red-500' : 'border-gray-300'
                              }`}
                            />
                            <span className="text-xs text-gray-500">{item.unit_type === 'kg-grams' ? formattedQuantity.replace(/\d+-/, '').trim() ? 'kg-grams' : 'kg' : item.unit}</span>
                          </div>
                          {getQuantityAsNumber(item.quantity, item.unit_type) > item.available_stock && (
                            <div className="text-xs text-red-500 mt-1">
                              Exceeds stock!
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updateItemPrice(item.id, parseCurrency(e.target.value))}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          Rs. {item.total_price.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {stockInfo && (
                            <div className="text-sm">
                              <div className="flex items-center">
                                <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                                {getDisplayValue(stockInfo.current_stock, item.unit_type)} → {getDisplayValue(stockInfo.new_stock, item.unit_type)}
                              </div>
                              <div className={`text-xs ${
                                stockInfo.status === 'insufficient' ? 'text-red-600' :
                                stockInfo.status === 'low' ? 'text-yellow-600' : 'text-green-600'
                              }`}>
                                {stockInfo.status === 'insufficient' ? 'Insufficient!' :
                                 stockInfo.status === 'low' ? 'Will be low' : 'OK'}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No items added yet. Search and select products above.</p>
            </div>
          )}
        </div>

        {/* Calculations & Payment */}
        {formData.items.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Calculator className="h-5 w-5 mr-2" />
              Invoice Calculations
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Calculations */}
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">Rs. {calculations.subtotal.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <label className="text-gray-600">Discount (%):</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.discount}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        discount: parseCurrency(e.target.value) 
                      }))}
                      className={`w-20 px-2 py-1 border rounded text-sm ${
                        errors.discount ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                </div>
                
                {errors.discount && (
                  <p className="text-sm text-red-600">{errors.discount}</p>
                )}
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Discount Amount:</span>
                  <span className="text-red-600">- Rs. {calculations.discountAmount.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-lg font-semibold border-t pt-2">
                  <span>Grand Total:</span>
                  <span>Rs. {calculations.grandTotal.toFixed(2)}</span>
                </div>
              </div>
              
              {/* Payment */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method
                  </label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      payment_method: e.target.value 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {PAYMENT_METHODS.map(method => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Amount
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={calculations.grandTotal}
                    step="0.01"
                    value={formData.payment_amount}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      payment_amount: parseCurrency(e.target.value) 
                    }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.payment_amount ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                  {errors.payment_amount && (
                    <p className="mt-1 text-sm text-red-600">{errors.payment_amount}</p>
                  )}
                  
                  <div className="mt-2 flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ 
                        ...prev, 
                        payment_amount: calculations.grandTotal 
                      }))}
                      className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                    >
                      Full Payment
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ 
                        ...prev, 
                        payment_amount: 0 
                      }))}
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                    >
                      Credit Sale
                    </button>
                  </div>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Remaining Balance:</span>
                  <span className={`font-semibold ${
                    calculations.remainingBalance > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    Rs. {calculations.remainingBalance.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Notes */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add any notes or special instructions..."
              />
            </div>
          </div>
        )}

        {/* Stock Impact Summary */}
        {stockPreview.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2" />
              Stock Impact Summary
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stockPreview.map(stock => {
                // Find the product to get unit_type
                const product = products.find(p => p.id === stock.product_id);
                const unitType = product?.unit_type || 'kg-grams';
                // For kg-grams, convert number to 'kg-grams' string before formatting
                const getDisplayValue = (val: number) =>
                  unitType === 'kg-grams' ? formatUnitString(numberToKgGramsString(val), unitType) : formatUnitString(val.toString(), unitType);
                return (
                  <div 
                    key={stock.product_id} 
                    className={`p-4 rounded-lg border-2 ${
                      stock.status === 'insufficient' ? 'border-red-200 bg-red-50' :
                      stock.status === 'low' ? 'border-yellow-200 bg-yellow-50' :
                      'border-green-200 bg-green-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{stock.product_name}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        stock.status === 'insufficient' ? 'bg-red-100 text-red-800' :
                        stock.status === 'low' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {stock.status === 'insufficient' ? 'Insufficient' :
                         stock.status === 'low' ? 'Low Stock' : 'OK'}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Current:</span>
                        <span>{getDisplayValue(stock.current_stock)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Selling:</span>
                        <span className="text-red-600">-{getDisplayValue(stock.ordered_quantity)}</span>
                      </div>
                      <div className="flex justify-between font-medium border-t pt-1">
                        <span className="text-gray-600">After Sale:</span>
                        <span className={
                          stock.status === 'insufficient' ? 'text-red-600' :
                          stock.status === 'low' ? 'text-yellow-600' : 'text-green-600'
                        }>
                          {getDisplayValue(stock.new_stock)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={resetForm}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Clear Form
          </button>
          
          <button
            type="button"
            onClick={handleSubmit}
            disabled={creating || formData.items.length === 0 || !formData.customer_id || stockPreview.some(p => p.status === 'insufficient')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {creating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating Invoice...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Create Invoice & Update Stock
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceForm;