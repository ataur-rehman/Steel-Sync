import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search,
  Eye,
  Download,
  AlertTriangle,
  Users,
  DollarSign,
  Calendar,
  Phone,
  MapPin,
  Filter
} from 'lucide-react';
import { db } from '../../services/database';
import { formatCurrency } from '../../utils/formatters';
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
  risk_level: 'low' | 'medium' | 'high' | 'critical';
}

const LoanLedger: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<LoanCustomer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<LoanCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'outstanding' | 'name' | 'overdue'>('outstanding');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Summary stats
  const [summaryStats, setSummaryStats] = useState({
    totalCustomers: 0,
    totalOutstanding: 0,
    averageOutstanding: 0,
    criticalCustomers: 0
  });

  useEffect(() => {
    loadLoanCustomers();
  }, []);

  useEffect(() => {
    filterAndSortCustomers();
  }, [customers, searchTerm, selectedRiskLevel, sortBy, sortOrder]);

  useEffect(() => {
    calculateSummaryStats();
  }, [filteredCustomers]);

  const loadLoanCustomers = async () => {
    try {
      setLoading(true);
      
      // Get all customers with outstanding balances
      const allCustomers = await db.getAllCustomers();
      const customerBalances: LoanCustomer[] = [];

      for (const customer of allCustomers) {
        const balance = await db.getCustomerBalance(customer.id);
        
        if (balance.outstanding > 0) {
          // Get invoice and payment statistics
          const invoices = await db.getCustomerInvoices(customer.id);
          const payments = await db.getCustomerPayments(customer.id);
          
          // Calculate days overdue (based on last invoice date)
          const lastInvoice = invoices.reduce((latest, invoice) => 
            new Date(invoice.date) > new Date(latest.date) ? invoice : latest
          );
          
          const lastInvoiceDate = new Date(lastInvoice.date);
          const daysOverdue = Math.floor((Date.now() - lastInvoiceDate.getTime()) / (1000 * 60 * 60 * 24));
          
          // Determine risk level
          let riskLevel: 'low' | 'medium' | 'high' | 'critical';
          if (daysOverdue <= 30 && balance.outstanding <= 10000) {
            riskLevel = 'low';
          } else if (daysOverdue <= 60 && balance.outstanding <= 25000) {
            riskLevel = 'medium';
          } else if (daysOverdue <= 90 && balance.outstanding <= 50000) {
            riskLevel = 'high';
          } else {
            riskLevel = 'critical';
          }

          // Get last payment date
          const lastPayment = payments.length > 0 ? 
            payments.reduce((latest: any, payment: any) => 
              new Date(payment.date) > new Date(latest.date) ? payment : latest
            ) : null;

          customerBalances.push({
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            address: customer.address,
            total_outstanding: balance.outstanding,
            last_payment_date: lastPayment ? lastPayment.date : undefined,
            last_invoice_date: lastInvoice.date,
            invoice_count: invoices.length,
            payment_count: payments.length,
            days_overdue: daysOverdue,
            risk_level: riskLevel
          });
        }
      }

      setCustomers(customerBalances);
    } catch (error) {
      console.error('Error loading loan customers:', error);
      toast.error('Failed to load customer loan data');
    } finally {
      setLoading(false);
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

    // Apply risk level filter
    if (selectedRiskLevel !== 'all') {
      filtered = filtered.filter(customer => customer.risk_level === selectedRiskLevel);
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
    const averageOutstanding = totalCustomers > 0 ? totalOutstanding / totalCustomers : 0;
    const criticalCustomers = filteredCustomers.filter(customer => customer.risk_level === 'critical').length;

    setSummaryStats({
      totalCustomers,
      totalOutstanding,
      averageOutstanding,
      criticalCustomers
    });
  };

  const exportToCSV = () => {
    const headers = ['Customer Name', 'Phone', 'Outstanding Amount', 'Days Overdue', 'Risk Level', 'Last Payment Date'];
    const csvData = filteredCustomers.map(customer => [
      customer.name,
      customer.phone || '',
      customer.total_outstanding.toFixed(2),
      customer.days_overdue.toString(),
      customer.risk_level,
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
    
    toast.success('Loan ledger exported successfully');
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskLevelIcon = (level: string) => {
    switch (level) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      default:
        return null;
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Loan Ledger</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track customers with outstanding balances and payment status
          </p>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Customers</p>
              <p className="text-2xl font-semibold text-gray-900">{summaryStats.totalCustomers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Outstanding</p>
              <p className="text-2xl font-semibold text-gray-900">{formatCurrency(summaryStats.totalOutstanding)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Outstanding</p>
              <p className="text-2xl font-semibold text-gray-900">{formatCurrency(summaryStats.averageOutstanding)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Critical Risk</p>
              <p className="text-2xl font-semibold text-gray-900">{summaryStats.criticalCustomers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <select
            value={selectedRiskLevel}
            onChange={(e) => setSelectedRiskLevel(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Risk Levels</option>
            <option value="low">Low Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="high">High Risk</option>
            <option value="critical">Critical Risk</option>
          </select>

          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field as 'outstanding' | 'name' | 'overdue');
              setSortOrder(order as 'asc' | 'desc');
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="outstanding-desc">Outstanding (High to Low)</option>
            <option value="outstanding-asc">Outstanding (Low to High)</option>
            <option value="overdue-desc">Days Overdue (High to Low)</option>
            <option value="overdue-asc">Days Overdue (Low to High)</option>
            <option value="name-asc">Name (A to Z)</option>
            <option value="name-desc">Name (Z to A)</option>
          </select>

          <div className="flex items-center text-sm text-gray-500">
            <Filter className="h-4 w-4 mr-2" />
            {filteredCustomers.length} of {customers.length} customers
          </div>
        </div>
      </div>

      {/* Customer List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Outstanding
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Days Overdue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      {getRiskLevelIcon(customer.risk_level)}
                      <div className={getRiskLevelIcon(customer.risk_level) ? "ml-3" : ""}>
                        <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                        <div className="text-sm text-gray-500">
                          {customer.invoice_count} invoices, {customer.payment_count} payments
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {customer.phone && (
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-1 text-gray-400" />
                          {customer.phone}
                        </div>
                      )}
                      {customer.address && (
                        <div className="flex items-center mt-1">
                          <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                          <span className="truncate max-w-xs">{customer.address}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-red-600">
                      {formatCurrency(customer.total_outstanding)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {customer.days_overdue} days
                    </div>
                    <div className="text-xs text-gray-500">
                      Since {new Date(customer.last_invoice_date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskLevelColor(customer.risk_level)}`}>
                      {customer.risk_level.charAt(0).toUpperCase() + customer.risk_level.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {customer.last_payment_date ? (
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                          {new Date(customer.last_payment_date).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-gray-500">Never</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => navigate(`/customers/${customer.id}`)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No loan customers found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || selectedRiskLevel !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'All customers have settled their outstanding balances.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoanLedger;
