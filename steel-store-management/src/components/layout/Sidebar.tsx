
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  Package, 
  Users, 
  FileText, 
  TrendingUp, 
  Settings,
  RotateCcw,
  DollarSign,
  Shield,
  UserCheck,
  Key,
  Activity,
  CreditCard
} from 'lucide-react';
import { useRoleAccess } from '../../hooks/useRoleAccess';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home, permission: 'view_dashboard' },
  { name: 'Products', href: '/products', icon: Package, permission: 'manage_products' },
  { name: 'Customers', href: '/customers', icon: Users, permission: 'manage_customers' },
  { name: 'New Invoice', href: '/billing/new', icon: FileText, permission: 'create_invoice' },
  { name: 'Invoices', href: '/billing/list', icon: DollarSign, permission: 'create_invoice' },
  { name: 'Payment Channels', href: '/payment-channels', icon: CreditCard, permission: 'create_invoice' },
  { name: 'Returns', href: '/returns', icon: RotateCcw, permission: 'create_invoice' },
  { name: 'Reports', href: '/reports/daily', icon: TrendingUp, permission: 'view_reports' },
  { name: 'Audit Trail', href: '/audit', icon: Shield, permission: 'view_reports' },
  { name: 'User Management', href: '/admin/users', icon: UserCheck, permission: 'manage_settings' },
  { name: 'Permissions', href: '/admin/permissions', icon: Key, permission: 'manage_settings' },
  { name: 'Activity Log', href: '/admin/activity', icon: Activity, permission: 'view_reports' },
  { name: 'Settings', href: '/settings', icon: Settings, permission: 'manage_settings' },
];

export default function Sidebar() {
  const { permissions, isAdmin, isManager, isWorker, isAccountant } = useRoleAccess();

  // Get user role for display
  const getUserRole = () => {
    if (isAdmin) return 'admin';
    if (isManager) return 'manager';
    if (isWorker) return 'worker';
    if (isAccountant) return 'accountant';
    return 'unknown';
  };

  const userRole = getUserRole();

  return (
    <div className="bg-gray-900 text-white w-64 flex flex-col">
      <div className="p-4">
        <h1 className="text-xl font-bold">Steel Store</h1>
        <p className="text-xs text-gray-400 mt-1">
          Role: <span className="capitalize font-medium">{userRole}</span>
        </p>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navigation.map((item) => {
          // Check if user has permission for this navigation item
          if (item.permission && !permissions[item.permission as keyof typeof permissions]) {
            return null; // Hide navigation item if no permission
          }

          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`
              }
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}