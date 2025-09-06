/**
 * Finance Service for Steel Store Management System
 * Handles all financial data aggregation, calculations, and business intelligence
 * Designed specifically for steel business operations
 */

import { db } from './database';
import { salaryHistoryService } from './salaryHistoryService';
import { auditLogService } from './auditLogService';
import { DataChangeDetector } from './autoRefreshService';

// PERFORMANCE: Track initialization to prevent repeated calls
let financeTablesInitialized = false;

export interface BusinessMetrics {
  totalSales: number;
  totalPurchases: number;
  outstandingReceivables: number;
  outstandingPayables: number;
  cashInHand: number;
  netProfit: number;
  grossProfit: number;
  profitMargin: number;
}

export interface MonthlyFinancialData {
  month: string;
  year: number;
  revenue: number;
  expenses: number;
  profit: number;
  cashFlow: number;
  steelPurchases: number;
  steelSales: number;
}

export interface ExpenseBreakdown {
  category: string;
  amount: number;
  percentage: number;
  monthlyTrend: number;
}

export interface CashFlowData {
  inflow: number;
  outflow: number;
  net: number;
  customerPayments: number;
  vendorPayments: number;
  expenses: number;
  salaries: number;
}

export interface CustomerOutstanding {
  customer_id: number;
  customer_name: string;
  outstanding_amount: number;
  last_payment_date: string;
  days_overdue: number;
  total_invoices: number;
}

export interface VendorOutstanding {
  vendor_id: number;
  vendor_name: string;
  outstanding_amount: number;
  last_payment_date: string;
  days_overdue: number;
  total_purchases: number;
}

export interface MonthlyExpense {
  month: string;
  year: number;
  salaries: number;
  transport: number;
  utilities: number;
  misc: number;
  total: number;
}

export interface ProfitTrend {
  month: string;
  year: number;
  revenue: number;
  cogs: number; // Cost of Goods Sold (steel purchases)
  grossProfit: number;
  expenses: number;
  netProfit: number;
  profitMargin: number;
}

export interface FinancialSummary {
  businessMetrics: BusinessMetrics;
  monthlyData: MonthlyFinancialData[];
  expenseBreakdown: ExpenseBreakdown[];
  cashFlow: CashFlowData;
  topCustomersOutstanding: CustomerOutstanding[];
  topVendorsOutstanding: VendorOutstanding[];
  monthlyExpenses: MonthlyExpense[];
  profitTrend: ProfitTrend[];
}

class FinanceService {
  private static instance: FinanceService;
  private cacheExpiry = 3 * 60 * 1000; // 3 minutes cache for fast access
  private cache = new Map<string, { data: any; timestamp: number }>();

  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  private setCachedData<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Clear cache to ensure fresh data calculation - CENTRALIZED SYSTEM ENHANCEMENT
   */
  public clearCache(): void {
    this.cache.clear();
    console.log('🧹 Finance service cache cleared - fresh data will be calculated');
  }

  /**
   * Force refresh business metrics without cache - CENTRALIZED SYSTEM ENHANCEMENT
   */
  public async getBusinessMetricsForced(): Promise<BusinessMetrics> {
    // Clear cache first
    this.clearCache();

    // Get fresh data
    const metrics = await this.getBusinessMetrics();

    // Log for debugging vendor purchase data display
    console.log('📊 FORCED Business Metrics Calculation:');
    console.log(`   Customer Sales: Rs ${metrics.totalSales.toLocaleString()}`);
    console.log(`   Vendor Purchases: Rs ${metrics.totalPurchases.toLocaleString()}`);
    console.log(`   Outstanding Payables: Rs ${metrics.outstandingPayables.toLocaleString()}`);

    if (metrics.totalPurchases > 0) {
      console.log('✅ Vendor purchase data successfully calculated from centralized system');
    }

    return metrics;
  }

