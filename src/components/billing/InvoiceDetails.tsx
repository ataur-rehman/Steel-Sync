import React, { useState, useEffect } from 'react';
import { db } from '../../services/database';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/calculations';
import { parseCurrency } from '../../utils/currency';
import { formatUnitString, parseUnit, validateUnit, getUnitTypeConfig } from '../../utils/unitUtils';
import { formatInvoiceNumber, formatInvoiceNumberForPrint } from '../../utils/numberFormatting';
import { formatDateTime, formatDate } from '../../utils/formatters';
import { getCurrentSystemDateTime } from '../../utils/systemDateTime';
import { TIronCalculator } from './TIronCalculator';

import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  DollarSign,
  Package,
  User,
  CreditCard,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Phone,
  ArrowLeft,
  Printer,
  Copy,
  ChevronDown,
  Calculator,
  ChevronUp,
  Undo2
} from 'lucide-react';

interface InvoiceDetailsProps {
  invoiceId: number;
  onClose: () => void;
  onUpdate?: () => void;
}

interface InvoiceItem {
  id: number;
  product_id: number | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  unit?: string;
  length?: number;
  pieces?: number;
  is_misc_item?: boolean;
  misc_description?: string;
  created_at?: string;
  updated_at?: string;
  // T-Iron calculation fields
  t_iron_pieces?: number;
  t_iron_length_per_piece?: number;
  t_iron_total_feet?: number;
  t_iron_unit?: string; // Unit type: 'pcs' or 'L'
  product_description?: string;
  is_non_stock_item?: boolean;
}

interface ReturnData {
  customer_id: number;
  customer_name?: string;
  original_invoice_id: number;
  original_invoice_number?: string;
  items: Array<{
    product_id: number;
    product_name: string;
    original_invoice_item_id: number;
    original_quantity: number;
    return_quantity: number;
    unit_price: number;
    total_price: number;
    unit?: string;
    reason?: string;
  }>;
  reason: string;
  settlement_type: 'ledger' | 'cash';
  notes?: string;
  created_by?: string;
}

interface ReturnModalState {
  isOpen: boolean;
  item: InvoiceItem | null;
  returnQuantity: string;
  reason: string;
  settlementType: 'ledger' | 'cash';
  notes: string;
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

const InvoiceDetails: React.FC<InvoiceDetailsProps> = ({ invoiceId, onClose, onUpdate }) => {
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [expandedPayments, setExpandedPayments] = useState(false);

  // Return functionality state
  const [returnModal, setReturnModal] = useState<ReturnModalState>({
    isOpen: false,
    item: null,
    returnQuantity: '',
    reason: 'Customer Request',
    settlementType: 'ledger',
    notes: ''
  });

  // Product selection for adding items
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemLength, setNewItemLength] = useState('');
  const [newItemPieces, setNewItemPieces] = useState('');

  // T-Iron Calculator state
  const [showTIronCalculator, setShowTIronCalculator] = useState(false);
  const [selectedTIronProduct, setSelectedTIronProduct] = useState<Product | null>(null);

  // Miscellaneous item state
  const [itemType, setItemType] = useState<'product' | 'misc'>('product');
  const [miscItemDescription, setMiscItemDescription] = useState('');
  const [miscItemPrice, setMiscItemPrice] = useState('');

  // Payment form
  const [newPayment, setNewPayment] = useState({
    amount: '',
    payment_method: 'cash',
    reference: '',
    notes: '',
    date: getCurrentSystemDateTime().dbDate // Use system date in YYYY-MM-DD format
  });

  // Payment channels
  const [paymentChannels, setPaymentChannels] = useState<any[]>([]);
  const [selectedPaymentChannel, setSelectedPaymentChannel] = useState<any>(null);

  // Item editing
  const [editQuantity, setEditQuantity] = useState('');

  // Function to reset add item form
  const resetAddItemForm = () => {
    setItemType('product');
    setSelectedProduct(null);
    setNewItemQuantity('');
    setNewItemPrice('');
    setNewItemLength('');
    setNewItemPieces('');
    setMiscItemDescription('');
    setMiscItemPrice('');
  };

  // T-Iron Calculator handlers
  const handleTIronCalculationComplete = async (calculatedItem: any) => {
    try {
      setSaving(true);

      // DEBUG: Log the received data (same as InvoiceForm)
      console.log('🔧 T-Iron Calculator Data Received in InvoiceDetails:', {
        pieces: calculatedItem.t_iron_pieces,
        lengthPerPiece: calculatedItem.t_iron_length_per_piece,
        totalFeet: calculatedItem.t_iron_total_feet,
        unit: calculatedItem.t_iron_unit,
        pricePerFoot: calculatedItem.unit_price,
        totalPrice: calculatedItem.total_price,
        description: calculatedItem.product_description,
        rawCalculatedItem: calculatedItem
      });

      const newItem = {
        product_id: calculatedItem.product_id,
        product_name: calculatedItem.product_name,
        quantity: calculatedItem.quantity.toString(), // Total feet
        unit_price: calculatedItem.unit_price, // Price per foot
        total_price: calculatedItem.total_price,
        unit: calculatedItem.unit,
        // T-Iron specific calculation data - CRITICAL FIX: Proper unit handling
        t_iron_pieces: Number(calculatedItem.t_iron_pieces), // Ensure it's a number
        t_iron_length_per_piece: Number(calculatedItem.t_iron_length_per_piece), // Ensure it's a number
        t_iron_total_feet: Number(calculatedItem.t_iron_total_feet), // Ensure it's a number
        t_iron_unit: String(calculatedItem.t_iron_unit || 'pcs'), // FIXED: Use 'pcs' not 'ft'
        product_description: calculatedItem.product_description,
        is_non_stock_item: Number(calculatedItem.is_non_stock_item || 1) // Ensure it's 1 for T-Iron items
      };

      // DEBUG: Log the created invoice item being sent to database
      console.log('🔧 New T-Iron Item Being Sent to Database from InvoiceDetails:', {
        pieces: newItem.t_iron_pieces,
        lengthPerPiece: newItem.t_iron_length_per_piece,
        totalFeet: newItem.t_iron_total_feet,
        unit: newItem.t_iron_unit,
        pricePerFoot: newItem.unit_price,
        totalPrice: newItem.total_price,
        quantity: newItem.quantity,
        fullNewItem: newItem
      });

      console.log('🔧 About to call db.addInvoiceItems from InvoiceDetails with:', [newItem]);
      await db.addInvoiceItems(invoiceId, [newItem]);

      toast.success(`T-Iron added: ${calculatedItem.t_iron_pieces}${calculatedItem.t_iron_unit || 'pcs'} × ${calculatedItem.t_iron_length_per_piece}ft × Rs.${calculatedItem.unit_price}/ft = Rs.${calculatedItem.total_price}`);
      setShowTIronCalculator(false);
      setSelectedTIronProduct(null);
      await loadInvoiceDetails();

      if (onUpdate) {
        onUpdate();
      }

      // Add event bus notification (same as InvoiceForm pattern)
      try {
        if (typeof window !== 'undefined') {
          const eventBus = (window as any).eventBus;
          if (eventBus && eventBus.emit) {
            eventBus.emit('INVOICE_DETAILS_UPDATED', {
              invoiceId,
              action: 't_iron_item_added',
              customerId: invoice?.customer_id
            });
          }
        }
      } catch (error) {
        console.warn('Could not emit invoice details update event:', error);
      }

    } catch (error: any) {
      console.error('Error adding T-Iron item:', error);
      toast.error(error.message || 'Failed to add T-Iron item');
    } finally {
      setSaving(false);
    }
  };

