import { ChevronRight, Home } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useDetailNavigation } from '../../hooks/useDetailNavigation';

interface BreadcrumbItem {
  label: string;
  path?: string;
  isActive?: boolean;
}

interface PageBreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

export default function PageBreadcrumbs({ items, className = '' }: PageBreadcrumbsProps) {
  const location = useLocation();
  const { navigateWithContext } = useDetailNavigation();
  
  // Get breadcrumbs from navigation state or use provided items
  const state = location.state as any;
  const breadcrumbs = items || state?.breadcrumbs || [];

  // Add home breadcrumb if not present
  const allBreadcrumbs: BreadcrumbItem[] = [
    { label: 'Dashboard', path: '/dashboard' },
    ...breadcrumbs
  ];

  const handleNavigate = (item: BreadcrumbItem) => {
    if (item.path && !item.isActive) {
      navigateWithContext(item.path, {
        breadcrumbs: allBreadcrumbs.slice(0, allBreadcrumbs.indexOf(item) + 1)
      });
    }
  };

  if (allBreadcrumbs.length <= 1) return null;

  return (
    <div className={`bg-gray-50 border-b border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-2 py-3">
          <Home className="h-4 w-4 text-gray-400" />
          
          {allBreadcrumbs.map((item, index) => (
            <div key={index} className="flex items-center space-x-2">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-gray-400" />
              )}
              
              {item.path && !item.isActive ? (
                <button
                  onClick={() => handleNavigate(item)}
                  className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {item.label}
                </button>
              ) : (
                <span className={`text-sm ${item.isActive ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                  {item.label}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
