import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { db } from '../../services/database';

import toast from 'react-hot-toast';
import { parseCurrency } from '../../utils/currency';
import { formatInvoiceNumber } from '../../utils/numberFormatting';
import { formatDate, formatTime, formatDateForDatabase } from '../../utils/formatters';
import { getSystemDateForInput } from '../../utils/systemDateTime';
import { ask } from '@tauri-apps/plugin-dialog';
import { ErrorBoundary } from '../common/ErrorBoundary';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Plus,
  Download,
  Search,
  BarChart3,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  Edit,
  Trash2,
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
  category?: string; // Made optional since we'll auto-determine it
  description: string;
  amount: number;
  customer_id?: number;
  payment_method: string;
  payment_channel_id?: number;
  payment_channel_name?: string;
  notes?: string;
  date: string;
}

// Enhanced categories with consistent naming
const INCOMING_CATEGORIES = [
  'Payment Received',
  'Sale Revenue',
  'Advance Payment',
  'Service Income',
  'Interest Income',
  'Commission Income',
  'Rental Income',
  'Other Income'
];

// 🚨 CRITICAL: These categories MUST match those used in database.ts for outgoing transactions
// 🚨 When adding new expense categories, add them here AND in cashFlowCategories below
// 🚨 Missing categories will prevent entries from showing in Daily Ledger
const OUTGOING_CATEGORIES = [
  'Office Rent',
  'Utilities Bill',
  'Staff Salary',
  'Labor Payment', // Used by miscellaneous items from invoices
  'Transportation',
  'Raw Materials',
  'Equipment Purchase',
  'Marketing Expense',
  'Professional Services',
  'Return Refund',
  'Vendor Payment',
  'Bank Charges',
  'Payment Given', // Money given to customers (reducing their credit)
  'Other Expense'
];

// 🚨 CRITICAL: Memoized Transaction Row for performance with 500+ entries
const TransactionRow = React.memo<{
  entry: LedgerEntry;
  type: 'incoming' | 'outgoing';
  onEdit: (entry: LedgerEntry) => void;
  onDelete: (id: string) => void;
  formatCurrency: (amount: number) => string;
  getCleanDisplayText: (entry: LedgerEntry) => { primaryText: string };
}>(({ entry, type, onEdit, onDelete, formatCurrency, getCleanDisplayText }) => {
  const { primaryText } = getCleanDisplayText(entry);
  const isIncoming = type === 'incoming';

  return (
    <tr key={entry.id} className="hover:bg-gray-50">
      <td className="px-3 py-2 text-gray-600 text-xs">{entry.time}</td>
      <td className="px-3 py-2">
        <div className="text-gray-900 font-medium text-sm">{primaryText}</div>
        <div className="text-xs text-gray-500">
          {entry.payment_channel_name || entry.payment_method || 'Cash'}
        </div>
      </td>
      <td className="px-3 py-2 text-right">
        <span className={`font-bold text-sm ${isIncoming ? 'text-green-600' : 'text-red-600'}`}>
          {isIncoming ? '+' : '-'}{formatCurrency(entry.amount)}
        </span>
      </td>
      <td className="px-3 py-2 text-center">
        {entry.is_manual ? (
          <div className="flex items-center justify-center space-x-1">
            <button
              onClick={() => onEdit(entry)}
              className="text-blue-600 hover:text-blue-800 p-1"
              title="Edit Transaction"
            >
              <Edit className="h-3 w-3" />
            </button>
            <button
              onClick={() => onDelete(entry.id)}
              className="text-red-600 hover:text-red-800 p-1"
              title="Delete Transaction"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <span className="text-xs text-gray-400">System</span>
        )}
      </td>
    </tr>
  );
});

