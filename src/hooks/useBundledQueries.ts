/**
 * 🚀 EXPERT SOLUTION: Bundled Query Hook
 * Eliminates multiple database round trips - the #1 performance killer
 */

import { useCallback } from 'react';
import { db } from '../services/database';

export const useBundledQueries = () => {
  
  // Bundle dashboard queries into single call
  const loadDashboardData = useCallback(async () => {
    const startTime = performance.now();
    
    // Execute all dashboard queries in parallel
    const [stats, recentInvoices, lowStock, customers, products] = await Promise.all([
      db.getDashboardStats(),
      db.getInvoices({ limit: 5, orderBy: 'date', orderDirection: 'DESC' }),
      db.getLowStockProducts({ limit: 10 }),
      db.getCustomers({ limit: 10 }),
      db.getProducts({ limit: 10 })
    ]);
    
    const loadTime = performance.now() - startTime;
    console.log(`⚡ Dashboard loaded in ${loadTime.toFixed(0)}ms`);
    
    return { stats, recentInvoices, lowStock, customers, products };
  }, []);

  // Bundle customer list data
  const loadCustomerListData = useCallback(async () => {
    const [customers, stats] = await Promise.all([
      db.getCustomersOptimized({ limit: 100, includeBalance: true }),
      db.getCustomerStats()
    ]);
    
    return { customers, stats };
  }, []);

  // Bundle invoice list data  
  const loadInvoiceListData = useCallback(async (filters = {}) => {
    const [invoices, customers, stats] = await Promise.all([
      db.getInvoices({ ...filters, limit: 100 }),
      db.getCustomers({ limit: 1000 }), // For dropdown
      db.getInvoiceStats()
    ]);
    
    return { invoices, customers, stats };
  }, []);

  // Bundle product list data
  const loadProductListData = useCallback(async () => {
    const [products, categories, stats] = await Promise.all([
      db.getProducts({ limit: 100 }),
      db.getProductCategories(),
      db.getStockStats()
    ]);
    
    return { products, categories, stats };
  }, []);

  return {
    loadDashboardData,
    loadCustomerListData,
    loadInvoiceListData,
    loadProductListData
  };
};
