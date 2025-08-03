// components/layout/AppLayout.tsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useNavigation } from '../../hooks/useNavigation';
import { settingsService } from '../../services/settingsService';

import {
  LayoutDashboard,
  Package,
  Users,
  FileText,
  RotateCcw,
  BarChart3,
  LogOut,
  Menu,
  X,
  Bell,
  Settings,
  Activity,
  AlertTriangle,
  Info,
  Truck,
  CreditCard
} from 'lucide-react';
import { useRoleAccess } from '../../hooks/useRoleAccess';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [companyName, setCompanyName] = useState('Itehad Iron Store');
  
  // Add error handling for useAuth
  let user, logout;
  try {
    const authContext = useAuth();
    user = authContext.user;
    logout = authContext.logout;
  } catch (error) {
    console.error('useAuth error in AppLayout:', error);
    // Fallback to default values
    user = null;
    logout = () => {
      console.warn('Logout attempted but auth context not available');
      window.location.reload();
    };
  }
  
  const { navigateTo, getCurrentTab } = useNavigation();
  const { hasPermission, isAdmin } = useRoleAccess();
  const location = useLocation();
  const navigate = useNavigate();

  // Get current tab for highlighting
  const currentTab = getCurrentTab();

  // Helper function to check if a navigation item is active
  const isNavigationItemActive = (item: NavigationItem): boolean => {
    if (item.href) {
      // For items with direct href, check if current path matches or starts with it
      if (item.href === '/dashboard' || item.href === '/') {
        return currentTab === 'dashboard';
      }
      return location.pathname.startsWith(item.href);
    }
    
    // For items with children, check if any child is active
    if (item.children) {
      return item.children.some(child => location.pathname === child.href);
    }
    
    return false;
  };

  // Helper function to check if a child navigation item is active
  const isChildNavigationItemActive = (child: NavigationChild): boolean => {
    return location.pathname === child.href;
  };

  // Mock notifications for now
  const notifications: any[] = [];
  const unreadCount = 0;
  const markAsRead = (_id: string) => {};
  const dismissNotification = (_id: string) => {};
  const markAllAsRead = () => {};
  const clearAllNotifications = () => {};

  // Load company name from settings
  useEffect(() => {
    const loadCompanyName = () => {
      const generalSettings = settingsService.getSettings('general');
      setCompanyName(generalSettings.companyName || 'Itehad Iron Store');
    };
    
    loadCompanyName();
    
    // Listen for settings changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'settings_general') {
        loadCompanyName();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  type NavigationChild = {
    name: string;
    href: string;
    icon: React.ElementType;
    badge?: string;
  };

  type NavigationItem = {
    name: string;
    href?: string;
    icon: React.ElementType;
    children?: NavigationChild[];
    badge?: string;
  };

  const navigation: NavigationItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Products', href: '/products', icon: Package },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Vendors', href: '/vendors', icon: Truck },
    { name: 'Stock Receiving', href: '/stock/receiving', icon: Package },
    { name: 'Loan Ledger', href: '/loan/ledger', icon: CreditCard },
    {
      name: 'Billing',
      icon: FileText,
      children: [
        { name: 'Invoice Form', href: '/billing/new', icon: FileText },
        { name: 'Invoice List', href: '/billing/list', icon: FileText }
      ]
    },
   
    {
      name: 'Management',
      icon: Settings,
      children: [
        { name: 'Staff Management', href: '/staff', icon: Users },
        { name: 'Activity Logger', href: '/audit', icon: Activity },
        { name: 'Payment Channels', href: '/payment/channels', icon: CreditCard },
        { name: 'Business Finance', href: '/finance', icon: BarChart3 }
      ]
    },
    {
      name: 'Reports',
      icon: BarChart3,
      children: [
        { name: 'Stock Report', href: '/reports/stock', icon: Package },
        { name: 'Daily Ledger', href: '/reports/daily', icon: Activity },
        { name: 'Customer Ledger', href: '/reports/customer', icon: Users }
      ]
    },
    ...(isAdmin ? [{
      name: 'Administration',
      icon: Settings,
      children: [
        { name: 'Role Management', href: '/admin/roles', icon: Settings },
        { name: 'Notifications', href: '/notifications', icon: Bell }
      ]
    }] : [])
  ];

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return AlertTriangle;
      case 'success':
        return Package;
      case 'info':
        return Info;
      case 'alert':
        return Bell;
      default:
        return Bell;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'text-yellow-600';
      case 'success':
        return 'text-green-600';
      case 'info':
        return 'text-blue-600';
      case 'alert':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const Sidebar = () => (
    <div className={`flex flex-col bg-gray-800 h-full transition-all duration-300 ${
      sidebarCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Fixed Header with Collapse Button */}
      <div className="flex items-center justify-between h-16 px-4 bg-gray-900 flex-shrink-0">
        {!sidebarCollapsed && (
          <h1 className="text-white text-lg font-semibold truncate">{companyName}</h1>
        )}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-1 text-gray-400 hover:text-white transition-colors"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
      
      {/* Scrollable Navigation Area */}
      <nav className="flex-1 px-2 py-4 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
        {navigation.map((item) =>
          item.children ? (
            <div key={item.name} className="space-y-1">
              <div 
                className={`flex items-center px-2 py-2 text-sm font-medium transition-colors cursor-pointer ${
                  isNavigationItemActive(item)
                    ? 'text-white bg-gray-700 rounded-md'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700 rounded-md'
                }`}
                title={sidebarCollapsed ? item.name : ''}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!sidebarCollapsed && (
                  <>
                    <span className="ml-3 truncate">{item.name}</span>
                    {item.badge && (
                      <span className="ml-auto bg-red-600 text-white text-xs px-2 py-1 rounded-full flex-shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </div>
              {!sidebarCollapsed && (
                <div className="ml-8 space-y-1">
                  {item.children.map((child) => (
                    <button
                      key={child.name}
                      onClick={() => navigateTo(child.href)}
                      className={`flex items-center w-full text-left px-2 py-2 text-sm rounded-md transition-colors ${
                        isChildNavigationItemActive(child)
                          ? 'bg-gray-700 text-white'
                          : 'text-gray-300 hover:text-white hover:bg-gray-700'
                      }`}
                    >
                      <child.icon className="mr-3 h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{child.name}</span>
                      {child.badge && (
                        <span className="ml-auto bg-red-600 text-white text-xs px-2 py-1 rounded-full flex-shrink-0">
                          {child.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button
              key={item.name}
              onClick={() => navigateTo(item.href!)}
              className={`flex items-center w-full px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                isNavigationItemActive(item)
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
              title={sidebarCollapsed ? item.name : ''}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!sidebarCollapsed && (
                <>
                  <span className="ml-3 truncate">{item.name}</span>
                  {item.badge && (
                    <span className="ml-auto bg-red-600 text-white text-xs px-2 py-1 rounded-full flex-shrink-0">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          )
        )}
      </nav>
      
 
    </div>
  );

  const NotificationPanel = () => (
    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              {unreadCount} unread
            </span>
            <button
              onClick={markAllAsRead}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              Mark all read
            </button>
          </div>
        </div>
      </div>
      
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Bell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>No notifications</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {notifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              return (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start space-x-3">
                    <Icon className={`h-5 w-5 mt-0.5 ${getNotificationColor(notification.type)}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {formatTimeAgo(notification.timestamp)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissNotification(notification.id);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {notifications.length > 0 && (
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={clearAllNotifications}
            className="w-full text-sm text-red-600 hover:text-red-800 font-medium"
          >
            Clear all notifications
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Sidebar - always fixed */}
      <div className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-200 h-screen shadow-sm transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}>
        <Sidebar />
      </div>

      {/* Sidebar backdrop for mobile only */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-40 transition-opacity lg:hidden z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content with dynamic left margin for sidebar */}
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
        sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
      }`} style={{ marginLeft: sidebarCollapsed ? '4rem' : '16rem' }}>
        {/* Mobile top bar */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-700 hover:text-blue-600"
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-gray-900 text-lg font-semibold">{companyName}</h1>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-gray-500 hover:text-blue-600 relative"
              >
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && <NotificationPanel />}
            </div>
            <button
              onClick={() => navigate('/settings')}
              className="p-2 text-gray-500 hover:text-blue-600"
            >
              <Settings className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Desktop header - fixed with dynamic positioning */}
        <header className={`hidden lg:flex fixed top-0 right-0 bg-white shadow-sm border-b border-gray-200 px-8 py-3 items-center justify-end z-40 transition-all duration-300 ${
          sidebarCollapsed ? 'left-16' : 'left-64'
        }`} style={{ left: sidebarCollapsed ? '4rem' : '16rem' }}>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-gray-500 hover:text-blue-600 relative"
                title="Notifications"
              >
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && <NotificationPanel />}
            </div>
            <button
              onClick={() => navigate('/settings')}
              className="p-2 text-gray-500 hover:text-blue-600"
              title="Settings"
            >
              <Settings className="h-6 w-6" />
            </button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <span className="text-sm font-medium text-gray-900">{user?.username || 'Admin'}</span>
              <button
                onClick={logout}
                className="p-2 text-gray-500 hover:text-blue-600"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Page content - add top padding for fixed header */}
        <main className="flex-1 overflow-y-auto pt-16">
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
