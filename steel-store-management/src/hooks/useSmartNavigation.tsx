import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';

export interface NavigationItem {
  path: string;
  label: string;
  icon?: string;
  params?: Record<string, string | undefined>;
}

export interface SmartNavigationOptions {
  fallbackPath?: string;
  enableBrowserBack?: boolean;
  maxHistoryDepth?: number;
}

export function useSmartNavigation(options: SmartNavigationOptions = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  
  const {
    fallbackPath = '/dashboard',
    enableBrowserBack = true,
    maxHistoryDepth = 10
  } = options;

  // Get navigation history from sessionStorage
  const getNavigationHistory = useCallback((): NavigationItem[] => {
    try {
      const history = sessionStorage.getItem('navigationHistory');
      return history ? JSON.parse(history) : [];
    } catch {
      return [];
    }
  }, []);

  // Save navigation history to sessionStorage
  const saveNavigationHistory = useCallback((history: NavigationItem[]) => {
    try {
      sessionStorage.setItem('navigationHistory', JSON.stringify(history));
    } catch {
      // Storage failed, continue silently
    }
  }, []);

  // Enhanced go back functionality
  const goBack = useCallback((customFallback?: string) => {
    const history = getNavigationHistory();
    
    if (history.length > 1) {
      // Remove current page and go to previous
      const updatedHistory = history.slice(0, -1);
      saveNavigationHistory(updatedHistory);
      const previousPage = updatedHistory[updatedHistory.length - 1];
      
      if (previousPage) {
        navigate(previousPage.path, { replace: true });
        return;
      }
    }

    // Fallback navigation
    if (enableBrowserBack && window.history.length > 1) {
      window.history.back();
    } else {
      navigate(customFallback || fallbackPath, { replace: true });
    }
  }, [navigate, fallbackPath, enableBrowserBack, getNavigationHistory, saveNavigationHistory]);

  // Navigate to a new page and update history
  const navigateTo = useCallback((path: string, options?: { replace?: boolean; label?: string; fromComponent?: string }) => {
    const { replace = false } = options || {};
    
    navigate(path, { replace });
  }, [navigate]);

  // Enhanced back to list navigation
  const goBackToList = useCallback((listPath?: string) => {
    if (listPath) {
      navigate(listPath);
      return;
    }
    
    // Smart detection of list path
    const currentPath = location.pathname;
    let smartListPath = '/dashboard';
    
    if (currentPath.includes('/customers/')) smartListPath = '/customers';
    else if (currentPath.includes('/vendors/')) smartListPath = '/vendors';
    else if (currentPath.includes('/products/')) smartListPath = '/products';
    else if (currentPath.includes('/invoices/')) smartListPath = '/invoices';
    else if (currentPath.includes('/stock/receiving/')) smartListPath = '/stock/receiving';
    else if (currentPath.includes('/stock/')) smartListPath = '/stock';
    else if (currentPath.includes('/reports/')) smartListPath = '/reports';
    
    navigate(smartListPath);
  }, [navigate, location.pathname]);

  // Get where we came from
  const getFromPage = useCallback(() => {
    const history = getNavigationHistory();
    if (history.length > 0) {
      return history[history.length - 1].path;
    }
    return null;
  }, [getNavigationHistory]);

  // Check if we can go back
  const canGoBack = useMemo(() => {
    const history = getNavigationHistory();
    return history.length > 1 || (enableBrowserBack && window.history.length > 1);
  }, [getNavigationHistory, enableBrowserBack]);

  // Clear navigation history
  const clearHistory = useCallback(() => {
    sessionStorage.removeItem('navigationHistory');
  }, []);

  // Get previous page info
  const previousPage = useMemo(() => {
    const history = getNavigationHistory();
    return history.length > 1 ? history[history.length - 2] : null;
  }, [getNavigationHistory]);

  // Generate breadcrumbs  
  const breadcrumbs = useMemo(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const crumbs: NavigationItem[] = [
      { path: '/dashboard', label: 'Dashboard', icon: 'home' }
    ];

    let currentPath = '';
    
    for (let i = 0; i < pathSegments.length; i++) {
      currentPath += `/${pathSegments[i]}`;
      
      if (currentPath !== '/dashboard') {
        crumbs.push({
          path: currentPath,
          label: pathSegments[i].charAt(0).toUpperCase() + pathSegments[i].slice(1),
          icon: undefined
        });
      }
    }

    return crumbs;
  }, [location.pathname]);

  return {
    goBack,
    navigateTo,
    goBackToList,
    getFromPage,
    canGoBack,
    previousPage,
    breadcrumbs,
    clearHistory,
    navigationHistory: getNavigationHistory()
  };
}
