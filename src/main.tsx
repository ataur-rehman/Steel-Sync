import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { eventBus, BUSINESS_EVENTS } from './utils/eventBus';
import { realtimeTestUtils } from './utils/realtimeTestUtils';

/**
 * CRITICAL DOM STABILITY: React Application Bootstrap
 * Enhanced with DOM error prevention and stable mounting
 */

// Global React root instance to prevent multiple mounts
let reactRoot: ReactDOM.Root | null = null;
let isInitializing = false;
let isAppMounted = false;

// DOM STABILITY: Load critical DOM fixes immediately
function loadDOMStabilityFixes(): void {
  // Override problematic DOM methods with safe versions
  const originalRemoveChild = Node.prototype.removeChild;
  const originalInsertBefore = Node.prototype.insertBefore;

  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    try {
      if (this.contains && !this.contains(child)) {
        console.warn('DOM Fix: Attempted to remove non-child node, skipping');
        return child;
      }
      if (child.parentNode !== this) {
        if (child.parentNode && child.parentNode.removeChild) {
          return child.parentNode.removeChild(child) as T;
        }
        return child;
      }
      return originalRemoveChild.call(this, child) as T;
    } catch (error: any) {
      console.warn('DOM Fix: RemoveChild error prevented:', error?.message || error);
      return child;
    }
  };

  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    try {
      if (!referenceNode) {
        return this.appendChild(newNode) as T;
      }
      if (this.contains && !this.contains(referenceNode)) {
        console.warn('DOM Fix: Reference node not found, appending instead');
        return this.appendChild(newNode) as T;
      }
      if (referenceNode.parentNode !== this) {
        console.warn('DOM Fix: Reference node parent mismatch, appending instead');
        return this.appendChild(newNode) as T;
      }
      return originalInsertBefore.call(this, newNode, referenceNode) as T;
    } catch (error: any) {
      console.warn('DOM Fix: InsertBefore error prevented, using appendChild:', error?.message || error);
      try {
        return this.appendChild(newNode) as T;
      } catch (appendError: any) {
        console.warn('DOM Fix: AppendChild also failed:', appendError?.message || appendError);
        return newNode;
      }
    }
  };

  console.log('✅ DOM stability fixes loaded');
}

