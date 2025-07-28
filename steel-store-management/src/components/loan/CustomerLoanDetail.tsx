import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formatInvoiceNumber } from '../../utils/numberFormatting';
import { 
  ArrowLeft,
  Calendar,
  DollarSign,
  FileText,
  Phone,
  MapPin,
  AlertCircle,
  CreditCard,
  Download,
  RefreshCw,
  TrendingUp,
  User
} from 'lucide-react';
import { db } from '../../services/database';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

interface Invoice {
  id: number;
  invoice_number: string;
  date: string;
  total_amount: number;
  paid_amount: number;
  outstanding: number;
  days_overdue: number;
  status: 'paid' | 'partial' | 'unpaid';
}

interface Payment {
  id: number;
  date: string;
  amount: number;
  method: string;
  reference?: string;
  invoice_id?: number;
}

interface CustomerInfo {
  id: number;
  name: string;
  phone?: string;
  address?: string;
  email?: string;
  created_at: string;
}

interface LoanSummary {
  totalInvoices: number;
  totalInvoiceAmount: number;
  totalPaid: number;
  totalOutstanding: number;
  overdueInvoices: number;
  overdueAmount: number;
  lastPaymentDate?: string;
  averagePaymentDays: number;
  oldestUnpaidInvoice?: Invoice;
}