  public static getInstance(): FinanceService {
    if (!FinanceService.instance) {
      FinanceService.instance = new FinanceService();
    }
    return FinanceService.instance;
  }

  /**
   * Initialize finance-related tables
   */
  async initializeTables(): Promise<void> {
    // PERFORMANCE: Skip if already initialized
    if (financeTablesInitialized) {
      console.log('✅ [FINANCE] Tables already initialized, skipping...');
      return;
    }

    try {
      console.log('🔄 [FINANCE] Initializing finance tables...');

      // Business expenses table
      await db.executeCommand(`
        CREATE TABLE IF NOT EXISTS business_expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL,
          category TEXT NOT NULL,
          description TEXT NOT NULL,
          amount REAL NOT NULL,
          payment_method TEXT NOT NULL,
          reference_number TEXT,
          approved_by TEXT NOT NULL,
          notes TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        )
      `);

      // Cash transactions table for tracking daily cash movements
      await db.executeCommand(`
        CREATE TABLE IF NOT EXISTS cash_transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL,
          type TEXT NOT NULL,
          category TEXT NOT NULL,
          description TEXT NOT NULL,
          amount REAL NOT NULL,
          balance_after REAL NOT NULL,
          reference_type TEXT,
          reference_id INTEGER,
          created_by TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        )
      `);

      // Financial targets table
      await db.executeCommand(`
        CREATE TABLE IF NOT EXISTS financial_targets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          month TEXT NOT NULL,
          year INTEGER NOT NULL,
          revenue_target REAL NOT NULL DEFAULT 0,
          profit_target REAL NOT NULL DEFAULT 0,
          expense_limit REAL NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
          UNIQUE(month, year)
        )
      `);

      // Create indexes for performance
      await db.executeCommand(`CREATE INDEX IF NOT EXISTS idx_business_expenses_date ON business_expenses(date)`);
      await db.executeCommand(`CREATE INDEX IF NOT EXISTS idx_business_expenses_category ON business_expenses(category)`);
      await db.executeCommand(`CREATE INDEX IF NOT EXISTS idx_cash_transactions_date ON cash_transactions(date)`);
      await db.executeCommand(`CREATE INDEX IF NOT EXISTS idx_cash_transactions_type ON cash_transactions(type)`);
      await db.executeCommand(`CREATE INDEX IF NOT EXISTS idx_financial_targets_date ON financial_targets(year, month)`);

      console.log('✅ Finance tables initialized successfully');

      // Mark as initialized to prevent repeated calls
      financeTablesInitialized = true;
      console.log('✅ [FINANCE] Finance service initialization completed');
    } catch (error) {
      console.error('❌ Error initializing finance tables:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive financial summary for dashboard with caching
   */
  async getFinancialSummary(months: number = 12): Promise<FinancialSummary> {
    try {
      // Check cache first for fast loading
      const cacheKey = `financial_summary_${months}`;
      const cachedData = this.getCachedData<FinancialSummary>(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      await this.initializeTables();

      const [
        businessMetrics,
        monthlyData,
        expenseBreakdown,
        cashFlow,
        topCustomersOutstanding,
        topVendorsOutstanding,
        monthlyExpenses,
        profitTrend
      ] = await Promise.all([
        this.getBusinessMetrics(),
        this.getMonthlyFinancialData(months),
        this.getExpenseBreakdown(),
        this.getCashFlowData(),
        this.getTopCustomersOutstanding(),
        this.getTopVendorsOutstanding(),
        this.getMonthlyExpenses(months),
        this.getProfitTrend(months)
      ]);

      const result = {
        businessMetrics,
        monthlyData,
        expenseBreakdown,
        cashFlow,
        topCustomersOutstanding,
        topVendorsOutstanding,
        monthlyExpenses,
        profitTrend
      };

      // Cache the result for subsequent requests
      this.setCachedData(cacheKey, result);

      return result;
    } catch (error) {
      console.error('Error getting financial summary:', error);
      throw error;
    }
  }

  /**
   * Get core business metrics
   */
  async getBusinessMetrics(): Promise<BusinessMetrics> {
    try {
      const currentYear = new Date().getFullYear();

      // Get total sales from invoices
      const salesResult = await db.executeRawQuery(`
        SELECT COALESCE(SUM(grand_total), 0) as total_sales
        FROM invoices 
        WHERE strftime('%Y', date) = ?
      `, [currentYear.toString()]);

      // Get total purchases from stock receiving - FIXED: Using correct column name
      const purchasesResult = await db.executeRawQuery(`
        SELECT COALESCE(SUM(grand_total), 0) as total_purchases
        FROM stock_receiving 
        WHERE strftime('%Y', date) = ?
      `, [currentYear.toString()]);

      // Get outstanding receivables
      const receivablesResult = await db.executeRawQuery(`
        SELECT COALESCE(ROUND(SUM(remaining_balance), 2), 0) as outstanding_receivables
        FROM invoices 
        WHERE remaining_balance > 0
      `);

      // Get outstanding payables - FIXED: Using correct column name
      const payablesResult = await db.executeRawQuery(`
        SELECT COALESCE(ROUND(SUM(sr.grand_total - COALESCE(vp.total_paid, 0)), 2), 0) as outstanding_payables
        FROM stock_receiving sr
        LEFT JOIN (
          SELECT vendor_id, SUM(amount) as total_paid
          FROM vendor_payments
          GROUP BY vendor_id
        ) vp ON sr.vendor_id = vp.vendor_id
      `);

      // Get cash in hand from latest cash transaction
      const cashResult = await db.executeRawQuery(`
        SELECT COALESCE(ROUND(balance_after, 2), 0) as cash_in_hand
        FROM cash_transactions 
        ORDER BY created_at DESC 
        LIMIT 1
      `);

      // Get total expenses (salaries + business expenses)
      const salaryExpenses = await salaryHistoryService.getSalaryStatistics();
      const businessExpensesResult = await db.executeRawQuery(`
        SELECT COALESCE(SUM(amount), 0) as business_expenses
        FROM business_expenses 
        WHERE strftime('%Y', date) = ?
      `, [currentYear.toString()]);

      const totalSales = Number(((salesResult[0] as any)?.total_sales || 0).toFixed(2));
      const totalPurchases = Number(((purchasesResult[0] as any)?.total_purchases || 0).toFixed(2));
      const totalExpenses = Number((salaryExpenses.total_paid_this_year + ((businessExpensesResult[0] as any)?.business_expenses || 0)).toFixed(2));

      const grossProfit = Number((totalSales - totalPurchases).toFixed(2));
      const netProfit = Number((grossProfit - totalExpenses).toFixed(2));
      const profitMargin = totalSales > 0 ? Number(((netProfit / totalSales) * 100).toFixed(2)) : 0;

      return {
        totalSales,
        totalPurchases,
        outstandingReceivables: Number(((receivablesResult[0] as any)?.outstanding_receivables || 0).toFixed(2)),
        outstandingPayables: Number(((payablesResult[0] as any)?.outstanding_payables || 0).toFixed(2)),
        cashInHand: Number(((cashResult[0] as any)?.cash_in_hand || 0).toFixed(2)),
        grossProfit,
        netProfit,
        profitMargin
      };
    } catch (error) {
      console.error('Error getting business metrics:', error);
      throw error;
    }
  }

  /**
   * Get monthly financial data for charts
   */
  async getMonthlyFinancialData(months: number = 12): Promise<MonthlyFinancialData[]> {
    try {
      const data: MonthlyFinancialData[] = [];
      const currentDate = new Date();

      for (let i = months - 1; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthStr = date.toISOString().slice(0, 7); // YYYY-MM
        const year = date.getFullYear();
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });

        // Get revenue for the month
        const revenueResult = await db.executeRawQuery(`
          SELECT COALESCE(SUM(grand_total), 0) as revenue
          FROM invoices 
          WHERE strftime('%Y-%m', date) = ?
        `, [monthStr]);

        // Get steel purchases for the month
        const steelPurchasesResult = await db.executeRawQuery(`
          SELECT COALESCE(SUM(grand_total), 0) as steel_purchases
          FROM stock_receiving 
          WHERE strftime('%Y-%m', date) = ?
        `, [monthStr]);

        // Get expenses for the month (salaries + business expenses)
        let salaryExpenses = 0;
        try {
          const salaryExpensesResult = await db.executeRawQuery(`
            SELECT COALESCE(SUM(payment_amount), 0) as salary_expenses
            FROM salary_payments 
            WHERE payment_month = ?
          `, [monthStr]);
          salaryExpenses = salaryExpensesResult[0]?.salary_expenses || 0;
        } catch (error: any) {
          if (error.message?.includes('no such table: salary_payments')) {
            console.warn('salary_payments table not found, using 0 for salary expenses');
            salaryExpenses = 0;
          } else {
            throw error;
          }
        }

        let businessExpenses = 0;
        try {
          const businessExpensesResult = await db.executeRawQuery(`
            SELECT COALESCE(SUM(amount), 0) as business_expenses
            FROM business_expenses 
            WHERE strftime('%Y-%m', date) = ?
          `, [monthStr]);
          businessExpenses = businessExpensesResult[0]?.business_expenses || 0;
        } catch (error: any) {
          if (error.message?.includes('no such table: business_expenses')) {
            console.warn('business_expenses table not found, using 0 for business expenses');
            businessExpenses = 0;
          } else {
            throw error;
          }
        }

        const revenue = Number(((revenueResult[0] as any)?.revenue || 0).toFixed(2));
        const steelPurchases = Number(((steelPurchasesResult[0] as any)?.steel_purchases || 0).toFixed(2));
        const totalExpenses = Number((salaryExpenses + businessExpenses).toFixed(2));
        const profit = Number((revenue - steelPurchases - totalExpenses).toFixed(2));

        // Cash flow calculation (simplified)
        const cashFlow = Number((revenue - totalExpenses).toFixed(2));

        data.push({
          month: monthName,
          year,
          revenue,
          expenses: totalExpenses,
          profit,
          cashFlow,
          steelPurchases,
          steelSales: revenue
        });
      }

      return data;
    } catch (error) {
      console.error('Error getting monthly financial data:', error);
      throw error;
    }
  }

  /**
   * Get expense breakdown by category
   */
  async getExpenseBreakdown(): Promise<ExpenseBreakdown[]> {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const lastMonthStr = lastMonth.toISOString().slice(0, 7);

      // Get current month business expenses by category
      const businessExpensesResult = await db.executeRawQuery(`
        SELECT 
          category,
          SUM(amount) as amount
        FROM business_expenses 
        WHERE strftime('%Y-%m', date) = ?
        GROUP BY category
      `, [currentMonth]);

      // Get current month salary expenses
      const salaryExpenses = await salaryHistoryService.getSalaryStatistics();

      // Get last month totals for trend calculation
      const lastMonthExpensesResult = await db.executeRawQuery(`
        SELECT 
          category,
          SUM(amount) as amount
        FROM business_expenses 
        WHERE strftime('%Y-%m', date) = ?
        GROUP BY category
      `, [lastMonthStr]);

      let lastMonthSalary = 0;
      try {
        const lastMonthSalaryResult = await db.executeRawQuery(`
          SELECT COALESCE(SUM(payment_amount), 0) as amount
          FROM salary_payments 
          WHERE payment_month = ?
        `, [lastMonthStr]);
        lastMonthSalary = lastMonthSalaryResult[0]?.amount || 0;
      } catch (error: any) {
        if (error.message?.includes('no such table: salary_payments')) {
          console.warn('salary_payments table not found, using 0 for last month salary');
          lastMonthSalary = 0;
        } else {
          throw error;
        }
      }

      // Calculate total expenses
      const businessExpensesByCategory = businessExpensesResult as any[];
      const totalBusinessExpenses = Number(businessExpensesByCategory.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2));
      const totalSalaryExpenses = Number(salaryExpenses.total_paid_this_month.toFixed(2));
      const totalExpenses = Number((totalBusinessExpenses + totalSalaryExpenses).toFixed(2));

      const breakdown: ExpenseBreakdown[] = [];

      // Add salary expenses (using lastMonthSalary we calculated above)
      const salaryTrend = lastMonthSalary > 0 ? ((totalSalaryExpenses - lastMonthSalary) / lastMonthSalary) * 100 : 0;

      breakdown.push({
        category: 'Staff Salaries',
        amount: totalSalaryExpenses,
        percentage: totalExpenses > 0 ? Number(((totalSalaryExpenses / totalExpenses) * 100).toFixed(2)) : 0,
        monthlyTrend: Number(salaryTrend.toFixed(2))
      });

      // Add business expense categories
      for (const expense of businessExpensesByCategory) {
        const lastMonthAmount = lastMonthExpensesResult.find(exp => exp.category === expense.category)?.amount || 0;
        const trend = lastMonthAmount > 0 ? Number((((expense.amount - lastMonthAmount) / lastMonthAmount) * 100).toFixed(2)) : 0;

        breakdown.push({
          category: this.formatCategoryName(expense.category),
          amount: Number(expense.amount.toFixed(2)),
          percentage: totalExpenses > 0 ? Number(((expense.amount / totalExpenses) * 100).toFixed(2)) : 0,
          monthlyTrend: trend
        });
      }

      return breakdown.sort((a, b) => b.amount - a.amount);
    } catch (error) {
      console.error('Error getting expense breakdown:', error);
      throw error;
    }
  }