  const handleTIronCalculatorCancel = () => {
    setShowTIronCalculator(false);
    setSelectedTIronProduct(null);
  };

  // Helper function to check if Add Item button should be disabled
  const isAddItemButtonDisabled = () => {
    if (saving) return true;

    if (itemType === 'misc') {
      const isDisabled = !miscItemDescription.trim() || !miscItemPrice || parseFloat(miscItemPrice) <= 0;
      console.log('🔍 [MISC-DEBUG] Button disabled check:', {
        itemType,
        miscItemDescription: miscItemDescription.trim(),
        miscItemPrice,
        parsedPrice: parseFloat(miscItemPrice),
        isDisabled,
        saving
      });
      return isDisabled;
    }

    if (itemType === 'product') {
      if (!selectedProduct) return true;

      // For T-Iron products, only require product selection
      const isTIronProduct = selectedProduct.name.toLowerCase().includes('t-iron') ||
        selectedProduct.name.toLowerCase().includes('tiron') ||
        selectedProduct.name.toLowerCase().includes('t iron');

      console.log('🔍 Add Item Button Check:', {
        productName: selectedProduct.name,
        isTIronProduct,
        newItemQuantity,
        newItemPrice,
        buttonWillBeDisabled: isTIronProduct ? false : (!newItemQuantity || !newItemPrice)
      });

      if (isTIronProduct) {
        return false; // T-Iron products only need product selection
      }

      // For regular products, require all fields
      return !newItemQuantity || !newItemPrice;
    }

    return false;
  };

  useEffect(() => {
    loadInvoiceDetails();
    loadProducts();
    loadPaymentChannels();
  }, [invoiceId]);

  const loadPaymentChannels = async () => {
    try {
      const channels = await db.getPaymentChannels(false); // Only active channels
      setPaymentChannels(channels);

      // Set default payment channel
      if (channels.length > 0) {
        const defaultChannel = channels[0];
        setSelectedPaymentChannel(defaultChannel);
        setNewPayment(prev => ({ ...prev, payment_method: defaultChannel.name }));
      }
    } catch (error) {
      console.error('Error loading payment channels:', error);
      toast.error('Failed to load payment channels');
    }
  };

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
    console.log('🚀 [MISC-DEBUG] handleAddItem function called!');
    console.log('🚀 [MISC-DEBUG] handleAddItem called with:', {
      itemType,
      selectedProduct: selectedProduct?.name,
      newItemQuantity,
      newItemPrice,
      miscItemDescription,
      miscItemPrice
    });
    alert('🚀 handleAddItem function called!');

    if (itemType === 'misc') {
      console.log('🎫 [MISC-DEBUG] Processing miscellaneous item...');
      // Handle miscellaneous item
      if (!miscItemDescription.trim() || !miscItemPrice || parseFloat(miscItemPrice) <= 0) {
        console.error('🎫 [MISC-DEBUG] Validation failed:', {
          description: miscItemDescription.trim(),
          price: miscItemPrice,
          parsedPrice: parseFloat(miscItemPrice)
        });
        toast.error('Please enter item description and valid price');
        return;
      }

      try {
        setSaving(true);

        const newMiscItem = {
          product_id: null,
          product_name: miscItemDescription.trim(),
          quantity: '1',
          unit_price: parseFloat(miscItemPrice),
          total_price: parseFloat(miscItemPrice),
          unit: 'item',
          is_misc_item: 1, // Use integer 1 instead of boolean true for database consistency
          misc_description: miscItemDescription.trim()
        };

        console.log('💼 [DEBUG] Creating miscellaneous item:', {
          productName: newMiscItem.product_name,
          isMiscItem: newMiscItem.is_misc_item,
          miscDescription: newMiscItem.misc_description,
          totalPrice: newMiscItem.total_price
        });

        await db.addInvoiceItems(invoiceId, [newMiscItem]);

        toast.success('Miscellaneous item added successfully');
        setShowAddItem(false);
        resetAddItemForm();
        await loadInvoiceDetails();

        if (onUpdate) {
          onUpdate();
        }

        try {
          if (typeof window !== 'undefined') {
            const eventBus = (window as any).eventBus;
            if (eventBus && eventBus.emit) {
              eventBus.emit('INVOICE_DETAILS_UPDATED', {
                invoiceId,
                action: 'misc_item_added',
                customerId: invoice?.customer_id
              });
            }
          }
        } catch (error) {
          console.warn('Could not emit invoice details update event:', error);
        }

      } catch (error: any) {
        console.error('Error adding miscellaneous item:', error);
        toast.error(error.message || 'Failed to add miscellaneous item');
      } finally {
        setSaving(false);
      }
      return;
    }

    // Handle regular product item
    if (!selectedProduct) {
      toast.error('Please select a product');
      return;
    }

    // Check if this is a T-Iron product that needs special calculation FIRST
    const isTIronProduct = selectedProduct.name.toLowerCase().includes('t-iron') ||
      selectedProduct.name.toLowerCase().includes('tiron') ||
      selectedProduct.name.toLowerCase().includes('t iron');

    console.log('🔍 T-Iron Detection:', {
      productName: selectedProduct.name,
      isTIronProduct,
      lowerCaseName: selectedProduct.name.toLowerCase(),
      currentStates: {
        showTIronCalculator,
        selectedTIronProduct: selectedTIronProduct?.name
      }
    });

    if (isTIronProduct) {
      // Show T-Iron calculator instead of adding directly
      console.log('✅ Opening T-Iron calculator for:', selectedProduct.name);
      toast.success(`Opening T-Iron calculator for precise calculation...`);
      setSelectedTIronProduct(selectedProduct);
      setShowTIronCalculator(true);
      console.log('✅ T-Iron calculator state set, returning early');
      return;
    }

    // For non-T-Iron products, validate all fields are filled
    if (!newItemQuantity || !newItemPrice) {
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
        unit: formatUnitString(newItemQuantity, selectedProduct.unit_type as any),
        length: newItemLength ? parseFloat(newItemLength) : undefined,
        pieces: newItemPieces ? parseFloat(newItemPieces) : undefined
      };

      await db.addInvoiceItems(invoiceId, [newItem]);

      toast.success('Item added successfully');
      setShowAddItem(false);
      resetAddItemForm();
      await loadInvoiceDetails();

      if (onUpdate) {
        onUpdate();
      }

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

      const item = invoice.items.find((i: InvoiceItem) => i.id === itemId);
      if (!item) return;

