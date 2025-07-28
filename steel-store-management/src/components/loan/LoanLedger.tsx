import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search,
  Download,
  Users,
  DollarSign,
  Calendar,
  Phone,
  MapPin,
  Filter,
  RefreshCw,
  CreditCard,
  AlertCircle,
  Clock
} from 'lucide-react';
import { db } from '../../services/database';
import { formatCurrency } from '../../utils/formatters';
import { useRealTimeUpdates } from '../../hooks/useRealTimeUpdates';
import { useActivityLogger } from '../../hooks/useActivityLogger';
import toast from 'react-hot-toast';

interface LoanCustomer {
  id: number;
  name: string;
  phone?: string;
  address?: string;
  total_outstanding: number;
  last_payment_date?: string;
  last_invoice_date: string;
  invoice_count: number;
  payment_count: number;
  days_overdue: number;
}

const LoanLedger: React.FC = () => {
  const navigate = useNavigate();
  const activityLogger = useActivityLogger();
  const [customers, setCustomers] = useState<LoanCustomer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<LoanCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'outstanding' | 'name' | 'overdue'>('outstanding');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Enhanced business intelligence stats
  const [summaryStats, setSummaryStats] = useState({
    totalCustomers: 0,
    totalOutstanding: 0,
    overdueCustomers: 0,
    urgentCustomers: 0
  });

  // Real-time updates integration
  useRealTimeUpdates({
    onPaymentRecorded: () => refreshData(),
    onInvoiceCreated: () => refreshData(),
    onInvoiceUpdated: () => refreshData(),
    onCustomerBalanceUpdated: () => refreshData(),
  });

  const refreshData = useCallback(async () => {
    await loadLoanCustomers();
    setLastRefresh(new Date());
  }, []);

  useEffect(() => {
    loadLoanCustomers();
  }, []);

  useEffect(() => {
    filterAndSortCustomers();
  }, [customers, searchTerm, sortBy, sortOrder]);

  useEffect(() => {
    calculateSummaryStats();
  }, [filteredCustomers]);

  const loadLoanCustomers = async () => {
    try {
      setLoading(true);
      
      // Try optimized query first
      const loanData = await db.getLoanLedgerData();
      
      if (loanData && loanData.length > 0) {
        setCustomers(loanData);
      } else {
        // Fallback to legacy method
        await loadLoanCustomersLegacy();
      }
    } catch (error) {
      console.error('Error loading loan customers:', error);
      toast.error('Failed to load customer loan data');
      // Try legacy method as fallback
      await loadLoanCustomersLegacy();
    } finally {
      setLoading(false);
    }
  };

  const loadLoanCustomersLegacy = async () => {
    try {
      // Get all customers with outstanding balances
      const allCustomers = await db.getAllCustomers();
      const customerBalances: LoanCustomer[] = [];

      for (const customer of allCustomers.slice(0, 100)) { // Increased limit
        const balance = await db.getCustomerBalance(customer.id);
        
        if (balance.outstanding > 0) {
          // Get basic invoice and payment info
          const [invoices, payments] = await Promise.all([
            db.getCustomerInvoices(customer.id),
            db.getCustomerPayments(customer.id)
          ]);
          
          // Calculate days overdue
          const lastInvoice = invoices.length > 0 ? invoices[0] : null;
          const lastInvoiceDate = lastInvoice ? new Date(lastInvoice.date) : new Date();
          const daysOverdue = Math.floor((Date.now() - lastInvoiceDate.getTime()) / (1000 * 60 * 60 * 24));
          
          // Get last payment date
          const lastPayment = payments.length > 0 ? payments[0] : null;

          customerBalances.push({
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            address: customer.address,
            total_outstanding: balance.outstanding,
            last_payment_date: lastPayment ? lastPayment.date : undefined,
            last_invoice_date: lastInvoice ? lastInvoice.date : new Date().toISOString(),
            invoice_count: invoices.length,
            payment_count: payments.length,
            days_overdue: daysOverdue
          });
        }
      }

      setCustomers(customerBalances);
    } catch (error) {
      console.error('Error in legacy loan loading:', error);
      toast.error('Failed to load loan data');
    }
  };

  const filterAndSortCustomers = () => {
    let filtered = [...customers];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.address?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'outstanding':
          comparison = a.total_outstanding - b.total_outstanding;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'overdue':
          comparison = a.days_overdue - b.days_overdue;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredCustomers(filtered);
  };

  const calculateSummaryStats = () => {
    const totalCustomers = filteredCustomers.length;
    const totalOutstanding = filteredCustomers.reduce((sum, customer) => sum + customer.total_outstanding, 0);
    const overdueCustomers = filteredCustomers.filter(customer => customer.days_overdue > 30).length;
    const urgentCustomers = filteredCustomers.filter(customer => customer.days_overdue > 60).length;

    setSummaryStats({
      totalCustomers,
      totalOutstanding,
      overdueCustomers,
      urgentCustomers
    });
  };

  const handleQuickPayment = async (customerId: number) => {
    navigate(`/payment?customer_id=${customerId}&source=loan_ledger`);
  };

  const exportToCSV = async () => {
    const headers = [
      'Customer Name', 'Phone', 'Outstanding Amount', 
      'Days Overdue', 'Last Payment Date'
    ];
    
    const csvData = filteredCustomers.map(customer => [
      customer.name,
      customer.phone || '',
      customer.total_outstanding.toFixed(2),
      customer.days_overdue.toString(),
      customer.last_payment_date || 'Never'
    ]);
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loan-ledger-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    // Log activity
    await activityLogger.logReportExported('Loan Ledger', 'CSV');
    
    toast.success('Loan ledger exported successfully');
  };

  const getUrgencyColor = (daysOverdue: number) => {
    if (daysOverdue > 60) return 'text-red-600';
    if (daysOverdue > 30) return 'text-orange-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Customer Loans</h3>
          <p className="text-gray-500">Please wait while we fetch the data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <DollarSign className="h-8 w-8 text-blue-600 mr-3" />
                Customer Receivables
              </h1>
              <p className="mt-1 text-gray-600">
                Manage outstanding customer payments • Updated: {lastRefresh.toLocaleTimeString()}
              </p>
            </div>
            
            <div className="mt-4 sm:mt-0 flex space-x-3">
              <button
                onClick={refreshData}
                className="flex items-center px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
              <button
                onClick={exportToCSV}
                className="flex items-center px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Summary Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <Users className="h-5 w-5 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Total Customers</p>
                  <p className="text-xl font-semibold text-gray-900">{summaryStats.totalCustomers}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <DollarSign className="h-5 w-5 text-red-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Total Outstanding</p>
                  <p className="text-xl font-semibold text-gray-900">{formatCurrency(summaryStats.totalOutstanding)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-orange-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Overdue (30+ days)</p>
                  <p className="text-xl font-semibold text-gray-900">{summaryStats.overdueCustomers}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Critical (60+ days)</p>
                  <p className="text-xl font-semibold text-gray-900">{summaryStats.urgentCustomers}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field as 'outstanding' | 'name' | 'overdue');
                  setSortOrder(order as 'asc' | 'desc');
                }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="outstanding-desc">Highest Amount First</option>
                <option value="outstanding-asc">Lowest Amount First</option>
                <option value="overdue-desc">Most Overdue First</option>
                <option value="overdue-asc">Least Overdue First</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
              </select>

              <div className="flex items-center text-sm text-gray-500 px-3 py-2">
                <Filter className="h-4 w-4 mr-2" />
                <span>{filteredCustomers.length} customers</span>
              </div>
            </div>
          </div>

          {/* Customer Table */}
          <div className="bg-white rounded-lg shadow border overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Outstanding Receivables</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Outstanding Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Days Overdue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Last Payment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {customer.days_overdue > 60 && (
                            <AlertCircle className="h-4 w-4 text-red-500 mr-3" />
                          )}
                          {customer.days_overdue > 30 && customer.days_overdue <= 60 && (
                            <Clock className="h-4 w-4 text-orange-500 mr-3" />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                            <div className="text-sm text-gray-500">
                              {customer.invoice_count} invoices • {customer.payment_count} payments
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          {customer.phone && (
                            <div className="flex items-center text-gray-900 mb-1">
                              <Phone className="h-4 w-4 mr-2 text-gray-400" />
                              <button
                                onClick={() => window.open(`tel:${customer.phone}`)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                {customer.phone}
                              </button>
                            </div>
                          )}
                          {customer.address && (
                            <div className="flex items-center text-gray-500">
                              <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                              <span className="truncate max-w-xs">{customer.address}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-lg font-semibold text-red-600">
                          {formatCurrency(customer.total_outstanding)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`text-sm font-medium ${getUrgencyColor(customer.days_overdue)}`}>
                          {customer.days_overdue} days
                        </div>
                        <div className="text-xs text-gray-500">
                          Since {new Date(customer.last_invoice_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          {customer.last_payment_date ? (
                            <div className="flex items-center text-gray-900">
                              <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                              {new Date(customer.last_payment_date).toLocaleDateString()}
                            </div>
                          ) : (
                            <span className="text-red-500 font-medium">No payments</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleQuickPayment(customer.id)}
                            className="px-3 py-1 text-sm text-white bg-green-600 hover:bg-green-700 rounded transition-colors"
                            title="Record Payment"
                          >
                            <CreditCard className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/loan-detail/${customer.id}`)}
                            className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-600 rounded transition-colors"
                            title="View Loan Details"
                          >
                            Details
                          </button>
                          <button
                            onClick={() => navigate(`/customers/${customer.id}`)}
                            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded transition-colors"
                            title="View Profile"
                          >
                            Profile
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredCustomers.length === 0 && (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No customers with outstanding payments</h3>
                <p className="text-sm text-gray-500 mb-4">
                  {searchTerm 
                    ? 'No customers match your search criteria.' 
                    : 'All customers have cleared their outstanding balances.'}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoanLedger;