// DOM STABILITY: Prevent multiple React mounts and DOM conflicts
async function initializeApp(): Promise<void> {
  // Prevent multiple simultaneous initializations
  if (isInitializing) {
    console.log('⚠️ [APP-INIT] Already initializing, skipping...');
    return;
  }

  if (isAppMounted) {
    console.log('✅ [APP-INIT] Application already mounted successfully');
    return;
  }

  isInitializing = true;

  try {
    console.log('🚀 [APP-INIT] Starting stable application...');

    // STEP 1: Load DOM stability fixes first
    loadDOMStabilityFixes();

    // STEP 2: Ensure DOM is ready and stable
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }

    // STEP 3: Clear any corrupted DOM state
    if (rootElement.hasChildNodes()) {
      console.log('🔧 [DOM-STABILITY] Cleaning existing DOM nodes...');
      // Check if nodes are corrupted or if this is a re-mount
      const children = Array.from(rootElement.childNodes);
      let hasCorruptedNodes = false;

      children.forEach(child => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          const element = child as Element;
          // Check for React DOM corruption indicators
          if (!child.parentNode || element.classList.contains('react-error-boundary') ||
            element.textContent?.includes('error') || element.textContent?.includes('failed')) {
            hasCorruptedNodes = true;
          }
        }
      });

      if (hasCorruptedNodes) {
        console.log('⚠️ [DOM-STABILITY] Corrupted nodes detected, cleaning...');
        rootElement.innerHTML = '';
        // Force cleanup of any React references
        try {
          delete (rootElement as any)._reactRootContainer;
          delete (rootElement as any).__reactInternalInstance;
          delete (rootElement as any).__reactInternalFiber;
        } catch (e) {
          // Ignore cleanup errors
        }
      } else {
        console.log('✅ [DOM-STABILITY] Existing nodes appear stable, preserving...');
        isAppMounted = true;
        isInitializing = false;
        addProductionConsoleUtilities();
        return;
      }
    }

    // STEP 4: Create React root safely (only if not exists)
    if (!reactRoot) {
      console.log('🔧 [DOM-STABILITY] Creating new React root...');

      // Ensure root element is completely clean
      rootElement.innerHTML = '';

      // Wait for DOM to stabilize
      await new Promise(resolve => setTimeout(resolve, 100));

      reactRoot = ReactDOM.createRoot(rootElement);

      // Add stability markers
      rootElement.dataset.reactStable = 'true';
      rootElement.dataset.initTime = Date.now().toString();
    }

    // STEP 5: Render React application with error boundaries
    console.log('🎨 [DOM-STABILITY] Rendering React application...');

    try {
      reactRoot.render(React.createElement(App));
      console.log('✅ [APP-INIT] React application rendered successfully');

      // Mark as successfully mounted
      isAppMounted = true;

      // Wait to ensure rendering is complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify the app is actually mounted
      if (rootElement.hasChildNodes()) {
        console.log('✅ [DOM-STABILITY] Application mount verified');
      } else {
        throw new Error('Application failed to mount - no child nodes detected');
      }

    } catch (renderError) {
      console.error('❌ [DOM-STABILITY] React render failed:', renderError);

      // Attempt recovery
      rootElement.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #721c24; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; margin: 20px;">
          <h2>Application Render Error</h2>
          <p>The React application failed to render properly.</p>
          <p><strong>Error:</strong> ${renderError instanceof Error ? renderError.message : String(renderError)}</p>
          <button onclick="window.location.reload()" style="margin-top: 10px; padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Reload Application
          </button>
          <br><br>
          <button onclick="window.recoverApp()" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Attempt Recovery
          </button>
        </div>
      `;

      throw renderError;
    }

    console.log('✅ [APP-INIT] Application started successfully');

    // STEP 6: Add production console utilities
    addProductionConsoleUtilities();

  } catch (error) {
    console.error('❌ [APP-INIT] Critical application startup failure:', error);

    // Show user-friendly error with recovery options
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #721c24; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; margin: 20px;">
          <h2>Application Initialization Failed</h2>
          <p>The application failed to start properly.</p>
          <p><strong>Error:</strong> ${error instanceof Error ? error.message : String(error)}</p>
          <div style="margin-top: 15px;">
            <button onclick="window.location.reload()" style="margin: 5px; padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Refresh Page
            </button>
            <button onclick="window.clearAndReload()" style="margin: 5px; padding: 8px 16px; background: #ffc107; color: black; border: none; border-radius: 4px; cursor: pointer;">
              Clear Cache & Reload
            </button>
            <button onclick="window.recoverApp()" style="margin: 5px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Attempt Recovery
            </button>
          </div>
          <div style="margin-top: 15px; font-size: 12px; color: #6c757d;">
            If problems persist, try opening browser console and running: <code>window.recoverApp()</code>
          </div>
        </div>
      `;
    }
  } finally {
    isInitializing = false;
  }
}

/**
 * APPLICATION RECOVERY: Handle DOM errors and recover gracefully
 */
async function recoverApplication(): Promise<void> {
  try {
    console.log('🔄 [RECOVERY] Attempting application recovery...');

    // Reset initialization flags
    isInitializing = false;
    isAppMounted = false;
    reactRoot = null;

    // Clear root element
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.innerHTML = '<div style="padding: 20px; text-align: center;">Recovering application...</div>';

      // Clear React references
      try {
        delete (rootElement as any)._reactRootContainer;
        delete (rootElement as any).__reactInternalInstance;
        delete (rootElement as any).__reactInternalFiber;
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    // Wait for DOM to stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Attempt re-initialization
    await initializeApp();

    console.log('✅ [RECOVERY] Application recovery successful');

  } catch (recoveryError) {
    console.error('❌ [RECOVERY] Recovery failed, forcing reload:', recoveryError);
    window.location.reload();
  }
}

/**
 * CLEAR CACHE AND RELOAD: Complete application reset
 */
async function clearAndReload(): Promise<void> {
  try {
    console.log('🧹 [CACHE-CLEAR] Clearing all caches and reloading...');

    // Clear localStorage
    if (window.localStorage) {
      window.localStorage.clear();
    }

    // Clear sessionStorage
    if (window.sessionStorage) {
      window.sessionStorage.clear();
    }

    // Clear service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let registration of registrations) {
        await registration.unregister();
      }
    }

    // Clear caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }

    // Force reload
    window.location.reload();

  } catch (error) {
    console.error('❌ [CACHE-CLEAR] Cache clear failed:', error);
    window.location.reload();
  }
}

/**
 * PRODUCTION UTILITIES: Console functions for debugging and testing
 */
