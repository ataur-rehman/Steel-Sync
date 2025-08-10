// Fixed Daily Ledger with Proper Data Interconnections
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { db } from '../../services/database';
import { useActivityLogger } from '../../hooks/useActivityLogger';
import toast from 'react-hot-toast';
import { parseCurrency } from '../../utils/currency';
import { formatInvoiceNumber } from '../../utils/numberFormatting';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Plus,
  Download,
  Search,
  Eye,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  Edit,
  Trash2,
  Save,
  X,
  User,
  Info
} from 'lucide-react';

// Enhanced interfaces with proper data handling
interface LedgerEntry {
  id: string;
  date: string;
  time: string;
  type: 'incoming' | 'outgoing';
  category: string;
  description: string;
  amount: number;
  reference_id?: number;
  reference_type?: string;
  customer_id?: number;
  customer_name?: string;
  payment_method?: string;
  payment_channel_id?: number;
  payment_channel_name?: string;
  notes?: string;
  bill_number?: string; // Added for searchability
  is_manual?: boolean; // To distinguish manual entries from system entries
  created_at: string;
  updated_at: string;
}

interface DailySummary {
  date: string;
  opening_balance: number;
  closing_balance: number;
  total_incoming: number;
  total_outgoing: number;
  net_movement: number;
  transactions_count: number;
}

interface TransactionForm {
  type: 'incoming' | 'outgoing';
  category: string;
  description: string;
  amount: number;
  customer_id?: number;
  payment_method: string;
  payment_channel_id?: number;
  payment_channel_name?: string;
  notes?: string;
  date: string;
}

// Enhanced categories
const INCOMING_CATEGORIES = [
  'Sale Revenue',
  'Payment Received', 
  'Advance Payment',
  'Service Income',
  'Interest Income',
  'Commission Income',
  'Rental Income',
  'Other Income'
];

const OUTGOING_CATEGORIES = [
  'Office Rent',
  'Utilities Bill',
  'Staff Salary',
  'Transportation',
  'Raw Materials',
  'Equipment Purchase',
  'Marketing Expense',
  'Professional Services',
  'Return Refund',
  'Bank Charges',
  'Other Expense'
];

