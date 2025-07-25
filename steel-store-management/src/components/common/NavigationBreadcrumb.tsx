import { ChevronRight, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface NavigationBreadcrumbProps {
  items?: BreadcrumbItem[];
  showHome?: boolean;
}

export default function NavigationBreadcrumb({ items = [], showHome = true }: NavigationBreadcrumbProps) {
  const location = useLocation();

  // Auto-generate breadcrumbs based on current path if items not provided
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    pathSegments.forEach((segment, index) => {
      const href = '/' + pathSegments.slice(0, index + 1).join('/');
      let label = segment.charAt(0).toUpperCase() + segment.slice(1);
      
      // Custom labels for common routes
      switch (segment) {
        case 'customers':
          label = 'Customers';
          break;
        case 'products':
          label = 'Products';
          break;
        case 'invoices':
          label = 'Invoices';
          break;
        case 'reports':
          label = 'Reports';
          break;
        case 'settings':
          label = 'Settings';
          break;
        default:
          // If it's a number (ID), show as ID
          if (!isNaN(Number(segment))) {
            label = `ID: ${segment}`;
          }
          break;
      }

      breadcrumbs.push({
        label,
        href: index === pathSegments.length - 1 ? undefined : href // Last item shouldn't be clickable
      });
    });

    return breadcrumbs;
  };

  const breadcrumbItems = items.length > 0 ? items : generateBreadcrumbs();

  if (breadcrumbItems.length === 0 && !showHome) {
    return null;
  }

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
      {showHome && (
        <>
          <Link 
            to="/" 
            className="flex items-center hover:text-gray-700 transition-colors"
          >
            <Home className="h-4 w-4" />
          </Link>
          {breadcrumbItems.length > 0 && (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
        </>
      )}

      {breadcrumbItems.map((item, index) => (
        <div key={index} className="flex items-center space-x-2">
          {item.href ? (
            <Link 
              to={item.href} 
              className="hover:text-gray-700 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-900 font-medium">{item.label}</span>
          )}
          
          {index < breadcrumbItems.length - 1 && (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
        </div>
      ))}
    </nav>
  );
}
