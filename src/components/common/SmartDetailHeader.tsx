import { ArrowLeft, List } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface SmartDetailHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  showBackButton?: boolean;
  backToListPath?: string;
  backToListLabel?: string;
  fromPage?: string; // Page that navigated to this detail view
  backButtonMode?: 'auto' | 'arrow' | 'list' | 'both'; // Control which back button(s) to show
}

export default function SmartDetailHeader({ 
  title, 
  subtitle, 
  onBack, 
  actions, 
  showBackButton = true,
  backToListPath,
  backToListLabel = "Back to List",
  fromPage,
  backButtonMode = 'auto'
}: SmartDetailHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Smart detection of list path if not provided
  const getSmartListPath = (): string => {
    if (backToListPath) return backToListPath;
    
    const currentPath = location.pathname;
    
    // Extract base path patterns
    if (currentPath.includes('/customers/')) return '/customers';
    if (currentPath.includes('/vendors/')) return '/vendors';
    if (currentPath.includes('/products/')) return '/products';
    if (currentPath.includes('/invoices/')) return '/invoices';
    if (currentPath.includes('/stock/receiving/')) return '/stock/receiving';
    if (currentPath.includes('/stock/')) return '/stock';
    if (currentPath.includes('/reports/')) return '/reports';
    
    return '/dashboard'; // Ultimate fallback
  };

  // Smart detection of list label
  const getSmartListLabel = (): string => {
    if (backToListLabel !== "Back to List") return backToListLabel;
    
    const currentPath = location.pathname;
    
    if (currentPath.includes('/customers/')) return 'Back to Customers';
    if (currentPath.includes('/vendors/')) return 'Back to Vendors';
    if (currentPath.includes('/products/')) return 'Back to Products';
    if (currentPath.includes('/invoices/')) return 'Back to Invoices';
    if (currentPath.includes('/stock/receiving/')) return 'Back to Receiving List';
    if (currentPath.includes('/stock/')) return 'Back to Stock';
    if (currentPath.includes('/reports/')) return 'Back to Reports';
    
    return 'Back to List';
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      // Check if we have navigation state indicating where we came from
      const navigationState = sessionStorage.getItem('navigationHistory');
      
      if (fromPage) {
        // Navigate back to the specific page that brought us here
        navigate(fromPage);
      } else if (navigationState) {
        try {
          const history = JSON.parse(navigationState);
          if (history.length > 1) {
            // Go to previous page in history
            const previousPage = history[history.length - 2];
            navigate(previousPage.path);
            return;
          }
        } catch (e) {
          console.warn('Failed to parse navigation history:', e);
        }
      }
      
      // Fallback to browser back or smart list path
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate(getSmartListPath());
      }
    }
  };

  const handleBackToList = () => {
    const listPath = getSmartListPath();
    navigate(listPath);
  };

  // Determine which back button to show based on context and mode
  const determineBackButtonVisibility = () => {
    if (!showBackButton) return { showArrow: false, showList: false };
    
    switch (backButtonMode) {
      case 'arrow':
        return { showArrow: true, showList: false };
      case 'list':
        return { showArrow: false, showList: true };
      case 'both':
        return { showArrow: true, showList: true };
      case 'auto':
      default:
        // Auto mode: Smart detection to avoid duplicate buttons
        const shouldShowArrowBack = fromPage || (window.history.length > 1 && !backToListPath);
        const shouldShowListBack = !shouldShowArrowBack || backToListPath;
        return { showArrow: shouldShowArrowBack, showList: shouldShowListBack };
    }
  };

  const { showArrow, showList } = determineBackButtonVisibility();

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {showArrow && (
            <button
              onClick={handleBack}
              className="flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
              title="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h1>
            {subtitle && (
              <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {actions}
          
          {/* Professional Back to List Button - only show when appropriate */}
          {showList && (
            <button
              onClick={handleBackToList}
              className="btn btn-secondary flex items-center px-3 py-1.5 text-sm hover:bg-gray-100 transition-colors"
              title={getSmartListLabel()}
            >
              <List className="h-4 w-4 mr-2" />
              {getSmartListLabel()}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
