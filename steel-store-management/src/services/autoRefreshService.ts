/**
 * PRODUCTION AUTO-REFRESH SYSTEM
 * Provides real-time updates for Business Finance Dashboard
 * Works automatically without manual refresh (Ctrl+S)
 */

export class AutoRefreshManager {
  private static instance: AutoRefreshManager;
  private refreshCallbacks: Map<string, () => void> = new Map();
  private refreshInterval: NodeJS.Timeout | null = null;
  private isActive: boolean = false;
  private lastUpdate: number = 0;
  private readonly REFRESH_INTERVAL = 30000; // 30 seconds
  private readonly MIN_UPDATE_INTERVAL = 5000; // 5 seconds minimum between updates

  public static getInstance(): AutoRefreshManager {
    if (!AutoRefreshManager.instance) {
      AutoRefreshManager.instance = new AutoRefreshManager();
    }
    return AutoRefreshManager.instance;
  }

  /**
   * Register a component for auto-refresh
   */
  public registerComponent(componentId: string, refreshCallback: () => void): void {
    console.log(`🔄 [AUTO-REFRESH] Registering component: ${componentId}`);
    this.refreshCallbacks.set(componentId, refreshCallback);
    
    // Start auto-refresh if this is the first component
    if (this.refreshCallbacks.size === 1) {
      this.startAutoRefresh();
    }
  }

  /**
   * Unregister a component from auto-refresh
   */
  public unregisterComponent(componentId: string): void {
    console.log(`🔄 [AUTO-REFRESH] Unregistering component: ${componentId}`);
    this.refreshCallbacks.delete(componentId);
    
    // Stop auto-refresh if no components are registered
    if (this.refreshCallbacks.size === 0) {
      this.stopAutoRefresh();
    }
  }

  /**
   * Trigger immediate refresh for all registered components
   */
  public triggerRefresh(reason: string = 'manual'): void {
    const now = Date.now();
    
    // Throttle updates to prevent excessive refreshing
    if (now - this.lastUpdate < this.MIN_UPDATE_INTERVAL) {
      console.log(`⚡ [AUTO-REFRESH] Throttling refresh (${reason}) - too soon since last update`);
      return;
    }

    console.log(`🔄 [AUTO-REFRESH] Triggering refresh for ${this.refreshCallbacks.size} components (${reason})`);
    
    this.refreshCallbacks.forEach((callback, componentId) => {
      try {
        callback();
        console.log(`✅ [AUTO-REFRESH] Refreshed component: ${componentId}`);
      } catch (error) {
        console.error(`❌ [AUTO-REFRESH] Error refreshing component ${componentId}:`, error);
      }
    });
    
    this.lastUpdate = now;
  }

  /**
   * Start automatic refresh interval
   */
  private startAutoRefresh(): void {
    if (this.isActive) {
      return;
    }

    console.log(`🚀 [AUTO-REFRESH] Starting auto-refresh every ${this.REFRESH_INTERVAL / 1000} seconds`);
    this.isActive = true;
    
    this.refreshInterval = setInterval(() => {
      this.triggerRefresh('auto');
    }, this.REFRESH_INTERVAL);
  }

  /**
   * Stop automatic refresh interval
   */
  private stopAutoRefresh(): void {
    if (!this.isActive) {
      return;
    }

    console.log(`🛑 [AUTO-REFRESH] Stopping auto-refresh`);
    this.isActive = false;
    
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Check if auto-refresh is active
   */
  public isAutoRefreshActive(): boolean {
    return this.isActive;
  }

  /**
   * Get refresh statistics
   */
  public getStats(): {
    isActive: boolean;
    registeredComponents: number;
    lastUpdate: number;
    timeSinceLastUpdate: number;
  } {
    return {
      isActive: this.isActive,
      registeredComponents: this.refreshCallbacks.size,
      lastUpdate: this.lastUpdate,
      timeSinceLastUpdate: this.lastUpdate ? Date.now() - this.lastUpdate : 0
    };
  }
}

/**
 * ENHANCED DATA CHANGE DETECTOR
 * Detects when data changes occur and triggers refreshes
 */
export class DataChangeDetector {
  private static instance: DataChangeDetector;
  private autoRefreshManager: AutoRefreshManager;
  private dataHashes: Map<string, string> = new Map();

  public static getInstance(): DataChangeDetector {
    if (!DataChangeDetector.instance) {
      DataChangeDetector.instance = new DataChangeDetector();
    }
    return DataChangeDetector.instance;
  }

  constructor() {
    this.autoRefreshManager = AutoRefreshManager.getInstance();
  }

  /**
   * Notify that data has changed (call this after any data modification)
   */
  public notifyDataChange(context: string, details?: any): void {
    console.log(`📊 [DATA-CHANGE] Data changed in context: ${context}`, details);
    
    // Trigger immediate refresh for all components
    this.autoRefreshManager.triggerRefresh(`data-change:${context}`);
  }

  /**
   * Hash data to detect changes
   */
  private hashData(data: any): string {
    return JSON.stringify(data).length.toString();
  }

  /**
   * Check if data has changed since last check
   */
  public hasDataChanged(key: string, data: any): boolean {
    const currentHash = this.hashData(data);
    const previousHash = this.dataHashes.get(key);
    
    if (currentHash !== previousHash) {
      this.dataHashes.set(key, currentHash);
      return true;
    }
    
    return false;
  }
}

/**
 * React Hook for Auto-Refresh
 */
import { useEffect, useRef } from 'react';

export function useAutoRefresh(
  refreshCallback: () => void,
  componentId: string,
  dependencies: any[] = []
): {
  triggerRefresh: () => void;
  isAutoRefreshActive: boolean;
} {
  const autoRefreshManager = useRef(AutoRefreshManager.getInstance());
  const dataChangeDetector = useRef(DataChangeDetector.getInstance());

  useEffect(() => {
    // Register component for auto-refresh
    autoRefreshManager.current.registerComponent(componentId, refreshCallback);

    return () => {
      // Unregister component on cleanup
      autoRefreshManager.current.unregisterComponent(componentId);
    };
  }, [componentId, refreshCallback]);

  // Trigger refresh when dependencies change
  useEffect(() => {
    if (dependencies.length > 0) {
      dataChangeDetector.current.notifyDataChange(`${componentId}-dependencies`, dependencies);
    }
  }, dependencies);

  return {
    triggerRefresh: () => autoRefreshManager.current.triggerRefresh(`manual:${componentId}`),
    isAutoRefreshActive: autoRefreshManager.current.isAutoRefreshActive()
  };
}

/**
 * Enhanced Finance Service Wrapper with Auto-Refresh
 */
export class EnhancedFinanceService {
  private dataChangeDetector: DataChangeDetector;

  constructor() {
    this.dataChangeDetector = DataChangeDetector.getInstance();
  }

  /**
   * Wrapper for finance operations that triggers auto-refresh
   */
  public async executeWithRefresh<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    try {
      const result = await operation();
      
      // Notify that data has changed
      this.dataChangeDetector.notifyDataChange(context, { success: true });
      
      return result;
    } catch (error) {
      // Still notify of change attempt
      this.dataChangeDetector.notifyDataChange(context, { success: false, error });
      throw error;
    }
  }
}

export const enhancedFinanceService = new EnhancedFinanceService();
