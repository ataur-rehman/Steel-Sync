import { useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useSmartNavigation } from '../../hooks/useSmartNavigation';

interface NavigationWrapperProps {
  children: React.ReactNode;
  pageTitle?: string;
  trackNavigation?: boolean;
}

export default function NavigationWrapper({
  children,
  pageTitle,
  trackNavigation = true
}: NavigationWrapperProps) {
  const location = useLocation();
  const params = useParams();
  const { navigateTo } = useSmartNavigation();

  // Track page visits for navigation history
  useEffect(() => {
    if (trackNavigation) {
      // Small delay to ensure the page has loaded
      const timer = setTimeout(() => {
        // This will automatically add the current page to navigation history
        // when using navigateTo, but we can also track manual navigation
        const currentPath = location.pathname;
        
        // Update document title if pageTitle is provided
        if (pageTitle) {
          document.title = `${pageTitle} - Steel Store Management`;
        }
        
        // You could add analytics tracking here
        console.log(`📍 Navigation: ${currentPath}`, { params });
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [location.pathname, pageTitle, trackNavigation, params]);

  return <>{children}</>;
}
