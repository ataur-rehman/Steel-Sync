import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../../services/database';
import toast from 'react-hot-toast';
import { formatCustomerCode, formatInvoiceNumber } from '../../utils/numberFormatting';
import { useDebounce } from '../../hooks/useDebounce';
import { useSmartNavigation } from '../../hooks/useSmartNavigation';
import { formatDateForDatabase } from '../../utils/formatters';
import { eventBus, BUSINESS_EVENTS } from '../../utils/eventBus';

// 🚀 PERFORMANCE: Performance measurement utilities
const PERFORMANCE_KEY = 'customerLedger_performance';

interface PerformanceMetrics {
    renderTime: number;
    dataLoadTime: number;
    filterTime: number;
    totalTime: number;
    transactionCount: number;
    timestamp: number;
}

const logPerformance = (metrics: PerformanceMetrics) => {
    console.log(`⚡ [CUSTOMER_LEDGER_PERF] Render: ${metrics.renderTime}ms | Load: ${metrics.dataLoadTime}ms | Filter: ${metrics.filterTime}ms | Total: ${metrics.totalTime}ms | Records: ${metrics.transactionCount}`);

    // Store in sessionStorage for comparison
    const stored = sessionStorage.getItem(PERFORMANCE_KEY);
    const history = stored ? JSON.parse(stored) : [];
    history.push(metrics);

    // Keep only last 10 measurements
    if (history.length > 10) {
        history.shift();
    }

    sessionStorage.setItem(PERFORMANCE_KEY, JSON.stringify(history));
};
import {
    FileText,
    Receipt,
    Search,
    X,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';

// Interfaces
interface Customer {
    id: number;
    name: string;
    customer_code?: string;
    phone?: string;
    address?: string;
    cnic?: string;
    total_balance: number;
    created_at: string;
    updated_at: string;
}

interface CustomerTransaction {
    id: string;
    date: string;
    time?: string;
    type: 'invoice' | 'payment' | 'adjustment';
    description: string;
    invoice_amount?: number;
    payment_amount?: number;
    adjustment_amount?: number;
    debit_amount?: number;
    credit_amount?: number;
    reference_number?: string;
    payment_method?: string;
    notes?: string;
    _runningBalance: number;
}

interface PaymentEntry {
    customer_id: number;
    amount: number;
    payment_method: 'cash' | 'bank' | 'check' | 'card';
    reference: string;
    notes: string;
    date: string;
}

export default function CustomerLedgerViewer() {
    const params = useParams();
    const navigate = useNavigate();
    useSmartNavigation();

    // 🚀 PERFORMANCE: Performance measurement refs
    const renderStartTime = useRef<number>(Date.now());
    const dataLoadStartTime = useRef<number>(0);
    const filterStartTime = useRef<number>(0);

    // Format currency function
    const formatCurrency = useCallback((amount: number | undefined | null): string => {
        const safeAmount = amount ?? 0;
        return `Rs. ${safeAmount.toFixed(2)}`;
    }, []);

    // Core state - only what's needed for ledger viewing
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [customerTransactions, setCustomerTransactions] = useState<CustomerTransaction[]>([]);
    const [customerAccountSummary, setCustomerAccountSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showAddPayment, setShowAddPayment] = useState(false);

    // 🚀 PERFORMANCE: Pagination for 10k+ entries
    const [currentPage, setCurrentPage] = useState(1);
    const [totalTransactions, setTotalTransactions] = useState(0);
    const [itemsPerPage] = useState(50); // Optimized page size

    // 🚀 PERFORMANCE: Virtual scrolling refs
    const containerRef = useRef<HTMLDivElement>(null);
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });

    // 🚀 PERFORMANCE: Performance monitoring
    const [performanceMetrics, setPerformanceMetrics] = useState({
        lastLoadTime: 0,
        transactionCount: 0,
        filterTime: 0
    });

    // Filters for transactions
    const [filters, setFilters] = useState({
        from_date: '',
        to_date: '',
        type: '',
        search: ''
    });

    // Search functionality - stable implementation
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 300); // Reduced debounce for better UX

    // Simple search handler
    const handleSearch = useCallback((value: string) => {
        console.log('🔍 Search handler called with:', value);
        setSearchQuery(value);
    }, []);

    // 🚀 PERFORMANCE: Optimized transaction filtering with early returns and memoization
    const filteredTransactions = useMemo(() => {
        // 🚀 PERFORMANCE: Start timing filter operation
        filterStartTime.current = Date.now();

        console.log('🔍 Filtering transactions:', {
            totalTransactions: customerTransactions.length,
            searchQuery: searchQuery,
            debouncedSearchQuery: debouncedSearchQuery,
            filters: filters
        });

        // Early return for empty dataset
        if (customerTransactions.length === 0) {
            return [];
        }

        let filtered = customerTransactions;

        // 🚀 PERFORMANCE: Apply most selective filters first

        // Apply search filter first (most selective) - optimized with pre-compiled search strings
        if (debouncedSearchQuery && debouncedSearchQuery.trim().length > 0) {
            const searchLower = debouncedSearchQuery.toLowerCase().trim();
            console.log('🔍 Applying search filter for:', searchLower);

            // 🚀 PERFORMANCE: Use more efficient filtering with optional chaining
            filtered = filtered.filter(tx => {
                // Optimized search text compilation
                const searchableItems = [
                    tx.description,
                    tx.reference_number,
                    tx.payment_method,
                    tx.notes,
                    tx.type
                ];

                // Check numeric fields efficiently
                if (tx.invoice_amount) searchableItems.push(tx.invoice_amount.toString());
                if (tx.payment_amount) searchableItems.push(tx.payment_amount.toString());
                if (tx.adjustment_amount) searchableItems.push(tx.adjustment_amount.toString());
                if (tx.debit_amount) searchableItems.push(tx.debit_amount.toString());
                if (tx.credit_amount) searchableItems.push(tx.credit_amount.toString());

                const searchText = searchableItems.filter(Boolean).join(' ').toLowerCase();
                return searchText.includes(searchLower);
            });
            console.log('🔍 After search filter:', filtered.length);
        }

        // Apply type filter (moderately selective)
        if (filters.type) {
            filtered = filtered.filter(tx => tx.type === filters.type);
            console.log('🔍 After type filter:', filtered.length);
        }

        // Apply date filters last (least selective for recent data)
        if (filters.from_date) {
            filtered = filtered.filter(tx => tx.date >= filters.from_date);
            console.log('🔍 After from_date filter:', filtered.length);
        }

        if (filters.to_date) {
            filtered = filtered.filter(tx => tx.date <= filters.to_date);
            console.log('🔍 After to_date filter:', filtered.length);
        }

        // 🚀 PERFORMANCE: Optimized sorting with cached date objects
        const sortedFiltered = filtered.map(tx => ({
            ...tx,
            _sortKey: new Date(tx.date + ' ' + (tx.time || '00:00:00')).getTime()
        })).sort((a, b) => b._sortKey - a._sortKey);

        // 🚀 CRITICAL: Recalculate running balance for filtered transactions efficiently
        const chronological = [...sortedFiltered].sort((a, b) => a._sortKey - b._sortKey);

        // Calculate correct running balance for filtered set
        let runningBalance = 0;
        const withCorrectBalance = chronological.map(tx => {
            const debitAmount = tx.debit_amount || tx.invoice_amount || 0;
            const creditAmount = tx.credit_amount || tx.payment_amount || 0;
            runningBalance += debitAmount - creditAmount;

            return {
                ...tx,
                _runningBalance: runningBalance
            };
        });

        // Return in display order (newest first) with correct running balances
        const finalFiltered = withCorrectBalance.reverse();

        // 🚀 PERFORMANCE: Log filter performance
        const filterTime = Date.now() - filterStartTime.current;
        console.log(`⚡ [FILTER_PERF] Filtered ${customerTransactions.length} → ${finalFiltered.length} transactions in ${filterTime}ms`);

        console.log('🔍 Final filtered and sorted transactions with recalculated balances:', finalFiltered.length);
        return finalFiltered;
    }, [customerTransactions, debouncedSearchQuery, filters.type, filters.from_date, filters.to_date]);

    // Payment form state
    const [newPayment, setNewPayment] = useState<PaymentEntry>({
        customer_id: 0,
        amount: 0,
        payment_method: 'cash',
        reference: '',
        notes: '',
        date: formatDateForDatabase()
    });

    const [selectedPaymentChannel] = useState<any>(null);
    const [customerInvoices, setCustomerInvoices] = useState<any[]>([]);
    const [selectedInvoice, setSelectedInvoice] = useState<number | null>(null);

    // Filter change handler
    const handleFilterChange = useCallback((key: string, value: string) => {
        setFilters(prev => {
            if (prev[key as keyof typeof prev] === value) {
                return prev;
            }
            return { ...prev, [key]: value };
        });
    }, []);

    // Load customer account summary
    const loadCustomerAccountSummary = useCallback(async (customerId: number) => {
        try {
            console.log('Loading customer account summary for ID:', customerId);
            const summary = await db.getCustomerAccountSummary(customerId);
            setCustomerAccountSummary(summary);
            console.log('Customer account summary loaded:', summary);
        } catch (error) {
            console.error('Failed to load customer account summary:', error);
            toast.error('Failed to load customer account details');
            setCustomerAccountSummary(null);
        }
    }, []);

    // Load customer data
    const loadCustomer = useCallback(async (customerId: number) => {
        try {
            // 🚀 PERFORMANCE: Start timing data load
            dataLoadStartTime.current = Date.now();
            setLoading(true);

            // Find customer from customers list
            const result = await db.getCustomersOptimized({
                search: '',
                limit: 50000,
                offset: 0,
                includeBalance: true
            });

            const customerData = result.customers.find((c: any) => c.id === customerId);
            if (customerData) {
                setCustomer(customerData);
                setNewPayment(prev => ({ ...prev, customer_id: customerId }));

                // 🚀 PERFORMANCE: Load related data in parallel
                await Promise.all([
                    loadCustomerLedger(customerId),
                    loadCustomerAccountSummary(customerId)
                ]);
            } else {
                toast.error('Customer not found');
                navigate('/customers');
            }
        } catch (error) {
            console.error('Failed to load customer:', error);
            toast.error('Failed to load customer data');
            navigate('/customers');
        } finally {
            setLoading(false);

            // 🚀 PERFORMANCE: Log total load time
            const totalLoadTime = Date.now() - dataLoadStartTime.current;
            console.log(`⚡ [CUSTOMER_LOAD_PERF] Customer data loaded in ${totalLoadTime}ms`);
        }
    }, [navigate, loadCustomerAccountSummary]);

    // Load payment channels
    const loadPaymentChannels = async () => {
        try {
            await db.getPaymentChannels();
        } catch (error) {
            console.error('Failed to load payment channels:', error);
        }
    };

    // Load customer ledger
    const loadCustomerLedger = async (customerId: number) => {
        if (!customerId) return;

        try {
            setLoading(true);
            const loadStartTime = performance.now();
            console.log('🚀 [CUSTOMER_LEDGER_PERF] Loading customer ledger for ID:', customerId);

            // 🚀 PERFORMANCE: Check cache first with stale-while-revalidate pattern
            const cacheKey = `customerLedger_${customerId}_${filters.from_date}_${filters.to_date}`;
            const cachedData = sessionStorage.getItem(cacheKey);
            const cacheExpiry = 300000; // 5 minutes cache duration

            if (cachedData) {
                try {
                    const parsed = JSON.parse(cachedData);
                    const cacheAge = Date.now() - parsed.timestamp;

                    // 🚀 STALE-WHILE-REVALIDATE: Show cached data immediately
                    if (cacheAge < cacheExpiry) {
                        console.log(`⚡ [CUSTOMER_LEDGER_PERF] Using cached data (${Math.round(cacheAge / 1000)}s old)`);
                        setCustomerTransactions(parsed.transactions);
                        setCustomerAccountSummary(parsed.summary);

                        // 🚀 PERFORMANCE: Set loading to false immediately for instant display
                        setLoading(false);

                        const cacheLoadTime = performance.now() - loadStartTime;
                        logPerformance({
                            renderTime: 0,
                            dataLoadTime: cacheLoadTime,
                            filterTime: 0,
                            totalTime: cacheLoadTime,
                            transactionCount: parsed.transactions.length,
                            timestamp: Date.now()
                        });

                        console.log(`⚡ [CUSTOMER_LEDGER_PERF] Cache load completed in ${cacheLoadTime.toFixed(2)}ms`);

                        // If cache is older than 1 minute, refresh in background
                        if (cacheAge > 60000) {
                            console.log('🔄 [CUSTOMER_LEDGER_PERF] Background refresh triggered for stale data');
                            // Continue to load fresh data but don't block UI
                        } else {
                            // Fresh enough, skip loading
                            return;
                        }
                    } else {
                        console.log(`📊 [CUSTOMER_LEDGER_PERF] Cache expired (${Math.round(cacheAge / 1000)}s old), loading fresh`);
                    }
                } catch (error) {
                    console.warn('Failed to parse customer ledger cache:', error);
                }
            } else {
                console.log('📊 [CUSTOMER_LEDGER_PERF] No cache found, loading fresh data');
            }

            // Create base filters for the API call
            const apiFilters = {
                from_date: filters.from_date,
                to_date: filters.to_date
            };

            const ledgerData = await db.getCustomerLedger(customerId, apiFilters);
            console.log('� Customer ledger loaded:', {
                transactionsCount: ledgerData.transactions?.length || 0,
                loadTime: `${(performance.now() - loadStartTime).toFixed(2)}ms`,
                firstFewTransactions: ledgerData.transactions?.slice(0, 3)?.map((tx: any) => ({
                    id: tx.id,
                    description: tx.description,
                    type: tx.type,
                    amount: tx.debit_amount || tx.credit_amount || tx.invoice_amount || tx.payment_amount
                }))
            });

            if (ledgerData.transactions) {
                // 🚀 PERFORMANCE: Optimized running balance calculation
                const balanceStartTime = performance.now();
                let runningBalance = 0;
                const processedTransactions = ledgerData.transactions.map((tx: any) => {
                    const debitAmount = tx.debit_amount || tx.invoice_amount || 0;
                    const creditAmount = tx.credit_amount || tx.payment_amount || 0;
                    runningBalance += debitAmount - creditAmount;

                    return {
                        ...tx,
                        _runningBalance: runningBalance
                    };
                });

                console.log(`🚀 Balance calculation: ${(performance.now() - balanceStartTime).toFixed(2)}ms for ${processedTransactions.length} transactions`);

                // 🚀 PERFORMANCE: Cache processed data
                sessionStorage.setItem(cacheKey, JSON.stringify({
                    transactions: processedTransactions,
                    timestamp: Date.now()
                }));

                setCustomerTransactions(processedTransactions);
                setTotalTransactions(processedTransactions.length);

                // Update performance metrics
                const totalLoadTime = performance.now() - loadStartTime;
                setPerformanceMetrics({
                    lastLoadTime: totalLoadTime,
                    transactionCount: processedTransactions.length,
                    filterTime: 0
                });

                // 🚀 PERFORMANCE: Log comprehensive performance data
                console.log(`⚡ [CUSTOMER_LEDGER_PERF] Fresh data load: ${totalLoadTime.toFixed(2)}ms for ${processedTransactions.length} transactions`);

                const perfHistory = JSON.parse(sessionStorage.getItem(PERFORMANCE_KEY) || '[]');
                perfHistory.push({
                    operation: 'ledger_load',
                    duration: totalLoadTime,
                    transactionCount: processedTransactions.length,
                    timestamp: Date.now(),
                    cached: false
                });
                if (perfHistory.length > 20) perfHistory.shift();
                sessionStorage.setItem(PERFORMANCE_KEY, JSON.stringify(perfHistory));
            } else {
                setCustomerTransactions([]);
                setTotalTransactions(0);
                setPerformanceMetrics({
                    lastLoadTime: performance.now() - loadStartTime,
                    transactionCount: 0,
                    filterTime: 0
                });
            }
        } catch (error) {
            console.error('Failed to load customer ledger:', error);
            toast.error('Failed to load customer ledger');
            setCustomerTransactions([]);
            setTotalTransactions(0);
        } finally {
            setLoading(false);
        }
    };

    // Load customer invoices for payment
    const loadCustomerInvoices = useCallback(async (customerId: number) => {
        try {
            const invoices = await db.getCustomerInvoices(customerId);
            setCustomerInvoices(invoices);
        } catch (error) {
            console.error('Failed to load customer invoices:', error);
            toast.error('Failed to load customer invoices');
        }
    }, []);

    // Handle payment for customer
    const handleSelectCustomerForPayment = useCallback(() => {
        if (customer) {
            setShowAddPayment(true);
            loadCustomerInvoices(customer.id);
        }
    }, [customer, loadCustomerInvoices]);

    // Handle navigate to new invoice
    const handleNavigateToNewInvoice = useCallback(() => {
        if (customer) {
            navigate('/billing/new', {
                state: {
                    customerId: customer.id,
                    customerName: customer.name,
                    navigationContext: {
                        source: 'customer_ledger',
                        customerId: customer.id,
                        customerName: customer.name
                    }
                }
            });
        }
    }, [customer, navigate]);

    // Load customer on mount
    useEffect(() => {
        const customerId = params.id ? parseInt(params.id) : null;
        if (customerId) {
            // 🚀 PERFORMANCE: Parallel data loading for faster initial load
            const loadStartTime = performance.now();
            dataLoadStartTime.current = loadStartTime;

            console.log('🚀 [CUSTOMER_LEDGER_PERF] Starting parallel data loading...');

            Promise.all([
                loadCustomer(customerId),
                loadPaymentChannels()
            ]).then(() => {
                const loadTime = performance.now() - loadStartTime;
                console.log(`⚡ [CUSTOMER_LEDGER_PERF] Parallel data loading completed in ${loadTime.toFixed(2)}ms`);

                // Store performance metric
                const perfHistory = JSON.parse(sessionStorage.getItem(PERFORMANCE_KEY) || '[]');
                perfHistory.push({
                    operation: 'initial_data_load',
                    duration: loadTime,
                    timestamp: Date.now()
                });
                if (perfHistory.length > 20) perfHistory.shift();
                sessionStorage.setItem(PERFORMANCE_KEY, JSON.stringify(perfHistory));
            }).catch(error => {
                console.error('❌ [CUSTOMER_LEDGER_PERF] Parallel data loading failed:', error);
            });
        } else {
            navigate('/customers');
        }
    }, [params.id, loadCustomer, navigate]);

    // 🚀 REAL-TIME: Event bus integration for live updates
    useEffect(() => {
        if (!customer) return;

        const handleLedgerUpdate = async (data: any) => {
            console.log('📡 Real-time ledger update received:', data);
            if (data.customerId === customer.id) {
                // Efficiently update only affected transactions
                await Promise.all([
                    loadCustomerLedger(customer.id),
                    loadCustomerAccountSummary(customer.id)
                ]);
            }
        };

        const handlePaymentUpdate = async (data: any) => {
            console.log('📡 Real-time payment update received:', data);
            if (data.customer_id === customer.id) {
                await Promise.all([
                    loadCustomerLedger(customer.id),
                    loadCustomerAccountSummary(customer.id)
                ]);
            }
        };

        const handleInvoiceUpdate = async (data: any) => {
            console.log('📡 Real-time invoice update received:', data);
            if (data.customer_id === customer.id) {
                await Promise.all([
                    loadCustomerLedger(customer.id),
                    loadCustomerAccountSummary(customer.id)
                ]);
            }
        };

        // Subscribe to relevant events
        eventBus.on(BUSINESS_EVENTS.CUSTOMER_LEDGER_UPDATED, handleLedgerUpdate);
        eventBus.on(BUSINESS_EVENTS.PAYMENT_RECORDED, handlePaymentUpdate);
        eventBus.on(BUSINESS_EVENTS.INVOICE_PAYMENT_RECEIVED, handlePaymentUpdate);
        eventBus.on(BUSINESS_EVENTS.INVOICE_CREATED, handleInvoiceUpdate);
        eventBus.on(BUSINESS_EVENTS.INVOICE_UPDATED, handleInvoiceUpdate);

        return () => {
            // Cleanup event listeners
            eventBus.off(BUSINESS_EVENTS.CUSTOMER_LEDGER_UPDATED, handleLedgerUpdate);
            eventBus.off(BUSINESS_EVENTS.PAYMENT_RECORDED, handlePaymentUpdate);
            eventBus.off(BUSINESS_EVENTS.INVOICE_PAYMENT_RECEIVED, handlePaymentUpdate);
            eventBus.off(BUSINESS_EVENTS.INVOICE_CREATED, handleInvoiceUpdate);
            eventBus.off(BUSINESS_EVENTS.INVOICE_UPDATED, handleInvoiceUpdate);
        };
    }, [customer, loadCustomerLedger, loadCustomerAccountSummary]);

    // 🚀 PERFORMANCE: Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchQuery, filters.type, filters.from_date, filters.to_date]);

    // 🚀 PERFORMANCE: Paginated and virtualized transaction display
    const paginatedTransactions = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredTransactions.slice(startIndex, endIndex);
    }, [filteredTransactions, currentPage, itemsPerPage]);

    // Calculate totals (optimized with memoization)
    const { totalDebits, totalCredits, adjustedBalance, availableCredit } = useMemo(() => {
        // 🚀 PERFORMANCE: Calculate totals only for filtered data, not all transactions
        const startTime = performance.now();

        const debits = filteredTransactions.reduce((sum, tx) =>
            sum + (tx.debit_amount || tx.invoice_amount || 0), 0);
        const credits = filteredTransactions.reduce((sum, tx) =>
            sum + (tx.credit_amount || tx.payment_amount || 0), 0);
        const balance = debits - credits;
        const credit = balance < 0 ? Math.abs(balance) : 0;

        const endTime = performance.now();
        console.log(`🚀 Balance calculation took ${endTime - startTime}ms for ${filteredTransactions.length} transactions`);

        return {
            totalDebits: debits,
            totalCredits: credits,
            adjustedBalance: balance,
            availableCredit: credit
        };
    }, [filteredTransactions]);

    // 🚀 PERFORMANCE: Virtual scrolling implementation  
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const scrollTop = container.scrollTop;
            const itemHeight = 80; // Estimated height per transaction row
            const containerHeight = container.clientHeight;

            const start = Math.floor(scrollTop / itemHeight);
            const end = Math.min(
                start + Math.ceil(containerHeight / itemHeight) + 5,
                filteredTransactions.length
            );

            setVisibleRange({ start, end });
        };

        container.addEventListener('scroll', handleScroll);
        handleScroll(); // Initial calculation

        return () => container.removeEventListener('scroll', handleScroll);
    }, [filteredTransactions.length]);

    // 🚀 PERFORMANCE: Pagination logic
    const totalPages = Math.ceil(totalTransactions / itemsPerPage);
    const hasNextPage = currentPage < totalPages;
    const hasPrevPage = currentPage > 1;

    // Handle payment submission
    const handlePaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!customer || newPayment.amount <= 0) {
            toast.error('Please enter a valid payment amount');
            return;
        }

        try {
            setLoading(true);

            const paymentData = {
                customer_id: customer.id,
                amount: newPayment.amount,
                payment_method: newPayment.payment_method,
                payment_channel_id: selectedPaymentChannel?.id || null,
                payment_channel_name: selectedPaymentChannel?.name || newPayment.payment_method,
                payment_type: 'bill_payment' as const,
                reference: newPayment.reference,
                notes: newPayment.notes,
                date: newPayment.date
            };

            await db.recordPayment(paymentData, selectedInvoice || undefined);

            const invoiceInfo = selectedInvoice ?
                ` (allocated to Invoice ${formatInvoiceNumber(customerInvoices.find(inv => inv.id === selectedInvoice)?.bill_number || '')})` : '';

            toast.success(`Payment of ${formatCurrency(newPayment.amount)} recorded for ${customer.name}${invoiceInfo}`);

            // Reload data
            await Promise.all([
                loadCustomerLedger(customer.id),
                loadCustomerAccountSummary(customer.id)
            ]);

            setShowAddPayment(false);
            setNewPayment({
                customer_id: customer.id,
                amount: 0,
                payment_method: 'cash',
                reference: '',
                notes: '',
                date: formatDateForDatabase()
            });
            setSelectedInvoice(null);

        } catch (error) {
            console.error('Failed to record payment:', error);
            toast.error('Failed to record payment');
        } finally {
            setLoading(false);
        }
    };

    // 🚀 PERFORMANCE: Track render timing
    useEffect(() => {
        renderStartTime.current = Date.now();
    });

    // 🚀 PERFORMANCE: Memoized transaction rows to prevent unnecessary re-renders
    const memoizedTransactionRows = useMemo(() => {
        return filteredTransactions.map((transaction, index) => {
            const isInvoice = transaction.type === 'invoice';
            const isPayment = transaction.type === 'payment';
            const isAdjustment = transaction.type === 'adjustment';

            const amount = transaction.debit_amount || transaction.invoice_amount ||
                transaction.credit_amount || transaction.payment_amount ||
                transaction.adjustment_amount || 0;

            return (
                <tr key={`${transaction.id}-${index}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm border-b border-gray-200">
                        {transaction.date}
                        {transaction.time && (
                            <div className="text-xs text-gray-500 mt-0.5">
                                {transaction.time}
                            </div>
                        )}
                    </td>
                    <td className="px-4 py-3 text-sm border-b border-gray-200">
                        <div className="flex items-center space-x-2">
                            {isInvoice && <Receipt className="h-4 w-4 text-blue-600" />}
                            {isPayment && <span className="w-4 h-4 bg-green-600 rounded-full flex items-center justify-center text-white text-xs">₨</span>}
                            {isAdjustment && <span className="w-4 h-4 bg-orange-600 rounded-full"></span>}
                            <div>
                                <div className="font-medium">{transaction.description}</div>
                                {transaction.reference_number && (
                                    <div className="text-xs text-gray-500">
                                        Ref: {transaction.reference_number}
                                    </div>
                                )}
                                {transaction.notes && (
                                    <div className="text-xs text-gray-500 mt-1">
                                        {transaction.notes}
                                    </div>
                                )}
                            </div>
                        </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-right border-b border-gray-200">
                        {(isInvoice || isAdjustment) && (
                            <span className="text-red-600 font-medium">
                                {formatCurrency(amount)}
                            </span>
                        )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right border-b border-gray-200">
                        {isPayment && (
                            <span className="text-green-600 font-medium">
                                {formatCurrency(amount)}
                            </span>
                        )}
                        {transaction.payment_method && (
                            <div className="text-xs text-gray-500 mt-0.5">
                                via {transaction.payment_method}
                            </div>
                        )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right border-b border-gray-200 font-semibold">
                        {formatCurrency(transaction._runningBalance)}
                    </td>
                </tr>
            );
        });
    }, [filteredTransactions, formatCurrency]);

    if (loading && !customer) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading customer ledger...</p>
                </div>
            </div>
        );
    }

    if (!customer) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <p className="text-gray-600">Customer not found</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => navigate('/customers')}
                            className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            <span>Back</span>
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{customer.name}</h1>
                            <p className="mt-1 text-sm text-gray-500">
                                Customer Account Details
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleNavigateToNewInvoice}
                            className="btn btn-secondary flex items-center px-3 py-1.5 text-sm"
                        >
                            <Receipt className="h-4 w-4 mr-2" />
                            New Invoice
                        </button>
                    </div>
                </div>

                {/* Customer Info Card - Enhanced */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left Column - Account Information */}
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 mb-4">Account Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs text-gray-500">Account</p>
                                        <p className="text-sm text-gray-900">{formatCustomerCode(customer?.customer_code || customer?.id.toString().padStart(6, '0') || '')}</p>
                                    </div>

                                    {customer?.phone && (
                                        <div>
                                            <p className="text-xs text-gray-500">Phone</p>
                                            <p className="text-sm text-gray-900">{customer.phone}</p>
                                        </div>
                                    )}

                                    {customer?.address && (
                                        <div>
                                            <p className="text-xs text-gray-500">Address</p>
                                            <p className="text-sm text-gray-900">{customer.address}</p>
                                        </div>
                                    )}

                                    <div>
                                        <p className="text-xs text-gray-500">Member Since</p>
                                        <p className="text-sm text-gray-900">{customerAccountSummary?.memberSince || 'N/A'}</p>
                                    </div>

                                    <div>
                                        <p className="text-xs text-gray-500">Days Overdue</p>
                                        <p className={`text-sm font-semibold ${customerAccountSummary && customerAccountSummary.outstandingAmount > 0
                                            ? customerAccountSummary.daysOverdue > 30 ? 'text-red-600' : 'text-orange-600'
                                            : 'text-green-600'
                                            }`}>
                                            {customerAccountSummary && customerAccountSummary.outstandingAmount > 0
                                                ? `${Math.floor(customerAccountSummary.daysOverdue)} days`
                                                : 'No overdue'
                                            }
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs text-gray-500">Total Invoices</p>
                                        <p className="text-lg font-semibold text-gray-900">{customerAccountSummary?.totalInvoicesCount || 0}</p>
                                    </div>

                                    <div>
                                        <p className="text-xs text-gray-500">Invoices Overdue</p>
                                        <p className={`text-sm font-semibold ${customerAccountSummary && customerAccountSummary.invoicesOverdueCount > 0
                                            ? 'text-red-600'
                                            : 'text-green-600'
                                            }`}>
                                            {customerAccountSummary?.invoicesOverdueCount || 0}
                                            {customerAccountSummary && customerAccountSummary.invoicesOverdueCount > 0 ? ' overdue' : ''}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs text-gray-500">Last Invoice</p>
                                        <p className="text-sm text-gray-900">{customerAccountSummary?.lastInvoiceDate || 'No invoices'}</p>
                                    </div>

                                    <div>
                                        <p className="text-xs text-gray-500">Last Payment</p>
                                        <p className="text-sm text-gray-900">{customerAccountSummary?.lastPaymentDate || 'No payments'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Financial Summary */}
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 mb-4">Financial Summary</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs text-gray-500">Total Invoiced</p>
                                        <p className="text-lg font-semibold text-blue-600">{formatCurrency(customerAccountSummary?.totalInvoicedAmount || 0)}</p>
                                    </div>

                                    <div>
                                        <p className="text-xs text-gray-500">Total Paid</p>
                                        <p className="text-lg font-semibold text-green-600">{formatCurrency(customerAccountSummary?.totalPaidAmount || 0)}</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs text-gray-500">Outstanding Balance</p>
                                        <div className={`text-xl font-bold ${customerAccountSummary && customerAccountSummary.outstandingAmount > 0
                                            ? 'text-red-600'
                                            : customerAccountSummary && customerAccountSummary.outstandingAmount < 0
                                                ? 'text-green-600'
                                                : 'text-gray-900'
                                            }`}>
                                            {formatCurrency(customerAccountSummary?.outstandingAmount || 0)}
                                            <span className="text-sm font-normal ml-2">
                                                {customerAccountSummary && customerAccountSummary.outstandingAmount > 0 ? 'Dr' :
                                                    customerAccountSummary && customerAccountSummary.outstandingAmount < 0 ? 'Cr' : ''}
                                            </span>
                                        </div>
                                        {customerAccountSummary && customerAccountSummary.outstandingAmount < 0 && (
                                            <div className="text-green-700 text-sm mt-1">
                                                Credit Available: {formatCurrency(Math.abs(customerAccountSummary.outstandingAmount))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>


                </div>

                {/* Filters Section */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                        <h2 className="text-lg font-semibold text-gray-900">Transaction History</h2>

                        <div className="flex flex-wrap items-center gap-3">
                            {/* Search Input */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        console.log('🔍 Input onChange called with:', e.target.value);
                                        handleSearch(e.target.value);
                                    }}
                                    onFocus={() => console.log('🔍 Search input focused')}
                                    onBlur={() => console.log('🔍 Search input blurred')}
                                    placeholder="Search transactions..."
                                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-64"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => handleSearch('')}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>

                            {/* Type Filter */}
                            <select
                                value={filters.type}
                                onChange={(e) => handleFilterChange('type', e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            >
                                <option value="">All Types</option>
                                <option value="invoice">Invoices</option>
                                <option value="payment">Payments</option>
                                <option value="adjustment">Adjustments</option>
                            </select>

                            {/* Date Filters */}
                            <input
                                type="date"
                                value={filters.from_date}
                                onChange={(e) => handleFilterChange('from_date', e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                placeholder="From Date"
                            />

                            <input
                                type="date"
                                value={filters.to_date}
                                onChange={(e) => handleFilterChange('to_date', e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                placeholder="To Date"
                            />

                            {/* Clear Filters */}
                            {(filters.type || filters.from_date || filters.to_date || searchQuery) && (
                                <button
                                    onClick={() => {
                                        setFilters({ from_date: '', to_date: '', type: '', search: '' });
                                        handleSearch('');
                                    }}
                                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                                >
                                    <X className="h-4 w-4 mr-1" />
                                    Clear Filters
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 🚀 PERFORMANCE: Pagination Info & Controls */}
                    {filteredTransactions.length > itemsPerPage && (
                        <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-t border-gray-200">
                            <div className="flex items-center text-sm text-gray-700">
                                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length} transactions
                            </div>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <span className="text-sm text-gray-700">
                                    Page {currentPage} of {Math.ceil(filteredTransactions.length / itemsPerPage)}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredTransactions.length / itemsPerPage), prev + 1))}
                                    disabled={currentPage >= Math.ceil(filteredTransactions.length / itemsPerPage)}
                                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Transaction Table */}
                    <div className="overflow-x-auto" ref={containerRef}>
                        {filteredTransactions.length > 0 ? (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {/* 🚀 PERFORMANCE: Optimized rendering for large datasets */}
                                    {filteredTransactions.length > 500
                                        ? filteredTransactions.slice(visibleRange.start, visibleRange.end).map((transaction, index) => (
                                            <tr key={`virtual-${transaction.id}-${visibleRange.start + index}`} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {new Date(transaction.date).toLocaleDateString()}
                                                    {transaction.time && (
                                                        <div className="text-xs text-gray-500">{transaction.time}</div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-900">
                                                    <div className="flex items-center">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mr-2 ${transaction.type === 'invoice' ? 'bg-blue-100 text-blue-800' :
                                                            transaction.type === 'payment' ? 'bg-green-100 text-green-800' :
                                                                'bg-yellow-100 text-yellow-800'
                                                            }`}>
                                                            {transaction.type}
                                                        </span>
                                                    </div>
                                                    <div className="font-medium">{transaction.description}</div>
                                                    {(() => {
                                                        const isPayment = transaction.type === 'payment';
                                                        const hasPaymentMethod = transaction.payment_method &&
                                                            ['cash', 'bank', 'check', 'card'].includes(transaction.payment_method.toLowerCase());

                                                        return isPayment && hasPaymentMethod;
                                                    })() && (
                                                            <div className="text-xs text-blue-600 mt-1 font-medium">
                                                                via {(transaction as any).payment_method}
                                                            </div>
                                                        )}
                                                    {transaction.notes && transaction.type !== 'payment' && (
                                                        <div className="text-xs text-gray-500 mt-1">{transaction.notes}</div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {transaction.reference_number || '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                                    {(transaction.debit_amount || transaction.invoice_amount) ? (
                                                        <span className="text-red-600 font-medium">
                                                            {(transaction.debit_amount ?? transaction.invoice_amount ?? 0).toLocaleString()}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                                    {(transaction.credit_amount || transaction.payment_amount) ? (
                                                        <span className="text-green-600 font-medium">
                                                            {(transaction.credit_amount ?? transaction.payment_amount ?? 0).toLocaleString()}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                                                    {transaction._runningBalance.toLocaleString()}
                                                </td>
                                            </tr>
                                        ))
                                        : /* Standard pagination for smaller datasets */
                                        paginatedTransactions.map((transaction, index) => (
                                            <tr key={`paginated-${transaction.id}-${index}`} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {new Date(transaction.date).toLocaleDateString()}
                                                    {transaction.time && (
                                                        <div className="text-xs text-gray-500">{transaction.time}</div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-900">
                                                    <div className="flex items-center">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mr-2 ${transaction.type === 'invoice' ? 'bg-blue-100 text-blue-800' :
                                                            transaction.type === 'payment' ? 'bg-green-100 text-green-800' :
                                                                'bg-yellow-100 text-yellow-800'
                                                            }`}>
                                                            {transaction.type}
                                                        </span>
                                                    </div>
                                                    <div className="font-medium">{transaction.description}</div>
                                                    {(() => {
                                                        const isPayment = transaction.type === 'payment';
                                                        const hasPaymentMethod = transaction.payment_method &&
                                                            transaction.payment_method !== 'account_deposit' &&
                                                            transaction.payment_method !== 'undefined';

                                                        return isPayment && hasPaymentMethod;
                                                    })() && (
                                                            <div className="text-xs text-blue-600 mt-1 font-medium">
                                                                via {(transaction as any).payment_method}
                                                            </div>
                                                        )}
                                                    {transaction.notes && transaction.type !== 'payment' && (
                                                        <div className="text-xs text-gray-500 mt-1">{transaction.notes}</div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {transaction.reference_number || '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                                    {(transaction.debit_amount || transaction.invoice_amount) ? (
                                                        <span className="text-red-600 font-medium">
                                                            {(transaction.debit_amount ?? transaction.invoice_amount ?? 0).toLocaleString()}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                                    {(transaction.credit_amount || transaction.payment_amount) ? (
                                                        <span className="text-green-600 font-medium">
                                                            {(transaction.credit_amount ?? transaction.payment_amount ?? 0).toLocaleString()}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                                                    {transaction._runningBalance.toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="text-center py-12">
                                <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
                                <p className="text-gray-500">
                                    {filters.type || filters.from_date || filters.to_date || searchQuery
                                        ? 'No transactions match your current filters. Try adjusting your search criteria.'
                                        : 'This customer has no transaction history yet.'
                                    }
                                </p>
                            </div>
                        )}
                    </div>

                    {/* 🚀 PERFORMANCE: Performance Metrics & Pagination Controls */}
                    {filteredTransactions.length > 0 && (
                        <div className="mt-4 bg-gray-50 rounded-lg p-4">
                            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                                {/* Performance Metrics */}
                                <div className="flex items-center space-x-6 text-sm text-gray-600">
                                    <span>📊 {filteredTransactions.length.toLocaleString()} transactions</span>
                                    {performanceMetrics.lastLoadTime > 0 && (
                                        <span>⚡ Loaded in {performanceMetrics.lastLoadTime.toFixed(1)}ms</span>
                                    )}
                                    {filteredTransactions.length > 500 && (
                                        <span className="text-blue-600">🚀 Virtual scrolling active</span>
                                    )}
                                </div>

                                {/* Pagination Controls */}
                                {filteredTransactions.length <= 500 && totalPages > 1 && (
                                    <div className="flex items-center space-x-4">
                                        <button
                                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                            disabled={!hasPrevPage}
                                            className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <ChevronLeft className="w-4 h-4 mr-1" />
                                            Previous
                                        </button>

                                        <span className="text-sm text-gray-700">
                                            Page {currentPage} of {totalPages}
                                        </span>

                                        <button
                                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                            disabled={!hasNextPage}
                                            className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Next
                                            <ChevronRight className="w-4 h-4 ml-1" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Balance Summary */}
                {filteredTransactions.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Balance Summary</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <div className="flex justify-between py-2 border-b border-gray-300">
                                    <span className="text-gray-700 font-medium">Starting Balance:</span>
                                    <span className="text-gray-900 font-bold">0</span>
                                </div>
                                <div className="flex justify-between py-2">
                                    <span className="text-gray-700 font-medium">Total Debits:</span>
                                    <span className="text-red-600 font-bold">{totalDebits.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between py-2">
                                    <span className="text-gray-700 font-medium">Total Credits:</span>
                                    <span className="text-green-600 font-bold">{totalCredits.toLocaleString()}</span>
                                </div>
                                {availableCredit > 0 && (
                                    <div className="flex justify-between py-2">
                                        <span className="text-green-700 font-medium">Available Credit:</span>
                                        <span className="text-green-700 font-bold">{availableCredit.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between py-3 bg-gray-50 px-4 rounded-lg border border-gray-200">
                                    <span className="text-lg font-bold text-gray-900">Adjusted Balance:</span>
                                    <span className={`text-2xl font-bold ${adjustedBalance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {Math.abs(adjustedBalance).toLocaleString()} {adjustedBalance >= 0 ? 'Dr' : 'Cr'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Add Payment Modal */}
            {showAddPayment && customer && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium text-gray-900">Add Payment for {customer.name}</h3>
                            <button
                                onClick={() => setShowAddPayment(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handlePaymentSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={newPayment.amount}
                                        onChange={(e) => setNewPayment(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                                    <select
                                        value={newPayment.payment_method}
                                        onChange={(e) => setNewPayment(prev => ({ ...prev, payment_method: e.target.value as any }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="bank">Bank Transfer</option>
                                        <option value="check">Check</option>
                                        <option value="card">Card</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                                    <input
                                        type="text"
                                        value={newPayment.reference}
                                        onChange={(e) => setNewPayment(prev => ({ ...prev, reference: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Reference number or note"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                    <input
                                        type="date"
                                        value={newPayment.date}
                                        onChange={(e) => setNewPayment(prev => ({ ...prev, date: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                <textarea
                                    value={newPayment.notes}
                                    onChange={(e) => setNewPayment(prev => ({ ...prev, notes: e.target.value }))}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Additional notes (optional)"
                                />
                            </div>

                            {/* Invoice Selection for Payment Allocation */}
                            {customerInvoices.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Allocate to Invoice (Optional)</label>
                                    <select
                                        value={selectedInvoice || ''}
                                        onChange={(e) => setSelectedInvoice(e.target.value ? parseInt(e.target.value) : null)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="">General Payment</option>
                                        {customerInvoices.map(invoice => (
                                            <option key={invoice.id} value={invoice.id}>
                                                Invoice #{formatInvoiceNumber(invoice.invoice_number)} - {formatCurrency(invoice.total_amount)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddPayment(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                >
                                    {loading ? 'Recording...' : 'Record Payment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