const DailyLedger: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const activityLogger = useActivityLogger();
  
  // Core state
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(false);
  
  // UI state
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [showCustomerFilter, setShowCustomerFilter] = useState(false);
  
  // Payment channel filtering state
  const [selectedPaymentChannels, setSelectedPaymentChannels] = useState<number[]>([]);
  const [showPaymentChannelFilter, setShowPaymentChannelFilter] = useState(false);
  
  // Form state
  const [newTransaction, setNewTransaction] = useState<TransactionForm>({
    type: 'incoming',
    category: '',
    description: '',
    amount: 0,
    payment_method: 'Cash',
    payment_channel_id: undefined,
    payment_channel_name: undefined,
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });
  
  const [editForm, setEditForm] = useState<Partial<LedgerEntry>>({});
  
  // Invoice selection for payment allocation (DailyLedger)
  const [customerInvoices, setCustomerInvoices] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<number | null>(null);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  
  // Data
  const [customers, setCustomers] = useState<any[]>([]);
  const [paymentChannels, setPaymentChannels] = useState<any[]>([]);

  useEffect(() => {
    loadInitialData();
    
    // ENHANCED: Listen to business events for real-time updates
    try {
      if (typeof window !== 'undefined') {
        const eventBus = (window as any).eventBus;
        if (eventBus && eventBus.on) {
          const handleDailyLedgerUpdate = (data: any) => {
            console.log('📊 Daily ledger refreshing due to ledger update:', data);
            if (data.date === selectedDate || !data.date) {
              loadDayData(selectedDate); // Refresh current day data
            }
          };

          const handleInvoiceCreated = (data: any) => {
            console.log('📊 Daily ledger refreshing due to invoice creation:', data);
            const invoiceDate = new Date(data.created_at).toISOString().split('T')[0];
            if (invoiceDate === selectedDate) {
              loadDayData(selectedDate); // Refresh if invoice created today
            }
          };

          const handlePaymentReceived = (data: any) => {
            console.log('📊 Daily ledger refreshing due to payment:', data);
            const today = new Date().toISOString().split('T')[0];
            if (selectedDate === today) {
              loadDayData(selectedDate); // Refresh today's data
            }
          };
          
          // Subscribe to relevant events
          eventBus.on('DAILY_LEDGER_UPDATED', handleDailyLedgerUpdate);
          eventBus.on('daily_ledger:updated', handleDailyLedgerUpdate); // New event name
          eventBus.on('INVOICE_CREATED', handleInvoiceCreated);
          eventBus.on('invoice:created', handleInvoiceCreated); // New event name
          eventBus.on('PAYMENT_RECORDED', handlePaymentReceived);
          eventBus.on('payment:recorded', handlePaymentReceived); // New event name
          
          // Store cleanup function
          (window as any).dailyLedgerCleanup = () => {
            eventBus.off('DAILY_LEDGER_UPDATED', handleDailyLedgerUpdate);
            eventBus.off('daily_ledger:updated', handleDailyLedgerUpdate);
            eventBus.off('INVOICE_CREATED', handleInvoiceCreated);
            eventBus.off('invoice:created', handleInvoiceCreated);
            eventBus.off('PAYMENT_RECORDED', handlePaymentReceived);
            eventBus.off('payment:recorded', handlePaymentReceived);
          };
        }
      }
    } catch (error) {
      console.warn('Could not set up daily ledger event listeners:', error);
    }

    return () => {
      // Clean up event listeners
      if ((window as any).dailyLedgerCleanup) {
        (window as any).dailyLedgerCleanup();
      }
    };
  }, []);

  useEffect(() => {
    loadDayData(selectedDate);
  }, [selectedDate, selectedCustomerId, selectedPaymentChannels]); // FIXED: Reload when customer or payment channel filter changes

  // Load customer invoices when customer is selected in transaction form
  useEffect(() => {
    if (newTransaction.customer_id) {
      loadCustomerInvoices(newTransaction.customer_id);
    } else {
      setCustomerInvoices([]);
      setSelectedInvoice(null);
    }
  }, [newTransaction.customer_id]);

  // FIXED: Handle incoming customer selection from other components
  useEffect(() => {
    const state = location.state as any;
    if (state?.customerId) {
      setSelectedCustomerId(state.customerId);
      // Clear the state to prevent issues on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const loadInitialData = async () => {
    try {
      await db.initialize();
      const customerList = await db.getAllCustomers();
      setCustomers(customerList);
      
      // Load payment channels from database
      console.log('🔄 [DailyLedger] Loading payment channels...');
      const channels = await db.getPaymentChannels();
      console.log('✅ [DailyLedger] Payment channels loaded:', channels);
      console.log('📊 [DailyLedger] Channel count:', channels?.length || 0);
      
      if (!channels || channels.length === 0) {
        console.error('❌ [DailyLedger] No payment channels found');
        toast.error('No payment channels found. Please set up payment channels first.');
        return;
      }
      
      setPaymentChannels(channels);
      
      // Set default payment channel if available
      if (channels.length > 0) {
        setNewTransaction(prev => ({
          ...prev,
          payment_channel_id: channels[0].id,
          payment_channel_name: channels[0].name,
          payment_method: channels[0].type
        }));
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
      toast.error('Failed to load data');
    }
  };

  const loadDayData = async (date: string) => {
    try {
      setLoading(true);
      
      // Load from localStorage first (for manual entries)
      const storedEntries = getStoredEntries(date);
      
      // Generate system entries from database
      const systemEntries = await generateSystemEntries(date);
      
      // Combine and deduplicate
      const allEntries = [...storedEntries, ...systemEntries];
      const uniqueEntries = allEntries.filter((entry, index, self) => 
        index === self.findIndex(e => e.id === entry.id)
      );
      
      // FIXED: Apply customer and payment channel filters if selected
      let filteredEntries = uniqueEntries;
      if (selectedCustomerId) {
        filteredEntries = filteredEntries.filter(entry => 
          entry.customer_id === selectedCustomerId
        );
      }
      
      // Apply payment channel filter if channels are selected
      if (selectedPaymentChannels.length > 0) {
        filteredEntries = filteredEntries.filter(entry => {
          // If entry has payment_channel_id, check if it's in selected channels
          if (entry.payment_channel_id) {
            return selectedPaymentChannels.includes(entry.payment_channel_id);
          }
          // If entry only has payment_method, match by channel name
          if (entry.payment_method) {
            const matchedChannel = paymentChannels.find(channel => 
              channel.name.toLowerCase() === (entry.payment_method || '').toLowerCase() ||
              channel.type.toLowerCase() === (entry.payment_method || '').toLowerCase()
            );
            return matchedChannel ? selectedPaymentChannels.includes(matchedChannel.id) : false;
          }
          return false;
        });
      }
      
      // Sort by time
      filteredEntries.sort((a, b) => a.time.localeCompare(b.time));
      
      setEntries(filteredEntries);
      
      // Calculate summary (always use all entries for balance calculation)
      const daySummary = calculateSummary(uniqueEntries, date);
      setSummary(daySummary);
      
      // Store closing balance for next day
      localStorage.setItem(`closing_balance_${date}`, daySummary.closing_balance.toString());
      
    } catch (error) {
      console.error('Failed to load day data:', error);
      toast.error('Failed to load day data');
    } finally {
      setLoading(false);
    }
  };

  const getStoredEntries = (date: string): LedgerEntry[] => {
    try {
      const stored = localStorage.getItem(`daily_ledger_${date}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading stored entries:', error);
      return [];
    }
  };

  const saveEntriesToStorage = (date: string, entries: LedgerEntry[]) => {
    try {
      const manualEntries = entries.filter(e => e.is_manual);
      localStorage.setItem(`daily_ledger_${date}`, JSON.stringify(manualEntries));
    } catch (error) {
      console.error('Error saving entries:', error);
    }
  };

  const generateSystemEntries = async (date: string): Promise<LedgerEntry[]> => {
    const systemEntries: LedgerEntry[] = [];
    
    try {
      console.log('🔄 [DailyLedger] Loading real cash flow entries for date:', date);
      
      // PHASE 1: Load existing daily ledger entries (ONLY CASH FLOW ENTRIES)
      const dailyLedgerData = await db.getDailyLedgerEntries(date, { customer_id: selectedCustomerId });
      const existingEntries = dailyLedgerData.entries || [];
      
      // Filter to only include REAL CASH FLOW entries, exclude invoice creation entries
      const cashFlowEntries = existingEntries.filter((entry: LedgerEntry) => {
        // Include manual entries (user-created transactions)
        if (entry.is_manual) return true;
        
        // Exclude invoice/sale entries that don't represent actual payments
        if (entry.category === 'Sale Invoice' || 
            entry.category === 'Invoice' || 
            entry.category === 'Sale' ||
            entry.description?.includes('Products sold') ||
            entry.description?.includes('Invoice amount:')) {
          return false;
        }
        
        // Include only cash flow categories
        const cashFlowCategories = [
          'Invoice Payment',
          'Payment Received', 
          'Customer Payment',
          'Vendor Payment',
          'Staff Salary',
          'Salary Payment',
          'Business Expense',
          'Manual Income',
          'Manual Expense'
        ];
        
        return cashFlowCategories.includes(entry.category);
      });
      
      systemEntries.push(...cashFlowEntries);
      
      console.log(`✅ [DailyLedger] Cash flow entries loaded: ${systemEntries.length}`);
      console.log(`📋 [DailyLedger] Filtered out ${existingEntries.length - cashFlowEntries.length} non-cash-flow entries`);
      
      // PHASE 2: Vendor Payments (Stock Receiving Payments) - REAL OUTGOING CASH FLOW
      try {
        // Try multiple possible table structures for vendor payments
        let vendorPayments = [];
        
        try {
          // First try with full join structure
          vendorPayments = await db.executeRawQuery(`
            SELECT vp.*, 
                   v.name as vendor_name,
                   pc.name as payment_channel_name,
                   pc.type as payment_method,
                   sr.receiving_number
            FROM vendor_payments vp
            LEFT JOIN vendors v ON vp.vendor_id = v.id
            LEFT JOIN payment_channels pc ON vp.payment_channel_id = pc.id
            LEFT JOIN stock_receivings sr ON vp.receiving_id = sr.id
            WHERE vp.date = ? AND vp.amount > 0
            ORDER BY vp.created_at ASC
          `, [date]);
        } catch (joinError) {
          console.log('🔄 [DailyLedger] Trying simplified vendor payment query...');
          // Fallback to simpler query
          vendorPayments = await db.executeRawQuery(`
            SELECT vp.*, 
                   COALESCE(v.name, vp.vendor_name, 'Unknown Vendor') as vendor_name
            FROM vendor_payments vp
            LEFT JOIN vendors v ON vp.vendor_id = v.id
            WHERE vp.date = ? AND vp.amount > 0
            ORDER BY vp.created_at ASC
          `, [date]);
        }
        
        console.log(`🔍 [DailyLedger] Found ${vendorPayments.length} vendor payments for ${date}`);
        
        for (const payment of vendorPayments) {
          // Check if already exists to avoid duplicates
          const existingEntry = systemEntries.find(entry => 
            entry.reference_type === 'vendor_payment' && entry.reference_id === payment.id
          );
          
          if (!existingEntry) {
            console.log(`💰 [DailyLedger] Adding vendor payment: ${payment.amount} to ${payment.vendor_name}`);
            systemEntries.push({
              id: `vendor_payment_${payment.id}`,
              date: payment.date,
              time: payment.time || new Date(payment.created_at).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true }),
              type: 'outgoing',
              category: 'Vendor Payment',
              description: `Payment to ${payment.vendor_name}${payment.receiving_number ? ` - Stock Receiving #${payment.receiving_number}` : ''}`,
              amount: payment.amount || 0,
              reference_id: payment.id,
              reference_type: 'vendor_payment',
              customer_id: undefined,
              customer_name: `Vendor: ${payment.vendor_name}`,
              payment_method: payment.payment_method || 'Cash',
              payment_channel_id: payment.payment_channel_id,
              payment_channel_name: payment.payment_channel_name || 'Cash',
              notes: payment.notes || `Vendor payment for stock receiving`,
              bill_number: payment.reference_number,
              is_manual: false,
              created_at: payment.created_at,
              updated_at: payment.updated_at
            });
          }
        }
        console.log(`✅ [DailyLedger] Vendor payments processed: ${vendorPayments.length}`);
      } catch (vendorError) {
        console.error('⚠️ [DailyLedger] Error loading vendor payments:', vendorError);
      }
      
      // PHASE 3: Invoice Payments (REAL INCOMING CASH FLOW ONLY)
      try {
        const invoicePayments = await db.executeRawQuery(`
          SELECT p.*, 
                 c.name as customer_name,
                 i.bill_number,
                 pc.name as payment_channel_name,
                 pc.type as payment_method_type
          FROM payments p
          LEFT JOIN customers c ON p.customer_id = c.id
          LEFT JOIN invoices i ON p.reference_invoice_id = i.id
          LEFT JOIN payment_channels pc ON p.payment_channel_id = pc.id
          WHERE p.date = ? AND p.amount > 0
          ORDER BY p.created_at ASC
        `, [date]);
        
        for (const payment of invoicePayments) {
          const existingEntry = systemEntries.find(entry => 
            entry.reference_type === 'invoice_payment' && entry.reference_id === payment.id
          );
          
          if (!existingEntry) {
            console.log(`💰 [DailyLedger] Adding invoice payment: ${payment.amount} from ${payment.customer_name}`);
            systemEntries.push({
              id: `invoice_payment_${payment.id}`,
              date: payment.date,
              time: payment.time || new Date(payment.created_at).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true }),
              type: 'incoming',
              category: 'Invoice Payment',
              description: `Payment from ${payment.customer_name}${payment.bill_number ? ` - Invoice ${payment.bill_number}` : ''}`,
              amount: payment.amount || 0,
              reference_id: payment.id,
              reference_type: 'invoice_payment',
              customer_id: payment.customer_id,
              customer_name: payment.customer_name,
              payment_method: payment.payment_method || payment.payment_method_type || 'Cash',
              payment_channel_id: payment.payment_channel_id,
              payment_channel_name: payment.payment_channel_name || 'Cash',
              notes: payment.notes || 'Invoice payment received',
              bill_number: payment.bill_number,
              is_manual: false,
              created_at: payment.created_at,
              updated_at: payment.updated_at
            });
          }
        }
        console.log(`✅ [DailyLedger] Invoice payments processed: ${invoicePayments.length}`);
      } catch (paymentError) {
        console.error('⚠️ [DailyLedger] Error loading invoice payments:', paymentError);
      }
      
      // PHASE 4: Staff Salary Payments - REAL OUTGOING CASH FLOW
      try {
        // Try multiple possible table structures for salary payments
        let salaryPayments = [];
        
        try {
          // First try with full join structure
          salaryPayments = await db.executeRawQuery(`
            SELECT sp.*, 
                   s.full_name as staff_name,
                   s.employee_id,
                   pc.name as payment_channel_name,
                   pc.type as payment_method_type
            FROM salary_payments sp
            LEFT JOIN staff s ON sp.staff_id = s.id
            LEFT JOIN payment_channels pc ON sp.payment_channel_id = pc.id
            WHERE DATE(sp.payment_date) = ? AND sp.payment_amount > 0
            ORDER BY sp.payment_date ASC
          `, [date]);
        } catch (joinError) {
          console.log('🔄 [DailyLedger] Trying simplified salary payment query...');
          // Fallback to simpler query
          try {
            salaryPayments = await db.executeRawQuery(`
              SELECT sp.*, 
                     COALESCE(s.full_name, sp.staff_name, 'Unknown Staff') as staff_name,
                     COALESCE(s.employee_id, sp.employee_id, 'N/A') as employee_id
              FROM salary_payments sp
              LEFT JOIN staff s ON sp.staff_id = s.id
              WHERE DATE(sp.payment_date) = ? AND sp.payment_amount > 0
              ORDER BY sp.payment_date ASC
            `, [date]);
          } catch (fallbackError) {
            console.log('🔄 [DailyLedger] Trying basic salary payment query...');
            salaryPayments = await db.executeRawQuery(`
              SELECT * FROM salary_payments 
              WHERE DATE(payment_date) = ? AND payment_amount > 0
              ORDER BY payment_date ASC
            `, [date]);
          }
        }
        
        console.log(`🔍 [DailyLedger] Found ${salaryPayments.length} salary payments for ${date}`);
        
        for (const salary of salaryPayments) {
          const existingEntry = systemEntries.find(entry => 
            entry.reference_type === 'salary_payment' && entry.reference_id === salary.id
          );
          
          if (!existingEntry) {
            console.log(`💰 [DailyLedger] Adding salary payment: ${salary.payment_amount} to ${salary.staff_name || 'Unknown Staff'}`);
            systemEntries.push({
              id: `salary_payment_${salary.id}`,
              date: date,
              time: new Date(salary.payment_date).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true }),
              type: 'outgoing',
              category: 'Staff Salary',
              description: `Salary payment to ${salary.staff_name || 'Unknown Staff'} ${salary.employee_id ? `(${salary.employee_id})` : ''} - ${salary.payment_type || 'Regular'}`,
              amount: salary.payment_amount || 0,
              reference_id: salary.id,
              reference_type: 'salary_payment',
              customer_id: undefined,
              customer_name: `Staff: ${salary.staff_name || 'Unknown Staff'}`,
              payment_method: salary.payment_method || salary.payment_method_type || 'Cash',
              payment_channel_id: salary.payment_channel_id,
              payment_channel_name: salary.payment_channel_name || 'Cash',
              notes: `${salary.payment_type || 'Regular'} salary payment${salary.notes ? ` - ${salary.notes}` : ''}`,
              bill_number: salary.reference_number,
              is_manual: false,
              created_at: salary.created_at || salary.payment_date,
              updated_at: salary.updated_at || salary.payment_date
            });
          }
        }
        console.log(`✅ [DailyLedger] Salary payments processed: ${salaryPayments.length}`);
      } catch (salaryError) {
        console.error('⚠️ [DailyLedger] Error loading salary payments:', salaryError);
      }
      
      console.log(`✅ [DailyLedger] Total cash flow entries: ${systemEntries.length}`);
      
      // Remove duplicates based on unique identifier
      const uniqueEntries = systemEntries.filter((entry: any, index: number, self: any[]) => 
        index === self.findIndex((e: any) => e.id === entry.id)
      );
      
      console.log(`✅ [DailyLedger] Unique cash flow entries: ${uniqueEntries.length}`);
      
      return uniqueEntries;
      
    } catch (error) {
      console.error('❌ [DailyLedger] Error loading system entries:', error);
      return [];
    }
  };

  const calculateSummary = (dayEntries: LedgerEntry[], date: string): DailySummary => {
    const openingBalance = getOpeningBalance(date);
    const totalIncoming = dayEntries.filter(e => e.type === 'incoming').reduce((sum, e) => sum + e.amount, 0);
    const totalOutgoing = dayEntries.filter(e => e.type === 'outgoing').reduce((sum, e) => sum + e.amount, 0);
    const closingBalance = openingBalance + totalIncoming - totalOutgoing;
    
    return {
      date,
      opening_balance: openingBalance,
      closing_balance: closingBalance,
      total_incoming: totalIncoming,
      total_outgoing: totalOutgoing,
      net_movement: totalIncoming - totalOutgoing,
      transactions_count: dayEntries.length
    };
  };

  const getOpeningBalance = (date: string): number => {
    const previousDate = new Date(date);
    previousDate.setDate(previousDate.getDate() - 1);
    const prevDateStr = previousDate.toISOString().split('T')[0];
    
    const storedBalance = localStorage.getItem(`closing_balance_${prevDateStr}`);
    return storedBalance ? parseFloat(storedBalance) : 100000;
  };

  const loadCustomerInvoices = async (customerId: number) => {
    try {
      setLoadingInvoices(true);
      const invoices = await db.getCustomerInvoices(customerId);
      setCustomerInvoices(invoices);
    } catch (error) {
      console.error('Failed to load customer invoices:', error);
      toast.error('Failed to load customer invoices');
    } finally {
      setLoadingInvoices(false);
    }
  };

  const addTransaction = async () => {
    try {
      if (!newTransaction.category || !newTransaction.description || newTransaction.amount <= 0) {
        toast.error('Please fill all required fields');
        return;
      }

      const now = new Date();
      const customerName = newTransaction.customer_id ? 
        customers.find(c => c.id === newTransaction.customer_id)?.name : undefined;

      console.log('💰 [DailyLedger] Adding transaction:', newTransaction);

      // PHASE 1: Customer Payment Processing (Incoming)
      if (newTransaction.customer_id && newTransaction.type === 'incoming') {
        try {
          console.log('🔄 [DailyLedger] Processing customer payment with full integration...');
          
          // Use recordPayment for proper customer payment integration
          const paymentRecord = {
            customer_id: newTransaction.customer_id,
            amount: newTransaction.amount,
            payment_method: newTransaction.payment_method,
            payment_channel_id: newTransaction.payment_channel_id,
            payment_channel_name: newTransaction.payment_channel_name,
            payment_type: (newTransaction.category.toLowerCase().includes('advance') ? 'advance_payment' : 'bill_payment') as 'bill_payment' | 'advance_payment',
            reference: newTransaction.description,
            notes: newTransaction.notes || '',
            date: newTransaction.date,
            created_by: 'daily_ledger_manual'
          };

          const paymentId = await db.recordPayment(paymentRecord, selectedInvoice || undefined);
          console.log('✅ [DailyLedger] Customer payment recorded with ID:', paymentId);

          // Update payment channels for customer payments
          if (newTransaction.payment_channel_id) {
            try {
              await db.updatePaymentChannelDailyLedger(
                newTransaction.payment_channel_id,
                newTransaction.date,
                newTransaction.amount
              );
              console.log('✅ [DailyLedger] Payment channel updated for customer payment');
            } catch (channelError) {
              console.warn('⚠️ [DailyLedger] Payment channel update failed:', channelError);
            }
          }

          const invoiceInfo = selectedInvoice ? 
            ` (allocated to Invoice ${formatInvoiceNumber(customerInvoices.find(inv => inv.id === selectedInvoice)?.bill_number || '')})` : '';
          
          toast.success(`Customer payment recorded successfully${invoiceInfo}. Integrated with Customer Ledger, Daily Ledger, and Payment Channels.`);
          
        } catch (paymentError: any) {
          console.error('❌ [DailyLedger] Customer payment failed:', paymentError);
          toast.error(`Failed to record customer payment: ${paymentError?.message || 'Unknown error'}`);
          return;
        }
      }
      
      // PHASE 2: Vendor Payment Processing (Outgoing)
      else if (newTransaction.type === 'outgoing' && 
               (newTransaction.category.toLowerCase().includes('vendor') || 
                newTransaction.category.toLowerCase().includes('supplier'))) {
        try {
          console.log('🔄 [DailyLedger] Processing vendor payment with full integration...');
          
          // For vendor payments, we need to use createVendorPayment if we have vendor details
          // For now, create a general ledger entry but with vendor-specific handling
          const vendorPayment = {
            date: newTransaction.date,
            type: 'outgoing' as const,
            category: 'Vendor Payment',
            description: newTransaction.description,
            amount: newTransaction.amount,
            customer_id: null,
            customer_name: `Vendor: ${newTransaction.description.split(' ')[2] || 'Vendor'}`,
            payment_method: newTransaction.payment_method,
            payment_channel_id: newTransaction.payment_channel_id,
            payment_channel_name: newTransaction.payment_channel_name,
            notes: newTransaction.notes || 'Manual vendor payment entry',
            is_manual: true
          };

          // Use createDailyLedgerEntry instead of private createLedgerEntry
          await db.createDailyLedgerEntry(vendorPayment);

          // Update payment channels for vendor payments (outgoing)
          if (newTransaction.payment_channel_id) {
            try {
              await db.executeRawQuery(`
                UPDATE payment_channels
                SET total_outgoing = COALESCE(total_outgoing, 0) + ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
              `, [newTransaction.amount, newTransaction.payment_channel_id]);
              
              await db.updatePaymentChannelDailyLedger(
                newTransaction.payment_channel_id,
                newTransaction.date,
                newTransaction.amount
              );
              console.log('✅ [DailyLedger] Payment channel updated for vendor payment');
            } catch (channelError) {
              console.warn('⚠️ [DailyLedger] Payment channel update failed:', channelError);
            }
          }

          toast.success('Vendor payment recorded successfully. Integrated with Daily Ledger and Payment Channels.');
          
        } catch (vendorError: any) {
          console.error('❌ [DailyLedger] Vendor payment failed:', vendorError);
          toast.error(`Failed to record vendor payment: ${vendorError?.message || 'Unknown error'}`);
          return;
        }
      }
      
      // PHASE 3: Staff Salary Processing (Outgoing)
      else if (newTransaction.type === 'outgoing' && 
               (newTransaction.category.toLowerCase().includes('salary') || 
                newTransaction.category.toLowerCase().includes('staff'))) {
        try {
          console.log('🔄 [DailyLedger] Processing staff salary with full integration...');
          
          const salaryPayment = {
            date: newTransaction.date,
            time: now.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true }),
            type: 'outgoing' as const,
            category: 'Staff Salary',
            description: newTransaction.description,
            amount: newTransaction.amount,
            customer_id: undefined,
            customer_name: `Staff: ${newTransaction.description.split(' ')[2] || 'Staff'}`,
            reference_type: 'salary_payment_manual',
            payment_method: newTransaction.payment_method,
            payment_channel_id: newTransaction.payment_channel_id,
            payment_channel_name: newTransaction.payment_channel_name,
            notes: newTransaction.notes || 'Manual staff salary entry',
            created_by: 'daily_ledger_manual'
          };

          await db.createDailyLedgerEntry({
            date: salaryPayment.date,
            type: salaryPayment.type,
            category: salaryPayment.category,
            description: salaryPayment.description,
            amount: salaryPayment.amount,
            customer_id: null,
            customer_name: salaryPayment.customer_name,
            payment_method: salaryPayment.payment_method,
            payment_channel_id: salaryPayment.payment_channel_id,
            payment_channel_name: salaryPayment.payment_channel_name,
            notes: salaryPayment.notes,
            is_manual: true
          });

          // Update payment channels for salary payments (outgoing)
          if (newTransaction.payment_channel_id) {
            try {
              await db.executeRawQuery(`
                UPDATE payment_channels
                SET total_outgoing = COALESCE(total_outgoing, 0) + ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
              `, [newTransaction.amount, newTransaction.payment_channel_id]);
              
              await db.updatePaymentChannelDailyLedger(
                newTransaction.payment_channel_id,
                newTransaction.date,
                newTransaction.amount
              );
              console.log('✅ [DailyLedger] Payment channel updated for salary payment');
            } catch (channelError) {
              console.warn('⚠️ [DailyLedger] Payment channel update failed:', channelError);
            }
          }

          toast.success('Staff salary recorded successfully. Integrated with Daily Ledger and Payment Channels.');
          
        } catch (salaryError: any) {
          console.error('❌ [DailyLedger] Salary payment failed:', salaryError);
          toast.error(`Failed to record salary payment: ${salaryError?.message || 'Unknown error'}`);
          return;
        }
      }
      
      // PHASE 4: General Business Transactions
      else {
        try {
          console.log('🔄 [DailyLedger] Processing general business transaction...');
          
          if (newTransaction.customer_id) {
            // Customer-related transaction
            const customerTransaction = {
              date: newTransaction.date,
              time: now.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true }),
              type: newTransaction.type,
              category: newTransaction.category,
              description: newTransaction.description,
              amount: newTransaction.amount,
              customer_id: newTransaction.customer_id,
              customer_name: customerName,
              reference_type: 'customer_transaction',
              payment_method: newTransaction.payment_method,
              payment_channel_id: newTransaction.payment_channel_id,
              payment_channel_name: newTransaction.payment_channel_name,
              notes: newTransaction.notes || 'Customer transaction',
              created_by: 'daily_ledger_manual'
            };

            await db.createDailyLedgerEntry({
              date: customerTransaction.date,
              type: customerTransaction.type,
              category: customerTransaction.category,
              description: customerTransaction.description,
              amount: customerTransaction.amount,
              customer_id: customerTransaction.customer_id,
              customer_name: customerTransaction.customer_name,
              payment_method: customerTransaction.payment_method,
              payment_channel_id: customerTransaction.payment_channel_id,
              payment_channel_name: customerTransaction.payment_channel_name,
              notes: customerTransaction.notes,
              is_manual: true
            });
            
            // For customer transactions, also update customer ledger if needed
            if (newTransaction.type === 'incoming') {
              await db.executeRawQuery(`
                UPDATE customers 
                SET balance = COALESCE(balance, 0) - ?
                WHERE id = ?
              `, [newTransaction.amount, newTransaction.customer_id]);
            }
            
          } else {
            // General business transaction
            const businessTransaction = {
              date: newTransaction.date,
              time: now.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true }),
              type: newTransaction.type,
              category: newTransaction.category,
              description: newTransaction.description,
              amount: newTransaction.amount,
              reference_type: 'manual_transaction',
              payment_method: newTransaction.payment_method,
              payment_channel_id: newTransaction.payment_channel_id,
              payment_channel_name: newTransaction.payment_channel_name,
              notes: newTransaction.notes || 'Manual transaction',
              created_by: 'daily_ledger_manual'
            };

            await db.createDailyLedgerEntry({
              date: businessTransaction.date,
              type: businessTransaction.type,
              category: businessTransaction.category,
              description: businessTransaction.description,
              amount: businessTransaction.amount,
              customer_id: null,
              customer_name: null,
              payment_method: businessTransaction.payment_method,
              payment_channel_id: businessTransaction.payment_channel_id,
              payment_channel_name: businessTransaction.payment_channel_name,
              notes: businessTransaction.notes,
              is_manual: true
            });
          }

          // Update payment channels for all transactions
          if (newTransaction.payment_channel_id) {
            try {
              const updateField = newTransaction.type === 'incoming' ? 'total_incoming' : 'total_outgoing';
              await db.executeRawQuery(`
                UPDATE payment_channels
                SET ${updateField} = COALESCE(${updateField}, 0) + ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
              `, [newTransaction.amount, newTransaction.payment_channel_id]);
              
              await db.updatePaymentChannelDailyLedger(
                newTransaction.payment_channel_id,
                newTransaction.date,
                newTransaction.amount
              );
              console.log('✅ [DailyLedger] Payment channel updated for general transaction');
            } catch (channelError) {
              console.warn('⚠️ [DailyLedger] Payment channel update failed:', channelError);
            }
          }

          toast.success('Transaction recorded successfully. Integrated with Daily Ledger and Payment Channels.');
          
        } catch (generalError: any) {
          console.error('❌ [DailyLedger] General transaction failed:', generalError);
          toast.error(`Failed to record transaction: ${generalError?.message || 'Unknown error'}`);
          return;
        }
      }

      // PHASE 5: Event Emission for Real-time Updates
      try {
        const { eventBus, BUSINESS_EVENTS } = await import('../../utils/eventBus');
        eventBus.emit(BUSINESS_EVENTS.DAILY_LEDGER_UPDATED, {
          date: newTransaction.date,
          type: newTransaction.type,
          amount: newTransaction.amount,
          category: newTransaction.category
        });
        console.log('✅ [DailyLedger] Real-time update events emitted');
      } catch (eventError) {
        console.warn('⚠️ [DailyLedger] Event emission failed:', eventError);
      }

      // PHASE 6: Reset Form and Reload Data
      setNewTransaction({
        date: newTransaction.date,
        type: 'incoming',
        category: '',
        description: '',
        amount: 0,
        customer_id: undefined,
        payment_method: paymentChannels[0]?.name || 'Cash',
        payment_channel_id: paymentChannels[0]?.id,
        payment_channel_name: paymentChannels[0]?.name,
        notes: ''
      });
      setSelectedInvoice(null);
      setShowAddTransaction(false);
      
      // Reload day data to show the new entry
      await loadDayData(newTransaction.date);
      
      // Log activity using the correct method
      await activityLogger.logCustomActivity(
        'CREATE' as any,
        'REPORTS' as any,
        Date.now(),
        `${newTransaction.type === 'incoming' ? 'Added income' : 'Added expense'}: ${newTransaction.category} - Amount: ₹${newTransaction.amount.toLocaleString()}`
      );

    } catch (error: any) {
      console.error('❌ [DailyLedger] Transaction processing failed:', error);
      toast.error(`Failed to add transaction: ${error?.message || 'Unknown error'}`);
    }
  };

  const startEdit = (entry: LedgerEntry) => {
    if (!entry.is_manual) {
      toast.error('System generated entries cannot be edited');
      return;
    }
    setEditingEntry(entry.id);
    setEditForm(entry);
  };

  const saveEdit = () => {
    try {
      const updatedEntries = entries.map(entry => 
        entry.id === editingEntry 
          ? { ...entry, ...editForm, updated_at: new Date().toISOString() }
          : entry
      );
      
      setEntries(updatedEntries);
      saveEntriesToStorage(selectedDate, updatedEntries);
      
      // Recalculate summary
      const newSummary = calculateSummary(updatedEntries, selectedDate);
      setSummary(newSummary);
      localStorage.setItem(`closing_balance_${selectedDate}`, newSummary.closing_balance.toString());
      
      setEditingEntry(null);
      setEditForm({});
      toast.success('Transaction updated successfully');
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error('Failed to update transaction');
    }
  };

  const deleteEntry = (entryId: string) => {
    try {
      const entry = entries.find(e => e.id === entryId);
      if (!entry?.is_manual) {
        toast.error('System generated entries cannot be deleted');
        return;
      }
      
      if (!confirm('Are you sure you want to delete this transaction?')) {
        return;
      }
      
      const updatedEntries = entries.filter(e => e.id !== entryId);
      setEntries(updatedEntries);
      saveEntriesToStorage(selectedDate, updatedEntries);
      
      // Recalculate summary
      const newSummary = calculateSummary(updatedEntries, selectedDate);
      setSummary(newSummary);
      localStorage.setItem(`closing_balance_${selectedDate}`, newSummary.closing_balance.toString());
      
      toast.success('Transaction deleted successfully');
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Failed to delete transaction');
    }
  };

  // FIXED: Proper navigation with existing routes
  const navigateToEntity = (entry: LedgerEntry) => {
    if (!entry.reference_id || !entry.reference_type) {
      toast.error('No reference available for this transaction');
      return;
    }
    
    try {
      let url = '';
      switch (entry.reference_type) {
        case 'invoice':
          url = `/billing/invoices`; // Navigate to invoice list since we don't have individual invoice view
          break;
        case 'customer':
          url = `/customers`; // Navigate to customer list
          break;
        case 'product':
          url = `/products`; // Navigate to product list
          break;
        default:
          toast.error('Unknown reference type');
          return;
      }
      
      navigate(url);
    } catch (error) {
      console.error('Navigation error:', error);
      toast.error('Unable to navigate');
    }
  };

  const changeDate = (direction: 'prev' | 'next') => {
    const currentDate = new Date(selectedDate);
    if (direction === 'prev') {
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      currentDate.setDate(currentDate.getDate() + 1);
    }
    setSelectedDate(currentDate.toISOString().split('T')[0]);
  };

  const exportData = async () => {
    if (!entries.length) {
      toast.error('No data to export');
      return;
    }

    try {
      const csvContent = [
        ['Date', 'Time', 'Type', 'Category', 'Description', 'Amount', 'Customer', 'Payment Method', 'Notes', 'Bill Number', 'Source'],
        ...entries.map(entry => [
          entry.date,
          entry.time,
          entry.type,
          entry.category,
          entry.description,
          entry.amount.toString(),
          entry.customer_name || '',
          entry.payment_method || '',
          entry.notes || '',
          entry.bill_number || '',
          entry.is_manual ? 'Manual' : 'System'
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `daily_ledger_${selectedDate}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      // Log export activity
      await activityLogger.logReportExported(
        'Daily Ledger', 
        `Date: ${selectedDate}, Entries: ${entries.length}`
      );
      
      toast.success('Data exported successfully');
    } catch (error) {
      console.error('Failed to export daily ledger:', error);
      toast.error('Failed to export data');
    }
  };

  // Enhanced filter entries - now includes bill number search
  const filteredEntries = entries.filter(entry =>
    entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.bill_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const incomingEntries = filteredEntries.filter(e => e.type === 'incoming');
  const outgoingEntries = filteredEntries.filter(e => e.type === 'outgoing');

  const formatCurrency = (amount: number): string => {
    return `Rs. ${amount.toLocaleString('en-PK')}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Transaction Row Component for reusability
  const TransactionRow = ({ entry, isEditing = false }: { entry: LedgerEntry, isEditing?: boolean }) => {
    if (isEditing && editingEntry === entry.id) {
      return (
        <div className="space-y-3">
          <select
            value={editForm.category || ''}
            onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
            className="w-full p-2 border rounded text-sm"
          >
            {(entry.type === 'incoming' ? INCOMING_CATEGORIES : OUTGOING_CATEGORIES).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <input
            type="text"
            value={editForm.description || ''}
            onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
            className="w-full p-2 border rounded text-sm"
            placeholder="Description"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              value={editForm.amount || 0}
              onChange={(e) => setEditForm(prev => ({ ...prev, amount: parseCurrency(e.target.value) }))}
              className="p-2 border rounded text-sm"
              placeholder="Amount"
            />
            <select
              value={editForm.payment_method || ''}
              onChange={(e) => {
                const selectedChannel = paymentChannels.find(c => c.name === e.target.value);
                setEditForm(prev => ({ 
                  ...prev, 
                  payment_method: selectedChannel ? selectedChannel.name : e.target.value
                }));
              }}
              className="p-2 border rounded text-sm"
            >
              {paymentChannels.map(channel => (
                <option key={channel.id} value={channel.name}>{channel.name}</option>
              ))}
            </select>
          </div>
          <textarea
            value={editForm.notes || ''}
            onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
            className="w-full p-2 border rounded text-sm"
            rows={2}
            placeholder="Notes"
          />
          <div className="flex space-x-2">
            <button
              onClick={saveEdit}
              className="flex items-center px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
            >
              <Save className="h-3 w-3 mr-1" />
              Save
            </button>
            <button
              onClick={() => {
                setEditingEntry(null);
                setEditForm({});
              }}
              className="flex items-center px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
            >
              <X className="h-3 w-3 mr-1" />
              Cancel
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className={`text-xs px-2 py-1 rounded ${
              entry.type === 'incoming' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {entry.category}
            </span>
            <span className="text-xs text-gray-500">{entry.time}</span>
            {entry.is_manual && (
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                Manual
              </span>
            )}
            {entry.bill_number && (
              <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                {formatInvoiceNumber(entry.bill_number)}
              </span>
            )}
          </div>
          <p className="font-medium text-gray-900 mt-1">{entry.description}</p>
          {entry.customer_name && (
            <p className="text-sm text-gray-600">{entry.customer_name}</p>
          )}
          {entry.notes && (
            <p className="text-xs text-gray-500 mt-1">{entry.notes}</p>
          )}
        </div>
        
        <div className="text-right ml-4">
          <p className={`font-bold ${
            entry.type === 'incoming' ? 'text-green-600' : 'text-red-600'
          }`}>
            {entry.type === 'incoming' ? '+' : '-'}{formatCurrency(entry.amount)}
          </p>
          {(entry.payment_method || entry.payment_channel_name) && (
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              {entry.payment_channel_name && (
                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                  {entry.payment_channel_name}
                </span>
              )}
              {entry.payment_method && !entry.payment_channel_name && (
                <span>{entry.payment_method}</span>
              )}
            </div>
          )}
          
          <div className="flex items-center space-x-1 mt-1">
            {entry.reference_id && (
              <button
                onClick={() => navigateToEntity(entry)}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                title="View Reference"
              >
                <Eye className="h-3 w-3" />
              </button>
            )}
            
            {entry.is_manual && (
              <>
                <button
                  onClick={() => startEdit(entry)}
                  className="text-xs text-gray-600 hover:text-gray-800"
                  title="Edit"
                >
                  <Edit className="h-3 w-3" />
                </button>
                <button
                  onClick={() => deleteEntry(entry.id)}
                  className="text-xs text-red-600 hover:text-red-800"
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily Ledger</h1>
          <p className="text-gray-600">{formatDate(selectedDate)}</p>
          {selectedCustomerId && (
            <p className="text-sm text-blue-600">
              Filtered by: {customers.find(c => c.id === selectedCustomerId)?.name}
            </p>
          )}
          {selectedPaymentChannels.length > 0 && (
            <p className="text-sm text-green-600">
              Payment Channels: {selectedPaymentChannels.map(id => 
                paymentChannels.find(c => c.id === id)?.name
              ).filter(Boolean).join(', ')}
            </p>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-white border rounded-lg">
            <button
              onClick={() => changeDate('prev')}
              className="p-2 hover:bg-gray-100 rounded-l-lg"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border-0 focus:ring-0"
            />
            
            <button
              onClick={() => changeDate('next')}
              className="p-2 hover:bg-gray-100 rounded-r-lg"
              disabled={selectedDate >= new Date().toISOString().split('T')[0]}
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          
          {/* Customer Filter Button */}
          <button
            onClick={() => setShowCustomerFilter(!showCustomerFilter)}
            className={`p-2 border rounded-lg hover:bg-gray-100 ${selectedCustomerId ? 'bg-blue-50 border-blue-300' : ''}`}
            title="Filter by Customer"
          >
            <User className="h-4 w-4" />
          </button>
          
          {/* Payment Channel Filter Button */}
          <button
            onClick={() => setShowPaymentChannelFilter(!showPaymentChannelFilter)}
            className={`p-2 border rounded-lg hover:bg-gray-100 ${selectedPaymentChannels.length > 0 ? 'bg-green-50 border-green-300' : ''}`}
            title="Filter by Payment Channel"
          >
            <TrendingUp className="h-4 w-4" />
          </button>
          
          <button
            onClick={() => setShowAddTransaction(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Transaction
          </button>
          
          <button
            onClick={exportData}
            className="p-2 border rounded-lg hover:bg-gray-100"
            title="Export CSV"
          >
            <Download className="h-4 w-4" />
          </button>
          
          <button
            onClick={() => loadDayData(selectedDate)}
            disabled={loading}
            className="p-2 border rounded-lg hover:bg-gray-100 disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Customer Filter Dropdown */}
      {showCustomerFilter && (
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Filter by Customer</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <button
              onClick={() => {
                setSelectedCustomerId(null);
                setShowCustomerFilter(false);
              }}
              className={`p-2 text-left border rounded text-sm hover:bg-gray-50 ${
                !selectedCustomerId ? 'bg-blue-50 border-blue-300' : ''
              }`}
            >
              All Customers
            </button>
            {customers.map(customer => (
              <button
                key={customer.id}
                onClick={() => {
                  setSelectedCustomerId(customer.id);
                  setShowCustomerFilter(false);
                }}
                className={`p-2 text-left border rounded text-sm hover:bg-gray-50 ${
                  selectedCustomerId === customer.id ? 'bg-blue-50 border-blue-300' : ''
                }`}
              >
                {customer.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Payment Channel Filter Dropdown */}
      {showPaymentChannelFilter && (
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Filter by Payment Channels</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {selectedPaymentChannels.length > 0 
                  ? `${selectedPaymentChannels.length} channel(s) selected` 
                  : 'No channels selected (showing all)'
                }
              </span>
              <div className="space-x-2">
                <button
                  onClick={() => setSelectedPaymentChannels(paymentChannels.map(c => c.id))}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Select All
                </button>
                <button
                  onClick={() => setSelectedPaymentChannels([])}
                  className="text-xs text-gray-600 hover:text-gray-700"
                >
                  Clear All
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {paymentChannels.map(channel => (
                <label
                  key={channel.id}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                    selectedPaymentChannels.includes(channel.id) ? 'bg-green-50 border-green-300' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedPaymentChannels.includes(channel.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPaymentChannels([...selectedPaymentChannels, channel.id]);
                      } else {
                        setSelectedPaymentChannels(selectedPaymentChannels.filter(id => id !== channel.id));
                      }
                    }}
                    className="mr-3 text-green-600 focus:ring-green-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center">
                      <span className="font-medium text-gray-900">{channel.name}</span>
                      <span className="ml-2 text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                        {channel.type}
                      </span>
                    </div>
                    {channel.description && (
                      <p className="text-xs text-gray-500 mt-1">{channel.description}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
            
            {paymentChannels.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                <p>No payment channels found.</p>
                <p className="text-xs mt-1">Set up payment channels to filter transactions.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Balance Summary */}
      {summary && (
        <div className="bg-white rounded-lg border p-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Opening</p>
              <p className="text-xl font-bold text-blue-600">
                {formatCurrency(summary.opening_balance)}
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-600">Incoming</p>
              <p className="text-xl font-bold text-green-600">
                +{formatCurrency(summary.total_incoming)}
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-600">Outgoing</p>
              <p className="text-xl font-bold text-red-600">
                -{formatCurrency(summary.total_outgoing)}
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-600">Net</p>
              <p className={`text-xl font-bold ${
                summary.net_movement >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {summary.net_movement >= 0 ? '+' : ''}{formatCurrency(summary.net_movement)}
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-600">Closing</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(summary.closing_balance)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search transactions, customers, bill numbers, notes..."
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Transactions - FIXED: Both columns visible, properly editable */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Incoming */}
          <div className="bg-white rounded-lg border">
            <div className="p-4 border-b bg-green-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
                  <h3 className="font-semibold text-green-900">Incoming ({incomingEntries.length})</h3>
                </div>
                <span className="text-sm font-bold text-green-600">
                  {formatCurrency(incomingEntries.reduce((sum, e) => sum + e.amount, 0))}
                </span>
              </div>
            </div>
            
            <div className="divide-y">
              {incomingEntries.length > 0 ? (
                incomingEntries.map((entry) => (
                  <div key={entry.id} className="p-4 hover:bg-gray-50">
                    <TransactionRow entry={entry} isEditing={editingEntry === entry.id} />
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No incoming transactions</p>
                </div>
              )}
            </div>
          </div>

          {/* Outgoing */}
          <div className="bg-white rounded-lg border">
            <div className="p-4 border-b bg-red-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <TrendingDown className="h-5 w-5 text-red-600 mr-2" />
                  <h3 className="font-semibold text-red-900">Outgoing ({outgoingEntries.length})</h3>
                </div>
                <span className="text-sm font-bold text-red-600">
                  {formatCurrency(outgoingEntries.reduce((sum, e) => sum + e.amount, 0))}
                </span>
              </div>
            </div>
            
            <div className="divide-y">
              {outgoingEntries.length > 0 ? (
                outgoingEntries.map((entry) => (
                  <div key={entry.id} className="p-4 hover:bg-gray-50">
                    <TransactionRow entry={entry} isEditing={editingEntry === entry.id} />
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <TrendingDown className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No outgoing transactions</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {showAddTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white">
              <h3 className="text-lg font-semibold">Add Transaction</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setNewTransaction(prev => ({ ...prev, type: 'incoming' }))}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    newTransaction.type === 'incoming'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <TrendingUp className="h-5 w-5 mx-auto mb-1" />
                  <span className="text-sm font-medium">Incoming</span>
                </button>
                
                <button
                  onClick={() => setNewTransaction(prev => ({ ...prev, type: 'outgoing' }))}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    newTransaction.type === 'outgoing'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <TrendingDown className="h-5 w-5 mx-auto mb-1" />
                  <span className="text-sm font-medium">Outgoing</span>
                </button>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newTransaction.date}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  value={newTransaction.category}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Category</option>
                  {(newTransaction.type === 'incoming' ? INCOMING_CATEGORIES : OUTGOING_CATEGORIES).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <input
                  type="text"
                  value={newTransaction.description}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter description"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={newTransaction.amount}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, amount: parseCurrency(e.target.value) }))}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
              
              {newTransaction.type === 'incoming' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer (Optional)</label>
                  <select
                    value={newTransaction.customer_id || ''}
                    onChange={(e) => setNewTransaction(prev => ({ 
                      ...prev, 
                      customer_id: e.target.value ? parseInt(e.target.value) : undefined 
                    }))}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Customer</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} - Balance: {formatCurrency(customer.balance || 0)}
                      </option>
                    ))}
                  </select>
                  {newTransaction.customer_id && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                      <div className="flex items-start">
                        <Info className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-blue-700">
                          This payment will automatically appear in <strong>{customers.find(c => c.id === newTransaction.customer_id)?.name}'s</strong> Customer Ledger and update their balance.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Invoice Selection for Payment Allocation */}
                  {newTransaction.customer_id && newTransaction.category.toLowerCase().includes('payment') && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Allocate to Invoice (Optional)
                      </label>
                      {loadingInvoices ? (
                        <div className="text-sm text-gray-500 py-2">Loading invoices...</div>
                      ) : customerInvoices.length > 0 ? (
                        <select
                          value={selectedInvoice || ''}
                          onChange={(e) => setSelectedInvoice(e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">General Payment (No specific invoice)</option>
                          {customerInvoices.map(invoice => (
                            <option key={invoice.id} value={invoice.id}>
                              {formatInvoiceNumber(invoice.bill_number)} - Balance: {formatCurrency(invoice.remaining_balance)} (Date: {invoice.date})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-sm text-gray-500 py-2 px-3 bg-gray-50 rounded-lg">
                          No pending invoices found for this customer
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Channel</label>
                <select
                  value={newTransaction.payment_channel_id || ''}
                  onChange={(e) => {
                    const channelId = parseInt(e.target.value);
                    const selectedChannel = paymentChannels.find(c => c.id === channelId);
                    setNewTransaction(prev => ({ 
                      ...prev, 
                      payment_channel_id: channelId,
                      payment_channel_name: selectedChannel?.name || '',
                      payment_method: selectedChannel?.name || ''
                    }));
                  }}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {paymentChannels.map(channel => (
                    <option key={channel.id} value={channel.id}>
                      {channel.name} ({channel.type})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={newTransaction.notes}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Additional notes or reference information"
                />
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-600">
                  <strong>Note:</strong> System entries (from invoices) are automatically generated. 
                  Only manual entries can be edited or deleted.
                </p>
              </div>
            </div>
            
            <div className="p-6 border-t flex justify-end space-x-3 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowAddTransaction(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={addTransaction}
                disabled={!newTransaction.category || !newTransaction.description || newTransaction.amount <= 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Transaction
              </button>
            </div>
          </div>
        </div>
      )}

      
      {/* Balance Transfer Info */}
      {summary && selectedDate !== new Date().toISOString().split('T')[0] && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Calendar className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-blue-900">Balance Transfer</h4>
              <p className="text-sm text-blue-700 mt-1">
                Closing balance of {formatCurrency(summary.closing_balance)} was automatically 
                transferred as opening balance for the next day.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* System Status */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            <span className="text-sm text-gray-600">
              Daily Ledger System - Auto Balance Transfer Active
            </span>
          </div>
          <div className="text-xs text-gray-500 space-x-4">
            <span>{summary?.transactions_count || 0} transactions today</span>
            <span>•</span>
            <span>
              {entries.filter(e => e.is_manual).length} manual, 
              {entries.filter(e => !e.is_manual).length} system
            </span>
            {selectedCustomerId && (
              <>
                <span>•</span>
                <span>Filtered by customer</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyLedger;