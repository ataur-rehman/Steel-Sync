// COMPREHENSIVE FLICKERING FIX: Universal Detail View Component
// This component provides a flickering-free foundation for all detail views

import React from 'react';
import { useStableCallback } from '../../hooks/useStableCallback';
import { useDetailView, useMultipleDetailLoads } from '../../hooks/useDetailView';
import { RefreshCw, X } from 'lucide-react';

interface FlickeringFixedDetailViewProps {
  // Core props
  id: number;
  title: string;
  onClose: () => void;
  onUpdate?: () => void;
  
  // Data loading configuration
  loadMainData: (id: string | number) => Promise<any>;
  loadRelatedData?: Array<{
    key: string;
    loadFn: () => Promise<any>;
  }>;
  
  // Render props
  renderContent: (data: any, relatedData: any, actions: {
    handleRefresh: () => Promise<void>;
    isLoading: boolean;
    error: string | null;
  }) => React.ReactNode;
  
  // Optional configuration
  config?: {
    showRefreshButton?: boolean;
    showCloseButton?: boolean;
    modalBackground?: boolean;
    className?: string;
  };
}

const FlickeringFixedDetailView: React.FC<FlickeringFixedDetailViewProps> = ({
  id,
  title,
  onClose,
  onUpdate,
  loadMainData,
  loadRelatedData = [],
  renderContent,
  config = {}
}) => {
  const {
    showRefreshButton = true,
    showCloseButton = true,
    modalBackground = true,
    className = ''
  } = config;

  // ✅ FLICKERING FIX: Single stable data loader for main data
  const { 
    data: mainData, 
    loading: mainLoading, 
    error: mainError, 
    reload: reloadMain 
  } = useDetailView({
    id,
    loadData: useStableCallback(loadMainData)
  });

  // ✅ FLICKERING FIX: Single stable loader for related data
  const { 
    data: relatedData, 
    loading: relatedLoading 
  } = useMultipleDetailLoads(
    loadRelatedData.map(({ key, loadFn }) => ({
      key,
      loadFn: useStableCallback(loadFn)
    })),
    [id]
  );

  // ✅ FLICKERING FIX: Stable refresh handler
  const handleRefresh = useStableCallback(async () => {
    try {
      console.log(`🔄 Refreshing ${title} details...`);
      await reloadMain();
      onUpdate?.();
      console.log(`✅ ${title} details refreshed`);
    } catch (error) {
      console.error(`❌ Failed to refresh ${title} details:`, error);
    }
  });

  // ✅ FLICKERING FIX: Show loading only when both main and related data are loading
  const isLoading = mainLoading || relatedLoading;

  // ✅ FLICKERING FIX: Consolidated loading state
  if (isLoading && !mainData) {
    return (
      <div className={modalBackground ? "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" : ""}>
        <div className="bg-white p-8 rounded-lg shadow-xl">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-lg font-medium">Loading {title.toLowerCase()}...</span>
          </div>
        </div>
      </div>
    );
  }

  // ✅ FLICKERING FIX: Handle errors gracefully
  if (mainError) {
    return (
      <div className={modalBackground ? "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" : ""}>
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-md">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading {title}</h3>
            <p className="text-gray-600 mb-4">{mainError?.message || String(mainError)}</p>
            <div className="flex space-x-3 justify-center">
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <RefreshCw className="h-4 w-4 inline mr-2" />
                Retry
              </button>
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ✅ FLICKERING FIX: Render content with stable props
  const containerClass = modalBackground 
    ? "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    : className;

  const contentClass = modalBackground
    ? "bg-white rounded-lg shadow-xl max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
    : "w-full h-full";

  return (
    <div className={containerClass}>
      <div className={contentClass}>
        {/* Header with title and actions */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <div className="flex items-center space-x-2">
            {showRefreshButton && (
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-auto">
          {renderContent(mainData, relatedData, {
            handleRefresh,
            isLoading,
            error: mainError
          })}
        </div>
      </div>
    </div>
  );
};

export default FlickeringFixedDetailView;
