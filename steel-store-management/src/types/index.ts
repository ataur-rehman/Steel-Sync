export interface User {
  id: number;
  username: string;
  fullName: string;
}

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
  category?: string;
  unit_type: 'kg-grams' | 'piece' | 'bag' | 'kg'; // Unit type determines how unit and stock are handled
  unit: string; // Format depends on unit_type: "1600-60" for kg-grams, "500.10" for kg, "100" for pieces, "50" for bags
  rate_per_unit: number;
  current_stock: string; // Stock in same unit format as unit
  min_stock_alert: string; // Alert level in same unit format
  size?: string; // Optional size
  grade?: string; // Optional grade
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: number;
  bill_number: string;
  customer_id: number;
  customer_name?: string;
  subtotal: number;
  discount: number;
  grand_total: number;
  payment_received: number;
  remaining_balance: number;
  status: 'pending' | 'paid' | 'partially_paid';
  created_at: string;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id?: number;
  invoice_id?: number;
  product_id: number;
  product_name: string;
  unit: string;
  quantity: string; // Changed to string for unit format compatibility
  unit_price: number;
  total_price: number;
  max_quantity?: number;
  length?: number;
  pieces?: number;
}

// Enhanced invoice creation interface
export interface InvoiceCreationData {
  customer_id: number;
  items: {
    product_id: number;
    product_name?: string;
    quantity: string;
    unit_price: number;
    total_price: number;
  }[];
  discount?: number;
  payment_amount?: number;
  payment_method?: string;
  notes?: string;
}

export interface Payment {
  id: number;
  customer_id: number;
  invoice_id?: number;
  amount: number;
  payment_method: string;
  reference?: string;
  created_at: string;
}

export interface Return {
  id: number;
  invoice_id: number;
  product_id: number;
  quantity: number;
  rate: number;
  total: number;
  reason?: string;
  created_at: string;
}

export interface StockHistory {
  id: number;
  product_id: number;
  type: 'sale' | 'return' | 'manual_adjustment' | 'purchase';
  quantity: number;
  reference_id?: number;
  reference_type?: string;
  previous_stock: number;
  new_stock: number;
  notes?: string;
  created_at: string;
}

export interface DailyLedgerEntry {
  id: number;
  date: string;
  type: 'sale' | 'purchase' | 'payment' | 'return';
  amount: number;
  description?: string;
  reference_id?: number;
  reference_type?: string;
  created_at: string;
}

export interface Setting {
  id: number;
  key: string;
  value: string;
  updated_at: string;
}

// Enhanced Payment Types with multiple channels
export interface PaymentChannel {
  id: number;
  name: string;
  type: 'cash' | 'bank' | 'cheque' | 'online';
  account_details?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EnhancedPayment {
  id: number;
  customer_id: number;
  customer_name: string;
  amount: number;
  payment_channel_id: number;
  payment_channel_name: string;
  payment_type: 'invoice_payment' | 'advance_payment' | 'non_invoice_payment';
  reference_invoice_id?: number;
  reference_number?: string;
  cheque_number?: string;
  cheque_date?: string;
  notes?: string;
  date: string;
  time: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Stock Receiving Module Types
export interface Vendor {
  id: number;
  name: string;
  company_name?: string;
  phone?: string;
  address?: string;
  contact_person?: string;
  payment_terms?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockReceiving {
  id: number;
  vendor_id: number;
  vendor_name: string;
  receiving_number: string;
  total_amount: number;
  payment_amount: number;
  remaining_balance: number;
  payment_status: 'pending' | 'partial' | 'paid';
  notes?: string;
  date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  items?: StockReceivingItem[];
}

export interface StockReceivingItem {
  id?: number;
  receiving_id: number;
  product_id: number;
  product_name: string;
  quantity: string;
  unit_price: number;
  total_price: number;
  expiry_date?: string;
  batch_number?: string;
  notes?: string;
}

export interface VendorPayment {
  id: number;
  vendor_id: number;
  vendor_name: string;
  receiving_id?: number;
  amount: number;
  payment_channel_id: number;
  payment_channel_name: string;
  reference_number?: string;
  cheque_number?: string;
  cheque_date?: string;
  notes?: string;
  date: string;
  time: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Staff Management Types
export interface Staff {
  id: number;
  name: string;
  employee_id: string;
  phone?: string;
  address?: string;
  cnic?: string;
  position?: string;
  basic_salary: number;
  joining_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StaffLedgerEntry {
  id: number;
  staff_id: number;
  staff_name: string;
  entry_type: 'salary' | 'advance' | 'bonus' | 'deduction' | 'overtime';
  amount: number;
  description: string;
  reference_number?: string;
  month?: string;
  year?: number;
  date: string;
  time: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Enhanced Customer Ledger Types
export interface CustomerLedgerEntry {
  id: number;
  customer_id: number;
  customer_name: string;
  entry_type: 'debit' | 'credit';
  transaction_type: 'invoice' | 'payment' | 'advance' | 'manual_entry' | 'stock_handover' | 'return';
  amount: number;
  description: string;
  reference_id?: number;
  reference_number?: string;
  payment_channel_id?: number;
  payment_channel_name?: string;
  balance_before: number;
  balance_after: number;
  date: string;
  time: string;
  created_by: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Business Finance Types
export interface BusinessExpense {
  id: number;
  category: string;
  subcategory?: string;
  description: string;
  amount: number;
  payment_channel_id: number;
  payment_channel_name: string;
  reference_number?: string;
  vendor_name?: string;
  date: string;
  time: string;
  created_by: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface BusinessIncome {
  id: number;
  source: 'sales' | 'other';
  category: string;
  description: string;
  amount: number;
  payment_channel_id: number;
  payment_channel_name: string;
  reference_id?: number;
  reference_number?: string;
  date: string;
  time: string;
  created_by: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialSummary {
  total_income: number;
  total_expenses: number;
  net_profit: number;
  cash_flow: number;
  accounts_receivable: number;
  accounts_payable: number;
  inventory_value: number;
  period_start: string;
  period_end: string;
}