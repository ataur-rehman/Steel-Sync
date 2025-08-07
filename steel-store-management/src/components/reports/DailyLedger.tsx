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
      // ENHANCED: First get daily ledger entries from database service
      // This includes system-generated entries from payments recorded via recordPayment
      const dailyLedgerData = await db.getDailyLedgerEntries(date, { customer_id: selectedCustomerId });
      
      // Add database entries (excluding manual entries which are already loaded)
      const dbEntries = dailyLedgerData.entries.filter((entry: LedgerEntry) => !entry.is_manual);
      systemEntries.push(...dbEntries);
      
      // CRITICAL FIX: Don't create duplicate invoice payment entries
      // The recordPayment function in database.ts already creates proper daily ledger entries
      // that are included in dbEntries above. Creating additional entries here causes duplicates.
      
      // NOTE: Credit sales are NOT included in Daily Ledger as they are not cash transactions
      // They are tracked in Customer Ledger only
      
    } catch (error) {
      console.error('Error generating system entries:', error);
    }
    
    return systemEntries;
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

      // CRITICAL FIX: Use database service to create the transaction properly
      // This will ensure it gets integrated with customer ledger
      if (newTransaction.customer_id) {
        try {
          // ENHANCED: For customer payments that can be allocated to invoices
          if (newTransaction.type === 'incoming' && newTransaction.category.toLowerCase().includes('payment')) {
            // This is a customer payment - use recordPayment for proper integration
            // CRITICAL FIX: recordPayment already creates all necessary entries, no manual entry needed
            await db.recordPayment({
              customer_id: newTransaction.customer_id,
              amount: newTransaction.amount,
              payment_method: newTransaction.payment_method,
              payment_channel_id: newTransaction.payment_channel_id,
              payment_channel_name: newTransaction.payment_channel_name,
              payment_type: 'bill_payment',
              reference: newTransaction.description,
              notes: newTransaction.notes || '',
              date: newTransaction.date
            }, selectedInvoice || undefined);

            const invoiceInfo = selectedInvoice ? 
              ` (allocated to Invoice ${formatInvoiceNumber(customerInvoices.find(inv => inv.id === selectedInvoice)?.bill_number || '')})` : '';
            
            toast.success(`Customer payment recorded successfully${invoiceInfo} and integrated with daily & customer ledgers`);
            
            // CRITICAL FIX: Reset form and reload data, but don't create duplicate entry
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
            await loadDayData(newTransaction.date);
            return; // Exit early to prevent duplicate entry creation
          } else {
            // Regular daily ledger entry with customer association
            await db.createDailyLedgerEntry({
              date: newTransaction.date,
              type: newTransaction.type,
              category: newTransaction.category,
              description: newTransaction.description,
              amount: newTransaction.amount,
              customer_id: newTransaction.customer_id,
              customer_name: customerName,
              payment_method: newTransaction.payment_method,
              payment_channel_id: newTransaction.payment_channel_id,
              payment_channel_name: newTransaction.payment_channel_name,
              notes: newTransaction.notes || '',
              is_manual: true
            });

            toast.success('Transaction added successfully and integrated with customer ledger');
            
            // CRITICAL FIX: Reset form and reload data, but don't create duplicate entry
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
            await loadDayData(newTransaction.date);
            return; // Exit early to prevent duplicate entry creation
          }

          console.log('✅ Transaction created via database service - will integrate with customer ledger');
        } catch (dbError) {
          console.error('Database service error, falling back to local storage:', dbError);
          toast.error('Failed to record payment. Please try again.');
          return;
        }
      }

      // CRITICAL FIX: Only create manual entry for non-customer transactions
      // or when database service is not available
      const newEntry: LedgerEntry = {
        id: `manual-${now.getTime()}`,
        date: newTransaction.date,
        time: now.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true }),
        type: newTransaction.type,
        category: newTransaction.category,
        description: newTransaction.description,
        amount: newTransaction.amount,
        customer_id: newTransaction.customer_id,
        customer_name: customerName,
        payment_method: newTransaction.payment_method,
        notes: newTransaction.notes,
        is_manual: true,
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      };

      // Add to current entries
      const updatedEntries = [...entries, newEntry].sort((a, b) => a.time.localeCompare(b.time));
      setEntries(updatedEntries);
      
      // Save to localStorage (for local persistence)
      saveEntriesToStorage(newTransaction.date, updatedEntries);
      
      // Recalculate summary
      const newSummary = calculateSummary(updatedEntries, newTransaction.date);
      setSummary(newSummary);
      localStorage.setItem(`closing_balance_${newTransaction.date}`, newSummary.closing_balance.toString());

      // Show success message for manual entries
      toast.success('Transaction added successfully');
      
      // CRITICAL FIX: Close modal and reset form for manual entries too
      setShowAddTransaction(false);
      setSelectedInvoice(null);
      
      // Reset form
      setNewTransaction({
        type: 'incoming',
        category: '',
        description: '',
        amount: 0,
        payment_method: paymentChannels[0]?.name || 'Cash',
        payment_channel_id: paymentChannels[0]?.id,
        payment_channel_name: paymentChannels[0]?.name,
        notes: '',
        date: selectedDate
      });
      
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast.error('Failed to add transaction');
      
      // CRITICAL FIX: Close modal even on error
      setShowAddTransaction(false);
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
                  step="0.01"
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