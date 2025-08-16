import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface NavigationState {
  from?: string;
  title?: string;
  timestamp?: number;
}

export function useDetailNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [navigationHistory, setNavigationHistory] = useState<NavigationState[]>([]);

  // Navigate to a detail view with context
  const navigateToDetail = useCallback((
    path: string, 
    options?: {
      title?: string;
      state?: any;
      replace?: boolean;
    }
  ) => {
    const currentPath = location.pathname;
    const navigationState: NavigationState = {
      from: currentPath,
      title: options?.title,
      timestamp: Date.now()
    };

    // Update navigation history
    setNavigationHistory(prev => [...prev, navigationState]);

    // Navigate with state
    navigate(path, {
      state: {
        ...options?.state,
        navigationContext: navigationState
      },
      replace: options?.replace
    });
  }, [navigate, location.pathname]);

  // Smart back navigation
  const goBack = useCallback((fallbackPath?: string) => {
    const state = location.state as any;
    
    if (state?.navigationContext?.from) {
      // Go back to the previous page we came from
      navigate(state.navigationContext.from);
    } else if (window.history.length > 1) {
      // Use browser back if available
      navigate(-1);
    } else if (fallbackPath) {
      // Use provided fallback
      navigate(fallbackPath);
    } else {
      // Default fallback
      navigate('/dashboard');
    }
  }, [navigate, location.state]);

  // Navigate with breadcrumb context
  const navigateWithContext = useCallback((
    path: string,
    context: {
      breadcrumbs: Array<{ label: string; path?: string }>;
      title?: string;
      state?: any;
    }
  ) => {
    navigate(path, {
      state: {
        ...context.state,
        breadcrumbs: context.breadcrumbs,
        title: context.title,
        from: location.pathname
      }
    });
  }, [navigate, location.pathname]);

  return {
    navigateToDetail,
    goBack,
    navigateWithContext,
    navigationHistory,
    currentLocation: location
  };
}