const CustomerLoanDetail: React.FC = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<LoanSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices');

  useEffect(() => {
    if (customerId) {
      loadCustomerLoanData(parseInt(customerId));
    }
  }, [customerId]);

  const loadCustomerLoanData = async (id: number) => {
    try {
      setLoading(true);
      
      // Load customer info
      const customerInfo = await db.getCustomer(id);
      setCustomer(customerInfo);

      // Load invoices with payment details
      const customerInvoices = await db.getCustomerInvoices(id);
      const customerPayments = await db.getCustomerPayments(id);

      // Process invoices to calculate outstanding amounts and overdue days
      const processedInvoices: Invoice[] = customerInvoices.map(invoice => {
        const paidAmount = customerPayments
          .filter(payment => payment.invoice_id === invoice.id)
          .reduce((sum, payment) => sum + payment.amount, 0);
        
        const outstanding = invoice.total_amount - paidAmount;
        const invoiceDate = new Date(invoice.date);
        const daysOverdue = outstanding > 0 
          ? Math.floor((Date.now() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        let status: 'paid' | 'partial' | 'unpaid' = 'unpaid';
        if (paidAmount >= invoice.total_amount) status = 'paid';
        else if (paidAmount > 0) status = 'partial';

        return {
          id: invoice.id,
          invoice_number: invoice.bill_number || `INV-${invoice.id}`,
          date: invoice.date,
          total_amount: invoice.total_amount,
          paid_amount: paidAmount,
          outstanding,
          days_overdue: daysOverdue,
          status
        };
      });

      setInvoices(processedInvoices);
      setPayments(customerPayments);

      // Calculate summary statistics
      calculateSummary(processedInvoices, customerPayments);

    } catch (error) {
      console.error('Error loading customer loan data:', error);
      toast.error('Failed to load customer loan information');
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (invoices: Invoice[], payments: Payment[]) => {
    const totalInvoices = invoices.length;
    const totalInvoiceAmount = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + inv.paid_amount, 0);
    const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.outstanding, 0);
    const overdueInvoices = invoices.filter(inv => inv.outstanding > 0 && inv.days_overdue > 30).length;
    const overdueAmount = invoices
      .filter(inv => inv.outstanding > 0 && inv.days_overdue > 30)
      .reduce((sum, inv) => sum + inv.outstanding, 0);
    
    const lastPayment = payments.length > 0 
      ? payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
      : null;

    // Calculate average payment days
    const paidInvoices = invoices.filter(inv => inv.status === 'paid');
    const paymentDays = paidInvoices.map(inv => {
      const invoiceDate = new Date(inv.date);
      const relatedPayments = payments.filter(p => p.invoice_id === inv.id);
      if (relatedPayments.length === 0) return 0;
      const lastPaymentDate = new Date(relatedPayments[relatedPayments.length - 1].date);
      return Math.floor((lastPaymentDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
    });
    const averagePaymentDays = paymentDays.length > 0 
      ? Math.round(paymentDays.reduce((sum, days) => sum + days, 0) / paymentDays.length)
      : 0;

    // Find oldest unpaid invoice
    const unpaidInvoices = invoices
      .filter(inv => inv.outstanding > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const oldestUnpaidInvoice = unpaidInvoices.length > 0 ? unpaidInvoices[0] : undefined;

    setSummary({
      totalInvoices,
      totalInvoiceAmount,
      totalPaid,
      totalOutstanding,
      overdueInvoices,
      overdueAmount,
      lastPaymentDate: lastPayment?.date,
      averagePaymentDays,
      oldestUnpaidInvoice
    });
  };

  const handleQuickPayment = () => {
    navigate(`/payment?customer_id=${customerId}&source=loan_detail`);
  };

  const exportLoanReport = () => {
    if (!customer || !summary) return;

    const reportData = [
      ['Customer Loan Report'],
      ['Generated on:', new Date().toLocaleDateString()],
      [''],
      ['Customer Information:'],
      ['Name:', customer.name],
      ['Phone:', customer.phone || 'N/A'],
      ['Address:', customer.address || 'N/A'],
      [''],
      ['Loan Summary:'],
      ['Total Invoices:', summary.totalInvoices.toString()],
      ['Total Invoice Amount:', formatCurrency(summary.totalInvoiceAmount)],
      ['Total Paid:', formatCurrency(summary.totalPaid)],
      ['Total Outstanding:', formatCurrency(summary.totalOutstanding)],
      ['Overdue Invoices:', summary.overdueInvoices.toString()],
      ['Overdue Amount:', formatCurrency(summary.overdueAmount)],
      ['Average Payment Days:', summary.averagePaymentDays.toString()],
      [''],
      ['Outstanding Invoices:'],
      ['Invoice Number', 'Date', 'Amount', 'Outstanding', 'Days Overdue']
    ];

    const outstandingInvoices = invoices.filter(inv => inv.outstanding > 0);
    outstandingInvoices.forEach(inv => {
      reportData.push([
        inv.invoice_number,
        new Date(inv.date).toLocaleDateString(),
        formatCurrency(inv.total_amount),
        formatCurrency(inv.outstanding),
        inv.days_overdue.toString()
      ]);
    });

    const csvContent = reportData
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${customer.name.replace(/\s+/g, '_')}_loan_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Loan report exported successfully');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'unpaid': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (daysOverdue: number) => {
    if (daysOverdue > 60) return 'text-red-600 font-semibold';
    if (daysOverdue > 30) return 'text-orange-600 font-medium';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Customer Loan Details</h3>
          <p className="text-gray-500">Please wait while we fetch the data...</p>
        </div>
      </div>
    );
  }

  if (!customer || !summary) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Customer Not Found</h3>
          <p className="text-gray-500 mb-4">The requested customer could not be found.</p>
          <button
            onClick={() => navigate('/loan-ledger')}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Return to Loan Ledger
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/loan-ledger')}
                className="mr-4 p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <User className="h-8 w-8 text-blue-600 mr-3" />
                  {customer.name} - Loan Details
                </h1>
                <p className="mt-1 text-gray-600">Complete loan ledger and payment history</p>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => loadCustomerLoanData(customer.id)}
                className="flex items-center px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
              <button
                onClick={exportLoanReport}
                className="flex items-center px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </button>
              <button
                onClick={handleQuickPayment}
                className="flex items-center px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Record Payment
              </button>
            </div>
          </div>

          {/* Customer Info Card */}
          <div className="bg-white rounded-lg shadow border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center">
                <User className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Customer Name</p>
                  <p className="font-medium text-gray-900">{customer.name}</p>
                </div>
              </div>
              {customer.phone && (
                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Phone Number</p>
                    <button
                      onClick={() => window.open(`tel:${customer.phone}`)}
                      className="font-medium text-blue-600 hover:text-blue-800"
                    >
                      {customer.phone}
                    </button>
                  </div>
                </div>
              )}
              {customer.address && (
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Address</p>
                    <p className="font-medium text-gray-900">{customer.address}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Loan Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Total Invoices</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.totalInvoices}</p>
                  <p className="text-sm text-gray-500">{formatCurrency(summary.totalInvoiceAmount)} total value</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Total Paid</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalPaid)}</p>
                  <p className="text-sm text-gray-500">
                    {summary.totalInvoiceAmount > 0 
                      ? Math.round((summary.totalPaid / summary.totalInvoiceAmount) * 100)
                      : 0}% of total
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <AlertCircle className="h-8 w-8 text-red-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Outstanding</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalOutstanding)}</p>
                  <p className="text-sm text-gray-500">{summary.overdueInvoices} overdue invoices</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-purple-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Avg Payment Days</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.averagePaymentDays}</p>
                  <p className="text-sm text-gray-500">
                    Last payment: {summary.lastPaymentDate 
                      ? new Date(summary.lastPaymentDate).toLocaleDateString()
                      : 'Never'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Priority Alert */}
          {summary.oldestUnpaidInvoice && summary.oldestUnpaidInvoice.days_overdue > 30 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
                <div>
                  <h4 className="text-sm font-medium text-red-800">Urgent: Overdue Payment</h4>
                  <p className="text-sm text-red-700">
                    Invoice {formatInvoiceNumber(summary.oldestUnpaidInvoice.invoice_number)} is {summary.oldestUnpaidInvoice.days_overdue} days overdue 
                    with {formatCurrency(summary.oldestUnpaidInvoice.outstanding)} outstanding.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow border">
            <div className="border-b">
              <nav className="flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('invoices')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'invoices'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Invoices ({invoices.length})
                </button>
                <button
                  onClick={() => setActiveTab('payments')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'payments'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Payments ({payments.length})
                </button>
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'invoices' && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Invoice
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Paid
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Outstanding
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Days Overdue
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {invoices.map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{formatInvoiceNumber(invoice.invoice_number)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{new Date(invoice.date).toLocaleDateString()}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{formatCurrency(invoice.total_amount)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-green-600">{formatCurrency(invoice.paid_amount)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-red-600">{formatCurrency(invoice.outstanding)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm ${getUrgencyColor(invoice.days_overdue)}`}>
                              {invoice.outstanding > 0 ? `${invoice.days_overdue} days` : '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {invoices.length === 0 && (
                    <div className="text-center py-8">
                      <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Invoices Found</h3>
                      <p className="text-gray-500">This customer has no invoices on record.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'payments' && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Method
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Reference
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Invoice
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {payments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                              <div className="text-sm text-gray-900">{new Date(payment.date).toLocaleDateString()}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-green-600">{formatCurrency(payment.amount)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{payment.method}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{payment.reference || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {payment.invoice_id ? `INV-${payment.invoice_id}` : 'General Payment'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {payments.length === 0 && (
                    <div className="text-center py-8">
                      <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Payments Found</h3>
                      <p className="text-gray-500">This customer has no payment records.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerLoanDetail;
