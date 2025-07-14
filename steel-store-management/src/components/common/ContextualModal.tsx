// components/common/ContextualModal.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  ExternalLink, 
  User, 
  Package, 
  FileText, 
  Phone,
  MapPin,
  Loader
} from 'lucide-react';
import { DeepLinkingService } from '../../services/deepLinking';
import type { LinkableEntity, TraceabilityContext } from '../../services/deepLinking';

interface ContextualModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'customer' | 'product' | 'invoice' | 'return' | 'payment';
  entityId: number;
  title?: string;
}

const ContextualModal: React.FC<ContextualModalProps> = ({
  isOpen,
  onClose,
  entityType,
  entityId,
  title
}) => {
  const navigate = useNavigate();
  const [context, setContext] = useState<TraceabilityContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'related' | 'timeline'>('details');

  useEffect(() => {
    if (isOpen && entityId) {
      loadEntityContext();
    }
  }, [isOpen, entityType, entityId]);

  const loadEntityContext = async () => {
    try {
      setLoading(true);
      const traceabilityContext = await DeepLinkingService.getTraceabilityContext(entityType, entityId);
      setContext(traceabilityContext);
    } catch (error) {
      console.error('Failed to load entity context:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToEntity = (entity: LinkableEntity) => {
    navigate(entity.url);
    onClose();
  };

  const handleOpenInNewContext = () => {
    if (context) {
      navigate(context.entity.url);
      onClose();
    }
  };

  const formatCurrency = (amount: number): string => {
    return `Rs. ${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderCustomerDetails = (entity: LinkableEntity) => {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-100 rounded-lg">
            <User className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{entity.displayName}</h3>
            <p className="text-sm text-gray-500">Customer Profile</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            {entity.metadata?.phone && (
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-700">{entity.metadata.phone}</span>
              </div>
            )}
            
            {entity.metadata?.address && (
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-700">{entity.metadata.address}</span>
              </div>
            )}
          </div>
          
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Current Balance</p>
              <p className={`text-lg font-semibold ${
                entity.metadata?.balance > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {formatCurrency(entity.metadata?.balance || 0)}
              </p>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Total Invoices</p>
              <p className="text-lg font-semibold text-gray-900">
                {entity.metadata?.totalInvoices || 0}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderProductDetails = (entity: LinkableEntity) => {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-green-100 rounded-lg">
            <Package className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{entity.displayName}</h3>
            <p className="text-sm text-gray-500">{entity.metadata?.category}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Current Stock</p>
            <p className={`text-lg font-semibold ${
              entity.metadata?.stock <= 20 ? 'text-red-600' : 'text-green-600'
            }`}>
              {entity.metadata?.stock || 0}
            </p>
          </div>
          
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Unit Price</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatCurrency(entity.metadata?.unitPrice || 0)}
            </p>
          </div>
          
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Total Sales</p>
            <p className="text-lg font-semibold text-blue-600">
              {entity.metadata?.totalSales || 0}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderInvoiceDetails = (entity: LinkableEntity) => {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-purple-100 rounded-lg">
            <FileText className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{entity.displayName}</h3>
            <p className="text-sm text-gray-500">Invoice Details</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(entity.metadata?.amount || 0)}
              </p>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Status</p>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                entity.metadata?.status === 'paid' ? 'bg-green-100 text-green-800' :
                entity.metadata?.status === 'partially_paid' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {entity.metadata?.status && typeof entity.metadata.status === 'string' 
                  ? entity.metadata.status.replace('_', ' ').toUpperCase() 
                  : 'UNKNOWN'}
              </span>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Items Count</p>
              <p className="text-lg font-semibold text-gray-900">
                {entity.metadata?.itemCount || 0}
              </p>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Date</p>
              <p className="text-sm text-gray-700">
                {entity.metadata?.date ? formatDate(entity.metadata.date) : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRelatedEntities = () => {
    if (!context?.relatedEntities.length) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">No related entities found</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {context.relatedEntities.map((relatedEntity) => (
          <div
            key={`${relatedEntity.type}-${relatedEntity.id}`}
            onClick={() => handleNavigateToEntity(relatedEntity)}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors group"
          >
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${
                relatedEntity.type === 'customer' ? 'bg-blue-100' :
                relatedEntity.type === 'product' ? 'bg-green-100' :
                relatedEntity.type === 'invoice' ? 'bg-purple-100' :
                'bg-gray-100'
              }`}>
                {relatedEntity.type === 'customer' && <User className="h-4 w-4 text-blue-600" />}
                {relatedEntity.type === 'product' && <Package className="h-4 w-4 text-green-600" />}
                {relatedEntity.type === 'invoice' && <FileText className="h-4 w-4 text-purple-600" />}
              </div>
              <div>
                <p className="font-medium text-gray-900">{relatedEntity.displayName}</p>
                <p className="text-sm text-gray-500 capitalize">{relatedEntity.type}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {relatedEntity.metadata?.amount && (
                <span className="text-sm font-semibold text-gray-700">
                  {formatCurrency(relatedEntity.metadata.amount)}
                </span>
              )}
              <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTimeline = () => {
    if (!context?.timeline.length) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">No timeline events found</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {context.timeline.map((event) => (
          <div key={event.id} className="flex items-start space-x-3">
            <div className={`p-2 rounded-full ${
              event.impact === 'positive' ? 'bg-green-100' :
              event.impact === 'negative' ? 'bg-red-100' :
              'bg-gray-100'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                event.impact === 'positive' ? 'bg-green-600' :
                event.impact === 'negative' ? 'bg-red-600' :
                'bg-gray-600'
              }`}></div>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900">{event.description}</p>
                <span className="text-xs text-gray-500">{formatDate(event.date)}</span>
              </div>
              
              {event.amount && (
                <p className={`text-sm font-semibold ${
                  event.impact === 'positive' ? 'text-green-600' :
                  event.impact === 'negative' ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {event.impact === 'positive' ? '+' : event.impact === 'negative' ? '-' : ''}
                  {formatCurrency(event.amount)}
                </p>
              )}
              
              <button
                onClick={() => handleNavigateToEntity(event.reference)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                View {event.reference.displayName}
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900">
            {title || 'Quick Preview'}
          </h3>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleOpenInNewContext}
              className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Full View
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center h-32">
            <Loader className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        )}

        {/* Content */}
        {!loading && context && (
          <>
            {/* Tabs */}
            <div className="flex space-x-1 mb-6 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('details')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
                  activeTab === 'details'
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Details
              </button>
              <button
                onClick={() => setActiveTab('related')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
                  activeTab === 'related'
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Related ({context.relatedEntities.length})
              </button>
              <button
                onClick={() => setActiveTab('timeline')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
                  activeTab === 'timeline'
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Timeline ({context.timeline.length})
              </button>
            </div>

            {/* Tab Content */}
            <div className="min-h-[300px]">
              {activeTab === 'details' && (
                <>
                  {entityType === 'customer' && renderCustomerDetails(context.entity)}
                  {entityType === 'product' && renderProductDetails(context.entity)}
                  {entityType === 'invoice' && renderInvoiceDetails(context.entity)}
                </>
              )}
              
              {activeTab === 'related' && renderRelatedEntities()}
              
              {activeTab === 'timeline' && renderTimeline()}
            </div>
          </>
        )}

        {/* Error State */}
        {!loading && !context && (
          <div className="text-center py-8">
            <p className="text-gray-500">Failed to load data</p>
            <button
              onClick={loadEntityContext}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContextualModal;