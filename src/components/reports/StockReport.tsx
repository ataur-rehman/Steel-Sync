import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { db } from '../../services/database';
import toast from 'react-hot-toast';
import { formatUnitString, parseUnit, type UnitType } from '../../utils/unitUtils';
import { eventBus, BUSINESS_EVENTS } from '../../utils/eventBus';
import { useActivityLogger } from '../../hooks/useActivityLogger';
import { formatDate, formatDateForDatabase } from '../../utils/formatters';
import { getCurrentSystemDateTime, getRelativeDate } from '../../utils/systemDateTime';
import {
  Package,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Search,
  Eye,
  Edit,
  Plus,
  Minus,
  CheckCircle,
  XCircle,
  User,
  FileText,
  History,
  Activity,
  RefreshCw,
  BarChart3,
  Filter,
  Download,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';

// Enhanced interfaces for complete stock tracking
interface StockItem {
  id: number;
  name: string;
  category: string;
  unit: string; // Now stores the unit format like "1600-60"
  unit_type: UnitType; // Unit type like 'kg-grams', 'bag', 'piece'
  rate_per_unit: number;
  current_stock: string; // Now stores stock in unit format
  min_stock_alert: string; // Alert level in unit format
  stock_value: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  last_updated: string;
  movement_30_days?: number;
  avg_monthly_usage?: number;
  reorder_suggestion?: string; // Now in unit format
  size?: string;
  grade?: string;
}

interface StockMovement {
  id?: number;
  product_id: number;
  product_name: string;
  movement_type: 'in' | 'out' | 'adjustment' | 'transfer' | 'return' | 'waste' | 'damage';
  quantity: string; // Now in unit format
  previous_stock: string; // Now in unit format
  new_stock: string; // Now in unit format
  unit_type?: UnitType; // Unit type for proper formatting
  unit_price?: number;
  total_value?: number;
  reason: string;
  reference_type?: 'invoice' | 'adjustment' | 'initial' | 'purchase' | 'return' | 'receiving' | 'transfer' | 'waste';
  reference_id?: number;
  reference_number?: string;
  customer_id?: number;
  customer_name?: string;
  notes?: string;
  date: string;
  time: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

interface StockSummary {
  total_products: number;
  total_stock_value: number;
  in_stock_count: number;
  low_stock_count: number;
  out_of_stock_count: number;
  categories_count: number;
  movements_today: number;
  movements_this_week: number;
}

interface StockAdjustment {
  product_id: number;
  adjustment_type: 'increase' | 'decrease';
  quantity: string; // Now in unit format
  reason: string;
  notes?: string;
}

const ADJUSTMENT_REASONS = [
  'Physical count correction',
  'Damaged goods',
  'Expired items',
  'Theft/Loss',
  'Purchase receipt',
  'Return from customer',
  'Transfer in',
  'Transfer out',
  'Manufacturing adjustment',
  'Quality control rejection',
  'Other'
];

const StockReport: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const activityLogger = useActivityLogger();

  // State management
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [filteredItems, setFilteredItems] = useState<StockItem[]>([]);
  const [filteredMovements, setFilteredMovements] = useState<StockMovement[]>([]);
  const [stockSummary, setStockSummary] = useState<StockSummary | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [movementsLoading, setMovementsLoading] = useState(false);

  // UI State
  const [currentView, setCurrentView] = useState<'overview' | 'movements' | 'details'>('overview');
  const [selectedProduct, setSelectedProduct] = useState<StockItem | null>(null);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    status: '',
    movement_type: '',
    from_date: '',
    to_date: '',
    sort_by: 'name',
    sort_order: 'asc'
  });

  // Stock adjustment form
  const [adjustment, setAdjustment] = useState<StockAdjustment>({
    product_id: 0,
    adjustment_type: 'increase',
    quantity: '0',
    reason: '',
    notes: ''
  });

  // Handle state restoration when navigating back from stock details
  useEffect(() => {
    const navigationState = location.state as any;
    if (navigationState?.preserveFilters) {
      setFilters(navigationState.preserveFilters);
    }
    if (navigationState?.preserveView) {
      setCurrentView(navigationState.preserveView);
    }
    // Clear the state after restoring to prevent issues with future navigation
    if (navigationState) {
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    loadStockData();

    // FIXED: Proper event bus integration with correct event names
    const handleStockUpdate = (data: any) => {
      console.log('📦 Stock report refreshing due to stock update:', data);
      // CRITICAL FIX: Add small delay to ensure database transaction is complete
      setTimeout(() => {
        loadStockData(); // Silent refresh with delay
      }, 500);
    };

    const handleInvoiceCreated = (data: any) => {
      console.log('📦 Stock report refreshing due to invoice creation:', data);
      loadStockData(); // Silent refresh
    };

    const handleStockAdjustment = (data: any) => {
      console.log('📦 Stock report refreshing due to stock adjustment:', data);
      loadStockData(); // Silent refresh
    };

    const handleUIRefreshRequested = (data: any) => {
      console.log('📦 Stock report refreshing due to UI refresh request:', data);
      // CRITICAL FIX: Multiple refresh attempts to ensure data is updated
      setTimeout(() => loadStockData(), 100);
      setTimeout(() => loadStockData(), 1000);
      setTimeout(() => loadStockData(), 2000);
    };

    const handleProductsUpdated = (data: any) => {
      console.log('📦 Stock report refreshing due to products updated:', data);
      loadStockData(); // Silent refresh
    };

    const handleForceProductReload = (data: any) => {
      console.log('📦 Stock report refreshing due to force product reload:', data);
      loadStockData(); // Silent refresh
    };

    // Register event listeners with correct event names
    eventBus.on(BUSINESS_EVENTS.STOCK_UPDATED, handleStockUpdate);
    eventBus.on(BUSINESS_EVENTS.INVOICE_CREATED, handleInvoiceCreated);
    eventBus.on(BUSINESS_EVENTS.STOCK_ADJUSTMENT_MADE, handleStockAdjustment);
    eventBus.on(BUSINESS_EVENTS.STOCK_MOVEMENT_CREATED, handleStockUpdate);

    // Listen for additional events emitted by stock receiving
    eventBus.on('UI_REFRESH_REQUESTED', handleUIRefreshRequested);
    eventBus.on('PRODUCTS_UPDATED', handleProductsUpdated);
    eventBus.on('FORCE_PRODUCT_RELOAD', handleForceProductReload);
    eventBus.on('PRODUCTS_CACHE_INVALIDATED', handleProductsUpdated);
    eventBus.on('COMPREHENSIVE_DATA_REFRESH', handleForceProductReload);

    // Set up auto-refresh every 30 seconds as backup
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadStockData(); // silent refresh
      }
    }, 30000);

    return () => {
      // Clean up event listeners
      eventBus.off(BUSINESS_EVENTS.STOCK_UPDATED, handleStockUpdate);
      eventBus.off(BUSINESS_EVENTS.INVOICE_CREATED, handleInvoiceCreated);
      eventBus.off(BUSINESS_EVENTS.STOCK_ADJUSTMENT_MADE, handleStockAdjustment);
      eventBus.off(BUSINESS_EVENTS.STOCK_MOVEMENT_CREATED, handleStockUpdate);

      // Clean up additional event listeners
      eventBus.off('UI_REFRESH_REQUESTED', handleUIRefreshRequested);
      eventBus.off('PRODUCTS_UPDATED', handleProductsUpdated);
      eventBus.off('FORCE_PRODUCT_RELOAD', handleForceProductReload);
      eventBus.off('PRODUCTS_CACHE_INVALIDATED', handleProductsUpdated);
      eventBus.off('COMPREHENSIVE_DATA_REFRESH', handleForceProductReload);

      // Clean up interval
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    applyFilters();
  }, [stockItems, stockMovements, filters]);

  // Handle incoming product selection from other components
  useEffect(() => {
    const state = location.state as any;
    if (state?.productId && stockItems.length > 0) {
      const product = stockItems.find(p => p.id === state.productId);
      if (product) {
        viewProductDetails(product);
      }
      // Clear the state to prevent issues on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state, stockItems]);

  // Manual refresh with user feedback
  const refreshStockData = async () => {
    try {
      setRefreshing(true);

      // CRITICAL FIX: Force cache bypass and multiple refresh attempts
      console.log('🔄 Manual refresh: Forcing comprehensive data reload...');

      // Try clearing any potential browser/local storage caches
      try {
        localStorage.removeItem('product_cache');
        sessionStorage.removeItem('stock_data');
      } catch (e) {
        console.log('Storage cache clearing skipped');
      }

      // Multiple refresh attempts with small delays
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`🔄 Refresh attempt ${attempt}/3...`);

          // Get fresh product data from database (bypass cache)
          const products = await db.getAllProducts();
          console.log(`✅ Retrieved ${products.length} products in attempt ${attempt}`);

          // Process with latest movement data
          const stockData = await processStockData(products);
          console.log(`✅ Processed ${stockData.length} stock items in attempt ${attempt}`);

          // Update summary with fresh calculations
          const summary = await calculateStockSummary(stockData);

          setStockItems(stockData);
          setStockSummary(summary);

          // Update selectedProduct if it exists
          if (selectedProduct) {
            const updatedSelectedProduct = stockData.find(item => item.id === selectedProduct.id);
            if (updatedSelectedProduct) {
              console.log(`🔄 [MANUAL] Updated selected product ${updatedSelectedProduct.name}`);
              console.log(`   Stock: ${selectedProduct.current_stock} → ${updatedSelectedProduct.current_stock}`);
              setSelectedProduct(updatedSelectedProduct);
            }
          }

          break; // Success, exit loop

        } catch (error) {
          console.error(`❌ Refresh attempt ${attempt} failed:`, error);
          if (attempt === 3) throw error; // Re-throw on final attempt
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        }
      }

      // Also refresh recent movements
      await loadStockMovements();

      console.log('✅ Manual stock data refresh completed successfully');
      toast.success('Stock data refreshed successfully!');

    } catch (error) {
      console.error('Failed to refresh stock data:', error);
      toast.error('Failed to refresh stock data');
    } finally {
      setRefreshing(false);
    }
  };

  // Navigate to product details view
  const viewProductDetails = async (product: StockItem) => {
    // Navigate directly to the stock details page with state to preserve context
    navigate(`/reports/stock-details/${product.id}`, {
      state: {
        fromStockReport: true,
        productName: product.name,
        preserveFilters: filters,
        preserveView: currentView
      }
    });
  };

  const navigateToCustomer = (customerId: number) => {
    navigate('/reports/customer', {
      state: { customerId }
    });
  };

  const navigateToInvoice = (_invoiceId: number, billNumber: string) => {
    navigate('/billing/invoices', {
      state: { searchTerm: billNumber }
    });
  };

  const loadStockData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Starting to load stock data...');

      await db.initialize();
      console.log('✅ Database initialized successfully');

      // Get all products with stock info
      console.log('📦 Getting all products...');
      const allProducts = await db.getAllProducts();

      // Filter out non-stock products (track_inventory = 0)
      const products = allProducts.filter(product =>
        product.track_inventory === 1 || product.track_inventory === true || product.track_inventory === undefined || product.track_inventory === null
      );

      console.log(`✅ Retrieved ${allProducts.length} total products, ${products.length} stock products (filtered out ${allProducts.length - products.length} non-stock products):`, products);

      // Get categories
      console.log('📁 Getting categories...');
      const categoryData = await db.getCategories();
      const categoryList = categoryData.map((cat: { category: string }) => cat.category);
      console.log(`✅ Retrieved ${categoryList.length} categories:`, categoryList);

      // Process stock data with movement calculations
      console.log('⚙️ Processing stock data...');
      const stockData = await processStockData(products);
      console.log(`✅ Processed ${stockData.length} stock items`);

      // Calculate summary with real movement data
      console.log('📊 Calculating stock summary...');
      const summary = await calculateStockSummary(stockData);
      console.log('✅ Summary calculated:', summary);

      setStockItems(stockData);
      setCategories(categoryList);
      setStockSummary(summary);

      // CRITICAL FIX: Update selectedProduct if it exists and stock has changed
      if (selectedProduct) {
        const updatedSelectedProduct = stockData.find(item => item.id === selectedProduct.id);
        if (updatedSelectedProduct) {
          console.log(`🔄 Updating selected product ${updatedSelectedProduct.name} with fresh stock data`);
          console.log(`   Old stock: ${selectedProduct.current_stock} → New stock: ${updatedSelectedProduct.current_stock}`);
          setSelectedProduct(updatedSelectedProduct);
        } else {
          console.log(`⚠️ Selected product ${selectedProduct.id} not found in updated stock data`);
        }
      }

      // Load recent stock movements
      console.log('📈 Loading stock movements...');
      await loadStockMovements();
      console.log('✅ Stock data loading completed successfully');

    } catch (error) {
      console.error('❌ Failed to load stock data:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      toast.error(`Failed to load stock data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const loadStockMovements = async (productId?: number) => {
    try {
      setMovementsLoading(true);

      const movementFilters: any = {
        limit: 100,
        offset: 0
      };

      if (productId) {
        movementFilters.product_id = productId;
      }

      if (filters.from_date) {
        movementFilters.from_date = filters.from_date;
      }

      if (filters.to_date) {
        movementFilters.to_date = filters.to_date;
      }

      if (filters.movement_type) {
        movementFilters.movement_type = filters.movement_type;
      }

      const movements = await db.getStockMovements(movementFilters);

      // CRITICAL FIX: Convert numeric quantities to proper unit format for display
      const convertedMovements = await Promise.all(movements.map(async (movement) => {
        // Get the product to determine its unit type
        let productUnitType = 'kg-grams'; // default
        try {
          const product = await db.getProduct(movement.product_id);
          if (product && product.unit_type) {
            productUnitType = product.unit_type;
          }
        } catch (error) {
          console.warn(`Could not get unit type for product ${movement.product_id}, using default kg-grams`);
        }

        // CRITICAL FIX: Handle new formatted quantity strings with signs
        const convertQuantity = (rawQuantity: number | string): string => {
          // Check if it's already a formatted string with sign (new format)
          if (typeof rawQuantity === 'string' && (rawQuantity.includes('kg') || rawQuantity.includes('pcs') || rawQuantity.includes('bags'))) {
            // Already formatted, return as is
            return rawQuantity;
          }

          // Legacy numeric conversion for backward compatibility
          const numericValue = typeof rawQuantity === 'string' ? parseFloat(rawQuantity) : rawQuantity;

          if (productUnitType === 'kg-grams') {
            // Convert from grams back to kg-grams format
            const kg = Math.floor(Math.abs(numericValue) / 1000);
            const grams = Math.abs(numericValue) % 1000;
            const sign = numericValue < 0 ? '-' : '';
            return grams > 0 ? `${sign}${kg}kg ${grams}g` : `${sign}${kg}kg`;
          } else if (productUnitType === 'kg') {
            const kg = Math.floor(Math.abs(numericValue) / 1000);
            const grams = Math.abs(numericValue) % 1000;
            const sign = numericValue < 0 ? '-' : '';
            return grams > 0 ? `${sign}${kg}.${String(grams).padStart(3, '0')}kg` : `${sign}${kg}kg`;
          } else if (productUnitType === 'piece') {
            const sign = numericValue < 0 ? '-' : '';
            return `${sign}${Math.abs(numericValue)} pcs`;
          } else if (productUnitType === 'bag') {
            const sign = numericValue < 0 ? '-' : '';
            return `${sign}${Math.abs(numericValue)} bags`;
          } else {
            return numericValue.toString();
          }
        };

        return {
          ...movement,
          quantity: convertQuantity(movement.quantity),
          previous_stock: convertQuantity(movement.previous_stock),
          new_stock: convertQuantity(movement.new_stock),
          unit_type: productUnitType as UnitType
        };
      }));

      setStockMovements(convertedMovements);

    } catch (error) {
      console.error('Failed to load stock movements:', error);
      toast.error('Failed to load stock movements');
    } finally {
      setMovementsLoading(false);
    }
  };

  const processStockData = async (products: any[]): Promise<StockItem[]> => {
    // Get recent movements for all products to calculate 30-day activity
    const thirtyDaysAgoStr = getRelativeDate(-30).db;

    try {
      const recentMovements = await db.getStockMovements({
        from_date: thirtyDaysAgoStr,
        movement_type: 'out', // Focus on outgoing movements for usage calculation
        limit: 1000
      });

      // Process each product with current stock data (don't recalculate every time)
      const processedProducts = products.map((product) => {
        try {
          // Use the current stock value as stored in database
          const currentStockData = parseUnit(product.current_stock);
          const minAlertData = parseUnit(product.min_stock_alert);

          // Calculate stock value using total grams for accuracy
          // Always round to two decimals for all currency calculations
          const stockValue = Number(((currentStockData.numericValue / 1000) * product.rate_per_unit).toFixed(2));

          let status: 'in_stock' | 'low_stock' | 'out_of_stock';

          if (currentStockData.numericValue === 0) {
            status = 'out_of_stock';
          } else if (currentStockData.numericValue <= minAlertData.numericValue) {
            status = 'low_stock';
          } else {
            status = 'in_stock';
          }

          // Calculate 30-day movements for this product
          const productMovements = recentMovements.filter(m => m.product_id === product.id);
          const movement30Days = productMovements.reduce((sum, m) => {
            // Convert numeric quantity to string for parsing if needed
            const quantityStr = typeof m.quantity === 'number' ? m.quantity.toString() : m.quantity;
            const movementData = parseUnit(quantityStr);
            return sum + movementData.numericValue;
          }, 0);
          const avgMonthlyUsage = movement30Days; // 30 days ≈ 1 month

          // Calculate reorder suggestion based on usage (in total grams)
          const reorderSuggestionGrams = Math.max(
            minAlertData.numericValue * 2,
            avgMonthlyUsage * 1.5, // 1.5 months of average usage
            10000 // Minimum reorder quantity (10kg in grams)
          );

          // Convert reorder suggestion back to unit format
          const reorderKg = Math.floor(reorderSuggestionGrams / 1000);
          const reorderGrams = reorderSuggestionGrams % 1000;
          const reorderSuggestion = reorderGrams > 0 ? `${reorderKg}-${reorderGrams}` : `${reorderKg}`;

          return {
            id: product.id,
            name: product.name,
            category: product.category,
            unit: product.unit,
            unit_type: product.unit_type || 'kg-grams',
            rate_per_unit: product.rate_per_unit,
            current_stock: product.current_stock, // Use current value from database
            min_stock_alert: product.min_stock_alert,
            stock_value: stockValue,
            status,
            last_updated: product.updated_at || getCurrentSystemDateTime().raw.toISOString(),
            movement_30_days: movement30Days,
            avg_monthly_usage: avgMonthlyUsage,
            reorder_suggestion: reorderSuggestion,
            size: product.size,
            grade: product.grade
          };
        } catch (error) {
          console.error(`❌ Failed to process stock for ${product.name}:`, error);

          // Fallback to basic calculation for stock products
          const currentStockData = parseUnit(product.current_stock);
          const minAlertData = parseUnit(product.min_stock_alert);
          const stockValue = Number(((currentStockData.numericValue / 1000) * product.rate_per_unit).toFixed(2));

          let status: 'in_stock' | 'low_stock' | 'out_of_stock';
          if (currentStockData.numericValue === 0) {
            status = 'out_of_stock';
          } else if (currentStockData.numericValue <= minAlertData.numericValue) {
            status = 'low_stock';
          } else {
            status = 'in_stock';
          }

          return {
            id: product.id,
            name: product.name,
            category: product.category,
            unit: product.unit,
            unit_type: product.unit_type || 'kg-grams',
            rate_per_unit: product.rate_per_unit,
            current_stock: product.current_stock,
            min_stock_alert: product.min_stock_alert,
            stock_value: stockValue,
            status,
            last_updated: product.updated_at || new Date().toISOString(),
            movement_30_days: 0,
            avg_monthly_usage: 0,
            reorder_suggestion: '10-0',
            size: product.size,
            grade: product.grade,
            is_non_stock: false
          };
        }
      });

      return processedProducts;

    } catch (error) {
      console.error('Error calculating movement data:', error);
      // Fallback to basic calculation without movement data
      return products.map(product => {
        // Parse current stock and min alert levels
        const currentStockData = parseUnit(product.current_stock);
        const minAlertData = parseUnit(product.min_stock_alert);

        // Calculate stock value using total grams for accuracy
        const stockValue = Number(((currentStockData.numericValue / 1000) * product.rate_per_unit).toFixed(2));

        let status: 'in_stock' | 'low_stock' | 'out_of_stock';

        if (currentStockData.numericValue === 0) {
          status = 'out_of_stock';
        } else if (currentStockData.numericValue <= minAlertData.numericValue) {
          status = 'low_stock';
        } else {
          status = 'in_stock';
        }

        // Default reorder suggestion (in unit format)
        const reorderSuggestionGrams = Math.max(minAlertData.numericValue * 2, 10000);
        const reorderKg = Math.floor(reorderSuggestionGrams / 1000);
        const reorderGrams = reorderSuggestionGrams % 1000;
        const reorderSuggestion = reorderGrams > 0 ? `${reorderKg}-${reorderGrams}` : `${reorderKg}`;

        return {
          id: product.id,
          name: product.name,
          category: product.category,
          unit: product.unit,
          unit_type: product.unit_type || 'kg-grams',
          rate_per_unit: product.rate_per_unit,
          current_stock: product.current_stock,
          min_stock_alert: product.min_stock_alert,
          stock_value: stockValue,
          status,
          last_updated: product.updated_at || new Date().toISOString(),
          movement_30_days: 0,
          avg_monthly_usage: 0,
          reorder_suggestion: reorderSuggestion,
          size: product.size,
          grade: product.grade
        };
      });
    }
  };

  const calculateStockSummary = async (items: StockItem[]): Promise<StockSummary> => {
    const totalStockValue = Number(items.reduce((sum, item) => sum + item.stock_value, 0).toFixed(2));
    const inStockCount = items.filter(item => item.status === 'in_stock').length;
    const lowStockCount = items.filter(item => item.status === 'low_stock').length;
    const outOfStockCount = items.filter(item => item.status === 'out_of_stock').length;
    const categoriesCount = new Set(items.map(item => item.category)).size;

    // Calculate movements for today and this week from database
    const today = formatDateForDatabase();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = formatDateForDatabase(weekAgo);

    try {
      // Get actual movement data from database
      const [todayMovements, weekMovements] = await Promise.all([
        db.getStockMovements({
          from_date: today,
          to_date: today,
          limit: 1000
        }),
        db.getStockMovements({
          from_date: weekAgoStr,
          limit: 1000
        })
      ]);

      return {
        total_products: items.length,
        total_stock_value: totalStockValue,
        in_stock_count: inStockCount,
        low_stock_count: lowStockCount,
        out_of_stock_count: outOfStockCount,
        categories_count: categoriesCount,
        movements_today: todayMovements.length,
        movements_this_week: weekMovements.length
      };
    } catch (error) {
      console.error('Error calculating movement statistics:', error);
      // Fallback to basic calculation
      return {
        total_products: items.length,
        total_stock_value: totalStockValue,
        in_stock_count: inStockCount,
        low_stock_count: lowStockCount,
        out_of_stock_count: outOfStockCount,
        categories_count: categoriesCount,
        movements_today: 0,
        movements_this_week: 0
      };
    }
  };

  // CRITICAL: Enhanced filtering with real-time data - FIXED INFINITE LOOP
  const applyFilters = async () => {
    // FIXED: Don't trigger loadStockData from within applyFilters to prevent infinite loops
    // If no data, the main useEffect will handle initial loading
    if (stockItems.length === 0) {
      // Just clear filtered results if no data is available
      setFilteredItems([]);
      setFilteredMovements([]);
      return;
    }

    // Filter stock items
    let filteredStockItems = [...stockItems];

    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase();
      filteredStockItems = filteredStockItems.filter(item =>
        item.name.toLowerCase().includes(searchTerm) ||
        item.category.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.category) {
      filteredStockItems = filteredStockItems.filter(item => item.category === filters.category);
    }

    if (filters.status) {
      filteredStockItems = filteredStockItems.filter(item => item.status === filters.status);
    }

    // Sort stock items
    filteredStockItems.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (filters.sort_by) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'current_stock':
          const aStockData = parseUnit(a.current_stock);
          const bStockData = parseUnit(b.current_stock);
          aValue = aStockData.total_grams;
          bValue = bStockData.total_grams;
          break;
        case 'stock_value':
          aValue = a.stock_value;
          bValue = b.stock_value;
          break;
        case 'category':
          aValue = a.category.toLowerCase();
          bValue = b.category.toLowerCase();
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (filters.sort_order === 'desc') {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      } else {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      }
    });

    setFilteredItems(filteredStockItems);

    // Filter movements
    let filteredStockMovements = [...stockMovements];

    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase();
      filteredStockMovements = filteredStockMovements.filter(movement =>
        movement.product_name.toLowerCase().includes(searchTerm) ||
        movement.customer_name?.toLowerCase().includes(searchTerm) ||
        movement.reference_number?.toLowerCase().includes(searchTerm) ||
        movement.notes?.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.movement_type) {
      filteredStockMovements = filteredStockMovements.filter(movement =>
        movement.movement_type === filters.movement_type
      );
    }

    if (filters.from_date) {
      filteredStockMovements = filteredStockMovements.filter(movement =>
        movement.date >= filters.from_date
      );
    }

    if (filters.to_date) {
      filteredStockMovements = filteredStockMovements.filter(movement =>
        movement.date <= filters.to_date
      );
    }

    // Sort movements by date/time (newest first)
    filteredStockMovements.sort((a, b) => {
      if (a.date === b.date) {
        return b.time.localeCompare(a.time);
      }
      return b.date.localeCompare(a.date);
    });

    setFilteredMovements(filteredStockMovements);
  };

  const openAdjustmentModal = (product: StockItem) => {
    setSelectedProduct(product);
    setAdjustment({
      product_id: product.id,
      adjustment_type: 'increase',
      quantity: '0',
      reason: '',
      notes: ''
    });
    setShowAdjustment(true);
  };

  const submitAdjustment = async () => {
    try {
      // Parse the quantity to validate it
      const quantityData = parseUnit(adjustment.quantity);
      if (!selectedProduct || quantityData.numericValue <= 0 || !adjustment.reason) {
        toast.error('Please fill in all required fields with valid quantities');
        return;
      }

      // Convert to numeric value for the database (in total grams)
      const adjustmentQuantityGrams = adjustment.adjustment_type === 'increase'
        ? quantityData.numericValue
        : -quantityData.numericValue;

      // Enhanced stock adjustment with customer context if available
      await db.adjustStock(
        adjustment.product_id,
        adjustmentQuantityGrams, // Use grams directly, don't convert to kg
        adjustment.reason,
        adjustment.notes || 'Manual stock adjustment from Stock Report',
        undefined, // customer_id - could be enhanced to include if relevant
        undefined  // customer_name - could be enhanced to include if relevant
      );

      const adjustmentType = adjustment.adjustment_type === 'increase' ? 'increased' : 'decreased';
      toast.success(
        `Stock ${adjustmentType} successfully! ${selectedProduct.name}: ${adjustment.adjustment_type === 'increase' ? '+' : '-'}${quantityData.display}`,
        { duration: 5000 }
      );

      // Reset form and reload data
      setShowAdjustment(false);
      setSelectedProduct(null);
      setAdjustment({
        product_id: 0,
        adjustment_type: 'increase',
        quantity: '0',
        reason: '',
        notes: ''
      });

      // Refresh all stock data to show updated values
      await loadStockData();

    } catch (error) {
      console.error('Error adjusting stock:', error);
      toast.error(`Failed to adjust stock: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'in_stock':
        return { label: 'In Stock', color: 'text-green-600 bg-green-50', icon: CheckCircle };
      case 'low_stock':
        return { label: 'Low Stock', color: 'text-yellow-600 bg-yellow-50', icon: AlertTriangle };
      case 'out_of_stock':
        return { label: 'Out of Stock', color: 'text-red-600 bg-red-50', icon: XCircle };
      default:
        return { label: 'Unknown', color: 'text-gray-600 bg-gray-50', icon: Package };
    }
  };

  // Export functions
  const exportStockReport = async () => {
    if (!stockItems.length) {
      toast.error('No data to export');
      return;
    }

    const csvContent = [
      ['Product Name', 'Category', 'Current Stock', 'Unit', 'Rate per Unit', 'Stock Value', 'Status', 'Min Alert Level', 'Last Updated'],
      ...filteredItems.map(item => [
        item.name,
        item.category,
        item.current_stock,
        item.unit,
        item.rate_per_unit.toString(),
        item.stock_value.toString(),
        item.status,
        item.min_stock_alert,
        formatDateDisplay(item.last_updated)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stock_report_${getCurrentSystemDateTime().dbDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Log activity
    await activityLogger.logReportExported('Stock Report', 'CSV');

    toast.success('Stock report exported successfully');
  };

  const exportMovementsReport = async () => {
    if (!stockMovements.length) {
      toast.error('No movements to export');
      return;
    }

    const csvContent = [
      ['Date', 'Time', 'Product', 'Movement Type', 'Quantity', 'Previous Stock', 'New Stock', 'Customer', 'Reference', 'Reason'],
      ...filteredMovements.map(movement => [
        movement.date,
        movement.time,
        movement.product_name,
        movement.movement_type,
        movement.quantity.toString(),
        movement.previous_stock.toString(),
        movement.new_stock.toString(),
        movement.customer_name || '',
        movement.reference_number || '',
        movement.reason
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stock_movements_${getCurrentSystemDateTime().dbDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Log activity
    await activityLogger.logReportExported('Stock Movements Report', 'CSV');

    toast.success('Movements report exported successfully');
  };

  const getMovementTypeInfo = (type: string) => {
    switch (type) {
      case 'in':
        return { label: 'Stock In', color: 'text-green-600 bg-green-50', icon: TrendingUp };
      case 'out':
        return { label: 'Stock Out', color: 'text-red-600 bg-red-50', icon: TrendingDown };
      case 'adjustment':
        return { label: 'Adjustment', color: 'text-blue-600 bg-blue-50', icon: Edit };
      default:
        return { label: 'Unknown', color: 'text-gray-600 bg-gray-50', icon: Package };
    }
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      status: '',
      movement_type: '',
      from_date: '',
      to_date: '',
      sort_by: 'name',
      sort_order: 'asc'
    });
  };

  const formatCurrency = (amount: number | undefined | null): string => {
    const safeAmount = amount ?? 0;
    // Always round to two decimals for all currency
    return `Rs. ${Number(safeAmount).toFixed(2)}`;
  };

  // Use centralized date/time formatting
  const formatDateDisplay = (dateString: string): string => {
    return formatDate(dateString);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Stock Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Complete inventory tracking with movement history
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setCurrentView('overview')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${currentView === 'overview'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Overview
            </button>
            <button
              onClick={() => setCurrentView('movements')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${currentView === 'movements'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Movements
            </button>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </button>

          <button
            onClick={currentView === 'overview' ? exportStockReport : exportMovementsReport}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>

          <button
            onClick={refreshStockData}
            disabled={refreshing}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  placeholder="Search products, customers..."
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {currentView === 'overview' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Stock Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="in_stock">In Stock</option>
                  <option value="low_stock">Low Stock</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Movement Type</label>
                <select
                  value={filters.movement_type}
                  onChange={(e) => setFilters(prev => ({ ...prev, movement_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="in">Stock In</option>
                  <option value="out">Stock Out</option>
                  <option value="adjustment">Adjustments</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={filters.from_date}
                  onChange={(e) => setFilters(prev => ({ ...prev, from_date: e.target.value }))}
                  className="px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                <input
                  type="date"
                  value={filters.to_date}
                  onChange={(e) => setFilters(prev => ({ ...prev, to_date: e.target.value }))}
                  className="px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {stockSummary && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <Package className="h-6 w-6 text-blue-600" />
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Total Products</p>
                <p className="text-lg font-semibold text-gray-900">{stockSummary.total_products}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <BarChart3 className="h-6 w-6 text-purple-600" />
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Stock Value</p>
                <p className="text-lg font-semibold text-gray-900">{formatCurrency(stockSummary.total_stock_value)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">In Stock</p>
                <p className="text-lg font-semibold text-green-600">{stockSummary.in_stock_count}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Low Stock</p>
                <p className="text-lg font-semibold text-yellow-600">{stockSummary.low_stock_count}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <XCircle className="h-6 w-6 text-red-600" />
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Out of Stock</p>
                <p className="text-lg font-semibold text-red-600">{stockSummary.out_of_stock_count}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <Activity className="h-6 w-6 text-indigo-600" />
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Movements Today</p>
                <p className="text-lg font-semibold text-indigo-600">{stockSummary.movements_today}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {currentView === 'overview' ? (
        /* Stock Overview */
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Current Stock Levels ({filteredItems.length} items)</h3>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredItems.map((item) => {
                    const statusInfo = getStatusInfo(item.status);
                    const StatusIcon = statusInfo.icon;

                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.name}</div>
                            <div className="text-sm text-gray-500">
                              Alert at: {item.min_stock_alert} {item.unit}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {item.category}
                          </span>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            {formatUnitString(item.current_stock, item.unit_type)}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(item.rate_per_unit)}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {formatCurrency(item.stock_value)}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusInfo.label}
                          </span>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => viewProductDetails(item)}
                              className="text-blue-600 hover:text-blue-800 flex items-center"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openAdjustmentModal(item)}
                              className="text-green-600 hover:text-green-800 flex items-center"
                              title="Adjust Stock"
                            >
                              <Edit className="h-4 w-4" />
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
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-500">
                {filters.search || filters.category || filters.status
                  ? 'No products match your current filters.'
                  : 'No products available in inventory.'
                }
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Stock Movements */
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Stock Movement History ({filteredMovements.length} movements)</h3>
          </div>

          {movementsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredMovements.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Movement
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Remaining Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer/Reference
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMovements.map((movement) => {
                    const movementInfo = getMovementTypeInfo(movement.movement_type);
                    const MovementIcon = movementInfo.icon;

                    return (
                      <tr key={movement.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDateDisplay(movement.date)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {movement.time}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {movement.product_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {movement.reason}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${movementInfo.color}`}>
                            <MovementIcon className="h-3 w-3 mr-1" />
                            {movementInfo.label}
                          </span>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-semibold ${movement.movement_type === 'in' ? 'text-green-600' :
                            movement.movement_type === 'out' ? 'text-red-600' : 'text-blue-600'
                            }`}>
                            {movement.movement_type === 'in' ? '+' : movement.movement_type === 'out' ? '-' : '±'}
                            {formatUnitString(movement.quantity, movement.unit_type || 'kg-grams')}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatUnitString(movement.new_stock, movement.unit_type || 'kg-grams')}
                          </div>
                          <div className="text-sm text-gray-500">
                            Value: {formatCurrency(movement.total_value)}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {movement.customer_name && (
                              <div className="flex items-center text-sm text-gray-900">
                                <User className="h-3 w-3 mr-1" />
                                {movement.customer_name}
                              </div>
                            )}
                            {movement.reference_number && (
                              <div className="flex items-center text-sm text-gray-500">
                                <FileText className="h-3 w-3 mr-1" />
                                {movement.reference_number}
                              </div>
                            )}
                            {movement.notes && (
                              <div className="text-xs text-gray-500">
                                {movement.notes}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center space-x-2">
                            {movement.customer_id && (
                              <button
                                onClick={() => navigateToCustomer(movement.customer_id!)}
                                className="text-blue-600 hover:text-blue-800 flex items-center"
                                title="View Customer"
                              >
                                <User className="h-4 w-4" />
                              </button>
                            )}
                            {movement.reference_id && movement.reference_type === 'invoice' && (
                              <button
                                onClick={() => navigateToInvoice(movement.reference_id!, movement.reference_number || '')}
                                className="text-green-600 hover:text-green-800 flex items-center"
                                title="View Invoice"
                              >
                                <FileText className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => viewProductDetails({
                                id: movement.product_id,
                                name: movement.product_name,
                                category: '',
                                unit: '',
                                unit_type: 'kg-grams', // Default fallback
                                rate_per_unit: movement.unit_price || 0,
                                current_stock: movement.new_stock,
                                min_stock_alert: '0',
                                stock_value: 0,
                                status: 'in_stock',
                                last_updated: movement.created_at || new Date().toISOString(),
                                reorder_suggestion: '0'
                              })}
                              className="text-purple-600 hover:text-purple-800 flex items-center"
                              title="View Product Details"
                            >
                              <Package className="h-4 w-4" />
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
            <div className="text-center py-12">
              <History className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No movements found</h3>
              <p className="text-gray-500">
                {filters.search || filters.movement_type || filters.from_date || filters.to_date
                  ? 'No movements match your current filters.'
                  : 'No stock movements recorded yet.'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showAdjustment && selectedProduct && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Stock Adjustment</h3>
              <button
                onClick={() => setShowAdjustment(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Product:</strong> {selectedProduct.name}
              </p>
              <p className="text-sm text-blue-800">
                <strong>Current Stock:</strong> {formatUnitString(selectedProduct.current_stock, selectedProduct.unit_type)}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adjustment Type</label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="adjustment_type"
                      value="increase"
                      checked={adjustment.adjustment_type === 'increase'}
                      onChange={(e) => setAdjustment(prev => ({ ...prev, adjustment_type: e.target.value as 'increase' | 'decrease' }))}
                      className="mr-2"
                    />
                    <Plus className="h-4 w-4 text-green-600 mr-1" />
                    Increase
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="adjustment_type"
                      value="decrease"
                      checked={adjustment.adjustment_type === 'decrease'}
                      onChange={(e) => setAdjustment(prev => ({ ...prev, adjustment_type: e.target.value as 'increase' | 'decrease' }))}
                      className="mr-2"
                    />
                    <Minus className="h-4 w-4 text-red-600 mr-1" />
                    Decrease
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (Format: kg or kg-grams)</label>
                <input
                  type="text"
                  value={adjustment.quantity}
                  onChange={(e) => setAdjustment(prev => ({ ...prev, quantity: e.target.value }))}
                  placeholder="Enter quantity (e.g., 100 or 100-500)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {adjustment.quantity && adjustment.quantity !== '0' && (
                  <p className="mt-1 text-sm text-gray-500">
                    Adjustment quantity: {formatUnitString(adjustment.quantity, selectedProduct?.unit_type || 'kg-grams')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <select
                  value={adjustment.reason}
                  onChange={(e) => setAdjustment(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select reason</option>
                  {ADJUSTMENT_REASONS.map(reason => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={adjustment.notes}
                  onChange={(e) => setAdjustment(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes about this adjustment..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAdjustment(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitAdjustment}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Apply Adjustment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockReport;