      const product = products.find(p => p.id === item.product_id);
      if (!product) return;

      const quantityValidation = validateUnit(newQuantity, product.unit_type as any);
      if (!quantityValidation.isValid) {
        toast.error(`Invalid quantity: ${quantityValidation.error}`);
        return;
      }

      const parsedQuantity = parseUnit(newQuantity, product.unit_type as any);
      await db.updateInvoiceItemQuantity(invoiceId, itemId, parsedQuantity.numericValue);

      toast.success('Quantity updated');
      setEditingItem(null);
      await loadInvoiceDetails();

      if (onUpdate) {
        onUpdate();
      }

    } catch (error: any) {
      toast.error(error.message || 'Failed to update item');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    if (!confirm('Remove this item from the invoice?')) return;

    try {
      setSaving(true);
      await db.removeInvoiceItems(invoiceId, [itemId]);

      toast.success('Item removed');
      await loadInvoiceDetails();

      if (onUpdate) {
        onUpdate();
      }

    } catch (error: any) {
      toast.error(error.message || 'Failed to remove item');
    } finally {
      setSaving(false);
    }
  };

  // Return functionality handlers
  const openReturnModal = (item: InvoiceItem) => {
    if (item.is_misc_item) {
      toast.error('Miscellaneous items cannot be returned');
      return;
    }

    setReturnModal({
      isOpen: true,
      item,
      returnQuantity: '1', // Default to 1
      reason: 'Customer Request',
      settlementType: 'ledger',
      notes: ''
    });
  };

  const closeReturnModal = () => {
    setReturnModal({
      isOpen: false,
      item: null,
      returnQuantity: '',
      reason: 'Customer Request',
      settlementType: 'ledger',
      notes: ''
    });
  };

  const validateReturnQuantity = (item: InvoiceItem, returnQty: string): { isValid: boolean; error?: string } => {
    if (!returnQty || returnQty.trim() === '') {
      return { isValid: false, error: 'Return quantity is required' };
    }

    const qty = parseFloat(returnQty);
    if (isNaN(qty) || qty <= 0) {
      return { isValid: false, error: 'Return quantity must be a positive number' };
    }

    if (qty > item.quantity) {
      return { isValid: false, error: `Return quantity cannot exceed original quantity (${item.quantity})` };
    }

    return { isValid: true };
  };

  const processReturn = async () => {
    if (!returnModal.item) return;

    // Validate return quantity
    const validation = validateReturnQuantity(returnModal.item, returnModal.returnQuantity);
    if (!validation.isValid) {
      toast.error(validation.error || 'Invalid return quantity');
      return;
    }

    if (!returnModal.reason.trim()) {
      toast.error('Return reason is required');
      return;
    }

    try {
      setSaving(true);

      const returnQuantity = parseFloat(returnModal.returnQuantity);
      const totalPrice = returnQuantity * returnModal.item.unit_price;

      const returnData: ReturnData = {
        customer_id: invoice.customer_id,
        customer_name: invoice.customer_name,
        original_invoice_id: invoiceId,
        original_invoice_number: invoice.invoice_number || invoice.bill_number,
        items: [{
          product_id: returnModal.item.product_id!,
          product_name: returnModal.item.product_name,
          original_invoice_item_id: returnModal.item.id,
          original_quantity: returnModal.item.quantity,
          return_quantity: returnQuantity,
          unit_price: returnModal.item.unit_price,
          total_price: totalPrice,
          unit: returnModal.item.unit || 'piece',
          reason: returnModal.reason
        }],
        reason: returnModal.reason,
        settlement_type: returnModal.settlementType,
        notes: returnModal.notes,
        created_by: 'user'
      };

      await db.createReturn(returnData);

      toast.success(
        `Return processed successfully! ${returnModal.settlementType === 'ledger'
          ? 'Credit added to customer ledger'
          : 'Cash refund recorded'}`
      );

      closeReturnModal();
      await loadInvoiceDetails();

      if (onUpdate) {
        onUpdate();
      }

    } catch (error: any) {
      console.error('Return processing error:', error);
      toast.error(error.message || 'Failed to process return');
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
    const remainingBalance = Math.round((invoice.remaining_balance + Number.EPSILON) * 10) / 10;

    // Use epsilon for floating point comparison to avoid precision issues
    if (paymentAmount > remainingBalance + 0.01) {
      toast.error(`Payment amount (${paymentAmount.toFixed(1)}) cannot exceed remaining balance (${remainingBalance.toFixed(1)})`);
      return;
    }

    try {
      setSaving(true);

      await db.addInvoicePayment(invoiceId, {
        amount: paymentAmount,
        payment_method: newPayment.payment_method,
        payment_channel_id: selectedPaymentChannel?.id || null,
        payment_channel_name: selectedPaymentChannel?.name || newPayment.payment_method,
        reference: newPayment.reference,
        notes: newPayment.notes,
        date: newPayment.date
      });

      toast.success('Payment recorded successfully');
      setShowAddPayment(false);
      setNewPayment({
        amount: '',
        payment_method: 'cash',
        reference: '',
        notes: '',
        date: getCurrentSystemDateTime().dbDate // Reset to current system date
      });
      await loadInvoiceDetails();

      if (onUpdate) {
        onUpdate();
      }

    } catch (error: any) {
      toast.error(error.message || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  const getPaymentStatus = () => {
    if (!invoice) return 'pending';
    if (invoice.remaining_balance <= 0) return 'paid';
    if (invoice.payment_amount > 0) return 'partial';
    return 'pending';
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'paid':
        return {
          label: 'Paid',
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: CheckCircle
        };
      case 'partial':
        return {
          label: 'Partial',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: Clock
        };
      default:
        return {
          label: 'Pending',
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: AlertTriangle
        };
    }
  };

  // Use centralized date/time formatting
  const formatDateTimeDisplay = (dateString: string) => {
    if (!dateString) return '';
    // Use system local time instead of UTC conversion
    return new Date(dateString).toLocaleString();
  };


  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copied`);
    });
  };

  const handlePrintInvoice = () => {
    if (!invoice) return;
    // Prevent multiple print windows by using a unique window name
    const printWindowName = `invoice_print_${invoice.id}`;
    let printWindow = window.open('', printWindowName);
    if (!printWindow) {
      toast.error('Please allow popups for printing');
      return;
    }

    // Write content and print
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${formatInvoiceNumberForPrint(invoice.bill_number)}</title>
          <style>
            @page { 
              size: 80mm auto; 
              margin: 2mm; 
            }
            * { 
              margin: 0; 
              padding: 0; 
              box-sizing: border-box; 
            }
            body { 
              font-family: 'Arial', 'Helvetica', sans-serif; 
              font-size: 11px; 
              line-height: 1.3; 
              color: #000; 
              width: 76mm; 
              padding: 2mm; 
              background: white;
            }
            .header { 
              text-align: center; 
              margin-bottom: 4mm; 
              border-bottom: 2px solid #000; 
              padding-bottom: 3mm; 
            }
            .store-name { 
              font-size: 14px; 
              font-weight: bold; 
              margin-bottom: 2mm; 
              letter-spacing: 0.3px;
            }
            .store-tagline { 
              font-size: 9px; 
              margin-bottom: 1mm; 
              font-style: italic;
            }
            .store-address { 
              font-size: 9px; 
              margin-bottom: 1mm; 
            }
            .store-phone { 
              font-size: 9px; 
              margin-bottom: 1mm; 
            }
            .proprietor { 
              font-size: 10px; 
              font-weight: bold; 
            }
            .invoice-info { 
              margin-bottom: 4mm; 
              font-size: 10px; 
              border-bottom: 1px dashed #000;
              padding-bottom: 3mm;
            }
            .invoice-row { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 1.5mm; 
            }
            .customer-info { 
              margin-bottom: 4mm; 
              border-bottom: 1px dashed #000; 
              padding-bottom: 3mm; 
              font-size: 10px;
            }
            .customer-info div {
              margin-bottom: 1mm;
            }
            .items-table { 
              width: 100%; 
              margin-bottom: 4mm; 
            }
            .items-header { 
              border-bottom: 2px solid #000; 
              padding-bottom: 2mm; 
              margin-bottom: 2mm; 
              font-weight: bold; 
              font-size: 11px; 
              text-align: center;
            }
            .item-row { 
              font-size: 9px; 
              margin-bottom: 2mm; 
              padding-bottom: 2mm; 
              border-bottom: 1px dotted #999; 
            }
            .item-name { 
              font-weight: bold; 
              margin-bottom: 1mm; 
              font-size: 10px;
            }
            .item-details { 
              display: flex; 
              justify-content: space-between; 
              font-size: 9px;
            }
            .item-timestamp { 
              font-size: 8px; 
              color: #666; 
              margin-bottom: 1mm; 
            }
            .totals { 
              border-top: 2px solid #000; 
              padding-top: 3mm; 
              margin-top: 3mm; 
              font-size: 10px;
            }
            .total-row { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 1.5mm; 
            }
            .grand-total { 
              font-weight: bold; 
              font-size: 12px; 
              border-top: 1px solid #000; 
              padding-top: 2mm; 
              margin-top: 2mm; 
            }
            .payment-info { 
              margin-top: 4mm; 
              border-top: 1px dashed #000; 
              padding-top: 3mm; 
              font-size: 9px;
            }
            .payment-row { 
              font-size: 8px; 
              margin-bottom: 1.5mm; 
              padding-bottom: 1.5mm; 
              border-bottom: 1px dotted #ccc; 
            }
            .payment-timestamp { 
              font-size: 8px; 
              color: #666; 
            }
            .footer { 
              text-align: center; 
              margin-top: 6mm; 
              border-top: 1px dashed #000; 
              padding-top: 3mm; 
              font-size: 8px; 
            }
            .status-paid { 
              font-weight: bold; 
              color: #008000;
            }
            .status-partial { 
              font-weight: bold; 
              color: #ff8c00;
            }
            .status-pending { 
              font-weight: bold; 
              color: #dc3545;
            }
            @media print { 
              body { 
                background: white; 
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              } 
              .no-print { 
                display: none; 
              } 
              * {
                font-size: inherit !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="store-name"><strong>ITTEHAD IRON STORE</strong></div>
            <div class="store-tagline">(Rebar <strong>G60 G72.5 G80</strong>, T-Iron, Girders are available)</div>
            <div class="store-address">Opposite Lakar Mandi Pull, GT Road, Chichawatni</div>
            <div class="store-phone">0333-4485500  •  0333-6899636</div>
          </div>
          <div class="invoice-info">
            <div class="invoice-row">
              <span>Invoice#:</span>
              <span><strong>${formatInvoiceNumberForPrint(invoice.bill_number)}</strong></span>
            </div>
            <div class="invoice-row">
              <span>Date:</span>
              <span>${formatDateTimeDisplay(invoice.created_at)}</span>
            </div>
          </div>
          <div class="customer-info">
            <div><strong>Customer:</strong> ${invoice.customer_name}</div>
            ${invoice.customer_phone ? `<div><strong>Phone:</strong> ${invoice.customer_phone}</div>` : ''}
            ${invoice.customer_address ? `<div><strong>Address:</strong> ${invoice.customer_address}</div>` : ''}
          </div>
          <div class="items-table">
            <div class="items-header">ITEMS</div>
            ${invoice.items?.map((item: any) => `
              <div class="item-row">
                <div class="item-name">${item.product_name}</div>
                ${item.updated_at && item.updated_at !== item.created_at ? `<div class="item-timestamp">Updated: ${new Date(item.updated_at).toLocaleDateString()}</div>` : ''}
                <div class="item-details">
                  ${(() => {
        // T-Iron display using exact InvoiceForm logic
        const isTIronProduct = item.product_name && (
          item.product_name.toLowerCase().includes('t-iron') ||
          item.product_name.toLowerCase().includes('tiron') ||
          item.product_name.toLowerCase().includes('t iron')
        );

        if (isTIronProduct && item.t_iron_pieces && item.t_iron_length_per_piece) {
          const pieces = item.t_iron_pieces;
          const lengthPerPiece = item.t_iron_length_per_piece;
          const unit = item.t_iron_unit || 'pcs';
          return `<span>${pieces}${unit} × ${lengthPerPiece}ft/${unit} × Rs.${item.unit_price}</span>`;
        }
        // Regular items
        return `<span>${item.quantity} × Rs.${item.unit_price}</span>`;
      })()}
                  <span><strong>Rs.${item.total_price.toFixed(2)}</strong></span>
                </div>
              </div>
            `).join('') || '<div>No items</div>'}
          </div>
          <div class="totals">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>${formatCurrency(invoice.subtotal)}</span>
            </div>
            ${invoice.discount > 0 ? `
              <div class="total-row">
                <span>Discount (${invoice.discount}%):</span>
                <span>-${formatCurrency(invoice.discount_amount || 0)}</span>
              </div>
            ` : ''}
            <div class="total-row grand-total">
              <span>TOTAL:</span>
              <span>${formatCurrency(invoice.grand_total)}</span>
            </div>
          </div>
          <div class="payment-info">
            <div class="total-row">
              <span>Paid:</span>
              <span>${formatCurrency(invoice.payment_amount || 0)}</span>
            </div>
            ${invoice.remaining_balance > 0 ? `
              <div class="total-row">
                <span><strong>Balance Due:</strong></span>
                <span><strong>${formatCurrency(invoice.remaining_balance)}</strong></span>
              </div>
              <div class="total-row">
                <span><strong>Payment Status:</strong></span>
                <span><strong>${(invoice.payment_amount || 0) > 0 ? 'PARTIALLY PAID' : 'PENDING'}</strong></span>
              </div>
            ` : `
              <div class="total-row">
                <span><strong>Payment Status:</strong></span>
                <span><strong>FULLY PAID</strong></span>
              </div>
            `}
          </div>
          ${invoice.payments && invoice.payments.length > 0 ? `
            <div class="payment-info">
              <div style="font-weight: bold; margin-bottom: 2mm;">Payment History:</div>
              ${invoice.payments.map((payment: any) => `
                <div class="payment-row">
                  <div class="total-row">
                    <span>${payment.payment_method?.replace('_', ' ').toUpperCase()}</span>
                    <span>${formatCurrency(payment.amount)}</span>
                  </div>
                
              `).join('')}
            </div>
          ` : ''}
          <div class="footer">
            <div>Thank you for business with us!</div>
            <div>Generated: ${getCurrentSystemDateTime().dateTime}</div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();

    // Use a short timeout to ensure print dialog opens before closing window
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 shadow-xl">
          <div className="flex items-center space-x-3">
            <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
            <span className="text-gray-900">Loading invoice...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 shadow-xl max-w-md w-full mx-4">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Invoice Not Found</h3>
            <p className="text-gray-600 mb-4">This invoice could not be loaded.</p>
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const status = getPaymentStatus();
  const statusConfig = getStatusConfig(status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Invoice #{formatInvoiceNumber(invoice.bill_number)}
              </h1>
              <p className="text-sm text-gray-500">{formatDateTimeDisplay(invoice.created_at)}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statusConfig.color}`}>
              <StatusIcon className="h-4 w-4 mr-1" />
              {statusConfig.label}
            </div>

            <button
              onClick={handlePrintInvoice}
              className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </button>

            <button
              onClick={() => copyToClipboard(invoice.bill_number, 'Invoice number')}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Copy invoice number"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-6">

            {/* Customer & Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Customer Details</h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-900">{invoice.customer_name}</span>
                  </div>
                  {invoice.customer_phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">{invoice.customer_phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Payment Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Amount:</span>
                    <span className="font-medium">{formatCurrency(invoice.grand_total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Paid:</span>
                    <span className="font-medium text-green-600">{formatCurrency(invoice.payment_amount || 0)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-gray-900 font-medium">Balance:</span>
                    <span className={`font-semibold ${invoice.remaining_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(invoice.remaining_balance)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Items Section */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <h3 className="font-medium text-gray-900">
                  Items ({invoice.items?.length || 0})
                </h3>
                <button
                  onClick={() => setShowAddItem(true)}
                  disabled={saving}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Item</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                {invoice.items?.length > 0 ? (
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Product</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Quantity</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Unit Price</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Total</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {invoice.items.map((item: InvoiceItem) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900 flex items-center">
                              {/* Show icon for misc vs product items */}
                              {item.is_misc_item ? (
                                <span className="mr-2 text-blue-600" title="Miscellaneous Item"></span>
                              ) : (
                                <span className="mr-2 text-green-600" title="Product Item"></span>
                              )}
                              {item.product_name}
                              {(() => {
                                // FIXED: Check if it's a miscellaneous item first
                                if (item.is_misc_item) {
                                  // Miscellaneous items should not show calculation format
                                  return null;
                                }

                                const productName = item.product_name.toLowerCase();
                                const isTIronByName = productName.includes('t-iron') || productName.includes('tiron') || productName.includes('t iron');

                                // ENHANCED: More robust T-Iron data checking
                                const hasTIronPieces = item.t_iron_pieces !== null && item.t_iron_pieces !== undefined && item.t_iron_pieces !== 0;
                                const hasTIronLength = item.t_iron_length_per_piece !== null && item.t_iron_length_per_piece !== undefined && item.t_iron_length_per_piece !== 0;

                                console.log('🔍 [T-IRON CHECK] Data availability:', {
                                  t_iron_pieces: item.t_iron_pieces,
                                  t_iron_length_per_piece: item.t_iron_length_per_piece,
                                  hasTIronPieces,
                                  hasTIronLength,
                                  productName: item.product_name
                                });

                                if (hasTIronPieces && hasTIronLength) {
                                  // ENHANCED: Ensure proper type conversion for T-Iron data
                                  const pieces = Number(item.t_iron_pieces);
                                  const lengthPerPiece = Number(item.t_iron_length_per_piece);
                                  const unitPrice = Number(item.unit_price);

                                  // Validate that we have valid numbers
                                  if (pieces > 0 && lengthPerPiece > 0) {
                                    const unit = item.t_iron_unit || 'pcs';
                                    console.log('🔧 [T-IRON DISPLAY] Using saved calculation data:', {
                                      pieces,
                                      lengthPerPiece,
                                      unit,
                                      unitPrice
                                    });

                                    return (
                                      <span className="text-sm text-blue-600 ml-2">
                                        ({pieces}{unit} × {lengthPerPiece}ft/{unit} × Rs.{unitPrice})
                                      </span>
                                    );
                                  } else {
                                    console.log('🔧 [T-IRON DISPLAY] Invalid saved data, falling back to reconstruction:', {
                                      rawPieces: item.t_iron_pieces,
                                      rawLength: item.t_iron_length_per_piece,
                                      convertedPieces: pieces,
                                      convertedLength: lengthPerPiece
                                    });
                                  }
                                } else if (isTIronByName) {
                                  // ENHANCED T-Iron Display: Try to reconstruct missing calculation data
                                  console.log('🔍 T-Iron Display Fix: Missing calculation data for:', item.product_name, {
                                    quantity: item.quantity,
                                    unit_price: item.unit_price,
                                    total_price: item.total_price,
                                    t_iron_pieces: item.t_iron_pieces,
                                    t_iron_length_per_piece: item.t_iron_length_per_piece
                                  });

                                  // Try to reconstruct reasonable T-Iron calculation from available data
                                  // ENHANCED SMART RECONSTRUCTION: Better estimation logic
                                  const totalFeet = parseFloat(String(item.quantity)) || 1;
                                  let displayPieces = 1;
                                  let displayLength = totalFeet;

                                  if (totalFeet > 50) {
                                    // IMPROVED: Try common T-Iron lengths to find best fit
                                    const commonLengths = [14, 15, 12, 10, 16, 8, 20]; // Added 15ft - very common T-Iron length!
                                    let bestFit = { pieces: Math.round(totalFeet / 12), length: 12, difference: Math.abs(totalFeet % 12) };

                                    console.log('🔧 [SMART RECONSTRUCTION] Testing common lengths for', totalFeet, 'feet');

                                    for (const length of commonLengths) {
                                      const pieces = Math.round(totalFeet / length);
                                      const calculatedTotal = pieces * length;
                                      const difference = Math.abs(totalFeet - calculatedTotal);

                                      console.log(`   ${pieces} × ${length} = ${calculatedTotal} (diff: ${difference})`);

                                      if (difference < bestFit.difference && pieces > 0) {
                                        bestFit = { pieces, length, difference };
                                        console.log('     ⭐ New best fit!');
                                      } else if (difference === bestFit.difference && difference === 0) {
                                        // ENHANCED: When multiple perfect matches exist, prefer more typical T-Iron dimensions
                                        // Typically fewer pieces with longer length is more common than many short pieces
                                        if (pieces < bestFit.pieces && length > bestFit.length) {
                                          bestFit = { pieces, length, difference };
                                          console.log('     ⭐ Better perfect match (fewer pieces, longer length)!');
                                        }
                                      }
                                    }

                                    displayPieces = bestFit.pieces;
                                    displayLength = bestFit.length;

                                    console.log(`🎯 [SMART RECONSTRUCTION] Final choice: ${displayPieces}pcs × ${displayLength}ft/pcs`);

                                    // Ensure pieces is at least 1
                                    if (displayPieces < 1) displayPieces = 1;
                                  }

                                  return (
                                    <span className="text-sm text-blue-600 ml-2">
                                      ({displayPieces}pcs × {displayLength}ft/pcs × Rs.{item.unit_price})
                                      <span className="text-xs text-orange-500 ml-1" title="Estimated - use T-Iron calculator for exact values">⚠️</span>
                                    </span>
                                  );
                                } else {
                                  // Regular products
                                  return (
                                    <>
                                      {item.length && ` • ${item.length}/L`}
                                      {item.pieces && ` • ${item.pieces}/pcs`}
                                    </>
                                  );
                                }
                              })()}
                            </div>
                            <div className="text-sm text-gray-500">
                              {(() => {
                                // Debug logging for T-Iron detection
                                const productName = item.product_name.toLowerCase();
                                const isTIronByName = productName.includes('t-iron') || productName.includes('tiron') || productName.includes('t iron');
                                console.log('🔍 InvoiceDetails Debug:', {
                                  productName: item.product_name,
                                  productNameLower: productName,
                                  is_misc_item: item.is_misc_item,
                                  is_non_stock_item: item.is_non_stock_item,
                                  isTIronByName,
                                  shouldShowNonStock: item.is_non_stock_item || isTIronByName
                                });

                                if (item.is_misc_item) {
                                  return 'Miscellaneous Item';
                                } else if (item.is_non_stock_item || isTIronByName) {
                                  return `Non-Stock Item • Total: ${item.t_iron_total_feet || item.quantity} ft`;
                                } else {
                                  return `ID: ${item.product_id}`;
                                }
                              })()}
                            </div>
                            <div className="text-xs text-gray-400">
                              Added: {new Date(item.created_at || '').toLocaleString()}
                              {item.updated_at && item.updated_at !== item.created_at && (
                                <span> | Updated: {new Date(item.updated_at).toLocaleString()}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {item.is_misc_item ? (
                              <span className="text-sm text-gray-500">1 item</span>
                            ) : (
                              editingItem === item.id ? (
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="text"
                                    value={editQuantity}
                                    onChange={(e) => setEditQuantity(e.target.value)}
                                    className="w-20 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500"
                                  />
                                  <button
                                    onClick={() => handleUpdateItemQuantity(item.id, editQuantity)}
                                    disabled={saving}
                                    className="p-1 text-green-600 hover:text-green-800"
                                  >
                                    <Save className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => setEditingItem(null)}
                                    className="p-1 text-gray-600 hover:text-gray-800"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-2">
                                  {/* T-Iron display using exact InvoiceForm logic */}
                                  {(() => {
                                    // Check if this is a T-Iron product (exact same logic as InvoiceForm)
                                    const isTIronProduct = item.product_name && (
                                      item.product_name.toLowerCase().includes('t-iron') ||
                                      item.product_name.toLowerCase().includes('tiron') ||
                                      item.product_name.toLowerCase().includes('t iron')
                                    );

                                    // DEBUG: Log why T-Iron items might not display properly
                                    if (isTIronProduct) {
                                      console.log('🔍 T-Iron Debug for item:', {
                                        id: item.id,
                                        product_name: item.product_name,
                                        isTIronProduct,
                                        t_iron_pieces: item.t_iron_pieces,
                                        t_iron_length_per_piece: item.t_iron_length_per_piece,
                                        t_iron_total_feet: item.t_iron_total_feet,
                                        t_iron_unit: item.t_iron_unit,
                                        quantity: item.quantity,
                                        hasRequiredData: !!(item.t_iron_pieces && item.t_iron_length_per_piece),
                                        rawData: {
                                          pieces_type: typeof item.t_iron_pieces,
                                          length_type: typeof item.t_iron_length_per_piece,
                                          pieces_value: item.t_iron_pieces,
                                          length_value: item.t_iron_length_per_piece
                                        }
                                      });
                                    }

                                    if (isTIronProduct && item.t_iron_pieces && item.t_iron_length_per_piece) {
                                      const pieces = item.t_iron_pieces;
                                      const lengthPerPiece = item.t_iron_length_per_piece;
                                      const unit = item.t_iron_unit || 'pcs';

                                      return (
                                        <div className="text-sm">
                                          {pieces}{unit} × {lengthPerPiece}ft/{unit}
                                        </div>
                                      );
                                    }
                                    return <span className="text-sm">{item.quantity}</span>;
                                  })()}
                                  {(() => {
                                    // Check if this is a T-Iron item with calculation data
                                    const isTIronProduct = item.product_name && (
                                      item.product_name.toLowerCase().includes('t-iron') ||
                                      item.product_name.toLowerCase().includes('tiron') ||
                                      item.product_name.toLowerCase().includes('t iron')
                                    );
                                    const hasTIronData = !!(item.t_iron_pieces && item.t_iron_length_per_piece);

                                    if (isTIronProduct && hasTIronData) {
                                      // For T-Iron items, show calculator button instead of edit
                                      return (
                                        <button
                                          onClick={() => toast('T-Iron items cannot be edited directly. Remove and re-add with T-Iron calculator.', {
                                            icon: '⚙️',
                                            duration: 4000
                                          })}
                                          className="p-1 text-gray-400 hover:text-gray-600"
                                          title="T-Iron items must use calculator"
                                        >
                                          <Calculator className="h-3 w-3" />
                                        </button>
                                      );
                                    } else {
                                      // For regular items, show edit button
                                      return (
                                        <button
                                          onClick={() => {
                                            setEditingItem(item.id);
                                            setEditQuantity(item.quantity.toString());
                                          }}
                                          className="p-1 text-blue-600 hover:text-blue-800"
                                        >
                                          <Edit2 className="h-3 w-3" />
                                        </button>
                                      );
                                    }
                                  })()}
                                </div>
                              )
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">{formatCurrency(item.unit_price)}</td>
                          <td className="px-4 py-3 text-sm font-medium">{formatCurrency(item.total_price)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center space-x-1">
                              {/* Return button - only for non-misc items with product_id */}
                              {!item.is_misc_item && item.product_id && (
                                <button
                                  onClick={() => openReturnModal(item)}
                                  disabled={saving}
                                  className="p-1 text-orange-600 hover:text-orange-800 disabled:opacity-50"
                                  title="Return Item"
                                >
                                  <Undo2 className="h-4 w-4" />
                                </button>
                              )}
                              {/* Remove button */}
                              <button
                                onClick={() => handleRemoveItem(item.id)}
                                disabled={saving}
                                className="p-1 text-red-600 hover:text-red-800 disabled:opacity-50"
                                title="Remove Item"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="px-4 py-8 text-center">
                    <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-4">No items in this invoice</p>
                    <button
                      onClick={() => setShowAddItem(true)}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Item
                    </button>
                  </div>
                )}
              </div>

              {/* Invoice Total */}
              {invoice.items?.length > 0 && (
                <div className="bg-gray-50 px-4 py-3 border-t">
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(invoice.subtotal)}</span>
                      </div>
                      {invoice.discount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Discount ({invoice.discount}%):</span>
                          <span>-{formatCurrency(invoice.discount_amount || 0)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold text-lg border-t pt-2">
                        <span>Total:</span>
                        <span>{formatCurrency(invoice.grand_total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Payments Section */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <h3 className="font-medium text-gray-900">
                  Payments ({invoice.payments?.length || 0})
                </h3>
                <div className="flex items-center space-x-2">
                  {invoice.remaining_balance > 0 && (
                    <button
                      onClick={() => setShowAddPayment(true)}
                      disabled={saving}
                      className="flex items-center space-x-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Payment</span>
                    </button>
                  )}
                </div>
              </div>

              {invoice.payments && invoice.payments.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {invoice.payments
                    .slice(0, expandedPayments ? invoice.payments.length : 3)
                    .map((payment: any) => {
                      const key = payment.id || payment.payment_id || Math.random();
                      return (
                        <div key={key} className="px-4 py-3 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                <DollarSign className="h-4 w-4 text-green-600" />
                              </div>
                              <div>
                                <div className="font-medium text-green-600">
                                  {formatCurrency(payment.amount)}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {(() => {
                                    // Debug: Log payment data to console
                                    console.log('Payment data:', {
                                      date: payment.date,
                                      time: payment.time,
                                      created_at: payment.created_at
                                    });

                                    // Priority 1: Use local date+time fields if both exist
                                    if (payment.date && payment.time) {
                                      return `${formatDate(payment.date)} ${payment.time}`;
                                    }
                                    // Priority 2: Use date field only if available
                                    else if (payment.date) {
                                      return formatDate(payment.date);
                                    }
                                    // Priority 3: Convert UTC created_at to Pakistan time
                                    else if (payment.created_at) {
                                      return formatDateTime(payment.created_at);
                                    }
                                    // Last resort
                                    else {
                                      return 'No date';
                                    }
                                  })()} • {payment.payment_method?.replace('_', ' ')}
                                </div>
                              </div>
                            </div>
                            <div className="text-sm text-gray-500">
                              {payment.reference || 'No reference'}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                  {invoice.payments.length > 3 && (
                    <div className="px-4 py-2 bg-gray-50 border-t">
                      <button
                        onClick={() => setExpandedPayments(!expandedPayments)}
                        className="w-full flex items-center justify-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
                      >
                        {expandedPayments ? (
                          <>
                            <ChevronUp className="h-4 w-4" />
                            <span>Show Less</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4" />
                            <span>Show {invoice.payments.length - 3} More</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-4 py-8 text-center">
                  <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">No payments recorded</p>
                  {invoice.remaining_balance > 0 && (
                    <button
                      onClick={() => setShowAddPayment(true)}
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Record Payment
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add Item Modal */}
        {showAddItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Add Item</h2>
                <button
                  onClick={() => {
                    setShowAddItem(false);
                    resetAddItemForm();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Item Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Item Type</label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="product"
                        checked={itemType === 'product'}
                        onChange={(e) => setItemType(e.target.value as 'product' | 'misc')}
                        className="mr-2"
                      />
                      <span className="text-sm">Product</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="misc"
                        checked={itemType === 'misc'}
                        onChange={(e) => {
                          console.log('🎫 [MISC-DEBUG] Miscellaneous item radio selected');
                          setItemType(e.target.value as 'product' | 'misc');
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm">Miscellaneous Item</span>
                    </label>
                  </div>
                </div>

                {itemType === 'product' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>
                      <select
                        value={selectedProduct?.id || ''}
                        onChange={(e) => {
                          const product = products.find(p => p.id === parseInt(e.target.value));
                          setSelectedProduct(product || null);
                          setNewItemPrice(product?.rate_per_unit.toString() || '');

                          // Check if T-Iron product and open calculator immediately
                          if (product) {
                            const isTIronProduct = product.name.toLowerCase().includes('t-iron') ||
                              product.name.toLowerCase().includes('tiron') ||
                              product.name.toLowerCase().includes('t iron');

                            console.log('🔍 T-Iron Detection Check:', {
                              productName: product.name,
                              track_inventory: product.track_inventory,
                              unit_type: product.unit_type,
                              isTIronProduct,
                              shouldShowCalculator: isTIronProduct
                            });

                            if (isTIronProduct) {
                              console.log('✅ Opening T-Iron calculator immediately for:', product.name);
                              // Close the Add Item modal and open T-Iron calculator
                              setShowAddItem(false);
                              setSelectedTIronProduct(product);
                              setShowTIronCalculator(true);
                              resetAddItemForm();
                              return;
                            }
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select a product</option>
                        {products.map(product => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedProduct && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Quantity ({getUnitTypeConfig(selectedProduct.unit_type as any).symbol})
                          </label>
                          <input
                            type="text"
                            value={newItemQuantity}
                            onChange={(e) => setNewItemQuantity(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder={getUnitTypeConfig(selectedProduct.unit_type as any).examples[0]}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Unit Price (Rs.)</label>
                          <input
                            type="number"
                            value={newItemPrice}
                            onChange={(e) => setNewItemPrice(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            step="0.1"
                          />
                        </div>

                        {/* Length and Pieces - Optional */}
                        <div className="border-t pt-3 mt-3">
                          <p className="text-sm font-medium text-gray-700 mb-2">Optional Details</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Length (L)</label>
                              <input
                                type="number"
                                value={newItemLength}
                                onChange={(e) => setNewItemLength(e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="e.g. 45"
                                step="0.1"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Pieces</label>
                              <input
                                type="number"
                                value={newItemPieces}
                                onChange={(e) => setNewItemPieces(e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="e.g. 87"
                                step="1"
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Item Description</label>
                      <input
                        type="text"
                        value={miscItemDescription}
                        onChange={(e) => {
                          console.log('🎫 [MISC-DEBUG] Description changed:', e.target.value);
                          setMiscItemDescription(e.target.value);
                        }}
                        placeholder="Enter item description (e.g., Rent, Fare, Service charge)"
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
                          onClick={() => {
                            console.log('🎫 [MISC-DEBUG] Service Charge button clicked');
                            setMiscItemDescription('Service Charge');
                          }}
                          className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          Service Charge
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Price (Rs.)</label>
                      <input
                        type="number"
                        value={miscItemPrice}
                        onChange={(e) => {
                          console.log('🎫 [MISC-DEBUG] Price changed:', e.target.value);
                          setMiscItemPrice(e.target.value);
                        }}
                        placeholder="Enter price"
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowAddItem(false);
                      resetAddItemForm();
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      try {
                        console.log('🎯 Button clicked!');
                        e.preventDefault();
                        e.stopPropagation();
                        handleAddItem();
                      } catch (error) {
                        console.error('❌ Error in button click:', error);
                        alert('Error in button click: ' + error);
                      }
                    }}
                    disabled={isAddItemButtonDisabled()}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${isAddItemButtonDisabled()
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      : selectedProduct && (
                        selectedProduct.name.toLowerCase().includes('t-iron') ||
                        selectedProduct.name.toLowerCase().includes('tiron') ||
                        selectedProduct.name.toLowerCase().includes('t iron')
                      )
                        ? 'bg-green-600 text-white hover:bg-green-700' // Special green color for T-Iron
                        : 'bg-blue-600 text-white hover:bg-blue-700'   // Regular blue for other products
                      }`}
                  >
                    {saving ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Adding...</span>
                      </div>
                    ) : (
                      selectedProduct && (
                        selectedProduct.name.toLowerCase().includes('t-iron') ||
                        selectedProduct.name.toLowerCase().includes('tiron') ||
                        selectedProduct.name.toLowerCase().includes('t iron')
                      ) ? '🧮 Add T-Iron (Calculator)' : 'Add Item'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Payment Modal */}
        {showAddPayment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-xs sm:max-w-sm md:max-w-md mx-2 sm:mx-4 max-h-[95vh] overflow-y-auto">
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Record Payment</h2>
                <button
                  onClick={() => setShowAddPayment(false)}
                  className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>

              <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="text-xs sm:text-sm text-yellow-800">
                    <strong>Outstanding Balance:</strong> {formatCurrency(invoice.remaining_balance)}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Amount (Rs.)</label>
                  <input
                    type="number"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                    step="0.1"
                    max={invoice.remaining_balance}
                    placeholder="0.0"
                  />
                  <div className="flex flex-col sm:flex-row justify-between mt-2 space-y-2 sm:space-y-0 sm:space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        // Always round to one decimal place to avoid floating point artifacts
                        const half = Math.round((invoice.remaining_balance / 2 + Number.EPSILON) * 10) / 10;
                        setNewPayment({ ...newPayment, amount: half.toFixed(1) });
                      }}
                      className="flex-1 text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      Half
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // Always round to one decimal place to avoid floating point artifacts
                        const full = Math.round((invoice.remaining_balance + Number.EPSILON) * 10) / 10;
                        setNewPayment({ ...newPayment, amount: full.toFixed(1) });
                      }}
                      className="flex-1 text-xs px-3 py-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200"
                    >
                      Full Amount
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Channel</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {paymentChannels.map(channel => (
                      <button
                        key={channel.id}
                        type="button"
                        onClick={() => {
                          setSelectedPaymentChannel(channel);
                          setNewPayment({ ...newPayment, payment_method: channel.name });
                        }}
                        className={`p-2 text-xs sm:text-sm rounded-lg border text-center transition-colors ${selectedPaymentChannel?.id === channel.id
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        <div className="font-medium truncate">{channel.name}</div>
                        <div className="text-xs text-gray-500 capitalize">{channel.type}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reference (Optional)</label>
                  <input
                    type="text"
                    value={newPayment.reference}
                    onChange={(e) => setNewPayment({ ...newPayment, reference: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                    placeholder="Transaction ID, cheque number, etc."
                  />
                </div>

                {/* Date Field */}
                <div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Date</label>
                    <input
                      type="date"
                      value={newPayment.date}
                      onChange={(e) => setNewPayment({ ...newPayment, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-3 sm:pt-4">
                  <button
                    onClick={() => setShowAddPayment(false)}
                    className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddPayment}
                    disabled={saving || !newPayment.amount}
                    className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {saving ? (
                      <div className="flex items-center justify-center space-x-2">
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

        {/* Return Modal */}
        {returnModal.isOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Return Item</h3>
                  <button
                    onClick={closeReturnModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="px-6 py-4 space-y-4">
                {/* Item Details */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="font-medium text-gray-900">{returnModal.item?.product_name}</h4>
                  <div className="text-sm text-gray-600 mt-1">
                    <div>Unit Price: {formatCurrency(returnModal.item?.unit_price || 0)}</div>
                    <div>Original Quantity: {returnModal.item?.quantity}</div>
                    <div>Max Return: {returnModal.item?.quantity}</div>
                  </div>
                </div>

                {/* Return Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Return Quantity *
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    max={returnModal.item?.quantity || 1}
                    step="0.01"
                    value={returnModal.returnQuantity}
                    onChange={(e) => setReturnModal(prev => ({ ...prev, returnQuantity: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter quantity to return"
                  />
                </div>

                {/* Return Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Return Reason *
                  </label>
                  <select
                    value={returnModal.reason}
                    onChange={(e) => setReturnModal(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Customer Request">Customer Request</option>
                    <option value="Defective Item">Defective Item</option>
                    <option value="Wrong Item">Wrong Item</option>
                    <option value="Damaged">Damaged</option>
                    <option value="Quality Issue">Quality Issue</option>
                    <option value="Change of Mind">Change of Mind</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Settlement Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Settlement Method *
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="ledger"
                        checked={returnModal.settlementType === 'ledger'}
                        onChange={(e) => setReturnModal(prev => ({ ...prev, settlementType: e.target.value as 'ledger' | 'cash' }))}
                        className="mr-3 text-blue-600"
                      />
                      <div>
                        <div className="text-sm font-medium">Add to Customer Ledger</div>
                        <div className="text-xs text-gray-500">Credit will be added to customer's account</div>
                      </div>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="cash"
                        checked={returnModal.settlementType === 'cash'}
                        onChange={(e) => setReturnModal(prev => ({ ...prev, settlementType: e.target.value as 'ledger' | 'cash' }))}
                        className="mr-3 text-blue-600"
                      />
                      <div>
                        <div className="text-sm font-medium">Cash Refund</div>
                        <div className="text-xs text-gray-500">Cash will be refunded to customer</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={returnModal.notes}
                    onChange={(e) => setReturnModal(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Additional notes about the return..."
                  />
                </div>

                {/* Return Total */}
                {returnModal.returnQuantity && !isNaN(parseFloat(returnModal.returnQuantity)) && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-sm font-medium text-blue-900">
                      Return Total: {formatCurrency(parseFloat(returnModal.returnQuantity) * (returnModal.item?.unit_price || 0))}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
                <button
                  onClick={closeReturnModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={processReturn}
                  disabled={saving || !returnModal.returnQuantity || !returnModal.reason}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    'Process Return'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* T-Iron Calculator Modal */}
        {(() => {
          console.log('🔍 T-Iron Modal Render Check:', {
            showTIronCalculator,
            selectedTIronProduct: selectedTIronProduct?.name,
            shouldRender: showTIronCalculator && selectedTIronProduct
          });
          return null;
        })()}
        {showTIronCalculator && selectedTIronProduct && (
          <TIronCalculator
            product={selectedTIronProduct}
            onCalculationComplete={handleTIronCalculationComplete}
            onCancel={handleTIronCalculatorCancel}
          />
        )}
      </div>
    </div>
  );
};

export default InvoiceDetails;