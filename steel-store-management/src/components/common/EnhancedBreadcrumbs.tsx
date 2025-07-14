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
  Search,
  Clock,
  Eye,
  ExternalLink
} from 'lucide-react';
import { DeepLinkingService } from '../../services/deepLinking';
import type { LinkableEntity } from '../../services/deepLinking';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LinkableEntity[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
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

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        performGlobalSearch(searchQuery);
      } else {
        setSearchResults([]);
        setShowSearchDropdown(false);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery]);

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

  const performGlobalSearch = async (query: string) => {
    try {
      const results = await DeepLinkingService.globalSearch(query);
      setSearchResults(results);
      setShowSearchDropdown(true);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    }
  };

  const handleSearchResultClick = (entity: LinkableEntity) => {
    navigate(entity.url);
    setSearchQuery('');
    setShowSearchDropdown(false);
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

  const formatCurrency = (amount: number): string => {
    return `Rs. ${amount.toFixed(2)}`;
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
                  className={`flex items-center space-x-1 px-2 py-1 rounded-md transition-colors ${
                    index === breadcrumbItems.length - 1
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

          {/* Global Search */}
          {showGlobalSearch && (
            <div className="relative">
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search customers, products, invoices..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => searchResults.length > 0 && setShowSearchDropdown(true)}
                    onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                    className="pl-10 pr-4 py-2 w-80 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
                
                {/* Recent Activity Button */}
                <button
                  onClick={() => navigate('/activity')}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  title="Recent Activity"
                >
                  <Clock className="h-4 w-4" />
                </button>
              </div>

              {/* Search Dropdown */}
              {showSearchDropdown && searchResults.length > 0 && (
                <div className="absolute top-full right-0 mt-1 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                  <div className="p-2">
                    <div className="text-xs font-medium text-gray-500 mb-2">
                      Search Results ({searchResults.length})
                    </div>
                    
                    {searchResults.map((result) => (
                      <div
                        key={`${result.type}-${result.id}`}
                        className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer group"
                        onClick={() => handleSearchResultClick(result)}
                      >
                        <div className="flex items-center space-x-3">
                          {getEntityIcon(result.type)}
                          <div>
                            <p className="font-medium text-gray-900">{result.displayName}</p>
                            <p className="text-sm text-gray-500 capitalize">{result.type}</p>
                            {result.metadata?.phone && (
                              <p className="text-xs text-gray-400">{result.metadata.phone}</p>
                            )}
                            {result.metadata?.category && (
                              <p className="text-xs text-gray-400">{result.metadata.category}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {result.metadata?.amount && (
                            <span className="text-sm font-semibold text-gray-700">
                              {formatCurrency(result.metadata.amount)}
                            </span>
                          )}
                          {result.metadata?.balance && (
                            <span className={`text-sm font-semibold ${
                              result.metadata.balance > 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {formatCurrency(result.metadata.balance)}
                            </span>
                          )}
                          {result.metadata?.stock !== undefined && (
                            <span className={`text-sm font-semibold ${
                              result.metadata.stock <= 20 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {result.metadata.stock}
                            </span>
                          )}
                          
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickPreview(result.type, result.id);
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Quick preview"
                            >
                              <Eye className="h-3 w-3" />
                            </button>
                            <ExternalLink className="h-3 w-3 text-gray-400 group-hover:text-gray-600" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                  onClick={() => navigate(DeepLinkingService.getEntityUrl(contextualEntity.type, contextualEntity.id))}
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