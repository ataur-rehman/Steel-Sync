// hooks/useNavigation.tsx
import React, { createContext, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface NavigationContextType {
  navigateTo: (path: string, options?: { replace?: boolean; state?: any }) => void;
  navigateWithParams: (path: string, params?: Record<string, string>) => void;
  getTitle: (path: string) => string;
  getCurrentTab: () => string;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

// Define tab roots based on main navigation sections
const TAB_ROOTS = {
  dashboard: '/',
  products: '/products',
  customers: '/customers', 
  billing: '/billing',
  returns: '/returns',
  reports: '/reports',
  settings: '/settings',
  activity: '/activity',
  notifications: '/notifications'
};

// Helper function to determine which tab a path belongs to
const getTabFromPath = (pathname: string): string => {
  if (pathname === '/' || pathname === '/dashboard') return 'dashboard';
  
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];
  
  // Check if first segment matches any tab root
  if (Object.values(TAB_ROOTS).some(root => root.startsWith(`/${firstSegment}`))) {
    return firstSegment;
  }
  
  return 'dashboard'; // Default fallback
};

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navigateTo = (path: string, options?: { replace?: boolean; state?: any }) => {
    if (options?.replace) {
      navigate(path, { replace: true, state: options.state });
    } else {
      navigate(path, { state: options?.state });
    }
  };

  const navigateWithParams = (path: string, params?: Record<string, string>) => {
    const searchParams = new URLSearchParams(params);
    const fullPath = params ? `${path}?${searchParams.toString()}` : path;
    navigate(fullPath);
  };

  const getCurrentTab = (): string => {
    return getTabFromPath(location.pathname);
  };

  const getTitle = (path: string) => {
    const metadata = getRouteMetadata(path);
    return metadata.title;
  };

  const contextValue: NavigationContextType = {
    navigateTo,
    navigateWithParams,
    getTitle,
    getCurrentTab
  };

  return (
    <NavigationContext.Provider value={contextValue}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

// Route utilities
export const getRouteMetadata = (pathname: string) => {
  const routes: Record<string, { title: string; icon: string; parent: string | null }> = {
    '/': { title: 'Dashboard', icon: 'LayoutDashboard', parent: null },
    '/products': { title: 'Products', icon: 'Package', parent: '/' },
    '/products/new': { title: 'New Product', icon: 'Package', parent: '/products' },
    '/customers': { title: 'Customers', icon: 'Users', parent: '/' },
    '/customers/new': { title: 'New Customer', icon: 'Users', parent: '/customers' },
    '/billing/new': { title: 'New Invoice', icon: 'FileText', parent: '/billing/list' },
    '/billing/list': { title: 'Invoices', icon: 'FileText', parent: '/' },
    '/returns': { title: 'Returns', icon: 'RotateCcw', parent: '/' },
    '/returns/new': { title: 'Process Return', icon: 'RotateCcw', parent: '/returns' },
    '/reports/daily': { title: 'Daily Ledger', icon: 'BarChart3', parent: '/' },
    '/reports/customer': { title: 'Customer Ledger', icon: 'BarChart3', parent: '/' },
    '/reports/stock': { title: 'Stock Report', icon: 'BarChart3', parent: '/' },
    '/settings': { title: 'Settings', icon: 'Settings', parent: '/' },
    '/activity': { title: 'Activity', icon: 'Activity', parent: '/' },
    '/notifications': { title: 'Notifications', icon: 'Bell', parent: '/' },
  };

  // Handle dynamic routes
  if (pathname.startsWith('/customers/') && pathname !== '/customers/new') {
    return { title: 'Customer Details', icon: 'Users', parent: '/customers' };
  }
  if (pathname.startsWith('/products/') && pathname !== '/products/new') {
    return { title: 'Product Details', icon: 'Package', parent: '/products' };
  }
  if (pathname.startsWith('/billing/view/')) {
    return { title: 'Invoice Details', icon: 'FileText', parent: '/billing/list' };
  }
  if (pathname.startsWith('/returns/') && pathname !== '/returns/new') {
    return { title: 'Return Details', icon: 'RotateCcw', parent: '/returns' };
  }

  return routes[pathname] || { title: 'Unknown', icon: 'HelpCircle', parent: '/' };
};
