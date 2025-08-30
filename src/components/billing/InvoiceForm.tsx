import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { db } from '../../services/database';
import { useActivityLogger } from '../../hooks/useActivityLogger';
import toast from 'react-hot-toast';
import { formatUnitString, parseUnit, hasSufficientStock, getStockAsNumber, getAlertLevelAsNumber, type UnitType } from '../../utils/unitUtils';
import { parseCurrency, roundCurrency, addCurrency, subtractCurrency } from '../../utils/currency';
import { calculateTotal, calculateDiscount, formatCurrency } from '../../utils/calculations';
import { formatInvoiceNumber } from '../../utils/numberFormatting';
import { getSystemDateForInput, getSystemTimeForInput } from '../../utils/systemDateTime';
import { formatTime } from '../../utils/formatters';
import Modal from '../common/Modal';
import CustomerForm from '../customers/CustomerForm';
import { TIronCalculator } from './TIronCalculator';
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

// Guest customer interface for one-time invoices
interface GuestCustomer {
  name: string;
  phone: string;
  address: string;
}

interface Product {
  id: number;
  name: string;
  unit_type?: 'kg-grams' | 'piece' | 'bag' | 'kg' | 'meter' | 'ton' | 'foot';
  unit: string;
  rate_per_unit: number;
  current_stock: string;
  min_stock_alert: string;
  track_inventory?: number; // 1 = track inventory, 0 = non-stock product
  size?: string;
  grade?: string;
}

interface InvoiceItem {
  id: string;
  product_id: number | null;
  product_name: string;
  quantity: string;
  unit_price: number;
  total_price: number;
  unit: string;
  available_stock: number;
  unit_type?: string;
  length?: number;
  pieces?: number;
  is_misc_item?: boolean;
  misc_description?: string;
  // T-Iron calculation fields
  t_iron_pieces?: number;
  t_iron_length_per_piece?: number;
  t_iron_total_feet?: number;
  t_iron_unit?: string; // Unit type: 'pcs' or 'L'
  product_description?: string;
  is_non_stock_item?: boolean;
}

interface InvoiceFormData {
  customer_id: number | null;
  items: InvoiceItem[];
  discount: number;
  payment_amount: number;
  payment_method: string;
  notes: string;
  date: string; // Date in YYYY-MM-DD format for input
  time: string; // Time in HH:MM format for input
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
  const { id } = useParams<{ id: string }>();
  const activityLogger = useActivityLogger();

  // Edit mode detection
  const isEditMode = !!id;
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [, setOriginalItems] = useState<InvoiceItem[]>([]); // For diff tracking

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
    notes: '',
    date: getSystemDateForInput(), // Current system date in YYYY-MM-DD format
    time: getSystemTimeForInput()  // Current system time in HH:MM format
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

