import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '../../services/database';
import { useActivityLogger } from '../../hooks/useActivityLogger';
import toast from 'react-hot-toast';
import { formatUnitString, parseUnit, hasSufficientStock, getStockAsNumber, getAlertLevelAsNumber, type UnitType } from '../../utils/unitUtils';
import { parseCurrency, roundCurrency, addCurrency, subtractCurrency } from '../../utils/currency';
import { calculateTotal, calculateDiscount } from '../../utils/calculations';
import { formatInvoiceNumber } from '../../utils/numberFormatting';
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

  ShoppingCart,

  RefreshCw,
  Plus,
  Minus,
  Receipt,

  DollarSign,

} from 'lucide-react';

// Enhanced interfaces with stock tracking - KEEPING YOUR ORIGINAL INTERFACES
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
  unit_type?: 'kg-grams' | 'piece' | 'bag' | 'kg';
  unit: string;
  rate_per_unit: number;
  current_stock: string;
  min_stock_alert: string;
  size?: string;
  grade?: string;
}

interface InvoiceItem {
  id: string;
  product_id: number;
  product_name: string;
  quantity: string;
  unit_price: number;
  total_price: number;
  unit: string;
  available_stock: number;
  unit_type?: string;
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

// Payment channels interface
interface PaymentChannel {
  id: number;
  name: string;
  type: 'cash' | 'bank' | 'digital' | 'card' | 'cheque' | 'other';
  is_active: boolean;
}

const InvoiceForm: React.FC = () => {
  const [showOptional, setShowOptional] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const activityLogger = useActivityLogger();
  
  // Helper function to convert quantity string to numeric value for calculations - YOUR FUNCTION
    const getQuantityAsNumber = (quantityString: string, unitType?: string): number => {
    try {
      const parsed = parseUnit(quantityString, unitType as any || 'kg-grams');
      return parsed.numericValue;
    } catch {
      const numericValue = parseFloat(quantityString);
      return isNaN(numericValue) ? 0 : numericValue;
    }
  };

  // Helper function to check if stock is sufficient - YOUR FUNCTION
  const isStockSufficient = (currentStock: string, requiredQuantity: string, unitType?: string): boolean => {
    return hasSufficientStock(currentStock, requiredQuantity, unitType as any || 'kg-grams');
  };

  // State management - KEEPING YOUR ORIGINAL STATE
  const [formData, setFormData] = useState<InvoiceFormData>({
    customer_id: null,
    items: [],
    discount: 0,
    payment_amount: 0,
    payment_method: 'cash',
    notes: ''
  });

  // Payment channels state
  const [paymentChannels, setPaymentChannels] = useState<PaymentChannel[]>([]);
  const [selectedPaymentChannel, setSelectedPaymentChannel] = useState<PaymentChannel | null>(null);

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

  // Initialize data - YOUR ORIGINAL FUNCTION
  useEffect(() => {
    loadInitialData();
    loadPaymentChannels();
  }, []);

  // Load payment channels
  const loadPaymentChannels = async () => {
    try {
      console.log('🔄 [InvoiceForm] Loading payment channels from database...');
      const channels = await db.getPaymentChannels(false); // Only active channels
      console.log('✅ [InvoiceForm] Raw channels response:', channels);
      console.log('📊 [InvoiceForm] Number of channels:', channels?.length || 0);
      
      if (channels && channels.length > 0) {
        setPaymentChannels(channels);
        const defaultChannel = channels[0];
        setSelectedPaymentChannel(defaultChannel);
        setFormData(prev => ({ ...prev, payment_method: defaultChannel.name }));
        console.log('✅ [InvoiceForm] Payment channels set successfully. Default channel:', defaultChannel.name);
        toast.success(`Loaded ${channels.length} payment channels`);
      } else {
        console.error('❌ [InvoiceForm] No payment channels found in database response');
        toast.error('No payment channels found. Please set up payment channels first.');
      }
    } catch (error) {
      console.error('❌ [InvoiceForm] Error loading payment channels:', error);
      console.error('❌ [InvoiceForm] Error details:', error instanceof Error ? error.message : 'Unknown error');
      toast.error('Failed to load payment channels from database');
    }
  };

  // Handle pre-selected customer from other components - YOUR ORIGINAL
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

  // Update stock preview when items change - YOUR ORIGINAL
  useEffect(() => {
    updateStockPreview();
    // If selected customer has credit, update payment_amount when items change
    if (selectedCustomer && selectedCustomer.balance < 0 && formData.items.length > 0) {
      const credit = Math.abs(selectedCustomer.balance);
      const grandTotal = formData.items.reduce((sum, item) => sum + item.total_price, 0);
      setFormData(prev => ({
        ...prev,
        payment_amount: Math.min(credit, grandTotal)
      }));
    }
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

  // YOUR ORIGINAL REFRESH FUNCTION
  const refreshProductData = async () => {
    try {
      setRefreshing(true);
      const productList = await db.getProducts();
      setProducts(productList);
      setFilteredProducts(productList);
      
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

  // Customer search and selection - YOUR ORIGINAL LOGIC
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
    // If customer has credit (negative balance), pre-fill payment_amount with credit up to invoice total
    setFormData(prev => {
      let payment_amount = prev.payment_amount;
      if (customer.balance < 0) {
        const credit = Math.abs(customer.balance);
        let grandTotal = 0;
        if (prev.items.length > 0) {
          grandTotal = prev.items.reduce((sum, item) => sum + item.total_price, 0);
        }
        payment_amount = Math.min(credit, grandTotal || payment_amount);
      }
      return { ...prev, customer_id: customer.id, payment_amount };
    });
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
    setErrors(prev => ({ ...prev, customer_id: '' }));
  };

  // Product search and filtering - YOUR ORIGINAL LOGIC
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

  // Calculate totals with proper currency precision - YOUR ORIGINAL LOGIC
  const calculations = React.useMemo(() => {
    const getItemTotal = (item: InvoiceItem) => {
      if (item.unit_type === 'kg-grams') {
        const parsed = parseUnit(item.quantity, 'kg-grams');
        const kg = typeof parsed.kg === 'number' ? parsed.kg : 0;
        const grams = typeof parsed.grams === 'number' ? parsed.grams : 0;
        return (kg + grams / 1000) * item.unit_price;
      }
      return getQuantityAsNumber(item.quantity, item.unit_type) * item.unit_price;
    };
    const subtotal = formData.items.reduce((sum, item) => addCurrency(sum, getItemTotal(item)), 0);
    const discountAmount = calculateDiscount(subtotal, formData.discount);
    const grandTotal = subtractCurrency(subtotal, discountAmount);
    const remainingBalance = subtractCurrency(grandTotal, formData.payment_amount);
    return {
      subtotal: roundCurrency(subtotal),
      discountAmount: roundCurrency(discountAmount),
      grandTotal: roundCurrency(grandTotal),
      remainingBalance: roundCurrency(remainingBalance)
    };
  }, [formData.items, formData.discount, formData.payment_amount]);

  // YOUR ORIGINAL ADD PRODUCT FUNCTION
  const addProduct = (product: Product) => {
    const currentProduct = products.find(p => p.id === product.id);
    if (!currentProduct) {
      toast.error('Product not found in current inventory');
      return;
    }

    const existingItemIndex = formData.items.findIndex(item => item.product_id === product.id);
    if (existingItemIndex >= 0) {
      const newItems = [...formData.items];
      let currentQuantity = getQuantityAsNumber(newItems[existingItemIndex].quantity, currentProduct.unit_type);
      let newQuantityNum;
      let newQuantity;
      if (currentProduct.unit_type === 'kg-grams') {
        // Add 1kg (1000 grams) each time
        newQuantityNum = currentQuantity + 1000;
        // Convert to kg-grams string
        const kg = Math.floor(newQuantityNum / 1000);
        const grams = newQuantityNum % 1000;
        newQuantity = `${kg}-${grams}`;
      } else {
        newQuantityNum = currentQuantity + 1;
        newQuantity = newQuantityNum.toString();
      }
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
      if (getStockAsNumber(currentProduct.current_stock, currentProduct.unit_type) < 1) {
        toast.error(`${currentProduct.name} is out of stock`);
        return;
      }
      // Always start with quantity 1 for all units
      const initialQuantity = "1";
      const initialQuantityNum = 1;
      const newItem: InvoiceItem = {
        id: `item_${Date.now()}_${Math.random()}`,
        product_id: currentProduct.id,
        product_name: currentProduct.name,
        quantity: initialQuantity,
        unit_price: currentProduct.rate_per_unit,
        total_price: calculateTotal(initialQuantityNum, currentProduct.rate_per_unit),
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

  // YOUR ORIGINAL UPDATE QUANTITY FUNCTION
  const updateItemQuantity = (itemId: string, newQuantityString: string) => {
    // If quantity is empty, keep it empty and do not remove or reset
    if (newQuantityString === '' || newQuantityString.trim() === '') {
      const newItems = formData.items.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            quantity: ''
          };
        }
        return item;
      });
      setFormData(prev => ({ ...prev, items: newItems }));
      return;
    }
    const newItems = formData.items.map(item => {
      if (item.id === itemId) {
        const currentProduct = products.find(p => p.id === item.product_id);
        if (!currentProduct) return item;
        
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

  // YOUR ORIGINAL UPDATE PRICE FUNCTION
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

  // YOUR ORIGINAL VALIDATION FUNCTION
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

  // YOUR ORIGINAL SUBMIT FUNCTION
// Replace your handleSubmit function in InvoiceForm.tsx with this lock-safe version:

const handleSubmit = async () => {
  // Refresh product data first
  await refreshProductData();
  
  if (!validateForm()) {
    toast.error('Please fix the errors before submitting');
    return;
  }

  setCreating(true);

  try {
    // Prepare invoice data
    let payment_amount = formData.payment_amount;
    if (selectedCustomer && selectedCustomer.balance < 0) {
      const credit = Math.abs(selectedCustomer.balance);
      const grandTotal = formData.items.reduce((sum, item) => sum + item.total_price, 0);
      payment_amount = Math.min(credit, grandTotal);
    }

    const invoiceData = {
      customer_id: formData.customer_id!,
      customer_name: selectedCustomer?.name,
      items: formData.items.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price
      })),
      discount: formData.discount,
      payment_amount,
      payment_method: formData.payment_method,
      payment_channel_id: selectedPaymentChannel?.id || null,
      payment_channel_name: selectedPaymentChannel?.name || formData.payment_method,
      notes: formData.notes
      
    };
    
    console.log('Creating invoice:', invoiceData);
    
    // Create invoice - the database will handle all retries internally
    const result = await db.createInvoice(invoiceData);
    
    // Log activity
    try {
      await activityLogger.logInvoiceCreated(
        result.bill_number, 
        selectedCustomer?.name || 'Unknown Customer',
        calculations.grandTotal
      );
    } catch (error) {
      console.error('Failed to log invoice creation activity:', error);
      // Don't fail the main operation if logging fails
    }
    
    // Success
    import('../../utils/eventBus').then(({ triggerInvoiceCreatedRefresh }) => {
      triggerInvoiceCreatedRefresh(result);
    });
    
    toast.success(`Invoice created successfully! Bill Number: ${formatInvoiceNumber(result.bill_number)}`, {
      duration: 5000
    });
    
    resetForm();
    await loadInitialData(false);
    
  } catch (error: any) {
    console.error('Invoice creation error:', error);
    toast.error(error.message || 'Failed to create invoice');
  } finally {
    setCreating(false);
  }
};

// ALSO ADD: Enhanced error handling for the entire component
// Add this useEffect to handle global database errors:
useEffect(() => {
  const handleDatabaseError = (event: CustomEvent) => {
    const { error, operation } = event.detail;
    
    if (error.message?.includes('database is locked') || error.code === 5) {
      toast.error(`Database is busy during ${operation}. Please wait a moment and try again.`);
    }
  };

  // Listen for database errors
  window.addEventListener('DATABASE_ERROR', handleDatabaseError as EventListener);
  
  return () => {
    window.removeEventListener('DATABASE_ERROR', handleDatabaseError as EventListener);
  };
}, []);

// ALSO UPDATE: The creating state message
// In your button, update the creating text to be more informative:
{creating ? (
  <>
    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
    Creating Invoice... {/* This will show retry attempts automatically via toast */}
  </>
) : (
  <>
    <CheckCircle className="h-4 w-4 mr-2" />
    Create Invoice & Update Stock
  </>
)}

// ADDITIONAL: Add this helper function to your component for better UX
const [retryCount] = useState(0);

// Update the submit button to show retry status
const getSubmitButtonText = () => {
  if (creating) {
    if (retryCount > 0) {
      return `Retrying... (${retryCount}/3)`;
    }
    return 'Creating Invoice...';
  }
  return 'Create Invoice & Update Stock';
};

// And update your button text:
{creating ? (
  <>
    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
    {getSubmitButtonText()}
  </>
) : (
  <>
    <CheckCircle className="h-4 w-4 mr-2" />
    Create Invoice & Update Stock
  </>
)}
  const resetForm = () => {
    setFormData({
      customer_id: null,
      items: [],
      discount: 0,
      payment_amount: 0,
      payment_method: paymentChannels.length > 0 ? paymentChannels[0].name : 'cash',
      notes: ''
    });
    setSelectedCustomer(null);
    setCustomerSearch('');
    setProductSearch('');
    setStockPreview([]);
    setErrors({});
    
    // Reset payment channel selection
    if (paymentChannels.length > 0) {
      setSelectedPaymentChannel(paymentChannels[0]);
    }
  };

  const viewCustomerLedger = () => {
    if (selectedCustomer) {
      navigate('/reports/customer', {
        state: { customerId: selectedCustomer.id }
      });
    }
  };

 

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
    <div className="max-w-7xl mx-auto p-4 space-y-4">
      {/* REDESIGNED: Compact Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Create New Invoice</h1>
            <p className="text-sm text-gray-500 mt-1">
              Total: Rs. {calculations.grandTotal.toFixed(2)} • Items: {formData.items.length}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={refreshProductData}
              disabled={refreshing}
              className="btn btn-secondary flex items-center px-3 py-2 text-sm"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            
            <button
              onClick={handleSubmit}
              disabled={!formData.customer_id || formData.items.length === 0 || creating}
              className="btn btn-primary flex items-center px-4 py-2 disabled:opacity-50"
            >
              {creating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Receipt className="h-4 w-4 mr-2" />
                  Create Invoice
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* REDESIGNED: Left Column - Customer & Products */}
        <div className="lg:col-span-2 space-y-4">
          {/* REDESIGNED: Customer Selection */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <User className="h-4 w-4 mr-2 text-blue-600" />
                Customer Selection
              </h3>
              {selectedCustomer && (
                <button
                  onClick={() => {
                    setSelectedCustomer(null);
                    setFormData(prev => ({ ...prev, customer_id: null }));
                    setCustomerSearch('');
                  }}
                  className="text-gray-500 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {!selectedCustomer ? (
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => handleCustomerSearch(e.target.value)}
                  onFocus={() => setShowCustomerDropdown(true)}
                  placeholder="Search customers by name, phone, or CNIC..."
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.customer_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                
                {errors.customer_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.customer_id}</p>
                )}
                
                {showCustomerDropdown && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map(customer => (
                        <div
                          key={customer.id}
                          onClick={() => selectCustomer(customer)}
                          className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900">{customer.name}</div>
                              <div className="text-sm text-gray-600">{customer.phone}</div>
                            </div>
                            <div className="text-right">
                              <div className={`text-sm font-medium ${customer.balance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                Balance: Rs. {customer.balance.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-gray-500 text-center">No customers found</div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-blue-900">{selectedCustomer.name}</h4>
                      <p className="text-sm text-blue-700">{selectedCustomer.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <div className={`text-sm font-medium ${selectedCustomer.balance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        Rs. {selectedCustomer.balance.toFixed(2)}
                      </div>
                      <div className="text-xs text-blue-600">
                        {selectedCustomer.balance >= 0 ? 'Outstanding' : 'Credit'}
                      </div>
                    </div>
                    <button onClick={viewCustomerLedger} className="text-blue-600 hover:text-blue-800">
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* REDESIGNED: Product Selection & Items */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <Package className="h-4 w-4 mr-2 text-green-600" />
              Invoice Items
            </h3>
            
            {/* Product Search */}
            <div className="relative mb-4" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={productSearch}
                onChange={(e) => {
                  handleProductSearch(e.target.value);
                  setShowProductDropdown(true);
                }}
                onFocus={() => setShowProductDropdown(true)}
                placeholder="Search products by name or category..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
              
              {showProductDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map(product => (
                      <div
                        key={product.id}
                        onClick={() => addProduct(product)}
                        className={`p-3 hover:bg-green-50 cursor-pointer border-b border-gray-100 last:border-b-0 ${
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
                          <div className="text-right ml-4">
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
            
            {/* REDESIGNED: Invoice Items Table */}
            {formData.items.length > 0 ? (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-32">Quantity</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Unit Price</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Total</th>
                      <th className="px-3 py-2 w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {formData.items.map((item) => {
                      // Format quantity for kg-grams
                      let formattedQuantity = item.quantity;
                      if (item.unit_type === 'kg-grams') {
                        // If quantity is a plain number, convert to kg-grams string
                        if (/^\d+$/.test(item.quantity)) {
                          const num = parseInt(item.quantity, 10);
                          const kg = Math.floor(num / 1000);
                          const grams = num % 1000;
                          formattedQuantity = `${kg}-${grams}`;
                        }
                        formattedQuantity = formatUnitString(formattedQuantity, 'kg-grams');
                      }
                      
                      // Format available stock for kg-grams
                      let formattedAvailableStock = item.available_stock.toString();
                      if (item.unit_type === 'kg-grams') {
                        const num = Number(item.available_stock);
                        const kg = Math.floor(num / 1000);
                        const grams = num % 1000;
                        formattedAvailableStock = formatUnitString(`${kg}-${grams}`, 'kg-grams');
                      } else {
                        formattedAvailableStock = formatUnitString(item.available_stock.toString(), item.unit_type as UnitType);
                      }
                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <div>
                              <div className="font-medium text-gray-900">{item.product_name}</div>
                              <div className="text-xs text-gray-500">
                                Available: {formattedAvailableStock}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => {
                                  if (item.unit_type === 'kg-grams') {
                                    // Decrease by 1kg (1000g), minimum 1kg
                                    const currentQty = getQuantityAsNumber(item.quantity, 'kg-grams');
                                    const newQtyNum = Math.max(1000, currentQty - 1000);
                                    const kg = Math.floor(newQtyNum / 1000);
                                    const grams = newQtyNum % 1000;
                                    const newQtyStr = `${kg}-${grams}`;
                                    updateItemQuantity(item.id, newQtyStr);
                                  } else {
                                    const currentQty = getQuantityAsNumber(item.quantity, item.unit_type);
                                    updateItemQuantity(item.id, Math.max(1, currentQty - 1).toString());
                                  }
                                }}
                                className="w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <input
                                type="text"
                                value={item.quantity}
                                onChange={(e) => updateItemQuantity(item.id, e.target.value)}
                                placeholder={item.unit_type === 'kg-grams' ? 'e.g. 155-20' : 'e.g. 100'}
                                className={`w-16 h-6 text-center text-xs border focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                                  getQuantityAsNumber(item.quantity, item.unit_type) > item.available_stock ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                }`}
                              />
                              <button
                                onClick={() => {
                                  if (item.unit_type === 'kg-grams') {
                                    // Increase by 1kg (1000g)
                                    const currentQty = getQuantityAsNumber(item.quantity, 'kg-grams');
                                    const newQtyNum = currentQty + 1000;
                                    const kg = Math.floor(newQtyNum / 1000);
                                    const grams = newQtyNum % 1000;
                                    const newQtyStr = `${kg}-${grams}`;
                                    updateItemQuantity(item.id, newQtyStr);
                                  } else {
                                    const currentQty = getQuantityAsNumber(item.quantity, item.unit_type);
                                    updateItemQuantity(item.id, (currentQty + 1).toString());
                                  }
                                }}
                                className="w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            {getQuantityAsNumber(item.quantity, item.unit_type) > item.available_stock && (
                              <div className="text-xs text-red-500 mt-1">Exceeds stock!</div>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) => updateItemPrice(item.id, parseCurrency(e.target.value))}
                              className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-3 py-2 font-medium text-gray-900">
                            Rs. {item.total_price.toFixed(2)}
                          </td>
                          <td className="px-3 py-2">
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
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-gray-500 text-sm">No items added yet</p>
                <p className="text-xs text-gray-400 mt-1">Search and select products above</p>
              </div>
            )}
          </div>
        </div>

        {/* REDESIGNED: Right Column - Summary & Payment */}
        <div className="space-y-4">
          {/* REDESIGNED: Order Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <Calculator className="h-4 w-4 mr-2 text-purple-600" />
              Order Summary
            </h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Items ({formData.items.length}):</span>
                <span className="font-medium">Rs. {calculations.subtotal.toFixed(2)}</span>
              </div>
              
        
              
              <div className="flex justify-between text-lg font-semibold border-t pt-2">
                <span>Total:</span>
                <span>Rs. {calculations.grandTotal.toFixed(2)}</span>
              </div>
            </div>
         
          </div>

          {/* REDESIGNED: Payment Details */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <DollarSign className="h-4 w-4 mr-2 text-green-600" />
              Payment Details
            </h3>

            <div className="space-y-3">
              {/* Payment Method */}
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Channel</label>
                <div className="grid grid-cols-2 gap-2">
                  {paymentChannels.map(channel => (
                  <button
                    key={channel.id}
                    onClick={() => {
                      setSelectedPaymentChannel(channel);
                      setFormData(prev => ({ ...prev, payment_method: channel.name }));
                    }}
                    className={`p-2 text-sm rounded border transition-colors ${
                    selectedPaymentChannel?.id === channel.id
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="text-center">
                      <div className="font-medium">{channel.name}</div>
                      <div className="text-xs text-gray-500 capitalize">{channel.type}</div>
                    </div>
                  </button>
                  ))}
                </div>
                </div>

              {/* Payment Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount</label>
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
                  className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-green-500 ${
                    errors.payment_amount ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
                {errors.payment_amount && (
                  <p className="text-xs text-red-600 mt-1">{errors.payment_amount}</p>
                )}
                
             
              </div>

              {/* Balance Display */}
              <div className={`p-3 rounded-lg border ${
                calculations.remainingBalance > 0 
                  ? 'border-orange-200 bg-orange-50' 
                  : 'border-green-200 bg-green-50'
              }`}>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-gray-700">Remaining Balance:</span>
                  <span className={`font-bold ${
                    calculations.remainingBalance > 0 ? 'text-orange-600' : 'text-green-600'
                  }`}>
                    Rs. {calculations.remainingBalance.toFixed(2)}
                  </span>
                </div>
                {calculations.remainingBalance > 0 && (
                  <div className="text-xs text-orange-600 mt-1">
                    This amount will be added to customer's outstanding balance
                  </div>
                )}
              </div>
            </div>
          </div>

 {/* Optional Fields: Size and Grade (Consistent Collapsible Card) */}
        <div>
          <button
            type="button"
            className="flex items-center w-full justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            onClick={() => setShowOptional((v) => !v)}
            aria-expanded={showOptional}
            disabled={loading}
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
          {/* REDESIGNED: Notes */}
          
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 resize-none"
              rows={2}
              placeholder="Add any special instructions or notes..."
            />
         
          </div>
</div>
          {/* REDESIGNED: Action Buttons */}
          <div className="space-y-2">
            <button
              onClick={handleSubmit}
              disabled={!formData.customer_id || formData.items.length === 0 || creating || stockPreview.some(p => p.status === 'insufficient')}
              className="w-full btn btn-primary py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
            
            <button
              type="button"
              onClick={resetForm}
              className="w-full btn btn-secondary py-2 text-sm"
            >
              Clear Form
            </button>
          </div>
        </div>
      </div>

      {/* REDESIGNED: Stock Impact Summary */}
      {stockPreview.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Stock Impact Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {stockPreview.map(stock => {
              const product = products.find(p => p.id === stock.product_id);
              const unitType = product?.unit_type || 'kg-grams';
              // Format stock values for kg-grams
              let formattedCurrentStock = stock.current_stock.toString();
              let formattedOrderedQuantity = stock.ordered_quantity.toString();
              let formattedNewStock = stock.new_stock.toString();
              if (unitType === 'kg-grams') {
                const formatKgGrams = (num: number) => {
                  const kg = Math.floor(num / 1000);
                  const grams = num % 1000;
                  return formatUnitString(`${kg}-${grams}`, 'kg-grams');
                };
                formattedCurrentStock = formatKgGrams(stock.current_stock);
                formattedOrderedQuantity = formatKgGrams(stock.ordered_quantity);
                formattedNewStock = formatKgGrams(stock.new_stock);
              } else {
                formattedCurrentStock = formatUnitString(stock.current_stock.toString(), unitType);
                formattedOrderedQuantity = formatUnitString(stock.ordered_quantity.toString(), unitType);
                formattedNewStock = formatUnitString(stock.new_stock.toString(), unitType);
              }
              return (
                <div 
                  key={stock.product_id} 
                  className={`p-3 rounded-lg border ${
                    stock.status === 'insufficient' ? 'border-red-200 bg-red-50' :
                    stock.status === 'low' ? 'border-yellow-200 bg-yellow-50' :
                    'border-green-200 bg-green-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 text-sm">{stock.product_name}</h4>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      stock.status === 'insufficient' ? 'bg-red-100 text-red-800' :
                      stock.status === 'low' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {stock.status === 'insufficient' ? 'Insufficient' :
                       stock.status === 'low' ? 'Low Stock' : 'OK'}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Current:</span>
                      <span>{formattedCurrentStock}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Selling:</span>
                      <span className="text-red-600">-{formattedOrderedQuantity}</span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-1">
                      <span className="text-gray-600">After Sale:</span>
                      <span className={
                        stock.status === 'insufficient' ? 'text-red-600' :
                        stock.status === 'low' ? 'text-yellow-600' : 'text-green-600'
                      }>
                        {formattedNewStock}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceForm;