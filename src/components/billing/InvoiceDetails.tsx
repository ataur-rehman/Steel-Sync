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
import { ask } from '@tauri-apps/plugin-dialog';

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
  mode?: 'view' | 'edit'; // New prop to control edit/view mode
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

const InvoiceDetails: React.FC<InvoiceDetailsProps> = ({ invoiceId, onClose, onUpdate, mode = 'edit' }) => {
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

  // Return eligibility and quantities
  const [returnEligibility, setReturnEligibility] = useState<{
    canReturn: boolean;
    reason: string;
    returnableQuantities: Record<number, number>;
  }>({
    canReturn: false,
    reason: '',
    returnableQuantities: {}
  });

  // Return items for display in invoice
  const [returnItems, setReturnItems] = useState<any[]>([]);

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
  const [editingTIronItem, setEditingTIronItem] = useState<any>(null);

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
        rawCalculatedItem: calculatedItem,
        isEdit: calculatedItem.isEdit,
        itemId: calculatedItem.itemId
      });

      if (calculatedItem.isEdit && calculatedItem.itemId) {
        // Editing existing T-Iron item - use T-Iron specific update method
        await db.updateTIronItemCalculation(calculatedItem.itemId, {
          pieces: calculatedItem.t_iron_pieces,
          lengthPerPiece: calculatedItem.t_iron_length_per_piece,
          totalFeet: calculatedItem.t_iron_total_feet,
          unit: calculatedItem.t_iron_unit,
          pricePerFoot: calculatedItem.unit_price,
          totalPrice: calculatedItem.total_price
        });

        toast.success(`T-Iron updated: ${calculatedItem.t_iron_pieces}${calculatedItem.t_iron_unit || 'pcs'} × ${calculatedItem.t_iron_length_per_piece}ft × Rs.${calculatedItem.unit_price}/ft = Rs.${calculatedItem.total_price}`);
        setEditingTIronItem(null);
      } else {
        // Adding new T-Iron item
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

        console.log('🔧 About to call db.addInvoiceItems from InvoiceDetails with:', [newItem]);
        await db.addInvoiceItems(invoiceId, [newItem]);

        toast.success(`T-Iron added: ${calculatedItem.t_iron_pieces}${calculatedItem.t_iron_unit || 'pcs'} × ${calculatedItem.t_iron_length_per_piece}ft × Rs.${calculatedItem.unit_price}/ft = Rs.${calculatedItem.total_price}`);
      }

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
    setEditingTIronItem(null);
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
      console.log('🔍 [INVOICE-DEBUG] Loading invoice details for ID:', invoiceId);
      const details = await db.getInvoiceWithDetails(invoiceId);
      console.log('🔍 [INVOICE-DEBUG] Invoice loaded:', details);
      setInvoice(details);

      // Load return items and check return eligibility after loading invoice
      if (details) {
        console.log('🔍 [INVOICE-DEBUG] Loading return items...');
        await loadReturnItems();
        console.log('🔍 [INVOICE-DEBUG] Checking return eligibility...');
        // Pass the invoice details directly instead of relying on state
        await checkReturnEligibility(details);
      }
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
        const numericValue = isNaN(parsedQuantity.numericValue) ? 0 : parsedQuantity.numericValue;
        const price = isNaN(unitPrice) ? 0 : unitPrice;
        totalPrice = (numericValue / 1000) * price;
      } else {
        // For simple units (piece, bag, etc.), use the numeric value directly
        const numericValue = isNaN(parsedQuantity.numericValue) ? 0 : parsedQuantity.numericValue;
        const price = isNaN(unitPrice) ? 0 : unitPrice;
        totalPrice = numericValue * price;
      }
      // Ensure totalPrice is not NaN
      totalPrice = isNaN(totalPrice) ? 0 : totalPrice;

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
    // Find the item to determine if it's miscellaneous
    const item = invoice?.items?.find((item: any) => item.id === itemId);
    const isMiscItem = item && Boolean(item.is_misc_item);

    const confirmMessage = isMiscItem
      ? `Remove this miscellaneous item from the invoice?\n\nNote: This will also remove the corresponding entry from the daily ledger.`
      : 'Remove this item from the invoice?';

    try {
      const confirmed = await ask(confirmMessage, {
        title: 'Confirm Item Removal'
      });

      if (!confirmed) return;
    } catch (error) {
      // Fallback to regular confirm if Tauri dialog fails
      if (!confirm(confirmMessage)) return;
    }

    try {
      setSaving(true);

      // Log the deletion for debugging
      if (isMiscItem) {
        console.log(`🎫 [MISC-DELETE] Removing miscellaneous item:`, {
          itemId,
          invoiceId,
          description: item.misc_description || item.product_name,
          amount: item.total_price,
          itemData: item
        });

        // Debug: Check entries before deletion
        await db.debugCheckMiscellaneousLedgerEntries(invoiceId);
      }

      await db.removeInvoiceItems(invoiceId, [itemId]);

      // After removing the item, check if ledger deletion was successful
      if (isMiscItem) {
        // Debug: Check entries after deletion
        const remainingEntries = await db.debugCheckMiscellaneousLedgerEntries(invoiceId);

        if (remainingEntries.length === 0) {
          console.log(`✅ [MISC-CLEANUP] All miscellaneous item ledger entries successfully removed`);
          toast.success('Miscellaneous item removed (daily ledger entry also deleted)');
        } else {
          console.warn(`⚠️ [MISC-CLEANUP] ${remainingEntries.length} ledger entries still remain after deletion`);
          toast.error('Item removed from invoice, but some ledger entries may still exist');
        }
      } else {
        toast.success('Item removed');
      }

      // Add a small delay to ensure database operations are complete
      if (isMiscItem) {
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log(`🎫 [MISC-DELETE] Deletion complete for item ${itemId}`);
      }
      await loadInvoiceDetails();

      if (onUpdate) {
        onUpdate();
      }

    } catch (error: any) {
      console.error('❌ [ITEM-DELETE] Error removing item:', error);
      toast.error(error.message || 'Failed to remove item');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!invoice) return;

    // Check for miscellaneous items
    const miscItems = invoice.items?.filter((item: any) => Boolean(item.is_misc_item)) || [];
    const hasMiscItems = miscItems.length > 0;

    let confirmMessage = `Delete entire invoice #${invoice.bill_number}?\n\nThis action cannot be undone.`;

    if (hasMiscItems) {
      confirmMessage += `\n\nNote: This invoice contains ${miscItems.length} miscellaneous item(s) that will also be removed from the daily ledger.`;
    }

    try {
      const confirmed = await ask(confirmMessage, {
        title: 'Confirm Invoice Deletion'
      });

      if (!confirmed) return;
    } catch (error) {
      // Fallback to regular confirm if Tauri dialog fails
      if (!confirm(confirmMessage)) return;
    }

    try {
      setSaving(true);

      // Log the deletion for debugging
      console.log(`🗑️ [INVOICE-DELETE] Deleting invoice ${invoiceId}:`, {
        invoiceNumber: invoice.bill_number,
        miscItemsCount: miscItems.length,
        miscItems: miscItems.map((item: any) => ({
          id: item.id,
          description: item.misc_description || item.product_name,
          amount: item.total_price
        })),
        totalItems: invoice.items?.length || 0
      });

      await db.deleteInvoice(invoiceId);

      const successMessage = hasMiscItems
        ? 'Invoice deleted (miscellaneous items also removed from daily ledger)'
        : 'Invoice deleted successfully';

      toast.success(successMessage);

      // Add a small delay to ensure database operations are complete
      if (hasMiscItems) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log(`🗑️ [INVOICE-DELETE] Deletion complete for invoice ${invoiceId}`);
      }

      if (onUpdate) {
        onUpdate();
      }

      // Close the modal/component
      onClose();

    } catch (error: any) {
      console.error('❌ [INVOICE-DELETE] Error deleting invoice:', error);
      toast.error(error.message || 'Failed to delete invoice');
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

  // Calculate adjusted totals including returns
  const calculateAdjustedTotals = () => {
    if (!invoice) return { adjustedSubtotal: 0, adjustedTotal: 0, totalReturns: 0 };

    const totalReturns = returnItems.reduce((sum, returnItem) => sum + Math.abs(returnItem.display_total_price), 0);
    const adjustedSubtotal = invoice.subtotal - totalReturns;
    const adjustedTotal = invoice.grand_total - totalReturns;

    return {
      adjustedSubtotal,
      adjustedTotal,
      totalReturns
    };
  };

  // Calculate current totals from actual items (CRITICAL FIX)
  const calculateCurrentTotals = () => {
    if (!invoice || !invoice.items) return { currentSubtotal: 0, currentTotal: 0, discountAmount: 0 };

    // Calculate actual subtotal from current items
    const currentSubtotal = invoice.items.reduce((sum: number, item: any) => {
      return sum + (item.total_price || 0);
    }, 0);

    // Apply discount if exists
    const subtotal = isNaN(currentSubtotal) ? 0 : currentSubtotal;
    const discountPercent = isNaN(invoice.discount) ? 0 : invoice.discount;
    const discountAmount = discountPercent > 0 ? (subtotal * discountPercent / 100) : 0;
    const currentTotal = subtotal - discountAmount;

    // Debug logging for troubleshooting
    console.log('🧮 [TOTAL-CALC] Current totals calculation:', {
      itemsCount: invoice.items?.length,
      currentSubtotal,
      discountPercent: invoice.discount,
      discountAmount,
      currentTotal,
      storedSubtotal: invoice.subtotal,
      storedTotal: invoice.grand_total,
      items: invoice.items?.map((item: any) => ({
        name: item.product_name,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        totalPrice: item.total_price
      }))
    });

    return {
      currentSubtotal,
      currentTotal,
      discountAmount
    };
  };

  // Calculate net quantity for an invoice item (original - returned)
  const calculateNetQuantity = (item: InvoiceItem) => {
    if (!returnItems || returnItems.length === 0) {
      // Ensure quantity is a valid number - handle potential undefined/null values
      const quantity = typeof item.quantity === 'number' && !isNaN(item.quantity) ? item.quantity : 0;
      return {
        netQuantity: quantity,
        totalReturned: 0,
        hasReturns: false
      };
    }

    // Find all return items for this invoice item
    const itemReturns = returnItems.filter(returnItem =>
      returnItem.original_invoice_item_id === item.id
    );

    const totalReturned = itemReturns.reduce((sum, returnItem) => {
      const returnQty = returnItem.return_quantity;
      const validReturnQty = typeof returnQty === 'number' && !isNaN(returnQty) ? Math.abs(returnQty) : 0;
      return sum + validReturnQty;
    }, 0);

    // Ensure item.quantity is a valid number before calculation
    const itemQuantity = typeof item.quantity === 'number' && !isNaN(item.quantity) ? item.quantity : 0;
    const netQuantity = itemQuantity - totalReturned;

    return {
      netQuantity: isNaN(netQuantity) ? 0 : netQuantity, // Prevent NaN from being returned
      totalReturned,
      hasReturns: totalReturned > 0
    };
  };

  // Calculate net total price for an invoice item
  const loadReturnItems = async () => {
    try {
      const returns = await db.getReturns({ original_invoice_id: invoiceId });
      const allReturnItems: any[] = [];

      returns.forEach((returnRecord: any) => {
        if (returnRecord.items && Array.isArray(returnRecord.items)) {
          returnRecord.items.forEach((returnItem: any) => {
            allReturnItems.push({
              ...returnItem,
              return_id: returnRecord.id,
              return_number: returnRecord.return_number,
              return_date: returnRecord.date,
              settlement_type: returnRecord.settlement_type,
              // Make quantities negative for display
              display_quantity: -returnItem.return_quantity,
              display_total_price: -returnItem.total_price,
              is_return_item: true
            });
          });
        }
      });

      setReturnItems(allReturnItems);
    } catch (error) {
      console.error('Error loading return items:', error);
      setReturnItems([]);
    }
  };
  const checkReturnEligibility = async (invoiceData?: any) => {
    const currentInvoice = invoiceData || invoice;
    if (!currentInvoice) {
      console.log('🔍 [RETURN-DEBUG] No invoice loaded yet');
      return;
    }

    try {
      // CRITICAL FIX: Use proper 2-decimal precision matching database calculations
      const totalAmount = Math.round((Number(currentInvoice.total_amount || currentInvoice.grand_total || 0) + Number.EPSILON) * 100) / 100;
      const remainingBalance = Math.round((Number(currentInvoice.remaining_balance || 0) + Number.EPSILON) * 100) / 100;
      const paidAmount = Math.round((Number(currentInvoice.paid_amount || currentInvoice.payment_amount || 0) + Number.EPSILON) * 100) / 100;

      // Check for data integrity issues (should not happen with precision fix)
      if (remainingBalance > totalAmount && paidAmount === 0) {
        console.error('🚨 [CRITICAL] Data integrity issue detected!', {
          invoice_id: currentInvoice.id,
          total_amount: totalAmount,
          remaining_balance: remainingBalance,
          difference: remainingBalance - totalAmount,
          issue: 'REMAINING_BALANCE_EXCEEDS_TOTAL'
        });
      }

      // FIXED: Proper payment status detection with consistent precision
      const isFullyPaid = remainingBalance <= 0.01;
      const isUnpaid = Math.abs(remainingBalance - totalAmount) <= 0.01; // Back to strict precision
      const isPartiallyPaid = !isFullyPaid && !isUnpaid; console.log('🔍 [RETURN-DEBUG] Payment status check:', {
        invoice_id: currentInvoice.id,
        total_amount: totalAmount,
        remaining_balance: remainingBalance,
        paid_amount: paidAmount,
        remaining_balance_exact: JSON.stringify(currentInvoice.remaining_balance),
        total_amount_exact: JSON.stringify(currentInvoice.total_amount || currentInvoice.grand_total),
        difference: Math.abs(remainingBalance - totalAmount),
        isFullyPaid,
        isUnpaid,
        isPartiallyPaid,
        comparison_zero: remainingBalance === 0,
        comparison_total: remainingBalance === totalAmount,
        balance_type: typeof currentInvoice.remaining_balance,
        total_type: typeof (currentInvoice.total_amount || currentInvoice.grand_total),
        precision_fixed: true,
        data_integrity_status: remainingBalance > totalAmount && paidAmount === 0 ? 'CRITICAL_ISSUE' : 'OK'
      });

      if (isPartiallyPaid) {
        console.log('🔍 [RETURN-DEBUG] Partially paid - returns not allowed');
        setReturnEligibility({
          canReturn: false,
          reason: 'Returns not allowed for partially paid invoices',
          returnableQuantities: {}
        });
        return;
      }

      // Load returnable quantities for all items
      const returnableQuantities: Record<number, number> = {};
      if (currentInvoice.items) {
        console.log('🔍 [RETURN-DEBUG] Checking returnable quantities for', currentInvoice.items.length, 'items');
        for (const item of currentInvoice.items) {
          if (!item.is_misc_item && item.product_id) {
            try {
              const result = await db.getReturnableQuantity(item.id);
              returnableQuantities[item.id] = result.returnableQuantity;
              console.log('🔍 [RETURN-DEBUG] Item', item.id, ':', {
                product_name: item.product_name,
                original: result.originalQuantity,
                returned: result.totalReturned,
                returnable: result.returnableQuantity
              });
            } catch (error) {
              console.error(`Error getting returnable quantity for item ${item.id}:`, error);
              returnableQuantities[item.id] = 0;
            }
          }
        }
      }

      const canReturn = isFullyPaid || isUnpaid;
      console.log('🔍 [RETURN-DEBUG] Final eligibility:', {
        canReturn,
        returnableQuantities
      });

      setReturnEligibility({
        canReturn,
        reason: canReturn ? '' : 'Returns only allowed for fully paid or unpaid invoices',
        returnableQuantities
      });
    } catch (error) {
      console.error('Error checking return eligibility:', error);
      setReturnEligibility({
        canReturn: false,
        reason: 'Error checking return eligibility',
        returnableQuantities: {}
      });
    }
  };

  // Utility function to parse kg-grams format quantities
  const parseQuantityInput = (input: string): number => {
    if (!input || input.trim() === '') {
      return 0;
    }

    const trimmedInput = input.trim();
    console.log('🔍 [PARSE-DEBUG] Input:', trimmedInput);

    // Check for kg-grams format: "12-990"
    const kgGramsMatch = trimmedInput.match(/^(\d+(?:\.\d+)?)-(\d+)$/);
    if (kgGramsMatch) {
      const kg = parseFloat(kgGramsMatch[1]);
      const grams = parseFloat(kgGramsMatch[2]);

      console.log('🔍 [PARSE-DEBUG] Matched kg-grams:', { kg, grams });

      // Validate grams should be less than 1000
      if (grams >= 1000) {
        throw new Error(`Invalid grams value: ${grams}. Grams should be less than 1000.`);
      }

      const result = kg + (grams / 1000);
      console.log('🔍 [PARSE-DEBUG] Calculated result:', result);
      return result;
    } else {
      // Handle regular decimal input
      const parsed = parseFloat(trimmedInput);
      console.log('🔍 [PARSE-DEBUG] Parsed as decimal:', parsed);
      return isNaN(parsed) ? 0 : parsed;
    }
  };

  // Utility function to format quantity for display (especially kg-grams)
  const formatQuantityDisplay = (quantity: number | string, showUnit: boolean = true): string => {
    if (typeof quantity === 'string' && quantity.includes('-')) {
      // Already in kg-grams format like "12-990"
      return showUnit ? `${quantity} kg` : quantity;
    }

    const numericQuantity = typeof quantity === 'string' ? parseFloat(quantity) : quantity;

    // For decimal quantities, convert back to kg-grams format when appropriate
    if (numericQuantity > 0) {
      const kg = Math.floor(numericQuantity);
      const gramsDecimal = numericQuantity - kg;

      if (gramsDecimal > 0.001) { // Add small tolerance for floating point precision
        const grams = Math.round(gramsDecimal * 1000);
        if (grams > 0 && grams < 1000) {
          // Format with proper zero padding for grams
          const gramsStr = grams.toString().padStart(3, '0');
          return showUnit ? `${kg}-${gramsStr} kg` : `${kg}-${gramsStr}`;
        }
      }

      // If grams is 0 or very small, just show kg
      return showUnit ? `${kg} kg` : `${kg}`;
    }

    return showUnit ? `${numericQuantity} kg` : `${numericQuantity}`;
  };

  const getReturnableQuantity = async (itemId: number): Promise<number> => {
    try {
      const result = await db.getReturnableQuantity(itemId);
      return result.returnableQuantity;
    } catch (error) {
      console.error('Error getting returnable quantity:', error);
      return 0;
    }
  };

  const validateReturnQuantity = async (item: InvoiceItem, returnQty: string): Promise<{ isValid: boolean; error?: string }> => {
    if (!returnQty || returnQty.trim() === '') {
      return { isValid: false, error: 'Return quantity is required' };
    }

    // Parse quantity using utility function with error handling
    let qty: number;
    try {
      qty = parseQuantityInput(returnQty);
    } catch (error) {
      return { isValid: false, error: (error as Error).message };
    }

    if (isNaN(qty) || qty <= 0) {
      return { isValid: false, error: 'Return quantity must be a positive number' };
    }

    // Get actual returnable quantity considering previous returns
    const returnableQty = await getReturnableQuantity(item.id);

    console.log('🔍 [RETURN-VALIDATION] Quantity comparison:', {
      returnQty: returnQty,
      parsedQty: qty,
      returnableQty: returnableQty,
      originalQty: item.quantity
    });

    if (qty > returnableQty) {
      return {
        isValid: false,
        error: `Cannot return ${returnQty} (${qty} kg). Maximum returnable quantity: ${formatQuantityDisplay(returnableQty)} (Original: ${formatQuantityDisplay(item.quantity)})`
      };
    }

    return { isValid: true };
  }; const processReturn = async () => {
    if (!returnModal.item) return;

    // Validate return quantity (now async)
    const validation = await validateReturnQuantity(returnModal.item, returnModal.returnQuantity);
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

      // Parse return quantity using utility function
      const returnQuantity = parseQuantityInput(returnModal.returnQuantity);

      console.log('🔍 [RETURN-PROCESS] Processing return:', {
        input: returnModal.returnQuantity,
        parsed: returnQuantity
      });

      const itemUnitPrice = isNaN(returnModal.item.unit_price) ? 0 : returnModal.item.unit_price;
      const safeReturnQuantity = isNaN(returnQuantity) ? 0 : returnQuantity;
      const totalPrice = safeReturnQuantity * itemUnitPrice;

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

      // Reload all data to reflect the return
      await loadInvoiceDetails();
      await checkReturnEligibility();

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
      const safePaymentAmount = isNaN(paymentAmount) ? 0 : paymentAmount;
      const safeRemainingBalance = isNaN(remainingBalance) ? 0 : remainingBalance;
      // CRITICAL FIX: Use 2-decimal precision for error messages
      toast.error(`Payment amount (${safePaymentAmount.toFixed(2)}) cannot exceed remaining balance (${safeRemainingBalance.toFixed(2)})`);
      return;
    }

    try {
      setSaving(true);

      const paymentData = {
        amount: paymentAmount,
        payment_method: newPayment.payment_method,
        payment_channel_id: selectedPaymentChannel?.id || null,
        payment_channel_name: selectedPaymentChannel?.name || newPayment.payment_method,
        reference: newPayment.reference,
        notes: newPayment.notes,
        date: newPayment.date
      };

      console.log('XYZA001-FRONTEND-START =============================== START FRONTEND-DEBUG ===============================');
      console.log('XYZA002-FRONTEND-DEBUG 🔍 [FRONTEND-DEBUG] Payment data being sent to backend:');
      console.log('XYZA003-FRONTEND-DEBUG    - Payment Amount:', paymentAmount);
      console.log('XYZA004-FRONTEND-DEBUG    - New Payment Object:', newPayment);
      console.log('XYZA005-FRONTEND-DEBUG    - Selected Payment Channel:', selectedPaymentChannel);
      console.log('XYZA006-FRONTEND-DEBUG    - Final Payment Data:', paymentData);
      console.log('XYZA007-FRONTEND-DEBUG    - Invoice ID:', invoiceId);
      console.log('XYZA008-FRONTEND-END =============================== END FRONTEND-DEBUG ===============================');

      console.log('XYZA009-FRONTEND-CALL 🔄 [FRONTEND-DEBUG] About to call db.addInvoicePayment...');
      console.log('XYZA009B-DB-OBJECT 🔍 [FRONTEND-DEBUG] Database object:', db);
      console.log('XYZA009C-DB-METHOD 🔍 [FRONTEND-DEBUG] addInvoicePayment method:', db.addInvoicePayment);
      console.log('XYZA009D-DB-TYPE 🔍 [FRONTEND-DEBUG] typeof addInvoicePayment:', typeof db.addInvoicePayment);

      await db.addInvoicePayment(invoiceId, paymentData);

      console.log('XYZA010-FRONTEND-SUCCESS ✅ [FRONTEND-DEBUG] Payment submitted successfully to backend');

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
      console.log('XYZA011-FRONTEND-ERROR ❌ [FRONTEND-DEBUG] Error in payment submission:', error);
      console.log('XYZA012-FRONTEND-ERROR ❌ [FRONTEND-DEBUG] Error message:', error.message);
      console.log('XYZA013-FRONTEND-ERROR ❌ [FRONTEND-DEBUG] Error stack:', error.stack);
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
            .item-row.has-returns {
              background-color: #fff4e6;
              border-left: 3px solid #f59e0b;
              padding-left: 2mm;
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
            <div class="items-header">ITEMS SOLD</div>
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
          const pieces = typeof item.t_iron_pieces === 'number' && !isNaN(item.t_iron_pieces) ? item.t_iron_pieces : 0;
          const lengthPerPiece = typeof item.t_iron_length_per_piece === 'number' && !isNaN(item.t_iron_length_per_piece) ? item.t_iron_length_per_piece : 0;
          const unit = item.t_iron_unit || 'pcs';
          const unitPrice = typeof item.unit_price === 'number' && !isNaN(item.unit_price) ? item.unit_price : 0;
          return `<span>${pieces}${unit} × ${lengthPerPiece}ft/${unit} × Rs.${unitPrice}</span>`;
        }
        // Regular items - calculate original quantity like in the main display
        let originalQuantity = typeof item.quantity === 'number' && !isNaN(item.quantity) ? item.quantity : 0;

        // If quantity is 0, try to back-calculate from total_price / unit_price
        if (originalQuantity === 0 && item.total_price && item.unit_price) {
          originalQuantity = item.total_price / item.unit_price;
        }

        // Find the product to get unit_type for proper formatting
        const product = item.product_id ? products.find(p => p.id === item.product_id) : null;

        // Format quantity based on product unit type
        let formattedQuantity;
        if (product && (product.unit_type === 'kg-grams' || product.unit_type === 'kg')) {
          formattedQuantity = formatQuantityDisplay(originalQuantity, true);
        } else {
          formattedQuantity = originalQuantity;
        }

        const unitPrice = typeof item.unit_price === 'number' && !isNaN(item.unit_price) ? item.unit_price : 0;
        return `<span>${formattedQuantity} × Rs.${unitPrice}</span>`;
      })()}
                  <span><strong>Rs.${typeof item.total_price === 'number' && !isNaN(item.total_price) ? item.total_price.toFixed(2) : '0.00'}</strong></span>
                </div>
              </div>
            `).join('') || '<div>No items</div>'}
          </div>
          <div class="totals">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>${(() => {
        const { currentSubtotal } = calculateCurrentTotals();
        return formatCurrency(currentSubtotal);
      })()}</span>
            </div>
            ${invoice.discount > 0 ? `
              <div class="total-row">
                <span>Discount (${invoice.discount}%):</span>
                <span>-${(() => {
          const { discountAmount } = calculateCurrentTotals();
          return formatCurrency(discountAmount || 0);
        })()}</span>
              </div>
            ` : ''}
            ${returnItems.length === 0 ? `
              <div class="total-row grand-total">
                <span>Total:</span>
                <span>${(() => {
          const { currentTotal } = calculateCurrentTotals();
          return formatCurrency(currentTotal);
        })()}</span>
              </div>
            ` : ''}
          </div>
          ${returnItems.length > 0 ? `
          <div class="totals">
            <div style="font-weight: bold; margin-bottom: 3mm; text-align: center; font-size: 11px; border-bottom: 1px solid #ccc; padding-bottom: 2mm;">RETURNS PROCESSED</div>
            ${(() => {
          // Group returns by return record
          const returnGroups: { [key: string]: any[] } = {};
          returnItems.forEach(returnItem => {
            if (!returnGroups[returnItem.return_id]) {
              returnGroups[returnItem.return_id] = [];
            }
            returnGroups[returnItem.return_id].push(returnItem);
          });

          return Object.values(returnGroups).map((group: any) => {
            return group.map((returnItem: any) => `
                <div class="item-row">
                  <div class="item-name">${returnItem.product_name}</div>
                  <div class="item-details">
                    <span>${returnItem.display_quantity} × Rs.${returnItem.unit_price}</span>
                    <span><strong>Rs. ${typeof returnItem.display_total_price === 'number' && !isNaN(returnItem.display_total_price) ? returnItem.display_total_price.toFixed(2) : '0.00'}</strong></span>
                  </div>
                </div>`).join('');
          }).join('');
        })()}
            <div class="total-row" style="border-top: 1px solid #ccc; padding-top: 2mm; margin-top: 2mm; font-weight: bold;">
              <span>TOTAL RETURNS:</span>
              <span>Rs.${(() => {
          const totalReturns = returnItems.reduce((sum, returnItem) => sum + Math.abs(returnItem.display_total_price), 0);
          return isNaN(totalReturns) ? '0.00' : totalReturns.toFixed(2);
        })()}</span>
            </div>
            <div class="total-row grand-total">
              <span>Total:</span>
              <span>${(() => {
          const { currentTotal } = calculateCurrentTotals();
          const totalReturns = returnItems.reduce((sum, returnItem) => sum + Math.abs(returnItem.display_total_price), 0);
          const netTotal = currentTotal - totalReturns;
          return formatCurrency(netTotal);
        })()}</span>
            </div>
          </div>
          ` : ''}
          <div class="payment-info">
            <div class="total-row">
              <span>Paid:</span>
              <span>${formatCurrency(invoice.payment_amount || 0)}</span>
            </div>
            ${(() => {
        const { currentTotal } = calculateCurrentTotals();
        const totalReturns = returnItems.reduce((sum, returnItem) => sum + Math.abs(returnItem.display_total_price), 0);
        const netAmount = currentTotal - totalReturns;
        const paidAmount = invoice.payment_amount || 0;
        const netBalance = netAmount - paidAmount;

        if (netBalance > 0) {
          return `
                <div class="total-row">
                  <span><strong>Outstanding Balance:</strong></span>
                  <span><strong>${formatCurrency(netBalance)}</strong></span>
                </div>
                <div class="total-row">
                  <span><strong>Payment Status:</strong></span>
                  <span><strong>${paidAmount > 0 ? 'PARTIALLY PAID' : 'UNPAID'}</strong></span>
                </div>`;
        } else {
          return `
                <div class="total-row">
                  <span><strong>Payment Status:</strong></span>
                  <span><strong>FULLY PAID</strong></span>
                </div>`;
        }
      })()}
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

            {/* Delete Invoice Button - Only for unpaid invoices */}
            {mode === 'edit' && invoice.remaining_balance > 0 && (
              <button
                onClick={handleDeleteInvoice}
                disabled={saving}
                className="p-2 hover:bg-red-100 rounded-lg text-red-600 hover:text-red-700 disabled:opacity-50"
                title="Delete Invoice"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
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
                  {(() => {
                    const { currentTotal } = calculateCurrentTotals();
                    const { totalReturns } = calculateAdjustedTotals();
                    const adjustedPaidAmount = invoice.payment_amount || 0;
                    const netTotal = currentTotal - totalReturns;
                    const adjustedBalance = netTotal - adjustedPaidAmount;

                    return (
                      <>
                        {returnItems.length > 0 ? (
                          <>
                            <div className="flex justify-between text-sm text-gray-500">
                              <span>Original Amount:</span>
                              <span>{formatCurrency(currentTotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-red-600">
                              <span>Returns:</span>
                              <span>-{formatCurrency(totalReturns)}</span>
                            </div>
                            <div className="flex justify-between text-sm border-t pt-2">
                              <span className="text-gray-600">Paid:</span>
                              <span className="font-medium text-green-600">{formatCurrency(adjustedPaidAmount)}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t">
                              <span className="text-gray-900 font-medium">Outstanding Balance:</span>
                              <span className={`font-semibold ${adjustedBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCurrency(adjustedBalance)}
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Total Amount:</span>
                              <span className="font-medium">{formatCurrency(currentTotal)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Paid:</span>
                              <span className="font-medium text-green-600">{formatCurrency(invoice.payment_amount || 0)}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t">
                              <span className="text-gray-900 font-medium">Outstanding Balance:</span>
                              <span className={`font-semibold ${(currentTotal - (invoice.payment_amount || 0)) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCurrency(currentTotal - (invoice.payment_amount || 0))}
                              </span>
                            </div>
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Items Section */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <h3 className="font-medium text-gray-900">
                  Items ({invoice.items?.length || 0})
                </h3>
                {mode === 'edit' && (
                  <button
                    onClick={() => setShowAddItem(true)}
                    disabled={saving}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Item</span>
                  </button>
                )}
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
                      {/* Original Invoice Items */}
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
                                      {item.length && !isNaN(item.length) && ` • ${item.length}/L`}
                                      {item.pieces && !isNaN(item.pieces) && ` • ${item.pieces}/pcs`}
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

                                      // Calculate net quantity for T-Iron items
                                      const { totalReturned, hasReturns } = calculateNetQuantity(item);

                                      // Ensure safe display values for T-Iron
                                      const displayTotalReturned = typeof totalReturned === 'number' && !isNaN(totalReturned) ? totalReturned : 0;
                                      const displayPieces = typeof pieces === 'number' && !isNaN(pieces) ? pieces : 0;
                                      const displayLengthPerPiece = typeof lengthPerPiece === 'number' && !isNaN(lengthPerPiece) ? lengthPerPiece : 0;

                                      return (
                                        <div className="text-sm">
                                          {hasReturns ? (
                                            <div>
                                              <div className="text-gray-900 font-medium">
                                                {displayPieces}{unit} × {displayLengthPerPiece}ft/{unit}
                                              </div>
                                              <div className="text-xs text-gray-500 mt-1">
                                                <span className="text-red-500">Returned: -{displayTotalReturned}</span>
                                              </div>
                                            </div>
                                          ) : (
                                            <div>
                                              {typeof pieces === 'number' && !isNaN(pieces) ? pieces : 0}{unit} × {typeof lengthPerPiece === 'number' && !isNaN(lengthPerPiece) ? lengthPerPiece : 0}ft/{unit}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    }
                                    // Calculate net quantity for this item
                                    const { totalReturned, hasReturns } = calculateNetQuantity(item);

                                    // Calculate original quantity from return records if available, otherwise use current quantity
                                    let originalQuantity = typeof item.quantity === 'number' && !isNaN(item.quantity) ? item.quantity : 0;

                                    if (hasReturns && returnItems && returnItems.length > 0) {
                                      // Find return records for this item to get the original quantity
                                      const itemReturns = returnItems.filter(returnItem =>
                                        returnItem.original_invoice_item_id === item.id
                                      );

                                      if (itemReturns.length > 0) {
                                        // Use original_quantity from the first return record (they should all be the same)
                                        originalQuantity = itemReturns[0].original_quantity || originalQuantity;
                                      }
                                    } else if (originalQuantity === 0 && item.total_price && item.unit_price) {
                                      // Fallback: If quantity is 0 but we have total_price and unit_price, back-calculate
                                      // This handles cases where quantity was incorrectly set to 0
                                      originalQuantity = item.total_price / item.unit_price;
                                    }

                                    return (
                                      <div className="text-sm">
                                        {hasReturns ? (
                                          <div>
                                            <span className="text-gray-900 font-medium">
                                              {(() => {
                                                // Find the product to get unit_type for proper formatting
                                                const product = item.product_id ? products.find(p => p.id === item.product_id) : null;

                                                // Format quantity based on product unit type
                                                if (product && (product.unit_type === 'kg-grams' || product.unit_type === 'kg')) {
                                                  return formatQuantityDisplay(originalQuantity, true);
                                                }

                                                return originalQuantity;
                                              })()}
                                            </span>
                                            <div className="text-xs text-gray-500 mt-1">
                                              <span className="text-red-500">Returned: -{typeof totalReturned === 'number' && !isNaN(totalReturned) ? totalReturned : 0}</span>
                                            </div>
                                          </div>
                                        ) : (
                                          <span>
                                            {(() => {
                                              // Find the product to get unit_type for proper formatting
                                              const product = item.product_id ? products.find(p => p.id === item.product_id) : null;

                                              // Format quantity based on product unit type
                                              if (product && (product.unit_type === 'kg-grams' || product.unit_type === 'kg')) {
                                                return formatQuantityDisplay(originalQuantity, true);
                                              }

                                              return originalQuantity;
                                            })()}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })()}
                                  {mode === 'edit' && (() => {
                                    // Check if this is a T-Iron item with calculation data
                                    const isTIronProduct = item.product_name && (
                                      item.product_name.toLowerCase().includes('t-iron') ||
                                      item.product_name.toLowerCase().includes('tiron') ||
                                      item.product_name.toLowerCase().includes('t iron')
                                    );
                                    const hasTIronData = !!(item.t_iron_pieces && item.t_iron_length_per_piece);

                                    // Get product info to check inventory tracking status
                                    const product = item.product_id ? products.find(p => p.id === item.product_id) : null;

                                    if (isTIronProduct && hasTIronData) {
                                      // For T-Iron items, open calculator with existing data
                                      return (
                                        <button
                                          onClick={() => {
                                            console.log('🔧 Opening T-Iron calculator for editing item:', item);
                                            setEditingTIronItem(item);
                                            if (product) {
                                              setSelectedTIronProduct(product);
                                            }
                                            setShowTIronCalculator(true);
                                          }}
                                          className="p-1 text-orange-600 hover:text-orange-800"
                                          title="Edit T-Iron calculation"
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
                          <td className="px-4 py-3 text-sm font-medium">
                            {(() => {
                              const { hasReturns } = calculateNetQuantity(item);

                              if (hasReturns) {
                                return (
                                  <div>
                                    <div className="text-gray-900 font-medium">
                                      {formatCurrency(item.total_price)}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      <span className="text-red-500">Has returns</span>
                                    </div>
                                  </div>
                                );
                              } else {
                                return formatCurrency(item.total_price);
                              }
                            })()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center space-x-1">
                              {/* Return button - only for eligible items with returnable quantity */}
                              {(() => {
                                const canShowReturn = !item.is_misc_item && item.product_id &&
                                  returnEligibility.canReturn &&
                                  (returnEligibility.returnableQuantities[item.id] || 0) > 0;

                                console.log(`🔍 [BUTTON-DEBUG] Item ${item.id} (${item.product_name}):`, {
                                  is_misc_item: item.is_misc_item,
                                  product_id: item.product_id,
                                  canReturn: returnEligibility.canReturn,
                                  returnableQty: returnEligibility.returnableQuantities[item.id],
                                  canShowReturn,
                                  invoice_id: invoice?.id,
                                  invoice_status: invoice ? {
                                    total: invoice.total_amount,
                                    remaining: invoice.remaining_balance,
                                    paid: invoice.paid_amount || invoice.payment_amount
                                  } : 'no invoice',
                                  reasons: {
                                    isMiscItem: !!item.is_misc_item,
                                    noProductId: !item.product_id,
                                    cantReturn: !returnEligibility.canReturn,
                                    noReturnableQty: (returnEligibility.returnableQuantities[item.id] || 0) <= 0,
                                    isNaN: isNaN(returnEligibility.returnableQuantities[item.id])
                                  },
                                  returnEligibility: returnEligibility
                                });

                                if (canShowReturn) {
                                  return (
                                    <button
                                      onClick={() => openReturnModal(item)}
                                      disabled={saving}
                                      className="p-1 text-orange-600 hover:text-orange-800 disabled:opacity-50"
                                      title={`Return Item (${returnEligibility.returnableQuantities[item.id] || 0} available)`}
                                    >
                                      <Undo2 className="h-4 w-4" />
                                    </button>
                                  );
                                }
                                return null;
                              })()}

                              {/* Return disabled indicator */}
                              {!item.is_misc_item && item.product_id &&
                                (!returnEligibility.canReturn || (returnEligibility.returnableQuantities[item.id] || 0) === 0) && (
                                  <button
                                    disabled
                                    className="p-1 text-gray-300 cursor-not-allowed"
                                    title={
                                      !returnEligibility.canReturn
                                        ? returnEligibility.reason
                                        : `No quantity available for return (${returnEligibility.returnableQuantities[item.id] || 0} remaining)`
                                    }
                                  >
                                    <Undo2 className="h-4 w-4" />
                                  </button>
                                )}
                              {/* Remove button */}
                              {mode === 'edit' && (
                                <button
                                  onClick={() => handleRemoveItem(item.id)}
                                  disabled={saving}
                                  className="p-1 text-red-600 hover:text-red-800 disabled:opacity-50"
                                  title="Remove Item"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}

                      {/* Return Items Section Header */}
                      {returnItems.length > 0 && (
                        <tr className="bg-red-100">
                          <td colSpan={5} className="px-4 py-2 text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <span className="text-red-600 font-medium">📋 RETURNED ITEMS</span>
                              <span className="text-xs text-red-500 bg-red-200 px-2 py-1 rounded">
                                {returnItems.length} item{returnItems.length !== 1 ? 's' : ''} returned
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* Return Items (shown as negative quantities) */}
                      {returnItems.map((returnItem: any) => (
                        <tr key={`return-${returnItem.return_id}-${returnItem.original_invoice_item_id}`}
                          className="hover:bg-red-50 bg-red-50/30">
                          <td className="px-4 py-3">
                            <div className="font-medium text-red-600 flex items-center">
                              <span className="mr-2 text-red-600" title="Returned Item">↵</span>
                              {returnItem.product_name}
                              <span className="text-xs text-red-500 ml-2 bg-red-100 px-2 py-1 rounded">
                                RETURNED
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Return #{returnItem.return_number} • {returnItem.return_date}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-red-600 font-medium">
                            {returnItem.display_quantity} {returnItem.unit || 'piece'}
                          </td>
                          <td className="px-4 py-3 text-sm text-red-600">{formatCurrency(returnItem.unit_price)}</td>
                          <td className="px-4 py-3 text-sm font-medium text-red-600">
                            {formatCurrency(returnItem.display_total_price)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center space-x-1">
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                {returnItem.settlement_type === 'ledger' ? 'Credit Added' : 'Cash Refunded'}
                              </span>
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


            </div>

            {/* Payments Section */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <h3 className="font-medium text-gray-900">
                  Payments ({invoice.payments?.length || 0})
                </h3>
                <div className="flex items-center space-x-2">
                  {mode === 'edit' && invoice.remaining_balance > 0 && (
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
                  {mode === 'edit' && invoice.remaining_balance > 0 && (
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
                            onWheel={(e) => e.currentTarget.blur()}
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
                                onWheel={(e) => e.currentTarget.blur()}
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
                                onWheel={(e) => e.currentTarget.blur()}
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
                        onWheel={(e) => e.currentTarget.blur()}
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
                        toast.error('Error adding item: ' + error);
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
                {(() => {
                  const { currentTotal } = calculateCurrentTotals();
                  const { totalReturns } = calculateAdjustedTotals();
                  const adjustedPaidAmount = invoice.payment_amount || 0;
                  const netTotal = currentTotal - totalReturns;
                  const adjustedBalance = netTotal - adjustedPaidAmount;

                  return (
                    <>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="text-xs sm:text-sm text-yellow-800">
                          <strong>Outstanding Balance:</strong> {formatCurrency(adjustedBalance)}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Payment Amount (Rs.)</label>
                        <input
                          type="number"
                          value={newPayment.amount}
                          onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                          onWheel={(e) => e.currentTarget.blur()}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                          step="0.1"
                          max={adjustedBalance}
                          placeholder="0.0"
                        />
                        <div className="flex flex-col sm:flex-row justify-between mt-2 space-y-2 sm:space-y-0 sm:space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              // CRITICAL FIX: Use 2-decimal precision for payment buttons
                              const half = Math.round((adjustedBalance / 2 + Number.EPSILON) * 100) / 100;
                              setNewPayment({ ...newPayment, amount: isNaN(half) ? '0.00' : half.toFixed(2) });
                            }}
                            className="flex-1 text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                          >
                            Half
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              // CRITICAL FIX: Use 2-decimal precision for full payment button
                              const full = Math.round((adjustedBalance + Number.EPSILON) * 100) / 100;
                              setNewPayment({ ...newPayment, amount: isNaN(full) ? '0.00' : full.toFixed(2) });
                            }}
                            className="flex-1 text-xs px-3 py-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200"
                          >
                            Full Amount
                          </button>
                        </div>
                      </div>
                    </>
                  );
                })()}

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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md sm:max-w-lg lg:max-w-xl max-h-[95vh] overflow-y-auto">
              <div className="border-b border-gray-200 px-4 sm:px-6 py-4 sticky top-0 bg-white rounded-t-lg">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Return Item</h3>
                  <button
                    onClick={closeReturnModal}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="px-4 sm:px-6 py-4 space-y-4 sm:space-y-6">
                {/* Item Details */}
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <h4 className="font-medium text-gray-900 text-sm sm:text-base mb-2">{returnModal.item?.product_name}</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Unit Price:</span>
                      <span className="font-medium">{formatCurrency(returnModal.item?.unit_price || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Original Quantity:</span>
                      <span className="font-medium">{formatQuantityDisplay(returnModal.item?.quantity || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Available for Return:</span>
                      <span className="font-medium text-green-600">
                        {returnModal.item ? formatQuantityDisplay(returnEligibility.returnableQuantities[returnModal.item.id] || 0) : 0}
                      </span>
                    </div>
                    {returnModal.item && (returnEligibility.returnableQuantities[returnModal.item.id] || 0) < parseFloat(String(returnModal.item.quantity)) && (
                      <div className="text-orange-600 text-xs mt-1 p-2 bg-orange-50 rounded">
                        {formatQuantityDisplay(parseFloat(String(returnModal.item.quantity)) - (returnEligibility.returnableQuantities[returnModal.item.id] || 0))} already returned
                      </div>
                    )}

                    {/* Debug information for troubleshooting */}
                    {process.env.NODE_ENV === 'development' && returnModal.item && (
                      <div className="text-xs text-blue-600 mt-2 p-2 bg-blue-50 rounded border">
                        <strong>Debug Info:</strong><br />
                        Raw quantity: {JSON.stringify(returnModal.item.quantity)}<br />
                        Parsed quantity: {parseFloat(String(returnModal.item.quantity))}<br />
                        Returnable: {returnEligibility.returnableQuantities[returnModal.item.id]}<br />
                        Format type: {typeof returnModal.item.quantity}
                      </div>
                    )}
                  </div>
                </div>

                {/* Return Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Return Quantity *
                  </label>
                  <input
                    type="text"
                    value={returnModal.returnQuantity}
                    onChange={(e) => setReturnModal(prev => ({ ...prev, returnQuantity: e.target.value }))}
                    className="w-full px-3 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                    placeholder="e.g., 12-990 for 12kg 990g or 5.5 for 5.5kg"
                  />
                  <div className="text-xs sm:text-sm text-gray-500 mt-2 space-y-1">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                      <span>Maximum: {returnModal.item ? formatQuantityDisplay(returnEligibility.returnableQuantities[returnModal.item.id] || 0) : 0}</span>
                      <span className="text-blue-600">Format: "12-990" for kg-grams or "5.5" for decimal</span>
                    </div>
                    {returnModal.returnQuantity && (
                      <div className="mt-2 p-2 sm:p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                          <strong className="text-xs sm:text-sm">Parsed Value:</strong>
                          <span className="text-xs sm:text-sm">
                            {(() => {
                              try {
                                const parsed = parseQuantityInput(returnModal.returnQuantity);
                                return `${parsed} kg`;
                              } catch (error) {
                                return `Error: ${(error as Error).message}`;
                              }
                            })()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Return Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Return Reason *
                  </label>
                  <select
                    value={returnModal.reason}
                    onChange={(e) => setReturnModal(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full px-3 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
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
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Settlement Method *
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-start cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <input
                        type="radio"
                        value="ledger"
                        checked={returnModal.settlementType === 'ledger'}
                        onChange={(e) => setReturnModal(prev => ({ ...prev, settlementType: e.target.value as 'ledger' | 'cash' }))}
                        className="mt-1 mr-3 text-blue-600"
                      />
                      <div className="flex-1">
                        <div className="text-sm sm:text-base font-medium text-gray-900">Add to Customer Ledger</div>
                        <div className="text-xs sm:text-sm text-gray-500 mt-1">Credit will be added to customer's account</div>
                      </div>
                    </label>
                    <label className="flex items-start cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <input
                        type="radio"
                        value="cash"
                        checked={returnModal.settlementType === 'cash'}
                        onChange={(e) => setReturnModal(prev => ({ ...prev, settlementType: e.target.value as 'ledger' | 'cash' }))}
                        className="mt-1 mr-3 text-blue-600"
                      />
                      <div className="flex-1">
                        <div className="text-sm sm:text-base font-medium text-gray-900">Cash Refund</div>
                        <div className="text-xs sm:text-sm text-gray-500 mt-1">Cash will be refunded to customer</div>
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
                    className="w-full px-3 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                    placeholder="Additional notes about the return..."
                  />
                </div>

                {/* Return Total */}
                {returnModal.returnQuantity && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                      <span className="text-sm sm:text-base font-medium text-blue-900">Return Total:</span>
                      <span className="text-lg sm:text-xl font-bold text-blue-900">
                        {(() => {
                          try {
                            const parsedQty = parseQuantityInput(returnModal.returnQuantity);
                            return formatCurrency(parsedQty * (returnModal.item?.unit_price || 0));
                          } catch (error) {
                            return formatCurrency(0);
                          }
                        })()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 px-4 sm:px-6 py-4 sticky bottom-0 bg-white rounded-b-lg">
                <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                  <button
                    onClick={closeReturnModal}
                    className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={processReturn}
                    disabled={saving || !returnModal.returnQuantity || !returnModal.reason}
                    className="w-full sm:w-auto px-4 py-2 sm:py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base font-medium"
                  >
                    {saving ? (
                      <div className="flex items-center justify-center space-x-2">
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
            existingItem={editingTIronItem}
          />
        )}
      </div>
    </div>
  );
};

export default InvoiceDetails;