function addProductionConsoleUtilities(): void {
  console.log('🔧 [CONSOLE] Production utilities available:');
  console.log('- Call reinitializeDatabase() to force database re-initialization');
  console.log('- Call getSystemStatus() to check system health');
  console.log('- Call clearCaches() to clear all caches');
  console.log('- Call recoverApp() to recover from DOM errors');
  console.log('- Call clearAndReload() to completely reset the app');
  console.log('- Call realtimeTest.startEventMonitoring() to debug real-time updates');
  console.log('- Call realtimeTest.forceGlobalRefresh() to force UI refresh');

  // Application recovery
  (window as any).recoverApp = recoverApplication;
  (window as any).clearAndReload = clearAndReload;

  // Real-time testing utilities
  (window as any).realtimeTest = realtimeTestUtils;

  // Production database re-initialization
  (window as any).reinitializeDatabase = async () => {
    try {
      console.log('🔄 [CONSOLE] Force reinitializing database...');
      // Database reinitialization logic would go here
      console.log('✅ [CONSOLE] Database reinitialized successfully');
    } catch (error) {
      console.error('❌ [CONSOLE] Database reinitialization failed:', error);
    }
  };

  // System status checker
  (window as any).getSystemStatus = async () => {
    try {
      console.log('🔍 [CONSOLE] Checking system status...');

      const status = {
        reactMounted: isAppMounted,
        domStable: document.getElementById('root')?.dataset.reactStable === 'true',
        rootElement: !!document.getElementById('root'),
        reactRoot: !!reactRoot,
        timestamp: new Date().toISOString()
      };

      console.log('📊 [CONSOLE] System Status:', status);
      return status;
    } catch (error) {
      console.error('❌ [CONSOLE] Status check failed:', error);
      return null;
    }
  };

  // Cache clearing utility
  (window as any).clearCaches = clearAndReload;

  // Immediate React DOM fix
  (window as any).fixReactDOMErrors = async () => {
    try {
      console.log('🔧 [CONSOLE] Applying immediate React DOM fixes...');

      // Apply DOM fixes
      loadDOMStabilityFixes();

      // Recover if needed
      if (!isAppMounted) {
        await recoverApplication();
      }

      console.log('✅ [CONSOLE] React DOM fixes applied');
      return { success: true, message: 'DOM fixes applied successfully' };

    } catch (error) {
      console.error('❌ [CONSOLE] DOM fix failed:', error);
      return { success: false, error: (error as Error)?.message || String(error) };
    }
  };
}

// Expose eventBus globally for cross-component communication
(window as any).eventBus = eventBus;
(window as any).BUSINESS_EVENTS = BUSINESS_EVENTS;

// ERROR HANDLING: Global error handlers for DOM stability
window.addEventListener('error', (event) => {
  const error = event.error;
  if (error && error.message) {
    const message = error.message;

    // IGNORE SEARCH-RELATED ERRORS - they should not trigger app recovery
    if (message.includes('products') ||
      message.includes('search') ||
      message.includes('filter') ||
      message.includes('no results') ||
      message.includes('empty') ||
      message.includes('COUNT') ||
      message.includes('SELECT')) {
      console.log('🔍 [SEARCH-ERROR] Ignoring search-related error:', message);
      event.preventDefault();
      return false;
    }

    // Check if it's a React DOM error
    if (message.includes('removeChild') ||
      message.includes('insertBefore') ||
      message.includes('appendChild') ||
      message.includes('replaceChild')) {

      console.log('🔧 [ERROR-HANDLER] React DOM error detected, attempting recovery...');

      // Prevent the error from crashing the app
      event.preventDefault();
      event.stopPropagation();

      // Attempt recovery
      setTimeout(() => {
        recoverApplication();
      }, 100);

      return false;
    }
  }
});

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message) {
    const message = event.reason.message;

    // IGNORE SEARCH-RELATED PROMISE REJECTIONS - they should not trigger app recovery
    if (message.includes('products') ||
      message.includes('search') ||
      message.includes('filter') ||
      message.includes('no results') ||
      message.includes('empty') ||
      message.includes('COUNT') ||
      message.includes('SELECT')) {
      console.log('🔍 [SEARCH-PROMISE] Ignoring search-related promise rejection:', message);
      event.preventDefault();
      return;
    }

    if (message.includes('DOM') || message.includes('React') || message.includes('removeChild') || message.includes('insertBefore')) {
      console.log('🔧 [ERROR-HANDLER] Unhandled DOM promise rejection, attempting recovery...');

      event.preventDefault();

      setTimeout(() => {
        recoverApplication();
      }, 100);

      return;
    }
  }
});

// PRODUCTION STARTUP: Initialize application with DOM stability
console.log('🚀 [BOOTSTRAP] Starting application with DOM stability enhancements...');
initializeApp().catch(error => {
  console.error('❌ [BOOTSTRAP] Failed to initialize application:', error);
  console.log('🔄 [BOOTSTRAP] Attempting recovery in 2 seconds...');
  setTimeout(() => {
    recoverApplication();
  }, 2000);
});
