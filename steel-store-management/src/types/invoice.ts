// Invoice-related TypeScript interfaces and types

export interface Customer {
  id: number;
  name: string;
  phone?: string;
  address?: string;
  cnic?: string;
  total_balance: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  size_mm?: string;
  grade?: string;
  unit: string;
  rate_per_unit: number;
  current_stock: number;
  min_stock_alert: number;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id?: number;
  invoice_id?: number;
  product_id: number;
  product_name?: string;
  quantity: number;
  rate: number;
  total: number;
  unit?: string;
}

export interface Invoice {
  id?: number;
  bill_number?: string;
  customer_id: number;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_cnic?: string;
  subtotal: number;
  discount: number;
  grand_total: number;
  payment_received: number;
  remaining_balance: number;
  status: 'pending' | 'partially_paid' | 'paid';
  payment_method?: string;
  notes?: string;
  items: InvoiceItem[];
  created_at?: string;
  updated_at?: string;
}

export interface InvoiceFilters {
  customer_id?: number;
  status?: string;
  from_date?: string;
  to_date?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface Payment {
  id?: number;
  customer_id: number;
  invoice_id?: number;
  amount: number;
  payment_method: 'cash' | 'bank_transfer' | 'cheque' | 'card';
  reference?: string;
  created_at?: string;
}

export interface InvoiceCalculation {
  subtotal: number;
  discount: number;
  grandTotal: number;
  remainingBalance: number;
}

export interface StockValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface InvoiceFormData {
  customer_id: number | null;
  items: InvoiceItem[];
  discount: number;
  payment_received: number;
  payment_method: string;
  notes: string;
}

export interface InvoiceFormErrors {
  customer_id?: string;
  items?: string[];
  discount?: string;
  payment_received?: string;
  general?: string;
}



// Payment method options
export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'card', label: 'Card Payment' }
] as const;

// Invoice status options
export const INVOICE_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'partially_paid', label: 'Partially Paid', color: 'bg-blue-100 text-blue-800' },
  { value: 'paid', label: 'Paid', color: 'bg-green-100 text-green-800' }
] as const;

// Utility functions
export const formatCurrency = (amount: number | undefined | null): string => {
  const safeAmount = amount ?? 0;
  // Get currency from settings
  const currency = localStorage.getItem('settings_general') 
    ? JSON.parse(localStorage.getItem('settings_general') || '{}').currency || 'PKR'
    : 'PKR';
  
  const localeMap: Record<string, string> = {
    'INR': 'en-IN',
    'PKR': 'en-PK',
    'USD': 'en-US',
    'EUR': 'en-DE',
    'GBP': 'en-GB',
    'JPY': 'ja-JP',
    'AED': 'ar-AE',
    'SAR': 'ar-SA'
  };
  
  const locale = localeMap[currency] || 'en-US';
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(safeAmount);
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

export const calculateInvoiceTotal = (items: InvoiceItem[]): number => {
  return items.reduce((sum, item) => sum + item.total, 0);
};

export const validateInvoiceItem = (item: InvoiceItem): string[] => {
  const errors: string[] = [];
  
  if (!item.product_id) {
    errors.push('Product is required');
  }
  
  if (!item.quantity || item.quantity <= 0) {
    errors.push('Quantity must be greater than 0');
  }
  
  if (!item.rate || item.rate <= 0) {
    errors.push('Rate must be greater than 0');
  }
  
  if (item.quantity && item.rate) {
    const expectedTotal = item.quantity * item.rate;
    if (Math.abs(expectedTotal - item.total) > 0.01) {
      errors.push('Total calculation is incorrect');
    }
  }
  
  return errors;
};

export const getInvoiceStatusInfo = (status: string) => {
  const statusInfo = INVOICE_STATUSES.find(s => s.value === status);
  return statusInfo || { value: status, label: status, color: 'bg-gray-100 text-gray-800' };
};