const DailyLedger: React.FC = () => {
  const location = useLocation();

  // 🚀 PERFORMANCE MEASUREMENT SYSTEM
  const performanceRef = React.useRef({
    loadStartTime: 0,
    filterStartTime: 0,
    renderStartTime: 0
  });

  const logPerformance = React.useCallback((operation: string, startTime: number, additionalData?: any) => {
    const duration = Date.now() - startTime;
    const logMessage = `⚡ [DAILY_LEDGER_PERF] ${operation} completed in ${duration}ms`;
    console.log(logMessage, additionalData || '');

    // Store in sessionStorage for comparison
    const perfHistory = JSON.parse(sessionStorage.getItem('dailyLedger_performance') || '[]');
    perfHistory.push({
      operation,
      duration,
      timestamp: Date.now(),
      ...additionalData
    });

    // Keep last 20 entries
    if (perfHistory.length > 20) {
      perfHistory.splice(0, perfHistory.length - 20);
    }

    sessionStorage.setItem('dailyLedger_performance', JSON.stringify(perfHistory));
  }, []);

  // Core state
  // Use centralized system date/time formatting
  const [selectedDate, setSelectedDate] = useState(formatDateForDatabase());
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
  const [showPaymentChannelsSummary, setShowPaymentChannelsSummary] = useState(false);

  // Form state
  const [newTransaction, setNewTransaction] = useState<TransactionForm>({
    type: 'incoming',
    description: '',
    amount: 0,
    payment_method: 'Cash',
    payment_channel_id: undefined,
    payment_channel_name: undefined,
    notes: '',
    date: formatDateForDatabase()
  });

  const [editForm, setEditForm] = useState<Partial<LedgerEntry>>({});

  // Invoice selection for payment allocation (DailyLedger)
  const [customerInvoices, setCustomerInvoices] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<number | null>(null);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Initial opening balance setup for new users
  const [showOpeningBalanceSetup, setShowOpeningBalanceSetup] = useState(false);
  const [initialOpeningBalance, setInitialOpeningBalance] = useState(0);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);

  // Data
  const [customers, setCustomers] = useState<any[]>([]);
  const [paymentChannels, setPaymentChannels] = useState<any[]>([]);

  // 🚀 PERFORMANCE: Cache state to prevent race conditions
  const [cacheLoaded, setCacheLoaded] = useState(false);

  useEffect(() => {
    loadInitialData();

    // ENHANCED: Listen to business events for real-time updates
    try {
      if (typeof window !== 'undefined') {
        const eventBus = (window as any).eventBus;
        if (eventBus && eventBus.on) {
          const handleDailyLedgerUpdate = (data: any) => {
            console.log('📊 Daily ledger immediate refresh due to ledger update:', data);
            if (data.date === selectedDate || !data.date) {
              // Force immediate refresh instead of debounced
              console.log('🚀 Triggering immediate ledger refresh');
              setLoading(true);
              loadDayData(selectedDate);
            }
          };

          const handleInvoiceCreated = (data: any) => {
            console.log('📊 Daily ledger immediate refresh due to invoice creation:', data);
            const invoiceDate = formatDateForDatabase(new Date(data.created_at));
            if (invoiceDate === selectedDate) {
              // Force immediate refresh instead of debounced
              console.log('🚀 Triggering immediate ledger refresh');
              setLoading(true);
              loadDayData(selectedDate);
            }
          };

          const handlePaymentReceived = (data: any) => {
            console.log('📊 Daily ledger immediate refresh due to payment:', data);
            const today = formatDateForDatabase();
            if (selectedDate === today || data?.date === selectedDate) {
              // Force immediate refresh instead of debounced
              console.log('🚀 Triggering immediate ledger refresh');
              setLoading(true);
              loadDayData(selectedDate);
            }
          };

          // Subscribe to relevant events for comprehensive real-time updates
          eventBus.on('DAILY_LEDGER_UPDATED', handleDailyLedgerUpdate);
          eventBus.on('daily_ledger:updated', handleDailyLedgerUpdate); // New event name
          eventBus.on('INVOICE_CREATED', handleInvoiceCreated);
          eventBus.on('invoice:created', handleInvoiceCreated); // New event name
          eventBus.on('PAYMENT_RECORDED', handlePaymentReceived);
          eventBus.on('payment:recorded', handlePaymentReceived); // New event name

          // Additional events for comprehensive coverage
          eventBus.on('CUSTOMER_BALANCE_UPDATED', handlePaymentReceived);
          eventBus.on('LEDGER_ENTRY_CREATED', handleDailyLedgerUpdate);
          eventBus.on('FIFO_PAYMENT_RECORDED', handlePaymentReceived); // For "Give Money to Customer"

          // Force refresh on UI refresh requests
          eventBus.on('UI_REFRESH_REQUESTED', (data: any) => {
            if (data?.type?.includes('ledger') || data?.type?.includes('payment')) {
              console.log('📊 Force refresh requested for ledger:', data);
              setLoading(true);
              loadDayData(selectedDate);
            }
          });

          console.log('✅ Daily Ledger real-time event listeners configured');

          // Store cleanup function
          (window as any).dailyLedgerCleanup = () => {
            eventBus.off('DAILY_LEDGER_UPDATED', handleDailyLedgerUpdate);
            eventBus.off('daily_ledger:updated', handleDailyLedgerUpdate);
            eventBus.off('INVOICE_CREATED', handleInvoiceCreated);
            eventBus.off('invoice:created', handleInvoiceCreated);
            eventBus.off('PAYMENT_RECORDED', handlePaymentReceived);
            eventBus.off('payment:recorded', handlePaymentReceived);
            eventBus.off('CUSTOMER_BALANCE_UPDATED', handlePaymentReceived);
            eventBus.off('LEDGER_ENTRY_CREATED', handleDailyLedgerUpdate);
            eventBus.off('FIFO_PAYMENT_RECORDED', handlePaymentReceived);
            eventBus.off('UI_REFRESH_REQUESTED');
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

  // Check for first-time user on component mount
  useEffect(() => {
    checkFirstTimeUser();
  }, []);

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

  // 🚨 CRITICAL: Debounced refresh to prevent UI lag with rapid events
  const debouncedRefresh = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (date: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          console.log('🔄 [DailyLedger] Debounced refresh triggered');
          loadDayData(date);
        }, 300);
      };
    })(),
    []
  );

  // PERFORMANCE: Memoize filtered entries to prevent unnecessary re-renders
  const filteredEntries = useMemo(() => {
    let result = entries;

    if (selectedCustomerId) {
      result = result.filter(entry => entry.customer_id === selectedCustomerId);
    }

    if (selectedPaymentChannels.length > 0) {
      result = result.filter(entry =>
        entry.payment_channel_id && selectedPaymentChannels.includes(entry.payment_channel_id)
      );
    }

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(entry =>
        entry.description.toLowerCase().includes(searchLower) ||
        entry.customer_name?.toLowerCase().includes(searchLower) ||
        entry.bill_number?.toLowerCase().includes(searchLower) ||
        entry.payment_method?.toLowerCase().includes(searchLower) ||
        entry.notes?.toLowerCase().includes(searchLower)
      );
    }

    return result;
  }, [entries, selectedCustomerId, selectedPaymentChannels, searchTerm]);

  // PERFORMANCE: Memoize separated transaction lists
  const { incomingTransactions, outgoingTransactions } = useMemo(() => {
    const incoming = filteredEntries.filter(entry => entry.type === 'incoming');
    const outgoing = filteredEntries.filter(entry => entry.type === 'outgoing');
    return { incomingTransactions: incoming, outgoingTransactions: outgoing };
  }, [filteredEntries]);

  // 🚀 PERFORMANCE: Memoized transaction entry component
  const MemoizedTransactionEntry = React.memo(({
    entry,
    onEdit,
    onDelete,
    getCleanDisplayText,
    formatCurrency
  }: {
    entry: LedgerEntry;
    onEdit: (entry: LedgerEntry) => void;
    onDelete: (entryId: string) => void;
    getCleanDisplayText: (entry: LedgerEntry) => { primaryText: string; secondaryText: string };
    formatCurrency: (amount: number) => string;
  }) => {
    const { primaryText } = getCleanDisplayText(entry);
    const isIncoming = entry.type === 'incoming';

    return (
      <tr key={entry.id} className="hover:bg-gray-50">
        <td className="px-3 py-2 text-gray-600 text-xs">{entry.time}</td>
        <td className="px-3 py-2">
          <div className="text-gray-900 font-medium text-sm">{primaryText}</div>
          <div className="text-xs text-gray-500">
            {entry.payment_channel_name || entry.payment_method || 'Cash'}
          </div>
        </td>
        <td className="px-3 py-2 text-right">
          <span className={`font-bold text-sm ${isIncoming ? 'text-green-600' : 'text-red-600'}`}>
            {isIncoming ? '+' : '-'}{formatCurrency(entry.amount)}
          </span>
        </td>
        <td className="px-3 py-2 text-center">
          {entry.is_manual ? (
            <div className="flex items-center justify-center space-x-1">
              <button
                onClick={() => onEdit(entry)}
                className="text-blue-600 hover:text-blue-800 p-1"
                title="Edit Transaction"
              >
                <Edit className="h-3 w-3" />
              </button>
              <button
                onClick={() => onDelete(entry.id)}
                className="text-red-600 hover:text-red-800 p-1"
                title="Delete Transaction"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <span className="text-gray-400 text-xs">Auto</span>
          )}
        </td>
      </tr>
    );
  });

  // 🚀 PERFORMANCE: Memoized currency formatter
  const memoizedFormatCurrency = React.useCallback((amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  }, []);

  const loadDayData = async (date: string) => {
    // 🚀 PERFORMANCE: Start timing
    performanceRef.current.loadStartTime = Date.now();
    const startTime = performanceRef.current.loadStartTime;

    try {
      setLoading(true);

      // 🚀 PERFORMANCE OPTIMIZATION: Check for cached data first with longer duration
      const cacheKey = `dailyLedger_${date}_${selectedCustomerId || 'all'}_${selectedPaymentChannels.sort().join(',')}`;
      const cachedData = sessionStorage.getItem(cacheKey);

      if (cachedData) {
        try {
          const { entries: cachedEntries, summary: cachedSummary, timestamp } = JSON.parse(cachedData);
          const cacheAge = Date.now() - timestamp;

          // 🚀 STALE-WHILE-REVALIDATE: Show cached data immediately, then refresh in background
          if (cacheAge < 300000) { // 5 minutes cache duration
            console.log(`⚡ [DAILY_LEDGER_PERF] Using cached data (${Math.round(cacheAge / 1000)}s old)`);

            setEntries(cachedEntries);
            setSummary(cachedSummary);

            // 🚀 PERFORMANCE: Set loading to false immediately for instant display
            setLoading(false);

            // 🚀 PERFORMANCE: Set cache loaded flag to prevent race condition
            setCacheLoaded(true);

            // 🚀 PERFORMANCE: Log cache performance
            logPerformance('Day data load (cached)', startTime, {
              entriesCount: cachedEntries.length,
              cacheAge: Math.round(cacheAge / 1000),
              date: date,
              source: 'cache'
            });

            // If cache is older than 1 minute, refresh in background
            if (cacheAge > 60000) {
              console.log('🔄 [DAILY_LEDGER_PERF] Background refresh triggered for stale data');
              // Continue to load fresh data but don't block UI
            } else {
              // Fresh enough, skip loading
              console.log('🚀 [DAILY_LEDGER_PERF] Cache loaded flag set - preventing data reload');
              return;
            }
          } else {
            console.log(`📊 [DAILY_LEDGER_PERF] Cache expired (${Math.round(cacheAge / 1000)}s old), loading fresh`);
          }
        } catch (error) {
          console.warn('Failed to parse cached data:', error);
        }
      } else {
        console.log('📊 [DAILY_LEDGER_PERF] No cache found, loading fresh data');
      }      // 🚀 PERFORMANCE OPTIMIZATION: Parallel data loading
      console.log('🔄 [DailyLedger] Starting parallel data load for date:', date);

      const [systemEntries] = await Promise.all([
        generateSystemEntries(date),
        // Add any other parallel operations here
      ]);

      // 🚀 PERFORMANCE: Log parallel load performance
      const parallelLoadTime = Date.now();
      const parallelLoadDuration = parallelLoadTime - startTime;
      console.log(`📊 [DAILY_LEDGER_PERF] Parallel data loaded in ${parallelLoadDuration}ms`);

      // BULLETPROOF SOLUTION: Load ALL entries from database ONLY
      // NO localStorage dependency - everything comes from database
      console.log('🔄 [DailyLedger] Loading all entries from database for date:', date);

      // Load both system and manual entries from database
      // All entries are now in systemEntries (including manual ones from ledger_entries table)

      console.log(`📊 [DailyLedger] Total entries from database: ${systemEntries.length}`);

      // Remove duplicate IDs only
      const seenIds = new Set();
      const allEntries = systemEntries.filter(entry => {
        if (entry.id && seenIds.has(entry.id)) {
          console.log(`🗑️ [DailyLedger] Removed duplicate ID: ${entry.id}`);
          return false;
        }
        if (entry.id) seenIds.add(entry.id);
        return true;
      });

      console.log(`✅ [DailyLedger] Final entries: ${allEntries.length} (pure database storage)`);

      // 🚀 PERFORMANCE: Early performance logging for data loading
      const dataLoadTime = Date.now();
      const dataLoadDuration = dataLoadTime - startTime;
      console.log(`📊 [DAILY_LEDGER_PERF] Data loaded in ${dataLoadDuration}ms (${allEntries.length} entries)`);

      // DEBUG: Log all entries before filtering
      console.log('🔍 [DailyLedger] All entries before filtering:', allEntries.map(e => ({
        id: e.id,
        description: e.description,
        amount: e.amount,
        customer_id: e.customer_id,
        payment_channel_id: e.payment_channel_id,
        payment_method: e.payment_method,
        category: e.category
      })));

      console.log('🔍 [DailyLedger] Current filters:', {
        selectedCustomerId,
        selectedPaymentChannels,
        paymentChannelsCount: paymentChannels.length
      });

      // 🚀 PERFORMANCE: Track filtering time
      const filterStartTime = Date.now();

      // FIXED: Apply customer and payment channel filters if selected
      let filteredEntries = allEntries;

      if (selectedCustomerId) {
        filteredEntries = filteredEntries.filter((entry: LedgerEntry) => {
          // Include entries for the selected customer
          if (entry.customer_id === selectedCustomerId) return true;

          // CRITICAL FIX: Include system entries (refunds, salary, manual transactions, etc.)
          // These should be visible regardless of customer filter
          if (!entry.customer_id || entry.customer_id === 0) return true;

          // Include cash refunds and return-related entries for any customer
          // since they affect overall daily cash flow
          if (entry.category === 'refunds' ||
            entry.category === 'Cash Refund' ||
            entry.category === 'Payment Given' || // Money given to customers should always be visible
            entry.description?.includes('Cash refund') ||
            entry.reference_type === 'other') return true;

          // Exclude other customer entries
          return false;
        });

        console.log(`🔍 [DailyLedger] After customer filter (${selectedCustomerId}): ${filteredEntries.length} entries`);
      }      // Apply payment channel filter if channels are selected
      if (selectedPaymentChannels.length > 0) {
        console.log(`🔍 [DailyLedger] Applying payment channel filter for channels: ${selectedPaymentChannels}`);

        const beforeChannelFilter = filteredEntries.length;
        filteredEntries = filteredEntries.filter((entry: LedgerEntry) => {
          // CRITICAL FIX: Always include system entries (refunds, salary, etc.) regardless of payment channel filter
          if (entry.category === 'refunds' ||
            entry.category === 'Cash Refund' ||
            entry.category === 'Payment Given' || // Money given to customers should always be visible
            entry.description?.includes('Cash refund') ||
            entry.reference_type === 'other' ||
            !entry.customer_id ||
            entry.customer_id === 0) {
            console.log(`🔍 [DailyLedger] Including system entry: ${entry.id} - ${entry.description}`);
            return true;
          }

          // If entry has payment_channel_id, check if it's in selected channels
          if (entry.payment_channel_id) {
            const included = selectedPaymentChannels.includes(entry.payment_channel_id);
            console.log(`🔍 [DailyLedger] Entry ${entry.id} payment_channel_id ${entry.payment_channel_id}: ${included ? 'INCLUDED' : 'EXCLUDED'}`);
            return included;
          }
          // If entry only has payment_method, match by channel name
          if (entry.payment_method) {
            const matchedChannel = paymentChannels.find(channel =>
              channel.name.toLowerCase() === (entry.payment_method || '').toLowerCase() ||
              channel.type.toLowerCase() === (entry.payment_method || '').toLowerCase()
            );
            const included = matchedChannel ? selectedPaymentChannels.includes(matchedChannel.id) : false;
            console.log(`🔍 [DailyLedger] Entry ${entry.id} payment_method "${entry.payment_method}" matched channel ${matchedChannel?.id}: ${included ? 'INCLUDED' : 'EXCLUDED'}`);
            return included;
          }
          console.log(`🔍 [DailyLedger] Entry ${entry.id} no payment info: EXCLUDED`);
          return false;
        });

        console.log(`🔍 [DailyLedger] After payment channel filter: ${beforeChannelFilter} -> ${filteredEntries.length} entries`);
      }

      // 🚀 PERFORMANCE: Log filter performance
      const filterDuration = Date.now() - filterStartTime;
      console.log(`📊 [DAILY_LEDGER_PERF] Filtering completed in ${filterDuration}ms (${allEntries.length} → ${filteredEntries.length} entries)`);

      // FIXED: Sort by date and time properly handling AM/PM format
      console.log(`🕒 [DailyLedger] Sorting ${filteredEntries.length} entries by date and time`);

      filteredEntries.sort((a: LedgerEntry, b: LedgerEntry) => {
        // First sort by date
        const dateA = a.date || '1900-01-01';
        const dateB = b.date || '1900-01-01';

        const dateComparison = dateA.localeCompare(dateB);
        if (dateComparison !== 0) {
          return dateComparison;
        }

        // If dates are equal, sort by time (convert to 24-hour format for proper sorting)
        const convertTo24Hour = (timeStr: string): string => {
          if (!timeStr || timeStr.trim() === '') return '00:00';

          try {
            const cleanTimeStr = timeStr.trim();

            // If already in 24-hour format, return as is
            if (!/AM|PM/i.test(cleanTimeStr)) {
              return cleanTimeStr;
            }

            // Parse 12-hour format
            const match = cleanTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
            if (!match) return '00:00';

            let hours = parseInt(match[1], 10);
            const minutes = match[2];
            const period = match[3].toUpperCase();

            // Convert to 24-hour format
            if (period === 'AM') {
              if (hours === 12) hours = 0; // 12:XX AM becomes 00:XX
            } else { // PM
              if (hours !== 12) hours += 12; // 1:XX PM becomes 13:XX, but 12:XX PM stays 12:XX
            }

            return `${hours.toString().padStart(2, '0')}:${minutes}`;
          } catch (error) {
            return '00:00';
          }
        };

        const timeA = convertTo24Hour(a.time || '00:00 AM');
        const timeB = convertTo24Hour(b.time || '00:00 AM');

        return timeA.localeCompare(timeB);
      });

      // Debug: Show first few entries after sorting
      if (filteredEntries.length > 0) {
        console.log(`🕒 [DailyLedger] Sample sorted entries:`,
          filteredEntries.slice(0, 3).map((e: LedgerEntry) => ({
            id: e.id,
            date: e.date,
            time: e.time,
            description: e.description
          }))
        );
      }

      console.log(`🔍 [DailyLedger] Final filtered entries (${filteredEntries.length}) being set to state:`);
      filteredEntries.forEach((entry: LedgerEntry) => {
        console.log(`🔍 [DailyLedger] Setting entry ${entry.id}: ${entry.description}, customer: ${entry.customer_id}, channel: ${entry.payment_channel_id}, method: ${entry.payment_method}`);
      });

      setEntries(filteredEntries);

      // Debug: Log manual vs system entries
      const manualCount = filteredEntries.filter((e: LedgerEntry) => e.is_manual).length;
      const systemCount = filteredEntries.filter((e: LedgerEntry) => !e.is_manual).length;
      console.log(`📊 [DailyLedger] Loaded entries for ${date}: ${manualCount} manual, ${systemCount} system, ${filteredEntries.length} total`);

      // Log a sample of manual entries for debugging
      const manualEntries = filteredEntries.filter((e: LedgerEntry) => e.is_manual);
      if (manualEntries.length > 0) {
        console.log('📝 [DailyLedger] Sample manual entries:', manualEntries.slice(0, 3).map((e: LedgerEntry) => ({
          id: e.id,
          description: e.description,
          amount: e.amount,
          is_manual: e.is_manual,
          category: e.category
        })));
      }

      // Calculate summary from database entries only
      const daySummary = await calculateSummary(allEntries, date);
      setSummary(daySummary);

      // 🚀 PERFORMANCE: Store in cache for fast subsequent loads
      const cacheData = {
        entries: filteredEntries,
        summary: daySummary,
        timestamp: Date.now()
      };
      sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));

      // 🚀 PERFORMANCE: Log complete operation performance
      logPerformance('Day data load (complete)', startTime, {
        entriesLoaded: allEntries.length,
        entriesVisible: filteredEntries.length,
        date: date,
        hasCustomerFilter: !!selectedCustomerId,
        hasChannelFilter: selectedPaymentChannels.length > 0,
        summaryBalance: daySummary.closing_balance,
        source: 'database'
      });

      // BULLETPROOF: No localStorage storage needed - database is the single source of truth

    } catch (error) {
      console.error('Failed to load day data:', error);
      toast.error('Failed to load day data');

      // 🚀 PERFORMANCE: Log error performance
      logPerformance('Day data load (error)', startTime, {
        error: error instanceof Error ? error.message : 'Unknown error',
        date: date
      });
    } finally {
      setLoading(false);
    }
  };

  // 🚀 PERFORMANCE: Reset cache flag when date changes
  useEffect(() => {
    setCacheLoaded(false);
  }, [selectedDate]);

  // BULLETPROOF SOLUTION: Pure database-only approach
  // NO localStorage, NO migrations, NO dependencies - just pure database
  useEffect(() => {
    // Simple initialization - just load the current date data
    if (selectedDate && !cacheLoaded) {
      console.log('🔄 [DAILY_LEDGER_PERF] Loading data for selectedDate (no cache)');
      loadDayData(selectedDate);
    } else if (cacheLoaded) {
      console.log('🚀 [DAILY_LEDGER_PERF] Skipping data load - cache already loaded');
    }
  }, [selectedDate, cacheLoaded]); // Only reload when date changes or cache state changes

  const generateSystemEntries = async (date: string): Promise<LedgerEntry[]> => {
    const systemEntries: LedgerEntry[] = [];

    try {
      console.log('🔄 [DailyLedger] Loading entries from centralized system for date:', date);

      // CENTRALIZED SYSTEM: Load from ledger_entries table AND vendor_payments table
      // This follows centralized approach - vendor payments stay in their own table

      // Phase 1: Load from centralized ledger_entries table (customer payments, salaries, etc.)
      console.log(`🔍 [DailyLedger] Loading entries for date: "${date}", selectedCustomerId: ${selectedCustomerId}`);

      // DEBUGGING: Check if FIFO payment ID 15 exists at all
      try {
        const fifoPaymentCheck = await db.executeRawQuery(
          'SELECT id, date, time, description, amount, customer_id, payment_channel_id, payment_method FROM ledger_entries WHERE id = 15',
          []
        );
        console.log(`🔍 [DailyLedger] FIFO Payment ID 15 check:`, fifoPaymentCheck);
      } catch (error) {
        console.log(`❌ [DailyLedger] Error checking FIFO payment:`, error);
      }

      // DEBUGGING: Check all entries for today
      try {
        const allTodayEntries = await db.executeRawQuery(
          'SELECT id, date, time, description, amount, customer_id, payment_channel_id, payment_method FROM ledger_entries WHERE date = ?',
          [date]
        );
        console.log(`🔍 [DailyLedger] All entries for ${date}:`, allTodayEntries);
      } catch (error) {
        console.log(`❌ [DailyLedger] Error checking all today entries:`, error);
      }

      const dailyLedgerData = await db.getDailyLedgerEntries(date, { customer_id: selectedCustomerId });
      const ledgerEntries = dailyLedgerData.entries || [];

      console.log(`📊 [DailyLedger] Raw ledger entries from database:`, ledgerEntries.map((e: any) => ({
        id: e.id,
        date: e.date,
        description: e.description,
        customer_id: e.customer_id,
        payment_channel_id: e.payment_channel_id,
        payment_method: e.payment_method
      })));

      console.log(`📊 [DailyLedger] Centralized ledger entries:`, ledgerEntries.length);      // Phase 2: Load vendor payments directly from vendor_payments table
      const vendorPayments = await db.executeRawQuery(`
        SELECT vp.*, 
               COALESCE(v.name, vp.vendor_name, 'Unknown Vendor') as vendor_name
        FROM vendor_payments vp
        LEFT JOIN vendors v ON vp.vendor_id = v.id
        WHERE vp.date = ? AND vp.amount > 0
        ORDER BY vp.created_at ASC
      `, [date]);

      console.log(`📊 [DailyLedger] Vendor payments for ${date}:`, vendorPayments.map(p => ({
        id: p.id,
        vendor_name: p.vendor_name,
        receiving_id: p.receiving_id,
        display_receiving: p.receiving_id ? `S0${p.receiving_id}` : null,
        amount: p.amount
      })));

      console.log(`� [DailyLedger] Vendor payments for ${date}:`, vendorPayments.length);

      // Add vendor payments to system entries
      for (const payment of vendorPayments) {
        // Generate display receiving number from receiving_id (e.g., receiving_id=1 -> S01)
        const displayReceivingNumber = payment.receiving_id ? `S0${payment.receiving_id}` : null;

        console.log(`🔍 [DailyLedger] Processing vendor payment:`, {
          id: payment.id,
          vendor_name: payment.vendor_name,
          receiving_id: payment.receiving_id,
          display_receiving_number: displayReceivingNumber,
          amount: payment.amount
        });

        const description = `Payment to ${payment.vendor_name}${displayReceivingNumber ? ` - Stock Receiving ${displayReceivingNumber}` : ''}`;
        console.log(`📝 [DailyLedger] Generated description:`, description);

        systemEntries.push({
          id: `vendor_payment_${payment.id}`,
          date: payment.date,
          time: payment.time || formatTime(new Date(payment.created_at)),
          type: 'outgoing',
          category: 'Vendor Payment',
          description: description,
          amount: payment.amount || 0,
          reference_id: payment.id,
          reference_type: 'vendor_payment',
          customer_id: undefined,
          customer_name: `Vendor: ${payment.vendor_name}`,
          payment_method: payment.payment_channel_name || 'Cash',
          payment_channel_id: payment.payment_channel_id,
          payment_channel_name: payment.payment_channel_name || 'Cash',
          notes: payment.notes || `Vendor payment via ${payment.payment_channel_name || 'Cash'}${displayReceivingNumber ? ` - Stock Receiving ${displayReceivingNumber}` : ''}`,
          bill_number: payment.reference_number,
          is_manual: false,
          created_at: payment.created_at,
          updated_at: payment.updated_at
        });

        console.log(`✅ [DailyLedger] Added vendor payment entry with description:`, description);
      }

      // Phase 3: Add centralized ledger entries (customer payments, salaries, etc.)
      // Filter to only include REAL CASH FLOW entries, exclude invoice creation entries
      const cashFlowEntries = ledgerEntries.filter((entry: LedgerEntry) => {
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

        // Include only cash flow categories (excluding Vendor Payment since we load those separately)
        // 🚨 CRITICAL: When adding new expense categories in database.ts, ALWAYS add them here too!
        // 🚨 MISSING CATEGORIES HERE WILL CAUSE ENTRIES TO NOT DISPLAY IN DAILY LEDGER
        // 🚨 Categories used in miscellaneous items, salary payments, and other expenses MUST be included
        const cashFlowCategories = [
          'Payment Received',
          'Customer Payment',
          'Invoice Payment',
          'Advance Payment',
          'Return Refund',
          'Cash Refund', // 🔧 CRITICAL FIX: Include cash refunds from returns
          'refunds', // 🔧 CRITICAL FIX: Include lowercase refunds category
          'Staff Salary',
          'Salary Payment',
          'salary', // 🔧 CRITICAL FIX: Include lowercase salary category from staff management
          'Labor Payment', // 🔧 CRITICAL FIX: Include labor payments from miscellaneous items
          'Business Expense',
          'Manual Income',
          'Manual Expense',
          'Office Rent',
          'Utilities Bill',
          'Transportation',
          'Raw Materials',
          'Equipment Purchase',
          'Marketing Expense',
          'Professional Services',
          'Bank Charges',
          'Payment Given', // Money given to customers (reducing their credit)
          'Other Income',
          'Other Expense'
        ];

        return cashFlowCategories.includes(entry.category);
      });

      // Clean the entries to ensure consistent data format
      const cleanedEntries = cashFlowEntries.map((entry: any) => {
        const cleanedEntry = {
          id: entry.id,
          date: entry.date,
          time: entry.time,
          type: entry.type,
          category: entry.category,
          description: entry.description,
          amount: entry.amount,
          reference_id: entry.reference_id,
          reference_type: entry.reference_type,
          customer_id: entry.customer_id,
          customer_name: entry.customer_name,
          payment_method: entry.payment_method,
          payment_channel_id: entry.payment_channel_id,
          payment_channel_name: entry.payment_channel_name,
          notes: entry.notes,
          bill_number: entry.bill_number,
          is_manual: Boolean(entry.is_manual),
          created_at: entry.created_at,
          updated_at: entry.updated_at
        };

        return cleanedEntry;
      });

      systemEntries.push(...cleanedEntries);

      console.log(`✅ [DailyLedger] Total centralized system entries: ${systemEntries.length}`);
      console.log(`� [DailyLedger] Vendor payments: ${systemEntries.filter(e => e.category === 'Vendor Payment').length}`);
      console.log(`� [DailyLedger] Ledger entries: ${cleanedEntries.length}`);

      return systemEntries;

    } catch (error) {
      console.error('❌ [DailyLedger] Error loading entries from daily_ledger table:', error);
      return [];
    }
  };

  // PROPER: Calculate cumulative opening balance with support for initial opening balance
  const getOpeningBalance = async (date: string): Promise<number> => {
    try {
      // Get all entries before the current date to calculate cumulative balance
      const allPreviousEntries = await db.executeRawQuery(
        'SELECT * FROM ledger_entries WHERE date < ? ORDER BY date ASC, time ASC',
        [date]
      );

      if (allPreviousEntries && allPreviousEntries.length > 0) {
        // Check if user has set an initial opening balance
        const initialBalance = await db.getInitialOpeningBalance();
        let cumulativeBalance = initialBalance.amount; // Start with initial opening balance

        allPreviousEntries.forEach((e: any) => {
          if (e.type === "incoming") {
            cumulativeBalance += e.amount;
          }
          if (e.type === "outgoing") {
            cumulativeBalance -= e.amount;
          }
        });

        console.log(`📊 [DailyLedger] Cumulative balance before ${date}: Rs. ${cumulativeBalance} (initial: Rs. ${initialBalance.amount} + ${allPreviousEntries.length} previous entries)`);
        return cumulativeBalance;
      }

      // If no previous entries, check if user has set an initial opening balance
      const initialBalance = await db.getInitialOpeningBalance();
      if (initialBalance.amount > 0) {
        console.log(`📊 [DailyLedger] Using initial opening balance: Rs. ${initialBalance.amount} (set on ${initialBalance.date})`);
        return initialBalance.amount;
      }

      // If no previous entries and no initial balance, start with 0
      console.log(`📊 [DailyLedger] No previous entries or initial balance, starting with 0`);
      return 0;
    } catch (error) {
      console.error('❌ [DailyLedger] Error calculating cumulative opening balance:', error);
      return 0; // Safe fallback
    }
  };

  // BULLETPROOF: Simple summary calculation with proper opening balance
  const calculateSummary = async (dayEntries: LedgerEntry[], date: string): Promise<DailySummary> => {
    const openingBalance = await getOpeningBalance(date);
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

  // Check if user needs to set initial opening balance
  const checkFirstTimeUser = async () => {
    try {
      const isFirstTime = await db.isFirstTimeUser();
      const initialBalance = await db.getInitialOpeningBalance();

      // Show setup if no transactions and no initial balance set
      if (isFirstTime && initialBalance.amount === 0) {
        setIsFirstTimeUser(true);
        setShowOpeningBalanceSetup(true);
      }
    } catch (error) {
      console.error('Error checking first-time user status:', error);
    }
  };

  // Set initial opening balance
  const handleSetInitialBalance = async () => {
    try {
      if (initialOpeningBalance < 0) {
        toast.error('Opening balance cannot be negative');
        return;
      }

      await db.setInitialOpeningBalance(initialOpeningBalance, selectedDate);
      toast.success(`Initial opening balance set to Rs. ${initialOpeningBalance.toFixed(2)}`);

      setShowOpeningBalanceSetup(false);
      setIsFirstTimeUser(false);

      // Refresh the data to show updated balances
      loadDayData(selectedDate);
    } catch (error) {
      console.error('Error setting initial opening balance:', error);
      toast.error('Failed to set initial opening balance');
    }
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
      if (!newTransaction.description || newTransaction.amount <= 0) {
        toast.error('Please fill all required fields (description and amount)');
        return;
      }

      // 🚨 CRITICAL: Financial security validation
      const MAX_TRANSACTION_AMOUNT = 10000000; // Rs. 1 Crore limit
      const MAX_DAILY_TOTAL = 50000000; // Rs. 5 Crore daily limit

      if (newTransaction.amount > MAX_TRANSACTION_AMOUNT) {
        toast.error(`Transaction amount exceeds maximum limit of ${formatCurrency(MAX_TRANSACTION_AMOUNT)}`);
        return;
      }

      // Check daily total limit (existing transactions + new transaction)
      // FIXED: Separate incoming and outgoing validation
      const dayIncoming = entries.filter(e => e.type === 'incoming').reduce((sum, entry) => sum + entry.amount, 0);
      const dayOutgoing = entries.filter(e => e.type === 'outgoing').reduce((sum, entry) => sum + entry.amount, 0);

      if (newTransaction.type === 'incoming') {
        if (dayIncoming + newTransaction.amount > MAX_DAILY_TOTAL) {
          toast.error(`Daily incoming total would exceed limit of ${formatCurrency(MAX_DAILY_TOTAL)} (Current: ${formatCurrency(dayIncoming)})`);
          return;
        }
      } else {
        if (dayOutgoing + newTransaction.amount > MAX_DAILY_TOTAL) {
          toast.error(`Daily outgoing total would exceed limit of ${formatCurrency(MAX_DAILY_TOTAL)} (Current: ${formatCurrency(dayOutgoing)})`);
          return;
        }
      }

      // Auto-determine category
      const autoCategory = getAutoCategory(newTransaction);

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
            payment_type: (autoCategory.toLowerCase().includes('advance') ? 'advance_payment' : 'bill_payment') as 'bill_payment' | 'advance_payment',
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
        (autoCategory.toLowerCase().includes('vendor') ||
          autoCategory.toLowerCase().includes('supplier'))) {
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
        (autoCategory.toLowerCase().includes('salary') ||
          autoCategory.toLowerCase().includes('staff'))) {
        try {
          console.log('🔄 [DailyLedger] Processing staff salary with full integration...');

          const salaryPayment = {
            date: newTransaction.date,
            time: formatTime(now),
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
              time: formatTime(now),
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
              category: autoCategory,
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
              time: formatTime(now),
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
              category: autoCategory,
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
          category: autoCategory
        });
        console.log('✅ [DailyLedger] Real-time update events emitted');
      } catch (eventError) {
        console.warn('⚠️ [DailyLedger] Event emission failed:', eventError);
      }

      // PHASE 6: Reset Form and Reload Data
      setNewTransaction({
        date: newTransaction.date,
        type: 'incoming',
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

      // Immediately refresh entries to show the new manual entry
      console.log('🔄 [DailyLedger] Refreshing entries after manual transaction creation...');

      // Small delay to ensure database transaction is committed
      setTimeout(async () => {
        await loadDayData(newTransaction.date);
      }, 100);

      // Log activity using the correct method


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

  const saveEdit = async () => {
    try {
      // PERMANENT SOLUTION: Update entry in database directly
      const entryToUpdate = entries.find(e => e.id === editingEntry);
      if (!entryToUpdate) {
        toast.error('Entry not found');
        return;
      }

      // Update the entry in database
      await db.executeRawQuery(
        `UPDATE ledger_entries 
         SET description = ?, amount = ?, category = ?, payment_method = ?, 
             payment_channel_name = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND is_manual = 1`,
        [
          editForm.description,
          editForm.amount,
          editForm.category,
          editForm.payment_method,
          editForm.payment_channel_name,
          editForm.notes,
          editingEntry
        ]
      );

      setEditingEntry(null);
      setEditForm({});
      toast.success('Transaction updated successfully');

      // Reload data to reflect changes
      await loadDayData(selectedDate);
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error('Failed to update transaction');
    }
  };

  const deleteEntry = async (entryId: string) => {
    try {
      const entry = entries.find(e => e.id === entryId);
      if (!entry?.is_manual) {
        toast.error('System generated entries cannot be deleted');
        return;
      }

      try {
        const confirmed = await ask('Are you sure you want to delete this transaction?\n\nThis action cannot be undone.', {
          title: 'Confirm Transaction Deletion'
        });

        if (!confirmed) return;
      } catch (error) {
        // Fallback to regular confirm if Tauri dialog fails
        if (!confirm('Are you sure you want to delete this transaction?')) return;
      }

      // PERMANENT SOLUTION: Delete entry from database directly
      await db.executeRawQuery(
        `DELETE FROM ledger_entries WHERE id = ? AND is_manual = 1`,
        [entryId]
      );

      toast.success('Transaction deleted successfully');

      // Reload data to reflect changes
      await loadDayData(selectedDate);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Failed to delete transaction');
    }
  };

  // FIXED: Proper navigation with existing routes

  const changeDate = (direction: 'prev' | 'next') => {
    const currentDate = new Date(selectedDate);
    if (direction === 'prev') {
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      currentDate.setDate(currentDate.getDate() + 1);
    }
    setSelectedDate(formatDateForDatabase(currentDate));
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


      toast.success('Data exported successfully');
    } catch (error) {
      console.error('Failed to export daily ledger:', error);
      toast.error('Failed to export data');
    }
  };

  // Enhanced filter entries - now includes bill number search - USING MEMOIZED VERSION
  // const filteredEntries is now defined above with useMemo for performance
  const incomingEntries = incomingTransactions;
  const outgoingEntries = outgoingTransactions;

  const formatCurrency = (amount: number | undefined | null): string => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return 'Rs. 0.00';
    }
    return `Rs. ${amount.toLocaleString('en-PK')}`;
  };

  // Use centralized date formatting for display
  const formatDateDisplay = (dateString: string): string => {
    const date = new Date(dateString);
    const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
    return `${weekday}, ${formatDate(date)}`;
  };

  // Auto-determine category based on transaction type and context
  const getAutoCategory = (transaction: TransactionForm): string => {
    if (transaction.type === 'incoming') {
      if (transaction.customer_id) {
        return 'Payment Received';
      } else {
        return 'Other Income';
      }
    } else {
      // For outgoing transactions, try to determine from description
      const desc = transaction.description.toLowerCase();
      if (desc.includes('salary') || desc.includes('staff')) {
        return 'Staff Salary';
      } else if (desc.includes('rent')) {
        return 'Office Rent';
      } else if (desc.includes('utilities') || desc.includes('bill')) {
        return 'Utilities Bill';
      } else if (desc.includes('vendor') || desc.includes('supplier')) {
        return 'Vendor Payment';
      } else {
        return 'Other Expense';
      }
    }
  };

  // Transaction Row Component for reusability
  // Helper function to get clean display text for table rows
  const getCleanDisplayText = (entry: LedgerEntry) => {
    let primaryText = '';

    // Clean customer name (remove prefixes)
    const cleanCustomerName = entry.customer_name
      ?.replace(/^(Guest:|Vendor:|Staff:)\s*/i, '')
      ?.replace(/\s*\(Guest\)$/, '')
      ?.trim();

    switch (entry.category) {
      case 'Cash Refund':
      case 'refunds':
      case 'Return Refund':
        // CLEAR FORMAT: "Cash Refund - [Customer Name] - Invoice [Number]"
        let refundText = 'Cash Refund';

        if (cleanCustomerName) {
          refundText += ` - ${cleanCustomerName}`;
        }

        // Add invoice reference if available (reference_id is the invoice ID)
        if (entry.reference_id) {
          refundText += ` - Invoice I${entry.reference_id}`;
        } else if (entry.bill_number) {
          refundText += ` - ${entry.bill_number}`;
        }

        primaryText = refundText;
        break;

      case 'Customer Payment':
      case 'Payment Received':
      case 'Invoice Payment':
      case 'Advance Payment':
        // CONSISTENT FORMAT: "Payment - Invoice [Number] - [Customer Name]"
        let paymentText = 'Payment';

        // Add invoice number if available
        if (entry.bill_number) {
          paymentText += ` - ${formatInvoiceNumber(entry.bill_number)}`;
        }

        // Add customer name
        if (cleanCustomerName) {
          paymentText += ` - ${cleanCustomerName}`;
          // Add (Guest) suffix if it's a guest customer
          if (entry.description && entry.description.includes('(Guest)')) {
            paymentText += ' (Guest)';
          }
        } else if (entry.description) {
          // Try to extract customer name from description
          const invoiceMatch = entry.description.match(/Invoice\s*[I\d]+\s*-\s*(.+?)(?:\s*\(Guest\))?$/i);
          if (invoiceMatch && invoiceMatch[1]) {
            paymentText += ` - ${invoiceMatch[1].trim()}`;
            if (entry.description.includes('(Guest)')) {
              paymentText += ' (Guest)';
            }
          } else {
            // Fallback to description but still maintain Payment prefix
            const cleanDesc = entry.description
              .replace(/^Payment\s*-?\s*/i, '')
              .replace(/^Invoice\s+[I\d]+\s*-\s*/i, '')
              .trim();
            if (cleanDesc) {
              paymentText += ` - ${cleanDesc}`;
            }
          }
        }

        primaryText = paymentText;
        break;

      case 'Vendor Payment':
        // Extract vendor name from customer_name or description
        let vendorName = cleanCustomerName || 'Unknown Vendor';
        if (vendorName.startsWith('Vendor: ')) {
          vendorName = vendorName.replace('Vendor: ', '');
        }

        // Extract stock receiving number from notes
        let stockReceivingNumber = '';
        if (entry.notes) {
          const receivingMatch = entry.notes.match(/Stock Receiving\s+(S\d+)/i);
          if (receivingMatch) {
            stockReceivingNumber = receivingMatch[1]; // Get "S01"
          }
        }

        primaryText = stockReceivingNumber
          ? `${vendorName} - ${stockReceivingNumber}`
          : vendorName;
        break;

      case 'Staff Salary':
      case 'Salary Payment':
        primaryText = cleanCustomerName || entry.description || 'Staff Salary';
        break;

      default:
        // For other categories, prefer customer name over generic description
        primaryText = cleanCustomerName || entry.description || entry.category;
    }

    return { primaryText };
  };
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Initial Opening Balance Setup Modal */}
      {showOpeningBalanceSetup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 relative">
            {/* Close button */}
            <button
              onClick={() => setShowOpeningBalanceSetup(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-blue-100 p-2 rounded-full">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Welcome! Set Your Opening Balance
                </h3>
                <p className="text-sm text-gray-600">
                  This appears to be your first time using the ledger
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-700 mb-3">
                  If your business had a previous cash/bank balance before using this software,
                  please enter it below. Otherwise, leave it as 0 to start fresh.
                </p>

                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Initial Opening Balance (Rs.)
                </label>
                <input
                  type="number"
                  value={initialOpeningBalance}
                  onChange={(e) => setInitialOpeningBalance(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter amount (e.g., 50000)"
                  min="0"
                  step="0.01"
                />

                <p className="text-xs text-gray-500 mt-1">
                  This will be your starting balance for {formatDate(selectedDate)}
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleSetInitialBalance}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Set Opening Balance
                </button>
                <button
                  onClick={() => {
                    setInitialOpeningBalance(0);
                    handleSetInitialBalance();
                  }}
                  className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Start with 0
                </button>
              </div>

              <div className="text-center">
                <button
                  onClick={() => setShowOpeningBalanceSetup(false)}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Skip for now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily Ledger</h1>
          <p className="text-gray-600">{formatDateDisplay(selectedDate)}</p>
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
              disabled={selectedDate >= getSystemDateForInput()}
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
            onClick={() => setShowOpeningBalanceSetup(true)}
            className="p-2 border rounded-lg hover:bg-gray-100"
            title="Set Opening Balance"
          >
            <BarChart3 className="h-4 w-4" />
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
              className={`p-2 text-left border rounded text-sm hover:bg-gray-50 ${!selectedCustomerId ? 'bg-blue-50 border-blue-300' : ''
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
                className={`p-2 text-left border rounded text-sm hover:bg-gray-50 ${selectedCustomerId === customer.id ? 'bg-blue-50 border-blue-300' : ''
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
                  className={`flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${selectedPaymentChannels.includes(channel.id) ? 'bg-green-50 border-green-300' : ''
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
              <p className={`text-xl font-bold ${summary.net_movement >= 0 ? 'text-green-600' : 'text-red-600'
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

      {/* Payment Channels Summary - Compact & Hideable */}
      {entries.length > 0 && (
        <div className="bg-white rounded-lg border">
          <button
            onClick={() => setShowPaymentChannelsSummary(!showPaymentChannelsSummary)}
            className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-700">Payment Channels</span>
            <div className="flex items-center text-xs text-gray-500">
              <span className="mr-2">
                {(() => {
                  const channelCount = new Set(entries.map(e => e.payment_channel_name || e.payment_method || 'Other')).size;
                  return `${channelCount} channels`;
                })()}
              </span>
              <svg
                className={`w-4 h-4 transition-transform ${showPaymentChannelsSummary ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {showPaymentChannelsSummary && (
            <div className="px-3 pb-3">
              <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {(() => {
                  const channelSummary = new Map<string, { incoming: number; outgoing: number; name: string }>();

                  // Process entries to calculate totals per channel
                  entries.forEach(entry => {
                    const channelName = entry.payment_channel_name || entry.payment_method || 'Other';
                    if (!channelSummary.has(channelName)) {
                      channelSummary.set(channelName, { incoming: 0, outgoing: 0, name: channelName });
                    }

                    const channel = channelSummary.get(channelName)!;
                    if (entry.type === 'incoming') {
                      channel.incoming += entry.amount;
                    } else {
                      channel.outgoing += entry.amount;
                    }
                  });

                  // Convert to array and filter out channels with no activity
                  return Array.from(channelSummary.values())
                    .filter(channel => channel.incoming > 0 || channel.outgoing > 0)
                    .sort((a, b) => (b.incoming - b.outgoing) - (a.incoming - a.outgoing))
                    .map(channel => {
                      const netAmount = channel.incoming - channel.outgoing;
                      return (
                        <div key={channel.name} className="text-center p-2 bg-gray-50 rounded text-xs">
                          <p className="text-gray-600 mb-1 truncate font-medium" title={channel.name}>
                            {channel.name.length > 8 ? channel.name.substring(0, 8) + '...' : channel.name}
                          </p>
                          {/* Show both inflow and outflow in compact format */}
                          <div className="space-y-1">
                            {channel.incoming > 0 && (
                              <p className="text-green-600 font-bold text-sm">
                                {channel.incoming.toLocaleString()}
                              </p>
                            )}
                            {channel.outgoing > 0 && (
                              <p className="text-red-600 font-bold text-sm">
                                {channel.outgoing.toLocaleString()}
                              </p>
                            )}
                            {/* Net amount as small subtitle */}
                            {(channel.incoming > 0 && channel.outgoing > 0) && (
                              <p className={`text-xs ${netAmount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                Net: {netAmount >= 0 ? '+' : ''}{netAmount.toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    });
                })()}
              </div>
            </div>
          )}
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

      {/* Transactions - Clean Minimalistic Design */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Incoming Transactions Table */}
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="p-4 border-b bg-green-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
                  <h3 className="font-semibold text-green-900">Incoming ({incomingEntries.length})</h3>
                </div>
                <span className="text-lg font-bold text-green-600">
                  {formatCurrency(incomingEntries.reduce((sum, e) => sum + e.amount, 0))}
                </span>
              </div>
            </div>

            {incomingEntries.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-700 text-xs">Time</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700 text-xs">Description</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-700 text-xs">Amount</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-700 text-xs">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {incomingEntries.map((entry) => {
                      const { primaryText } = getCleanDisplayText(entry);

                      return (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-600 text-xs">{entry.time}</td>
                          <td className="px-3 py-2">
                            <div className="text-gray-900 font-medium text-sm">{primaryText}</div>
                            <div className="text-xs text-gray-500">
                              {entry.payment_channel_name || entry.payment_method || 'Cash'}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="font-bold text-green-600 text-sm">
                              +{formatCurrency(entry.amount)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            {entry.is_manual ? (
                              <div className="flex items-center justify-center space-x-1">
                                <button
                                  onClick={() => startEdit(entry)}
                                  className="text-blue-600 hover:text-blue-800 p-1"
                                  title="Edit Transaction"
                                >
                                  <Edit className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => deleteEntry(entry.id)}
                                  className="text-red-600 hover:text-red-800 p-1"
                                  title="Delete Transaction"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">System</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                <TrendingUp className="h-6 w-6 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No incoming transactions</p>
              </div>
            )}
          </div>

          {/* Outgoing Transactions Table */}
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="p-4 border-b bg-red-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <TrendingDown className="h-5 w-5 text-red-600 mr-2" />
                  <h3 className="font-semibold text-red-900">Outgoing ({outgoingEntries.length})</h3>
                </div>
                <span className="text-lg font-bold text-red-600">
                  {formatCurrency(outgoingEntries.reduce((sum, e) => sum + e.amount, 0))}
                </span>
              </div>
            </div>

            {outgoingEntries.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-700 text-xs">Time</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700 text-xs">Description</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-700 text-xs">Amount</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-700 text-xs">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {outgoingEntries.map((entry) => {
                      const { primaryText } = getCleanDisplayText(entry);
                      return (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-600 text-xs">{entry.time}</td>
                          <td className="px-3 py-2">
                            <div className="text-gray-900 font-medium text-sm">{primaryText}</div>
                            <div className="text-xs text-gray-500">
                              {entry.payment_channel_name || entry.payment_method || 'Cash'}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="font-bold text-red-600 text-sm">
                              -{formatCurrency(entry.amount)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            {entry.is_manual ? (
                              <div className="flex items-center justify-center space-x-1">
                                <button
                                  onClick={() => startEdit(entry)}
                                  className="text-blue-600 hover:text-blue-800 p-1"
                                  title="Edit Transaction"
                                >
                                  <Edit className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => deleteEntry(entry.id)}
                                  className="text-red-600 hover:text-red-800 p-1"
                                  title="Delete Transaction"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">System</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                <TrendingDown className="h-6 w-6 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No outgoing transactions</p>
              </div>
            )}
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
                  className={`p-3 rounded-lg border-2 transition-all ${newTransaction.type === 'incoming'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <TrendingUp className="h-5 w-5 mx-auto mb-1" />
                  <span className="text-sm font-medium">Incoming</span>
                </button>

                <button
                  onClick={() => setNewTransaction(prev => ({ ...prev, type: 'outgoing' }))}
                  className={`p-3 rounded-lg border-2 transition-all ${newTransaction.type === 'outgoing'
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

              {/* Category field removed for simplicity - auto-determined based on transaction type and description */}

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
                  value={newTransaction.amount || ''}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, amount: e.target.value === '' ? 0 : parseCurrency(e.target.value) }))}
                  onWheel={(e) => e.currentTarget.blur()}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter amount"
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
                  {newTransaction.customer_id && newTransaction.type === 'incoming' && (
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
                disabled={!newTransaction.description || newTransaction.amount <= 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Transaction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {editingEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white">
              <h3 className="text-lg font-semibold">Edit Transaction</h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={editForm.category || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {(editForm.type === 'incoming' ? INCOMING_CATEGORIES : OUTGOING_CATEGORIES).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Transaction description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  value={editForm.amount || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, amount: e.target.value === '' ? 0 : parseCurrency(e.target.value) }))}
                  onWheel={(e) => e.currentTarget.blur()}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter amount"
                  step="0.01"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  value={editForm.payment_method || ''}
                  onChange={(e) => {
                    const selectedChannel = paymentChannels.find(c => c.name === e.target.value);
                    setEditForm(prev => ({
                      ...prev,
                      payment_method: selectedChannel ? selectedChannel.name : e.target.value,
                      payment_channel_name: selectedChannel ? selectedChannel.name : e.target.value
                    }));
                  }}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {paymentChannels.map(channel => (
                    <option key={channel.id} value={channel.name}>{channel.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={editForm.notes || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Additional notes or reference information"
                />
              </div>

              <div className="bg-yellow-50 p-3 rounded-lg">
                <p className="text-xs text-yellow-800">
                  <strong>Note:</strong> Only manual entries can be edited. System-generated entries from invoices and payments cannot be modified.
                </p>
              </div>
            </div>

            <div className="p-6 border-t flex justify-end space-x-3 sticky bottom-0 bg-white">
              <button
                onClick={() => {
                  setEditingEntry(null);
                  setEditForm({});
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={!editForm.description || !editForm.amount || editForm.amount <= 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Balance Transfer Info */}
      {summary && selectedDate !== getSystemDateForInput() && (
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

export default function DailyLedgerWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <DailyLedger />
    </ErrorBoundary>
  );
}