  // Guest customer and quick creation states
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [guestCustomer, setGuestCustomer] = useState<GuestCustomer>({
    name: '',
    phone: '',
    address: ''
  });
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showStockWarning, setShowStockWarning] = useState(false);

  // Miscellaneous item state
  const [miscItemDescription, setMiscItemDescription] = useState('');
  const [miscItemPrice, setMiscItemPrice] = useState(0);

  // T-Iron calculator state
  const [showTIronCalculator, setShowTIronCalculator] = useState(false);
  const [selectedTIronProduct, setSelectedTIronProduct] = useState<Product | null>(null);
  const [editingTIronItemId, setEditingTIronItemId] = useState<string | null>(null); // Track which item is being edited

  // Enhanced non-stock calculation state
  const [nonStockCalculation, setNonStockCalculation] = useState<{
    [itemId: string]: {
      baseQuantity: string;      // e.g., "12"
      baseUnit: 'L' | 'pcs';     // L or pcs
      multiplierQuantity: string; // e.g., "13"
      multiplierUnit: 'ft' | 'L'; // ft or L  
      unitPrice: string;         // price per unit
      isCalculating: boolean;
    }
  }>({});

  // Credit preview state
  const [creditPreview, setCreditPreview] = useState<{
    availableCredit: number;
    willUseCredit: number;
    remainingCredit: number;
    outstandingAfterCredit: number;
  } | null>(null);

  // Initialize data - YOUR ORIGINAL FUNCTION
  useEffect(() => {
    loadInitialData();
    loadPaymentChannels();
  }, []);

  // Load invoice data for edit mode
  useEffect(() => {
    if (isEditMode && id) {
      loadInvoiceForEdit(parseInt(id));
    }
  }, [isEditMode, id]);

  // Load invoice data for editing
  const loadInvoiceForEdit = async (invoiceId: number) => {
    try {
      setLoading(true);

      const invoice = await db.getInvoiceDetails(invoiceId);
      if (!invoice) {
        toast.error('Invoice not found');
        navigate('/billing/list');
        return;
      }

      // Validate edit permissions
      if (invoice.payment_amount > 0 && invoice.status === 'paid') {
        toast.error('Cannot edit fully paid invoices');
        navigate(`/billing/view/${invoiceId}`);
        return;
      }

      setEditingInvoice(invoice);

      // Load invoice items
      const items = await db.getInvoiceItems(invoiceId);
      const formattedItems: InvoiceItem[] = items.map((item: any, index: number) => ({
        id: `item-${index}`,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity?.toString() || '0',
        unit_price: item.unit_price || 0,
        total_price: item.total_price || 0,
        unit: item.unit || '',
        available_stock: 0, // Will be updated when products load
        unit_type: item.unit_type,
        length: item.length,
        pieces: item.pieces,
        is_misc_item: item.is_misc_item,
        misc_description: item.misc_description,
        t_iron_pieces: item.t_iron_pieces,
        t_iron_length_per_piece: item.t_iron_length_per_piece,
        t_iron_total_feet: item.t_iron_total_feet,
        t_iron_unit: item.t_iron_unit,
        is_non_stock_item: item.is_non_stock_item
      }));

      setOriginalItems([...formattedItems]);

      // Find and set customer
      const customer = await db.getCustomer(invoice.customer_id);
      if (customer) {
        setSelectedCustomer(customer);
        setCustomerSearch(customer.name);
      }

      // Update form data
      setFormData({
        customer_id: invoice.customer_id,
        items: formattedItems,
        discount: invoice.discount || 0,
        payment_amount: invoice.payment_amount || 0,
        payment_method: invoice.payment_method || 'cash',
        notes: invoice.notes || '',
        date: invoice.date ? invoice.date.split(' ')[0] : getSystemDateForInput(),
        time: invoice.date ? formatTime(invoice.date) : getSystemTimeForInput()
      });

      console.log('✅ [EDIT-MODE] Invoice loaded for editing:', invoiceId);
      toast.success(`Invoice #${invoice.bill_number} loaded for editing`);

    } catch (error) {
      console.error('❌ [EDIT-MODE] Error loading invoice for edit:', error);
      toast.error('Failed to load invoice for editing');
      navigate('/billing/list');
    } finally {
      setLoading(false);
    }
  };

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

  // Update stock preview and credit preview when items change
  useEffect(() => {
    updateStockPreview();
    updateCreditPreview();
  }, [formData.items, formData.payment_amount, selectedCustomer, products]);

  // Guest Mode: Automatically set payment amount to full total when items change
  useEffect(() => {
    if (isGuestMode && formData.items.length > 0) {
      const grandTotal = formData.items.reduce((sum, item) => sum + item.total_price, 0);
      const discountAmount = (grandTotal * formData.discount) / 100;
      const finalTotal = grandTotal - discountAmount;

      // Only update if payment amount is different to avoid infinite loops
      if (formData.payment_amount !== finalTotal) {
        setFormData(prev => ({
          ...prev,
          payment_amount: finalTotal
        }));
      }
    }
  }, [isGuestMode, formData.items, formData.discount, formData.payment_amount]);

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
      // Skip stock preview for miscellaneous items
      if (item.is_misc_item || !item.product_id) {
        return;
      }

      const product = products.find(p => p.id === item.product_id);
      if (product && product.track_inventory !== 0) { // Only check stock for products that track inventory
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

  // Credit preview calculation with proper precision handling
  const updateCreditPreview = () => {
    if (!selectedCustomer || isGuestMode || selectedCustomer.balance >= 0) {
      setCreditPreview(null);
      return;
    }

    // Use currency utilities for precise calculations
    const availableCredit = roundCurrency(Math.abs(selectedCustomer.balance));
    const grandTotal = roundCurrency(formData.items.reduce((sum, item) => sum + item.total_price, 0));
    const discountAmount = roundCurrency((grandTotal * formData.discount) / 100);
    const finalTotal = subtractCurrency(grandTotal, discountAmount);
    const outstandingAmount = roundCurrency(Math.max(0, subtractCurrency(finalTotal, formData.payment_amount)));

    if (outstandingAmount > 0) {
      const willUseCredit = roundCurrency(Math.min(availableCredit, outstandingAmount));
      const remainingCredit = subtractCurrency(availableCredit, willUseCredit);
      const outstandingAfterCredit = subtractCurrency(outstandingAmount, willUseCredit);

      setCreditPreview({
        availableCredit,
        willUseCredit,
        remainingCredit,
        outstandingAfterCredit
      });
    } else {
      setCreditPreview(null);
    }
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
    // DO NOT auto-apply credit - just set customer and let credit preview handle the logic
    setFormData(prev => ({ ...prev, customer_id: customer.id }));
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
    setErrors(prev => ({ ...prev, customer_id: '' }));
  };

  // Helper function to check if we have valid customer info
  const hasValidCustomer = (): boolean => {
    if (isGuestMode) {
      return guestCustomer.name.trim() !== '';
    } else {
      return formData.customer_id !== null;
    }
  };

  // Guest customer handlers
  const toggleGuestMode = () => {
    const newGuestMode = !isGuestMode;
    setIsGuestMode(newGuestMode);
    setSelectedCustomer(null);
    setGuestCustomer({ name: '', phone: '', address: '' });

    setFormData(prev => {
      // If switching TO guest mode, set payment amount to full total (no credit allowed)
      if (newGuestMode && prev.items.length > 0) {
        const grandTotal = prev.items.reduce((sum, item) => sum + item.total_price, 0);
        return { ...prev, customer_id: null, payment_amount: grandTotal };
      }
      return { ...prev, customer_id: null };
    });

    setCustomerSearch('');
    setErrors(prev => ({ ...prev, customer_id: '' }));
  };

  const handleGuestCustomerChange = (field: keyof GuestCustomer, value: string) => {
    setGuestCustomer(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, customer_id: '' }));
  };

  // Handle successful customer creation from modal
  const handleCustomerCreated = async () => {
    setShowCustomerModal(false);

    try {
      // Store the original customer count to identify the new customer
      const originalCount = customers.length;

      // Refresh customer list
      const updatedCustomers = await db.getCustomers();
      setCustomers(updatedCustomers);
      setFilteredCustomers(updatedCustomers);

      // Find the newly created customer by comparing with original list
      // The new customer should be the one not in the original list
      let newCustomer = null;

      if (updatedCustomers.length > originalCount) {
        // Find customer that wasn't in the original list
        const originalIds = new Set(customers.map(c => c.id));
        newCustomer = updatedCustomers.find(c => !originalIds.has(c.id));
      }

      if (newCustomer) {
        selectCustomer(newCustomer);
        toast.success(`Customer "${newCustomer.name}" created and selected successfully!`);
      } else {
        toast.success('Customer created successfully! Please select from the list.');
      }
    } catch (error) {
      console.error('Error refreshing customers after creation:', error);
      toast.error('Customer created but failed to refresh list');
    }
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

  // Enhanced non-stock calculation helper functions
  const initializeNonStockCalculation = (itemId: string, isNonStock: boolean) => {
    if (isNonStock && !nonStockCalculation[itemId]) {
      setNonStockCalculation(prev => ({
        ...prev,
        [itemId]: {
          baseQuantity: '1',
          baseUnit: 'pcs',
          multiplierQuantity: '1',
          multiplierUnit: 'ft',
          unitPrice: '0',
          isCalculating: false
        }
      }));
    }
  };

  const updateNonStockCalculation = (itemId: string, field: string, value: string) => {
    setNonStockCalculation(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }));
    // The useEffect will handle updating the item when nonStockCalculation changes
  };

  const updateItemWithEnhancedCalculation = (itemId: string) => {
    const calc = nonStockCalculation[itemId];
    if (!calc) return;

    const baseQty = parseFloat(calc.baseQuantity) || 0;
    const multiplierQty = parseFloat(calc.multiplierQuantity) || 0;
    const price = parseFloat(calc.unitPrice) || 0;
    const totalCalculated = baseQty * multiplierQty * price;
    const totalFeet = baseQty * multiplierQty;

    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            // Update T-Iron specific fields
            t_iron_pieces: baseQty,
            t_iron_length_per_piece: multiplierQty,
            t_iron_total_feet: totalFeet,
            quantity: totalFeet.toString(), // Total feet as quantity
            unit_price: price,
            total_price: totalCalculated,
            is_non_stock_item: true
          };
        }
        return item;
      })
    }));
  };

  // Update items when enhanced calculation changes
  useEffect(() => {
    Object.keys(nonStockCalculation).forEach(itemId => {
      const calc = nonStockCalculation[itemId];
      if (calc && calc.baseQuantity && calc.multiplierQuantity && calc.unitPrice) {
        // Delay the update to avoid immediate state update during render
        setTimeout(() => updateItemWithEnhancedCalculation(itemId), 0);
      }
    });
  }, [nonStockCalculation]);

  const calculateNonStockTotal = (itemId: string) => {
    const calc = nonStockCalculation[itemId];
    if (!calc) return 0;

    const baseQty = parseFloat(calc.baseQuantity) || 0;
    const multiplierQty = parseFloat(calc.multiplierQuantity) || 0;
    const price = parseFloat(calc.unitPrice) || 0;

    return baseQty * multiplierQty * price;
  };

  const getNonStockDisplayText = (itemId: string) => {
    const calc = nonStockCalculation[itemId];
    if (!calc) return '';

    return `${calc.baseQuantity}/${calc.baseUnit} × ${calc.multiplierQuantity}${calc.multiplierUnit}/${calc.baseUnit} × Rs.${calc.unitPrice}`;
  };

  // Calculate totals with proper currency precision - YOUR ORIGINAL LOGIC
  const calculations = React.useMemo(() => {
    const getItemTotal = (item: InvoiceItem) => {
      // Use enhanced calculation for non-stock items
      if (item.is_non_stock_item && nonStockCalculation[item.id]) {
        return calculateNonStockTotal(item.id);
      }

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

    // CRITICAL FIX: Account for credit when calculating remaining balance
    const creditToApply = creditPreview?.willUseCredit || 0;
    const totalPayments = addCurrency(formData.payment_amount, creditToApply);
    const remainingBalance = subtractCurrency(grandTotal, totalPayments);

    return {
      subtotal: roundCurrency(subtotal),
      discountAmount: roundCurrency(discountAmount),
      grandTotal: roundCurrency(grandTotal),
      remainingBalance: roundCurrency(remainingBalance)
    };
  }, [formData.items, formData.discount, formData.payment_amount, nonStockCalculation, creditPreview]);

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
      // Skip stock validation for non-stock products (track_inventory = 0)
      if (currentProduct.track_inventory !== 0 && !isStockSufficient(currentProduct.current_stock, newQuantity, currentProduct.unit_type)) {
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
      // Check if this is a T-Iron or similar non-stock product that needs special calculation
      const isTIronProduct = currentProduct.name.toLowerCase().includes('t-iron') ||
        currentProduct.name.toLowerCase().includes('tiron') ||
        currentProduct.name.toLowerCase().includes('t iron');

      console.log('🔍 T-Iron Detection Check:', {
        productName: currentProduct.name,
        track_inventory: currentProduct.track_inventory,
        unit_type: currentProduct.unit_type,
        isTIronProduct,
        shouldShowCalculator: isTIronProduct
      });

      if (isTIronProduct) {
        // Show T-Iron calculator for all T-Iron products regardless of inventory settings
        setSelectedTIronProduct(currentProduct);
        setShowTIronCalculator(true);
        setProductSearch('');
        setShowProductDropdown(false);
        return;
      }

      // Skip stock validation for non-stock products (track_inventory = 0)
      if (currentProduct.track_inventory !== 0 && getStockAsNumber(currentProduct.current_stock, currentProduct.unit_type) < 1) {
        toast.error(`${currentProduct.name} is out of stock`);
        return;
      }
      // Always start with quantity 1 for all units
      const initialQuantity = "1";
      const initialQuantityNum = 1;

      // Debug logging for T-Iron products
      if (currentProduct.name.toLowerCase().includes('t-iron') ||
        currentProduct.name.toLowerCase().includes('tiron') ||
        currentProduct.name.toLowerCase().includes('t iron')) {
        console.log('🔍 T-Iron Product Debug:', {
          name: currentProduct.name,
          track_inventory: currentProduct.track_inventory,
          unit_type: currentProduct.unit_type,
          isNonStock: currentProduct.track_inventory === 0,
          willForceNonStock: true
        });
      }

      const newItem: InvoiceItem = {
        id: `item_${Date.now()}_${Math.random()}`,
        product_id: currentProduct.id,
        product_name: currentProduct.name,
        quantity: initialQuantity,
        unit_price: currentProduct.rate_per_unit,
        total_price: calculateTotal(initialQuantityNum, currentProduct.rate_per_unit),
        unit: currentProduct.unit,
        available_stock: getStockAsNumber(currentProduct.current_stock, currentProduct.unit_type),
        unit_type: currentProduct.unit_type,
        length: undefined,
        pieces: undefined,
        // Non-stock item detection - Force T-Iron products to be non-stock
        is_non_stock_item: currentProduct.track_inventory === 0 ||
          currentProduct.name.toLowerCase().includes('t-iron') ||
          currentProduct.name.toLowerCase().includes('tiron') ||
          currentProduct.name.toLowerCase().includes('t iron')
      };

      // Initialize enhanced calculation for non-stock items - Force for T-Iron
      const isNonStock = currentProduct.track_inventory === 0 ||
        currentProduct.name.toLowerCase().includes('t-iron') ||
        currentProduct.name.toLowerCase().includes('tiron') ||
        currentProduct.name.toLowerCase().includes('t iron');
      console.log('🔧 Non-stock check:', {
        productName: currentProduct.name,
        isNonStock,
        track_inventory: currentProduct.track_inventory,
        isTIron: currentProduct.name.toLowerCase().includes('t-iron') || currentProduct.name.toLowerCase().includes('tiron')
      });

      if (isNonStock) {
        console.log('✅ Initializing enhanced calculation for:', currentProduct.name);
        initializeNonStockCalculation(newItem.id, true);
      }

      setFormData(prev => ({
        ...prev,
        items: [...prev.items, newItem]
      }));
    }

    setProductSearch('');
    setShowProductDropdown(false);
    toast.success(`${currentProduct.name} added to invoice`);
  };

  // T-Iron calculator callbacks
  const handleTIronCalculationComplete = (calculatedItem: any) => {
    // DEBUG: Log the received data
    console.log('🔧 T-Iron Calculator Data Received:', {
      pieces: calculatedItem.t_iron_pieces,
      lengthPerPiece: calculatedItem.t_iron_length_per_piece,
      totalFeet: calculatedItem.t_iron_total_feet,
      unit: calculatedItem.t_iron_unit,
      pricePerFoot: calculatedItem.unit_price,
      totalPrice: calculatedItem.total_price,
      description: calculatedItem.product_description
    });

    if (editingTIronItemId) {
      // Update existing item
      setFormData(prev => ({
        ...prev,
        items: prev.items.map(item => {
          if (item.id === editingTIronItemId) {
            const updatedItem = {
              ...item,
              quantity: calculatedItem.quantity.toString(), // Total feet
              unit_price: calculatedItem.unit_price, // Price per foot
              total_price: calculatedItem.total_price,
              // T-Iron specific calculation data
              t_iron_pieces: calculatedItem.t_iron_pieces,
              t_iron_length_per_piece: calculatedItem.t_iron_length_per_piece,
              t_iron_total_feet: calculatedItem.t_iron_total_feet,
              t_iron_unit: calculatedItem.t_iron_unit,
              product_description: calculatedItem.product_description,
              is_non_stock_item: calculatedItem.is_non_stock_item
            };

            // DEBUG: Log the updated item
            console.log('🔧 Updated Existing T-Iron Item:', {
              id: updatedItem.id,
              pieces: updatedItem.t_iron_pieces,
              lengthPerPiece: updatedItem.t_iron_length_per_piece,
              unit: updatedItem.t_iron_unit,
              totalFeet: updatedItem.t_iron_total_feet
            });

            return updatedItem;
          }
          return item;
        })
      }));

      toast.success(`T-Iron updated: ${calculatedItem.t_iron_pieces}${calculatedItem.t_iron_unit || 'pcs'} × ${calculatedItem.t_iron_length_per_piece}ft × Rs.${calculatedItem.unit_price}/ft = Rs.${calculatedItem.total_price}`);
    } else {
      // Add new item
      const newItem: InvoiceItem = {
        id: `item_${Date.now()}_${Math.random()}`,
        product_id: calculatedItem.product_id,
        product_name: calculatedItem.product_name,
        quantity: calculatedItem.quantity.toString(), // Total feet
        unit_price: calculatedItem.unit_price, // Price per foot
        total_price: calculatedItem.total_price,
        unit: calculatedItem.unit,
        available_stock: 0, // Non-stock items don't track stock
        unit_type: 'foot',
        // T-Iron specific calculation data
        t_iron_pieces: calculatedItem.t_iron_pieces,
        t_iron_length_per_piece: calculatedItem.t_iron_length_per_piece,
        t_iron_total_feet: calculatedItem.t_iron_total_feet,
        t_iron_unit: calculatedItem.t_iron_unit, // Add the unit field
        product_description: calculatedItem.product_description,
        is_non_stock_item: calculatedItem.is_non_stock_item
      };

      // DEBUG: Log the created invoice item
      console.log('🔧 New T-Iron Item Created:', {
        pieces: newItem.t_iron_pieces,
        lengthPerPiece: newItem.t_iron_length_per_piece,
        totalFeet: newItem.t_iron_total_feet,
        unit: newItem.t_iron_unit,
        pricePerFoot: newItem.unit_price,
        totalPrice: newItem.total_price,
        quantity: newItem.quantity
      });

      setFormData(prev => ({
        ...prev,
        items: [...prev.items, newItem]
      }));

      toast.success(`T-Iron added: ${calculatedItem.t_iron_pieces}${calculatedItem.t_iron_unit || 'pcs'} × ${calculatedItem.t_iron_length_per_piece}ft × Rs.${calculatedItem.unit_price}/ft = Rs.${calculatedItem.total_price}`);
    }

    setShowTIronCalculator(false);
    setSelectedTIronProduct(null);
    setEditingTIronItemId(null);
  };

  const handleTIronCalculatorCancel = () => {
    setShowTIronCalculator(false);
    setSelectedTIronProduct(null);
    setEditingTIronItemId(null);
  };

  // Add miscellaneous item function
  const addMiscItem = () => {
    if (!miscItemDescription.trim()) {
      toast.error('Please enter item description');
      return;
    }
    if (!miscItemPrice || miscItemPrice <= 0) {
      toast.error('Please enter valid price');
      return;
    }

    const newMiscItem: InvoiceItem = {
      id: `misc_${Date.now()}_${Math.random()}`,
      product_id: null,
      product_name: miscItemDescription.trim(),
      quantity: '1',
      unit_price: miscItemPrice,
      total_price: miscItemPrice,
      unit: 'item',
      available_stock: 0,
      unit_type: 'pieces',
      length: undefined,
      pieces: undefined,
      is_misc_item: true,
      misc_description: miscItemDescription.trim()
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newMiscItem]
    }));

    // Clear misc item inputs
    setMiscItemDescription('');
    setMiscItemPrice(0);
    toast.success('Miscellaneous item added to invoice');
  };

  // YOUR ORIGINAL UPDATE QUANTITY FUNCTION
  const updateItemQuantity = (itemId: string, newQuantityString: string) => {
    // Check if this is a miscellaneous item - they can't have quantity changed
    const targetItem = formData.items.find(item => item.id === itemId);
    if (targetItem?.is_misc_item) {
      return; // Don't allow quantity changes for misc items
    }

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

        // Skip stock validation for non-stock products (track_inventory = 0)
        if (currentProduct.track_inventory !== 0 && !isStockSufficient(currentProduct.current_stock, newQuantityString, currentProduct.unit_type)) {
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
        let newTotalPrice = 0;

        // Handle miscellaneous items
        if (item.is_misc_item) {
          newTotalPrice = newPrice; // For misc items, total = price (quantity is always 1)
        } else {
          // Handle product items
          const currentProduct = products.find(p => p.id === item.product_id);
          if (currentProduct?.unit_type === 'kg-grams') {
            const parsed = parseUnit(item.quantity, 'kg-grams');
            const kg = typeof parsed.kg === 'number' ? parsed.kg : 0;
            const grams = typeof parsed.grams === 'number' ? parsed.grams : 0;
            newTotalPrice = (kg + grams / 1000) * newPrice;
          } else {
            const quantityNum = getQuantityAsNumber(item.quantity, currentProduct?.unit_type);
            newTotalPrice = quantityNum * newPrice;
          }
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

  // Update item length or pieces
  const updateItemLengthPieces = (itemId: string, field: 'length' | 'pieces' | 'clear', value?: number) => {
    console.log('🔍 DEBUG: updateItemLengthPieces called:', { itemId, field, value, valueType: typeof value });

    const newItems = formData.items.map(item => {
      if (item.id === itemId) {
        console.log('🔍 DEBUG: Found matching item:', item.product_name, 'Current L/pcs:', { length: item.length, pieces: item.pieces });

        if (field === 'clear') {
          console.log('🔍 DEBUG: Clearing L/pcs for item:', item.product_name);
          return {
            ...item,
            length: undefined,
            pieces: undefined
          };
        } else {
          console.log(`🔍 DEBUG: Setting ${field} = ${value} (${typeof value}) for item:`, item.product_name);
          const updatedItem = {
            ...item,
            [field]: value
          };
          console.log('🔍 DEBUG: Updated item result:', updatedItem);
          return updatedItem;
        }
      }
      return item;
    });

    console.log('🔍 DEBUG: Updated items:', newItems.map(item => ({
      id: item.id,
      product_name: item.product_name,
      length: item.length,
      pieces: item.pieces,
      lengthType: typeof item.length,
      piecesType: typeof item.pieces
    })));

    console.log('🔍 DEBUG: Full updated items array:', newItems);

    setFormData(prev => ({ ...prev, items: newItems }));

    // Debug: Check state after update
    setTimeout(() => {
      console.log('🔍 DEBUG: State after update:', formData.items.find(item => item.id === itemId));
    }, 100);
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

    // Customer validation
    if (isGuestMode) {
      if (!guestCustomer.name.trim()) {
        newErrors.customer_id = 'Guest customer name is required';
      }
    } else {
      // For regular customers, check both formData and selectedCustomer
      // Note: Guest Customer has ID -1 and should be considered valid
      const hasValidCustomerId = formData.customer_id && Number.isInteger(formData.customer_id) && (formData.customer_id > 0 || formData.customer_id === -1);
      const hasValidSelectedCustomer = selectedCustomer && selectedCustomer.id && Number.isInteger(selectedCustomer.id) && (selectedCustomer.id > 0 || selectedCustomer.id === -1);

      if (!hasValidCustomerId && !hasValidSelectedCustomer) {
        newErrors.customer_id = 'Please select a valid customer';
        console.warn('🔍 Customer validation failed:', {
          formDataCustomerId: formData.customer_id,
          selectedCustomer: selectedCustomer,
          hasValidCustomerId,
          hasValidSelectedCustomer
        });
      }
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

    // Guest mode: enforce full payment (no credit/partial payment allowed)
    if (isGuestMode && formData.payment_amount < calculations.grandTotal) {
      newErrors.payment_amount = 'Guest customers must pay the full amount. No credit allowed.';
    }

    const stockIssues: string[] = [];
    formData.items.forEach(item => {
      const currentProduct = products.find(p => p.id === item.product_id);
      // Skip stock validation for non-stock products (track_inventory = 0)
      if (currentProduct && currentProduct.track_inventory !== 0 && !isStockSufficient(currentProduct.current_stock, item.quantity, currentProduct.unit_type)) {
        stockIssues.push(`${item.product_name} (Required: ${formatUnitString(item.quantity, currentProduct.unit_type || 'kg-grams')}, Available: ${formatUnitString(currentProduct.current_stock, currentProduct.unit_type || 'kg-grams')})`);
      }
    });

    if (stockIssues.length > 0) {
      newErrors.stock = `Insufficient stock for: ${stockIssues.join(', ')}`;
    }

    // Debug logging
    console.log('🔍 Form validation:', {
      isGuestMode,
      guestCustomerName: guestCustomer.name,
      formDataCustomerId: formData.customer_id,
      selectedCustomerId: selectedCustomer?.id,
      selectedCustomerName: selectedCustomer?.name,
      itemsCount: formData.items.length,
      errors: newErrors
    });

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
      if (isEditMode && editingInvoice) {
        // UPDATE MODE - Edit existing invoice
        await handleUpdateInvoice();
      } else {
        // CREATE MODE - Create new invoice
        await handleCreateInvoice();
      }
    } catch (error: any) {
      console.error('Invoice operation error:', error);

      // Enhanced error handling for database lock issues
      if (error.message?.includes('database is locked') || error.code === 5) {
        toast.error('Database is currently busy. Please wait a moment and try again.', {
          duration: 4000,
          icon: '🔒'
        });
      } else if (error.message?.includes('UNIQUE constraint failed')) {
        toast.error('Duplicate record detected. Please refresh and try again.', {
          duration: 4000,
          icon: '⚠️'
        });
      } else {
        toast.error(error.message || `Failed to ${isEditMode ? 'update' : 'create'} invoice`, {
          duration: 4000,
          icon: '❌'
        });
      }
    } finally {
      setCreating(false);
    }
  };

  // Handle invoice creation (original logic)
  const handleCreateInvoice = async () => {
    // Prepare invoice data
    let payment_amount = formData.payment_amount;
    let customer_id: number;
    let customer_name = '';

    if (isGuestMode) {
      // For guest customers, use a special customer ID (-1) to satisfy NOT NULL constraint
      customer_id = -1;
      customer_name = guestCustomer.name;
      payment_amount = formData.payment_amount; // Guest customers pay what they specify
    } else {
      // Regular customer - ensure we have a valid customer_id
      if (!formData.customer_id && !selectedCustomer?.id) {
        throw new Error('No customer selected. Please select a customer or switch to guest mode.');
      }

      // Use selectedCustomer.id as primary source, formData.customer_id as fallback
      customer_id = selectedCustomer?.id || formData.customer_id!;

      // Validate that customer_id is a valid positive integer
      if (!customer_id || !Number.isInteger(customer_id) || customer_id <= 0) {
        console.error('Invalid customer ID:', {
          selectedCustomerId: selectedCustomer?.id,
          formDataCustomerId: formData.customer_id,
          resolvedCustomerId: customer_id
        });
        throw new Error('Invalid customer ID. Please select a valid customer.');
      }

      customer_name = selectedCustomer?.name || '';

      // DO NOT auto-apply credit during invoice creation
      // Credit will be applied post-invoice creation if payment < total
      payment_amount = formData.payment_amount;
    }

    const invoiceData = {
      customer_id,
      customer_name,
      customer_phone: isGuestMode ? guestCustomer.phone : selectedCustomer?.phone || '',
      customer_address: isGuestMode ? guestCustomer.address : selectedCustomer?.address || '',
      items: formData.items.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        length: item.length,
        pieces: item.pieces,
        is_misc_item: item.is_misc_item,
        misc_description: item.misc_description,
        // T-Iron calculation fields
        t_iron_pieces: item.t_iron_pieces,
        t_iron_length_per_piece: item.t_iron_length_per_piece,
        t_iron_total_feet: item.t_iron_total_feet,
        t_iron_unit: item.t_iron_unit, // Add unit type
        product_description: item.product_description,
        is_non_stock_item: item.is_non_stock_item
      })),
      discount: formData.discount,
      payment_amount,
      payment_method: formData.payment_method,
      payment_channel_id: selectedPaymentChannel?.id || null,
      payment_channel_name: selectedPaymentChannel?.name || formData.payment_method,
      notes: formData.notes,
      date: formData.date, // User-selected or current system date
      time: formData.time  // User-selected or current system time
    };

    // Debug: Log items with L/pcs data before sending to database
    console.log('🔍 DEBUG: Creating invoice with items:', invoiceData.items);
    invoiceData.items.forEach((item, index) => {
      console.log(`🔍 Form Item ${index + 1}:`, {
        product_name: item.product_name,
        length: item.length,
        pieces: item.pieces,
        lengthType: typeof item.length,
        piecesType: typeof item.pieces
      });
    });

    // 🔥 ENHANCED INVOICE DATA: Include credit application during invoice creation
    const enhancedInvoiceData = {
      ...invoiceData,
      // Add credit application if available and needed
      applyCredit: (!isGuestMode && selectedCustomer && selectedCustomer.balance < 0 && creditPreview && creditPreview.willUseCredit > 0)
        ? creditPreview.willUseCredit
        : undefined
    };

    console.log('Creating invoice with integrated credit application:', enhancedInvoiceData);

    // Create invoice - the database will handle credit application internally during creation
    const result = await db.createInvoice(enhancedInvoiceData);

    // 🎉 SUCCESS: Credit is now applied during invoice creation, no post-processing needed!
    if (!isGuestMode && selectedCustomer && selectedCustomer.balance < 0 && creditPreview && creditPreview.willUseCredit > 0) {
      console.log('✅ Customer credit applied during invoice creation:', {
        invoiceId: result.id,
        creditApplied: creditPreview.willUseCredit,
        invoiceTotal: result.grand_total,
        totalPaid: result.payment_amount
      });

      toast.success(`Invoice created! Credit applied: Rs. ${creditPreview.willUseCredit.toFixed(2)} from customer balance`, {
        duration: 4000,
        icon: '💳'
      });
    }

    // Log activity
    try {
      await activityLogger.logInvoiceCreated(
        result.bill_number,
        customer_name,
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

    const modeText = isGuestMode ? ' (Guest Customer)' : '';
    toast.success(`Invoice created successfully${modeText}! Bill Number: ${formatInvoiceNumber(result.bill_number)}`, {
      duration: 5000
    });

    resetForm();
    await loadInitialData(false);
  };

  // Handle invoice update (new logic)
  const handleUpdateInvoice = async () => {
    if (!editingInvoice) return;

    const updateData = {
      discount: formData.discount,
      notes: formData.notes,
      payment_amount: formData.payment_amount,
      payment_method: formData.payment_method,
      items: formData.items.map(item => ({
        id: item.id.startsWith('item-') ? parseInt(item.id.replace('item-', '')) : undefined,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        unit: item.unit,
        length: item.length,
        pieces: item.pieces,
        is_misc_item: item.is_misc_item,
        misc_description: item.misc_description,
        t_iron_pieces: item.t_iron_pieces,
        t_iron_length_per_piece: item.t_iron_length_per_piece,
        t_iron_total_feet: item.t_iron_total_feet,
        t_iron_unit: item.t_iron_unit,
        is_non_stock_item: item.is_non_stock_item
      }))
    };

    console.log('🔄 [EDIT-MODE] Updating invoice:', editingInvoice.id, updateData);

    const result = await db.updateInvoice(editingInvoice.id, updateData);

    if (result.success) {
      // Log activity
      try {
        await activityLogger.logInvoiceUpdated(
          editingInvoice.bill_number,
          editingInvoice.customer_name,
          { amount: calculations.grandTotal }
        );
      } catch (error) {
        console.error('Failed to log invoice update activity:', error);
      }

      // Success
      import('../../utils/eventBus').then(({ triggerInvoiceUpdatedRefresh }) => {
        triggerInvoiceUpdatedRefresh(editingInvoice);
      });

      toast.success(`Invoice #${editingInvoice.bill_number} updated successfully!`, {
        duration: 5000
      });

      // Navigate back to invoice view
      navigate(`/billing/view/${editingInvoice.id}`);
    } else {
      throw new Error(result.error?.message || 'Failed to update invoice');
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
  {
    creating ? (
      <>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
        Creating Invoice... {/* This will show retry attempts automatically via toast */}
      </>
    ) : (
      <>
        <CheckCircle className="h-4 w-4 mr-2" />
        Create Invoice & Update Stock
      </>
    )
  }

  // ADDITIONAL: Add this helper function to your component for better UX
  const [retryCount] = useState(0);

  // Update the submit button to show retry status
  const getSubmitButtonText = () => {
    if (creating) {
      if (retryCount > 0) {
        return `Retrying... (${retryCount}/3)`;
      }
      return isEditMode ? 'Updating Invoice...' : 'Creating Invoice...';
    }
    return isEditMode ? 'Update Invoice & Stock' : 'Create Invoice & Update Stock';
  };

  // And update your button text:
  {
    creating ? (
      <>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
        {getSubmitButtonText()}
      </>
    ) : (
      <>
        <CheckCircle className="h-4 w-4 mr-2" />
        {isEditMode ? 'Update Invoice & Stock' : 'Create Invoice & Update Stock'}
      </>
    )
  }
  const resetForm = () => {
    setFormData({
      customer_id: null,
      items: [],
      discount: 0,
      payment_amount: 0,
      payment_method: paymentChannels.length > 0 ? paymentChannels[0].name : 'cash',
      notes: '',
      date: getSystemDateForInput(), // Reset to current system date
      time: getSystemTimeForInput()  // Reset to current system time
    });
    setSelectedCustomer(null);
    setCustomerSearch('');
    setProductSearch('');
    setStockPreview([]);
    setErrors({});

    // Reset guest customer state
    setIsGuestMode(false);
    setGuestCustomer({ name: '', phone: '', address: '' });
    setGuestCustomer({ name: '', phone: '', address: '' });
    setShowCustomerModal(false);

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
            <h1 className="text-xl font-bold text-gray-900">
              {isEditMode ? `Edit Invoice #${editingInvoice?.bill_number || ''}` : 'Create New Invoice'}
            </h1>
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
              disabled={!hasValidCustomer() || formData.items.length === 0 || creating}
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
              <div className="flex items-center space-x-2">
                {/* Guest Mode Toggle */}
                <button
                  onClick={toggleGuestMode}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${isGuestMode
                    ? 'bg-orange-100 text-orange-700 border border-orange-300'
                    : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                    }`}
                >
                  {isGuestMode ? 'Guest Mode' : 'Regular Mode'}
                </button>
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
            </div>

            {isGuestMode ? (
              /* Guest Customer Form */
              <div className="space-y-3">
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-700 mb-2 font-medium">Guest Customer (One-time Invoice)</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Customer Name *"
                      value={guestCustomer.name}
                      onChange={(e) => handleGuestCustomerChange('name', e.target.value)}
                      className="px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                    <input
                      type="text"
                      placeholder="Phone Number"
                      value={guestCustomer.phone}
                      onChange={(e) => handleGuestCustomerChange('phone', e.target.value)}
                      className="px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                    <input
                      type="text"
                      placeholder="Address (Optional)"
                      value={guestCustomer.address}
                      onChange={(e) => handleGuestCustomerChange('address', e.target.value)}
                      className="md:col-span-2 px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                  {errors.customer_id && (
                    <p className="mt-1 text-sm text-red-600">{errors.customer_id}</p>
                  )}
                </div>
              </div>
            ) : !selectedCustomer ? (
              <div className="space-y-3">
                {/* Customer Search */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => handleCustomerSearch(e.target.value)}
                    onFocus={() => setShowCustomerDropdown(true)}
                    placeholder="Search customers by name, phone, or CNIC..."
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.customer_id ? 'border-red-500' : 'border-gray-300'
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
                      ) : customerSearch.trim() ? (
                        <div className="p-3">
                          <div className="text-gray-500 text-center mb-2">No customers found</div>
                          <button
                            onClick={() => setShowCustomerModal(true)}
                            className="w-full px-3 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm"
                          >
                            + Create New Customer
                          </button>
                        </div>
                      ) : (
                        <div className="p-3 text-gray-500 text-center">Start typing to search</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Create New Customer Button */}
                <div className="text-center">
                  <button
                    onClick={() => setShowCustomerModal(true)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    + Add New Customer
                  </button>
                </div>
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
                        className={`p-3 hover:bg-green-50 cursor-pointer border-b border-gray-100 last:border-b-0 ${product.track_inventory !== 0 && getStockAsNumber(product.current_stock, product.unit_type) === 0 ? 'opacity-50' : ''
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
                            {product.track_inventory !== 0 ? (
                              <>
                                <div className={`text-sm font-medium ${getStockAsNumber(product.current_stock, product.unit_type) <= getAlertLevelAsNumber(product.min_stock_alert, product.unit_type)
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
                              </>
                            ) : (
                              <div className="text-sm font-medium text-blue-600">Non-Stock Item</div>
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

            {/* Miscellaneous Items Section */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <Plus className="h-4 w-4 mr-2 text-blue-600" />
                Add Miscellaneous Item
              </h4>
              <div className="space-y-3">
                <div className="w-full">
                  <input
                    type="text"
                    value={miscItemDescription}
                    onChange={(e) => setMiscItemDescription(e.target.value)}
                    placeholder="Enter item description (e.g., Labor-T Iron, Rent, Fare)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />

                  {/* Quick selection buttons */}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setMiscItemDescription('Labor-T Iron')}
                      className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                    >
                      Labor-T Iron
                    </button>
                    <button
                      type="button"
                      onClick={() => setMiscItemDescription('Transport')}
                      className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      Transport
                    </button>
                    <button
                      type="button"
                      onClick={() => setMiscItemDescription('Service Charge')}
                      className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      Service Charge
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={miscItemPrice || ''}
                    onChange={(e) => setMiscItemPrice(parseFloat(e.target.value) || 0)}
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="Price"
                    min="0"
                    step="0.01"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={addMiscItem}
                    disabled={!miscItemDescription.trim() || !miscItemPrice || miscItemPrice <= 0}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </button>
                </div>
              </div>
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
                              <div className="font-medium text-gray-900 flex items-center">
                                {/* Show icon for misc vs product items */}
                                {item.is_misc_item ? (
                                  <span className="mr-2 text-blue-600" title="Miscellaneous Item">📄</span>
                                ) : (
                                  <span className="mr-2 text-green-600" title="Product Item">📦</span>
                                )}
                                {/* Display product name with T-Iron calculation or regular length/pieces */}
                                {item.product_name}
                                {item.t_iron_pieces && item.t_iron_length_per_piece ? (
                                  <span className="text-sm text-blue-600 ml-2">
                                    ({item.t_iron_pieces}{item.t_iron_unit || 'pcs'} × {item.t_iron_length_per_piece}ft/{item.t_iron_unit || 'pcs'} × Rs.{item.unit_price})
                                  </span>
                                ) : (
                                  <>
                                    {item.length && ` • ${item.length}/L`}
                                    {item.pieces && ` • ${item.pieces}/pcs`}
                                  </>
                                )}
                              </div>
                              {/* Show different info for misc vs product items */}
                              {item.is_misc_item ? (
                                <div className="text-xs text-blue-600">
                                  Miscellaneous Item
                                </div>
                              ) : item.is_non_stock_item ? (
                                <div className="text-xs text-green-600">
                                  Non-Stock Item • Total: {item.t_iron_total_feet || item.quantity} ft
                                </div>
                              ) : (
                                <div className="text-xs text-gray-500">
                                  Available: {formattedAvailableStock}
                                </div>
                              )}
                              {/* Enhanced calculation for non-stock items (but NOT T-Iron) */}
                              {!item.is_misc_item && item.is_non_stock_item &&
                                !item.product_name.toLowerCase().includes('t-iron') &&
                                !item.product_name.toLowerCase().includes('tiron') &&
                                !item.product_name.toLowerCase().includes('t iron') && (
                                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                                    <div className="text-xs font-medium text-blue-800 mb-2">Enhanced Calculation</div>
                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                      <div>
                                        <input
                                          type="number"
                                          placeholder="Qty"
                                          value={nonStockCalculation[item.id]?.baseQuantity || '1'}
                                          onChange={(e) => updateNonStockCalculation(item.id, 'baseQuantity', e.target.value)}
                                          onWheel={(e) => e.currentTarget.blur()}
                                          className="w-full px-1 py-1 border border-gray-300 rounded text-xs"
                                        />
                                        <select
                                          value={nonStockCalculation[item.id]?.baseUnit || 'pcs'}
                                          onChange={(e) => updateNonStockCalculation(item.id, 'baseUnit', e.target.value)}
                                          className="w-full mt-1 px-1 py-1 border border-gray-300 rounded text-xs"
                                        >
                                          <option value="pcs">pcs</option>
                                          <option value="L">L</option>
                                        </select>
                                      </div>
                                      <div>
                                        <input
                                          type="number"
                                          placeholder="Length"
                                          value={nonStockCalculation[item.id]?.multiplierQuantity || '1'}
                                          onChange={(e) => updateNonStockCalculation(item.id, 'multiplierQuantity', e.target.value)}
                                          onWheel={(e) => e.currentTarget.blur()}
                                          className="w-full px-1 py-1 border border-gray-300 rounded text-xs"
                                        />
                                        <select
                                          value={nonStockCalculation[item.id]?.multiplierUnit || 'ft'}
                                          onChange={(e) => updateNonStockCalculation(item.id, 'multiplierUnit', e.target.value)}
                                          className="w-full mt-1 px-1 py-1 border border-gray-300 rounded text-xs"
                                        >
                                          <option value="ft">ft</option>
                                          <option value="L">L</option>
                                        </select>
                                      </div>
                                      <div>
                                        <input
                                          type="number"
                                          placeholder="Price"
                                          value={nonStockCalculation[item.id]?.unitPrice || item.unit_price.toString()}
                                          onChange={(e) => updateNonStockCalculation(item.id, 'unitPrice', e.target.value)}
                                          onWheel={(e) => e.currentTarget.blur()}
                                          className="w-full px-1 py-1 border border-gray-300 rounded text-xs"
                                        />
                                        <div className="text-xs text-gray-500 mt-1">per unit</div>
                                      </div>
                                    </div>
                                    <div className="mt-2 text-xs text-blue-700 font-medium">
                                      Formula: {getNonStockDisplayText(item.id)} = Rs.{calculateNonStockTotal(item.id).toFixed(2)}
                                    </div>
                                  </div>
                                )}
                              {/* Quick add L/pcs buttons - only for regular product items */}
                              {!item.is_misc_item && !item.is_non_stock_item && (
                                <div className="flex items-center gap-1 mt-1">
                                  <button
                                    onClick={() => {
                                      const value = prompt('Enter length (L):');
                                      if (value && !isNaN(Number(value))) {
                                        updateItemLengthPieces(item.id, 'length', Number(value));
                                      }
                                    }}
                                    className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded border border-blue-200"
                                    title="Add length (L)"
                                  >
                                    +L
                                  </button>
                                  <button
                                    onClick={() => {
                                      const value = prompt('Enter pieces:');
                                      if (value && !isNaN(Number(value))) {
                                        updateItemLengthPieces(item.id, 'pieces', Number(value));
                                      }
                                    }}
                                    className="text-xs px-1.5 py-0.5 bg-green-50 text-green-600 hover:bg-green-100 rounded border border-green-200"
                                    title="Add pieces"
                                  >
                                    +pcs
                                  </button>
                                  {(item.length || item.pieces) && (
                                    <button
                                      onClick={() => updateItemLengthPieces(item.id, 'clear')}
                                      className="text-xs px-1.5 py-0.5 bg-red-50 text-red-600 hover:bg-red-100 rounded border border-red-200"
                                      title="Clear L/pcs"
                                    >
                                      ×
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            {item.is_misc_item ? (
                              <div className="text-center text-gray-500 text-sm">
                                1 item
                              </div>
                            ) : (() => {
                              // Check if this is a T-Iron product
                              const isTIronProduct = item.product_name.toLowerCase().includes('t-iron') ||
                                item.product_name.toLowerCase().includes('tiron') ||
                                item.product_name.toLowerCase().includes('t iron');

                              if (isTIronProduct && item.t_iron_pieces && item.t_iron_length_per_piece) {
                                // T-Iron product with calculator data - show the calculation
                                const unit = item.t_iron_unit || 'pcs';
                                return (
                                  <div className="text-center text-blue-600 text-sm">
                                    <div className="font-medium">
                                      {item.t_iron_pieces}{unit}
                                    </div>
                                    <div className="text-xs">
                                      × {item.t_iron_length_per_piece}ft/{unit}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      = {item.t_iron_total_feet}ft
                                    </div>
                                  </div>
                                );
                              } else if (item.is_non_stock_item && !isTIronProduct) {
                                // Other non-stock items use enhanced calculation
                                return (
                                  <div className="text-center text-blue-600 text-sm">
                                    <div className="font-medium">
                                      {(nonStockCalculation[item.id]?.baseQuantity || '1')}/{nonStockCalculation[item.id]?.baseUnit || 'pcs'}
                                    </div>
                                    <div className="text-xs">
                                      × {(nonStockCalculation[item.id]?.multiplierQuantity || '1')}{nonStockCalculation[item.id]?.multiplierUnit || 'ft'}
                                    </div>
                                  </div>
                                );
                              } else {
                                // Regular products with normal quantity editing
                                return (
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
                                      className={`w-16 h-6 text-center text-xs border focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${getQuantityAsNumber(item.quantity, item.unit_type) > item.available_stock ? 'border-red-500 bg-red-50' : 'border-gray-300'
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
                                );
                              }
                            })()}
                            {(() => {
                              // Check if this is a non-stock item (including T-Iron products)
                              const isTIronProduct = item.product_name.toLowerCase().includes('t-iron') ||
                                item.product_name.toLowerCase().includes('tiron') ||
                                item.product_name.toLowerCase().includes('t iron');
                              const isNonStock = item.is_non_stock_item || isTIronProduct;

                              return !item.is_misc_item && !isNonStock && getQuantityAsNumber(item.quantity, item.unit_type) > item.available_stock && (
                                <div className="text-xs text-red-500 mt-1">Exceeds stock!</div>
                              );
                            })()}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={item.unit_price}
                              onChange={(e) => updateItemPrice(item.id, parseCurrency(e.target.value))}
                              onWheel={(e) => e.currentTarget.blur()}
                              className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-3 py-2 font-medium text-gray-900">
                            {(() => {
                              // Check if this is a T-Iron product
                              const isTIronProduct = item.product_name.toLowerCase().includes('t-iron') ||
                                item.product_name.toLowerCase().includes('tiron') ||
                                item.product_name.toLowerCase().includes('t iron');

                              if (isTIronProduct && item.t_iron_pieces && item.t_iron_length_per_piece) {
                                // T-Iron product with calculator data - use the stored total_price
                                return (
                                  <div>
                                    <div>Rs. {item.total_price.toFixed(2)}</div>
                                    <div className="text-xs text-gray-500">(T-Iron Calc)</div>
                                  </div>
                                );
                              } else if (item.is_non_stock_item && !isTIronProduct) {
                                // Other non-stock items use enhanced calculation
                                return (
                                  <div>
                                    <div>Rs. {calculateNonStockTotal(item.id).toFixed(2)}</div>
                                    <div className="text-xs text-gray-500">(Enhanced Calc)</div>
                                  </div>
                                );
                              } else {
                                // Regular items
                                return <div>Rs. {item.total_price.toFixed(2)}</div>;
                              }
                            })()}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center space-x-1">
                              {/* T-Iron Calculator Button */}
                              {!item.is_misc_item && item.unit_type === 'foot' &&
                                item.product_name.toLowerCase().includes('t-iron') && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const product = products.find(p => p.id === item.product_id);
                                      if (product) {
                                        setSelectedTIronProduct(product);
                                        setEditingTIronItemId(item.id); // Track which item we're editing
                                        setShowTIronCalculator(true);
                                      }
                                    }}
                                    className="text-blue-600 hover:text-blue-800"
                                    title="T-Iron Calculator"
                                  >
                                    <Calculator className="h-4 w-4" />
                                  </button>
                                )}
                              {/* Delete Button */}
                              <button
                                type="button"
                                onClick={() => removeItem(item.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
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
                      className={`p-2 text-sm rounded border transition-colors ${selectedPaymentChannel?.id === channel.id
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Amount
                  {isGuestMode && (
                    <span className="text-red-600 text-xs ml-1">(Full payment required)</span>
                  )}
                </label>
                <input
                  type="number"
                  min="0"
                  max={calculations.grandTotal}
                  step="0.1"
                  value={formData.payment_amount}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    payment_amount: parseCurrency(e.target.value)
                  }))}
                  onWheel={(e) => e.currentTarget.blur()}
                  className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-green-500 ${errors.payment_amount ? 'border-red-500' : 'border-gray-300'
                    } ${isGuestMode ? 'bg-red-50 border-red-300' : ''}`}
                  placeholder="0.0"
                  disabled={isGuestMode} // Disable editing in guest mode since it must be full amount
                />
                {isGuestMode && (
                  <p className="text-xs text-red-600 mt-1">
                    Guest customers must pay the full amount (Rs. {formatCurrency(calculations.grandTotal)}). No credit allowed.
                  </p>
                )}
                {errors.payment_amount && (
                  <p className="text-xs text-red-600 mt-1">{errors.payment_amount}</p>
                )}
              </div>

              {/* Credit Preview */}
              {creditPreview && (
                <div className="p-3 rounded-lg border border-blue-200 bg-blue-50">
                  <div className="flex items-center mb-2">
                    <DollarSign className="h-4 w-4 mr-1 text-blue-600" />
                    <span className="font-medium text-blue-700 text-sm">Credit Preview</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Available Credit:</span>
                      <span className="font-medium text-blue-600">Rs. {creditPreview.availableCredit.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Will Use:</span>
                      <span className="font-medium text-green-600">Rs. {creditPreview.willUseCredit.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Remaining Credit:</span>
                      <span className="font-medium text-blue-600">Rs. {creditPreview.remainingCredit.toFixed(2)}</span>
                    </div>
                    {creditPreview.outstandingAfterCredit > 0 && (
                      <div className="flex justify-between pt-1 border-t border-blue-300">
                        <span className="text-gray-600">Outstanding After Credit:</span>
                        <span className="font-medium text-orange-600">Rs. {creditPreview.outstandingAfterCredit.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-blue-600 mt-2 italic">
                    Credit will be applied automatically after invoice creation
                  </div>
                </div>
              )}

              {/* Balance Display */}
              <div className={`p-3 rounded-lg border ${calculations.remainingBalance > 0
                ? 'border-orange-200 bg-orange-50'
                : 'border-green-200 bg-green-50'
                }`}>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-gray-700">Remaining Balance:</span>
                  <span className={`font-bold ${calculations.remainingBalance > 0 ? 'text-orange-600' : 'text-green-600'
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
              {/* Date and Time Fields */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Date</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, date: getSystemDateForInput() }))}
                      className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-300 rounded hover:bg-blue-50"
                      title="Set to current date"
                    >
                      Now
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Time</label>
                  <div className="flex gap-2">
                    <input
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, time: getSystemTimeForInput() }))}
                      className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-300 rounded hover:bg-blue-50"
                      title="Set to current time"
                    >
                      Now
                    </button>
                  </div>
                </div>
              </div>

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
              disabled={!hasValidCustomer() || formData.items.length === 0 || creating || stockPreview.some(p => p.status === 'insufficient')}
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
                  {isEditMode ? 'Update Invoice & Stock' : 'Create Invoice & Update Stock'}
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
                  className={`p-3 rounded-lg border ${stock.status === 'insufficient' ? 'border-red-200 bg-red-50' :
                    stock.status === 'low' ? 'border-yellow-200 bg-yellow-50' :
                      'border-green-200 bg-green-50'
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 text-sm">{stock.product_name}</h4>
                    <span className={`text-xs px-2 py-1 rounded-full ${stock.status === 'insufficient' ? 'bg-red-100 text-red-800' :
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

      {/* Customer Creation Modal */}
      <Modal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        title="Add New Customer"
      >
        <CustomerForm
          customer={null}
          onSuccess={handleCustomerCreated}
        />
      </Modal>

      {/* T-Iron Calculator Modal */}
      {showTIronCalculator && selectedTIronProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <TIronCalculator
              product={selectedTIronProduct}
              onCalculationComplete={handleTIronCalculationComplete}
              onCancel={handleTIronCalculatorCancel}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceForm;