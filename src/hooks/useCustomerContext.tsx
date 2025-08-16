// Customer Context Hook for Unified State Management
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useDatabase } from './useDatabase';
import { eventBus, BUSINESS_EVENTS } from '../utils/eventBus';

interface CustomerSummary {
  totalInvoices: number;
  totalPaid: number;
  outstandingBalance: number;
  lastPaymentDate: string | null;
  creditLimit: number;
}

interface CustomerContextType {
  customer: any | null;
  summary: CustomerSummary | null;
  loading: boolean;
  refreshCustomer: () => Promise<void>;
  refreshSummary: () => Promise<void>;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export const CustomerProvider: React.FC<{ customerId: number; children: React.ReactNode }> = ({
  customerId,
  children
}) => {
  const [customer, setCustomer] = useState<any>(null);
  const [summary, setSummary] = useState<CustomerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const { db } = useDatabase();

  const refreshCustomer = async () => {
    try {
      const customerData = await db.getCustomer(customerId);
      setCustomer(customerData);
    } catch (error) {
      console.error('Error loading customer:', error);
    }
  };

  const refreshSummary = async () => {
    try {
      const balanceData = await db.getCustomerBalance(customerId);
      
      // Transform to expected summary format
      const summaryData: CustomerSummary = {
        totalInvoices: 0, // This would need to be calculated from invoices
        totalPaid: balanceData?.total_paid || 0,
        outstandingBalance: balanceData?.outstanding || 0,
        lastPaymentDate: null, // This would need to be fetched from payments
        creditLimit: 0 // This would need to be added to customer data
      };
      
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading customer summary:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([refreshCustomer(), refreshSummary()]);
      setLoading(false);
    };

    loadData();

    // Listen for real-time updates
    const handleCustomerUpdate = (data: any) => {
      if (data.customerId === customerId) {
        refreshCustomer();
        refreshSummary();
      }
    };

    eventBus.on(BUSINESS_EVENTS.CUSTOMER_UPDATED, handleCustomerUpdate);
    eventBus.on(BUSINESS_EVENTS.INVOICE_CREATED, handleCustomerUpdate);
    eventBus.on(BUSINESS_EVENTS.PAYMENT_RECORDED, handleCustomerUpdate);

    return () => {
      eventBus.off(BUSINESS_EVENTS.CUSTOMER_UPDATED, handleCustomerUpdate);
      eventBus.off(BUSINESS_EVENTS.INVOICE_CREATED, handleCustomerUpdate);
      eventBus.off(BUSINESS_EVENTS.PAYMENT_RECORDED, handleCustomerUpdate);
    };
  }, [customerId]);

  return (
    <CustomerContext.Provider value={{
      customer,
      summary,
      loading,
      refreshCustomer,
      refreshSummary
    }}>
      {children}
    </CustomerContext.Provider>
  );
};

export const useCustomerContext = () => {
  const context = useContext(CustomerContext);
  if (!context) {
    throw new Error('useCustomerContext must be used within a CustomerProvider');
  }
  return context;
};
