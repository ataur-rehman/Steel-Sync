import { ArrowLeft, Home, ChevronRight } from 'lucide-react';
import { useSmartNavigation } from '../../hooks/useSmartNavigation';

interface SmartBackButtonProps {
  fallbackPath?: string;
  showBreadcrumbs?: boolean;
  showPreviousPageName?: boolean;
  className?: string;
  variant?: 'button' | 'breadcrumb' | 'minimal';
}

export default function SmartBackButton({
  fallbackPath,
  showBreadcrumbs = true,
  showPreviousPageName = true,
  className = '',
  variant = 'button'
}: SmartBackButtonProps) {
  const { goBack, canGoBack, previousPage, breadcrumbs, navigateTo } = useSmartNavigation({
    fallbackPath
  });

  if (variant === 'breadcrumb') {
    return (
      <nav className={`flex items-center space-x-2 text-sm text-gray-600 ${className}`} aria-label="Breadcrumb">
        {breadcrumbs.map((item, index) => (
          <div key={item.path} className="flex items-center">
            {index > 0 && <ChevronRight className="h-4 w-4 mx-2 text-gray-400" />}
            {index === breadcrumbs.length - 1 ? (
              <span className="text-gray-900 font-medium">{item.label}</span>
            ) : (
              <button
                onClick={() => navigateTo(item.path)}
                className="hover:text-blue-600 transition-colors"
              >
                {index === 0 && <Home className="h-4 w-4 inline mr-1" />}
                {item.label}
              </button>
            )}
          </div>
        ))}
      </nav>
    );
  }

  if (variant === 'minimal') {
    if (!canGoBack) return null;
    
    return (
      <button
        onClick={() => goBack()}
        className={`inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors ${className}`}
        title="Go back"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
    );
  }

  // Default button variant
  if (!canGoBack) return null;

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-2 ${className}`}>
      <button
        onClick={() => goBack()}
        className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
        {showPreviousPageName && previousPage && (
          <span className="ml-1 text-gray-500">to {previousPage.label}</span>
        )}
      </button>
      
      {showBreadcrumbs && breadcrumbs.length > 1 && (
        <nav className="flex items-center space-x-2 text-sm text-gray-500" aria-label="Breadcrumb">
          {breadcrumbs.map((item, index) => (
            <div key={item.path} className="flex items-center">
              {index > 0 && <ChevronRight className="h-3 w-3 mx-1" />}
              {index === breadcrumbs.length - 1 ? (
                <span className="text-gray-900 font-medium">{item.label}</span>
              ) : (
                <button
                  onClick={() => navigateTo(item.path)}
                  className="hover:text-blue-600 transition-colors"
                >
                  {index === 0 && <Home className="h-3 w-3 inline mr-1" />}
                  {item.label}
                </button>
              )}
            </div>
          ))}
        </nav>
      )}
    </div>
  );
}
