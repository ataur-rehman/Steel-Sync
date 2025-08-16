// Enhanced Customer Navigation Component
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, FileText, DollarSign, Receipt, BarChart3, User } from 'lucide-react';

interface CustomerNavigationProps {
  customerId: number;
  customerName: string;
  currentPage: 'detail' | 'ledger' | 'invoices' | 'payments';
}

const CustomerNavigation: React.FC<CustomerNavigationProps> = ({
  customerId,
  customerName,
  currentPage
}) => {
  const navigate = useNavigate();

  const navigationItems = [
    {
      key: 'detail',
      label: 'Overview',
      icon: Eye,
      path: `/customers/${customerId}`,
      description: 'Customer details and summary'
    },
    {
      key: 'ledger',
      label: 'Ledger',
      icon: FileText,
      path: `/reports/customer?customerId=${customerId}`,
      description: 'Complete transaction history'
    },
    {
      key: 'invoices',
      label: 'Invoices',
      icon: Receipt,
      path: `/invoices?customerId=${customerId}`,
      description: 'All customer invoices'
    },
    {
      key: 'payments',
      label: 'Payments',
      icon: DollarSign,
      path: `/payments?customerId=${customerId}`,
      description: 'Payment history'
    },
    {
      key: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      path: `/customers/${customerId}/analytics`,
      description: 'Customer insights and trends'
    }
  ];

  return (
    <div className="bg-white border-b border-gray-200 mb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center">
            <User className="h-5 w-5 text-gray-400 mr-2" />
            <h1 className="text-lg font-semibold text-gray-900">{customerName}</h1>
          </div>
        </div>
        
        <nav className="flex space-x-8 overflow-x-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.key;
            
            return (
              <button
                key={item.key}
                onClick={() => navigate(item.path)}
                className={`
                  flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                  ${isActive 
                    ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }
                `}
                title={item.description}
              >
                <Icon className="h-4 w-4 mr-2" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default CustomerNavigation;
