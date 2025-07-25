import { ArrowLeft, Home, ChevronRight } from 'lucide-react';
import { useSmartNavigation } from '../../hooks/useSmartNavigation';

interface EnhancedNavigationHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  showBreadcrumbs?: boolean;
  fallbackPath?: string;
  actions?: React.ReactNode;
  className?: string;
}

export default function EnhancedNavigationHeader({
  title,
  subtitle,
  showBackButton = true,
  showBreadcrumbs = true,
  fallbackPath,
  actions,
  className = ''
}: EnhancedNavigationHeaderProps) {
  const { goBack, canGoBack, breadcrumbs, navigateTo } = useSmartNavigation({
    fallbackPath
  });

  return (
    <div className={`bg-white border-b border-gray-200 ${className}`}>
      <div className="px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        {showBreadcrumbs && breadcrumbs.length > 1 && (
          <nav className="flex items-center space-x-2 py-3 text-sm text-gray-500 border-b border-gray-100" aria-label="Breadcrumb">
            {breadcrumbs.map((item, index) => (
              <div key={item.path} className="flex items-center">
                {index > 0 && <ChevronRight className="h-4 w-4 mx-2 text-gray-400 flex-shrink-0" />}
                {index === breadcrumbs.length - 1 ? (
                  <span className="text-gray-900 font-medium truncate">{item.label}</span>
                ) : (
                  <button
                    onClick={() => navigateTo(item.path)}
                    className="hover:text-blue-600 transition-colors truncate max-w-32 sm:max-w-none"
                    title={item.label}
                  >
                    {index === 0 && <Home className="h-4 w-4 inline mr-1 flex-shrink-0" />}
                    <span className="truncate">{item.label}</span>
                  </button>
                )}
              </div>
            ))}
          </nav>
        )}

        {/* Header Content */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-6">
          <div className="flex items-start space-x-4">
            {/* Back Button */}
            {showBackButton && canGoBack && (
              <button
                onClick={() => goBack()}
                className="flex-shrink-0 inline-flex items-center justify-center p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                title="Go back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}

            {/* Title and Subtitle */}
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1 text-sm text-gray-500">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          {actions && (
            <div className="flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