  /**
   * Get cash flow data
   */
  async getCashFlowData(): Promise<CashFlowData> {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);

      // Get customer payments (inflow)
      const customerPaymentsResult = await db.executeRawQuery(`
        SELECT COALESCE(SUM(amount), 0) as customer_payments
        FROM payments 
        WHERE strftime('%Y-%m', date) = ?
      `, [currentMonth]);

      // Get vendor payments (outflow) - using 'date' instead of 'payment_date'
      const vendorPaymentsResult = await db.executeRawQuery(`
        SELECT COALESCE(SUM(amount), 0) as vendor_payments
        FROM vendor_payments 
        WHERE strftime('%Y-%m', date) = ?
      `, [currentMonth]);

      // Get business expenses (outflow)
      const businessExpensesResult = await db.executeRawQuery(`
        SELECT COALESCE(SUM(amount), 0) as business_expenses
        FROM business_expenses 
        WHERE strftime('%Y-%m', date) = ?
      `, [currentMonth]);

      // Get salary payments (outflow)
      const salaryStats = await salaryHistoryService.getSalaryStatistics();

      const customerPayments = Number(((customerPaymentsResult[0] as any)?.customer_payments || 0).toFixed(2));
      const vendorPayments = Number(((vendorPaymentsResult[0] as any)?.vendor_payments || 0).toFixed(2));
      const businessExpenses = Number(((businessExpensesResult[0] as any)?.business_expenses || 0).toFixed(2));
      const salaryPayments = Number(salaryStats.total_paid_this_month.toFixed(2));

