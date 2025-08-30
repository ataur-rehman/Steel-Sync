// components/common/EnhancedBreadcrumbs.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronRight,
  Home,
  User,
  Package,
  FileText,
  RotateCcw,
  BarChart3,
  Eye,
  ExternalLink,
  Clock
} from 'lucide-react';
import OptimizedSearch from './OptimizedSearch';
import ContextualModal from './ContextualModal';

interface BreadcrumbItem {
  label: string;
  path: string;
  icon?: React.ReactNode;
  entityType?: 'customer' | 'product' | 'invoice' | 'return' | 'payment';
  entityId?: number;
  metadata?: Record<string, any>;
}

interface EnhancedBreadcrumbsProps {
  items?: BreadcrumbItem[];
  showGlobalSearch?: boolean;
  contextualEntity?: {
    type: 'customer' | 'product' | 'invoice' | 'return' | 'payment';
    id: number;
    name: string;
  };
}

const EnhancedBreadcrumbs: React.FC<EnhancedBreadcrumbsProps> = ({
  items,
  showGlobalSearch = true,
  contextualEntity
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showModal, setShowModal] = useState(false);
  const [modalEntity, setModalEntity] = useState<{
    type: 'customer' | 'product' | 'invoice' | 'return' | 'payment';
    id: number;
  } | null>(null);
  const [breadcrumbItems, setBreadcrumbItems] = useState<BreadcrumbItem[]>([]);

  useEffect(() => {
    if (items) {
      setBreadcrumbItems(items);
    } else {
      // Auto-generate breadcrumbs from current path
      setBreadcrumbItems(generateBreadcrumbsFromPath(location.pathname));
    }
  }, [items, location.pathname]);

  const generateBreadcrumbsFromPath = (pathname: string): BreadcrumbItem[] => {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      {
        label: 'Dashboard',
        path: '/',
        icon: <Home className="h-4 w-4" />
      }
    ];

    let currentPath = '';

    segments.forEach((segment) => {
      currentPath += `/${segment}`;

      let label = segment.charAt(0).toUpperCase() + segment.slice(1);
      let icon = null;

      // Custom labels and icons for known routes
      switch (segment) {
        case 'products':
          label = 'Products';
          icon = <Package className="h-4 w-4" />;
          break;
        case 'customers':
          label = 'Customers';
          icon = <User className="h-4 w-4" />;
          break;
        case 'billing':
          label = 'Billing';
          icon = <FileText className="h-4 w-4" />;
          break;
        case 'returns':
          label = 'Returns';
          icon = <RotateCcw className="h-4 w-4" />;
          break;
        case 'reports':
          label = 'Reports';
          icon = <BarChart3 className="h-4 w-4" />;
          break;
        case 'new':
          label = 'New';
          break;
        case 'list':
          label = 'List';
          break;
        case 'daily':
          label = 'Daily Ledger';
          break;
        case 'customer':
          label = 'Customer Ledger';
          break;
        case 'stock':
          label = 'Stock Report';
          break;
        default:
          // Check if it's a numeric ID and try to get entity details
          if (/^\d+$/.test(segment)) {
            label = `#${segment}`;
            // We could enhance this to fetch actual entity names
          }
      }

      breadcrumbs.push({
        label,
        path: currentPath,
        icon
      });
    });

    return breadcrumbs;
  };

  const handleQuickPreview = (entityType: string, entityId: number) => {
    setModalEntity({
      type: entityType as any,
      id: entityId
    });
    setShowModal(true);
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'customer':
        return <User className="h-4 w-4 text-blue-600" />;
      case 'product':
        return <Package className="h-4 w-4 text-green-600" />;
      case 'invoice':
        return <FileText className="h-4 w-4 text-purple-600" />;
      case 'return':
        return <RotateCcw className="h-4 w-4 text-orange-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <>
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center space-x-1 text-sm">
            {breadcrumbItems.map((item, index) => (
              <React.Fragment key={item.path}>
                {index > 0 && (
                  <ChevronRight className="h-4 w-4 text-gray-400 mx-1" />
                )}

                <button
                  onClick={() => navigate(item.path)}
                  className={`flex items-center space-x-1 px-2 py-1 rounded-md transition-colors ${index === breadcrumbItems.length - 1
                      ? 'text-gray-900 font-medium bg-gray-100'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>

                {/* Quick preview button for entities */}
                {item.entityType && item.entityId && index === breadcrumbItems.length - 1 && (
                  <button
                    onClick={() => handleQuickPreview(item.entityType!, item.entityId!)}
                    className="ml-1 p-1 text-gray-400 hover:text-gray-600 rounded"
                    title="Quick preview"
                  >
                    <Eye className="h-3 w-3" />
                  </button>
                )}
              </React.Fragment>
            ))}
          </nav>

          {/* Global Search - Optimized */}
          {showGlobalSearch && (
            <div className="flex items-center space-x-2">
              <OptimizedSearch
                placeholder="Search customers, products, invoices..."
                showMetrics={false}
                className="flex-1"
              />

              {/* Recent Activity Button */}
              <button
                onClick={() => navigate('/activity')}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                title="Recent Activity"
              >
                <Clock className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Contextual Information */}
        {contextualEntity && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getEntityIcon(contextualEntity.type)}
                <div>
                  <p className="font-medium text-blue-900">
                    {contextualEntity.name}
                  </p>
                  <p className="text-sm text-blue-700 capitalize">
                    {contextualEntity.type} Context
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleQuickPreview(contextualEntity.type, contextualEntity.id)}
                  className="flex items-center px-3 py-1 text-sm text-blue-700 hover:text-blue-900 border border-blue-300 rounded-md hover:bg-blue-100"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Quick View
                </button>

                <button
                  onClick={() => {
                    // Generate URL based on entity type
                    let url = '/';
                    switch (contextualEntity.type) {
                      case 'customer':
                        url = `/customers/${contextualEntity.id}`;
                        break;
                      case 'product':
                        url = `/products/${contextualEntity.id}`;
                        break;
                      case 'invoice':
                        url = `/billing/${contextualEntity.id}`;
                        break;
                      case 'return':
                        url = `/returns/${contextualEntity.id}`;
                        break;
                      case 'payment':
                        url = `/payments/${contextualEntity.id}`;
                        break;
                    }
                    navigate(url);
                  }}
                  className="flex items-center px-3 py-1 text-sm text-blue-700 hover:text-blue-900 border border-blue-300 rounded-md hover:bg-blue-100"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Full View
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Contextual Modal */}
      {showModal && modalEntity && (
        <ContextualModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          entityType={modalEntity.type}
          entityId={modalEntity.id}
        />
      )}
    </>
  );
};

export default EnhancedBreadcrumbs;