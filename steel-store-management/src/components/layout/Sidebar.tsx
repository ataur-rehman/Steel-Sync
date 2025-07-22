
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  Package, 
  Users, 
  FileText, 
  TrendingUp, 
  Settings,
  RotateCcw,
  DollarSign
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'New Invoice', href: '/billing/new', icon: FileText },
  { name: 'Invoices', href: '/billing/list', icon: DollarSign },
  { name: 'Returns', href: '/returns', icon: RotateCcw },
  { name: 'Reports', href: '/reports/daily', icon: TrendingUp },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  return (
    <div className="bg-gray-900 text-white w-64 flex flex-col">
      <div className="p-4">
        <h1 className="text-xl font-bold">Steel Store</h1>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navigation.map((item) => (
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
        ))}
      </nav>
    </div>
  );
}