      const inflow = customerPayments;
      const outflow = Number((vendorPayments + businessExpenses + salaryPayments).toFixed(2));
      const net = Number((inflow - outflow).toFixed(2));

      return {
        inflow,
        outflow,
        net,
        customerPayments,
        vendorPayments,
        expenses: businessExpenses,
        salaries: salaryPayments
      };
    } catch (error) {
      console.error('Error getting cash flow data:', error);
      throw error;
    }
  }

  /**
   * Get top customers with outstanding balances
   */
  async getTopCustomersOutstanding(limit: number = 10): Promise<CustomerOutstanding[]> {
    try {
      const result = await db.executeRawQuery(`
        SELECT 
          c.id as customer_id,
          c.name as customer_name,
          COALESCE(SUM(i.remaining_balance), 0) as outstanding_amount,
          MAX(p.date) as last_payment_date,
          COUNT(i.id) as total_invoices,
          CASE 
            WHEN MAX(p.date) IS NULL THEN 999
            ELSE CAST((julianday('now') - julianday(MAX(p.date))) AS INTEGER)
          END as days_overdue
        FROM customers c
        LEFT JOIN invoices i ON c.id = i.customer_id AND i.remaining_balance > 0
        LEFT JOIN payments p ON c.id = p.customer_id
        WHERE i.remaining_balance > 0
        GROUP BY c.id, c.name
        HAVING outstanding_amount > 0
        ORDER BY outstanding_amount DESC
        LIMIT ?
      `, [limit]);

      return result as CustomerOutstanding[];
    } catch (error) {
      console.error('Error getting top customers outstanding:', error);
      return [];
    }
  }

  /**
   * Get top vendors with outstanding payments
   */
  async getTopVendorsOutstanding(limit: number = 10): Promise<VendorOutstanding[]> {
    try {
      const result = await db.executeRawQuery(`
        SELECT 
          v.id as vendor_id,
          v.name as vendor_name,
          COALESCE(SUM(sr.grand_total) - COALESCE(SUM(vp.amount), 0), 0) as outstanding_amount,
          MAX(vp.date) as last_payment_date,
          COUNT(sr.id) as total_purchases,
          CASE 
            WHEN MAX(vp.date) IS NULL THEN 999
            ELSE CAST((julianday('now') - julianday(MAX(vp.date))) AS INTEGER)
          END as days_overdue
        FROM vendors v
        LEFT JOIN stock_receiving sr ON v.id = sr.vendor_id
        LEFT JOIN vendor_payments vp ON v.id = vp.vendor_id
        WHERE sr.grand_total > 0
        GROUP BY v.id, v.name
        HAVING outstanding_amount > 0
        ORDER BY outstanding_amount DESC
        LIMIT ?
      `, [limit]);

      return result as VendorOutstanding[];
    } catch (error) {
      console.error('Error getting top vendors outstanding:', error);
      return [];
    }
  }

  /**
   * Get monthly expenses breakdown
   */
  async getMonthlyExpenses(months: number = 12): Promise<MonthlyExpense[]> {
    try {
      const data: MonthlyExpense[] = [];
      const currentDate = new Date();

      for (let i = months - 1; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthStr = date.toISOString().slice(0, 7);
        const year = date.getFullYear();
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });

        // Get salary expenses
        let salaries = 0;
        try {
          const salaryResult = await db.executeRawQuery(`
            SELECT COALESCE(SUM(payment_amount), 0) as amount
            FROM salary_payments 
            WHERE payment_month = ?
          `, [monthStr]);
          salaries = salaryResult[0]?.amount || 0;
        } catch (error: any) {
          if (error.message?.includes('no such table: salary_payments')) {
            console.warn('salary_payments table not found, using 0 for salary expenses');
            salaries = 0;
          } else {
            throw error;
          }
        }

        // Get business expenses by category
        const expensesResult = await db.executeRawQuery(`
          SELECT 
            category,
            COALESCE(SUM(amount), 0) as amount
          FROM business_expenses 
          WHERE strftime('%Y-%m', date) = ?
          GROUP BY category
        `, [monthStr]);

        // Now we use the salaries value we already calculated above
        const expenses = expensesResult as any[];

        const transport = expenses.find(e => e.category === 'transport')?.amount || 0;
        const utilities = expenses.find(e => e.category === 'utilities')?.amount || 0;
        const misc = expenses.filter(e => !['transport', 'utilities'].includes(e.category))
          .reduce((sum, e) => sum + e.amount, 0);

        const total = salaries + transport + utilities + misc;

        data.push({
          month: monthName,
          year,
          salaries,
          transport,
          utilities,
          misc,
          total
        });
      }

      return data;
    } catch (error) {
      console.error('Error getting monthly expenses:', error);
      throw error;
    }
  }

  /**
   * Get profit trend over time
   */
  async getProfitTrend(months: number = 12): Promise<ProfitTrend[]> {
    try {
      const data: ProfitTrend[] = [];
      const currentDate = new Date();

      for (let i = months - 1; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthStr = date.toISOString().slice(0, 7);
        const year = date.getFullYear();
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });

        // Get revenue
        const revenueResult = await db.executeRawQuery(`
          SELECT COALESCE(SUM(grand_total), 0) as revenue
          FROM invoices 
          WHERE strftime('%Y-%m', date) = ?
        `, [monthStr]);

        // Get COGS (steel purchases)
        const cogsResult = await db.executeRawQuery(`
          SELECT COALESCE(SUM(grand_total), 0) as cogs
          FROM stock_receiving 
          WHERE strftime('%Y-%m', date) = ?
        `, [monthStr]);

        // Get total expenses
        let salaries = 0;
        try {
          const salaryResult = await db.executeRawQuery(`
            SELECT COALESCE(SUM(payment_amount), 0) as salaries
            FROM salary_payments 
            WHERE payment_month = ?
          `, [monthStr]);
          salaries = salaryResult[0]?.salaries || 0;
        } catch (error: any) {
          if (error.message?.includes('no such table: salary_payments')) {
            console.warn('salary_payments table not found, using 0 for salaries');
            salaries = 0;
          } else {
            throw error;
          }
        }

        let businessExpenses = 0;
        try {
          const businessExpensesResult = await db.executeRawQuery(`
            SELECT COALESCE(SUM(amount), 0) as expenses
            FROM business_expenses 
            WHERE strftime('%Y-%m', date) = ?
          `, [monthStr]);
          businessExpenses = businessExpensesResult[0]?.expenses || 0;
        } catch (error: any) {
          if (error.message?.includes('no such table: business_expenses')) {
            console.warn('business_expenses table not found, using 0 for business expenses');
            businessExpenses = 0;
          } else {
            throw error;
          }
        }

        const revenue = (revenueResult[0] as any)?.revenue || 0;
        const cogs = (cogsResult[0] as any)?.cogs || 0;

        const grossProfit = revenue - cogs;
        const totalExpenses = salaries + businessExpenses;
        const netProfit = grossProfit - totalExpenses;
        const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

        data.push({
          month: monthName,
          year,
          revenue,
          cogs,
          grossProfit,
          expenses: totalExpenses,
          netProfit,
          profitMargin
        });
      }

      return data;
    } catch (error) {
      console.error('Error getting profit trend:', error);
      throw error;
    }
  }

  /**
   * Record a business expense
   */
  async recordExpense(expense: {
    date: string;
    category: 'salaries' | 'transport' | 'utilities' | 'rent' | 'misc';
    description: string;
    amount: number;
    payment_method: 'cash' | 'bank_transfer' | 'cheque';
    reference_number?: string;
    approved_by: string;
    notes?: string;
  }): Promise<void> {
    try {
      await this.initializeTables();

      await db.executeCommand(`
        INSERT INTO business_expenses (
          date, category, description, amount, payment_method,
          reference_number, approved_by, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        expense.date,
        expense.category,
        expense.description,
        expense.amount,
        expense.payment_method,
        expense.reference_number || null,
        expense.approved_by,
        expense.notes || null
      ]);

      // Record cash transaction if payment method is cash
      if (expense.payment_method === 'cash') {
        await this.recordCashTransaction({
          date: expense.date,
          type: 'out',
          category: expense.category,
          description: expense.description,
          amount: expense.amount,
          reference_type: 'expense',
          created_by: expense.approved_by
        });
      }

      // Clear cache after recording new expense
      this.clearCache();

      // Trigger auto-refresh for financial data
      DataChangeDetector.getInstance().notifyDataChange('business-expense-recorded', {
        category: expense.category,
        amount: expense.amount
      });

      // Log audit event
      await auditLogService.logEvent({
        user_id: 1,
        user_name: expense.approved_by,
        action: 'CREATE',
        entity_type: 'SYSTEM',
        entity_id: '',
        description: `Business expense recorded: ${expense.category} - ${expense.description} (${expense.amount})`,
        new_values: expense
      });

      console.log('✅ Business expense recorded successfully');
    } catch (error) {
      console.error('❌ Error recording business expense:', error);
      throw error;
    }
  }

  /**
   * Record a cash transaction
   */
  async recordCashTransaction(transaction: {
    date: string;
    type: 'in' | 'out';
    category: string;
    description: string;
    amount: number;
    reference_type?: string;
    reference_id?: number;
    created_by: string;
  }): Promise<void> {
    try {
      // Get current cash balance
      const balanceResult = await db.executeRawQuery(`
        SELECT COALESCE(balance_after, 0) as current_balance
        FROM cash_transactions 
        ORDER BY created_at DESC 
        LIMIT 1
      `);

      const currentBalance = (balanceResult[0] as any)?.current_balance || 0;
      const balanceAfter = transaction.type === 'in'
        ? currentBalance + transaction.amount
        : currentBalance - transaction.amount;

      await db.executeCommand(`
        INSERT INTO cash_transactions (
          date, type, category, description, amount, balance_after,
          reference_type, reference_id, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        transaction.date,
        transaction.type,
        transaction.category,
        transaction.description,
        transaction.amount,
        balanceAfter,
        transaction.reference_type || null,
        transaction.reference_id || null,
        transaction.created_by
      ]);

      console.log(`✅ Cash transaction recorded: ${transaction.type} ${transaction.amount}, balance: ${balanceAfter}`);
    } catch (error) {
      console.error('❌ Error recording cash transaction:', error);
      throw error;
    }
  }

  /**
   * Format category name for display
   */
  private formatCategoryName(category: string): string {
    const names: Record<string, string> = {
      'salaries': 'Staff Salaries',
      'transport': 'Transportation',
      'utilities': 'Utilities',
      'rent': 'Rent',
      'misc': 'Miscellaneous'
    };
    return names[category] || category;
  }

  /**
   * Export financial data to CSV
   */
  async exportFinancialReport(): Promise<string> {
    try {
      const summary = await this.getFinancialSummary();

      let csv = 'Financial Report\n\n';
      csv += 'Business Metrics\n';
      csv += 'Metric,Amount\n';
      csv += `Total Sales,${summary.businessMetrics.totalSales}\n`;
      csv += `Total Purchases,${summary.businessMetrics.totalPurchases}\n`;
      csv += `Outstanding Receivables,${summary.businessMetrics.outstandingReceivables}\n`;
      csv += `Outstanding Payables,${summary.businessMetrics.outstandingPayables}\n`;
      csv += `Cash in Hand,${summary.businessMetrics.cashInHand}\n`;
      csv += `Net Profit,${summary.businessMetrics.netProfit}\n`;
      csv += `Profit Margin,${summary.businessMetrics.profitMargin}%\n\n`;

      csv += 'Monthly Data\n';
      csv += 'Month,Year,Revenue,Expenses,Profit\n';
      summary.monthlyData.forEach(data => {
        csv += `${data.month},${data.year},${data.revenue},${data.expenses},${data.profit}\n`;
      });

      return csv;
    } catch (error) {
      console.error('Error exporting financial report:', error);
      throw error;
    }
  }
}

export const financeService = FinanceService.getInstance();
