// components/common/NavigationHeader.tsx
import React from 'react';
import { Home, ChevronRight } from 'lucide-react';
import { useNavigation, getRouteMetadata } from '../../hooks/useNavigation';
import { useLocation } from 'react-router-dom';

interface NavigationHeaderProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  showBreadcrumbs?: boolean;
  className?: string;
}

const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  title,
  subtitle,
  actions,
  showBreadcrumbs = true,
  className = ''
}) => {
  const { navigateTo, getCurrentTab } = useNavigation();
  const location = useLocation();

  const routeMetadata = getRouteMetadata(location.pathname);
  const displayTitle = title || routeMetadata.title;
  const displaySubtitle = subtitle || '';

  const generateBreadcrumbs = () => {
    const breadcrumbs = [];
    let currentPath: string | null = location.pathname;
    const currentTab = getCurrentTab();
    
    // Generate breadcrumb trail within the current tab
    while (currentPath && currentPath !== '/') {
      const metadata = getRouteMetadata(currentPath);
      breadcrumbs.unshift({
        title: metadata.title,
        path: currentPath,
        icon: metadata.icon
      });
      
      // Stop at tab root to prevent going to other tabs
      if (isTabRoot(currentPath, currentTab)) {
        break;
      }
      
      currentPath = metadata.parent;
    }
    
    // Add dashboard as root only if we're not already in a tab root and not in dashboard
    if (location.pathname !== '/' && !isTabRoot(location.pathname, currentTab)) {
      // Add tab root instead of dashboard for better context
      const tabRootPath = getTabRootPath(currentTab);
      if (tabRootPath && tabRootPath !== location.pathname) {
        const tabRootMetadata = getRouteMetadata(tabRootPath);
        breadcrumbs.unshift({
          title: tabRootMetadata.title,
          path: tabRootPath,
          icon: tabRootMetadata.icon
        });
      }
    }
    
    return breadcrumbs;
  };

  // Helper function to check if a path is a tab root
  const isTabRoot = (path: string, tab: string): boolean => {
    const tabRoots = {
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
    
    return tabRoots[tab as keyof typeof tabRoots] === path;
  };

  // Helper function to get tab root path
  const getTabRootPath = (tab: string): string | null => {
    const tabRoots = {
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
    
    return tabRoots[tab as keyof typeof tabRoots] || null;
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <div className={`bg-white/80 backdrop-blur border-b border-gray-200 px-4 sm:px-6 lg:px-8 ${className}`}>
      <div className="flex items-center justify-between py-4">
        {/* Left side - Title */}
        <div className="flex items-center space-x-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-gray-900">{displayTitle}</h1>
            </div>
            {displaySubtitle && (
              <p className="text-sm text-gray-600 mt-1">{displaySubtitle}</p>
            )}
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center space-x-4">
          {actions}
        </div>
      </div>

      {/* Breadcrumbs */}
      {showBreadcrumbs && breadcrumbs.length > 1 && (
        <div className="flex items-center space-x-2 pb-4 text-sm">
          {breadcrumbs.map((breadcrumb, index) => (
            <React.Fragment key={breadcrumb.path}>
              {index > 0 && <ChevronRight className="h-4 w-4 text-gray-400" />}
              <button
                onClick={() => navigateTo(breadcrumb.path)}
                className={`flex items-center space-x-1 px-2 py-1 rounded-md transition-all duration-200 ${
                  index === breadcrumbs.length - 1
                    ? 'text-gray-900 bg-gray-100 cursor-default'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
                disabled={index === breadcrumbs.length - 1}
              >
                {breadcrumb.path === '/' && <Home className="h-4 w-4" />}
                <span>{breadcrumb.title}</span>
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

export default NavigationHeader;
