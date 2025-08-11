import React from 'react';
import { useAuth } from './useAuth';

// Higher Order Component for safe auth usage
export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>
): React.ComponentType<P> {
  const ComponentWithAuth = (props: P) => {
    try {
      // Verify auth context is available
      useAuth();
      return <WrappedComponent {...props} />;
    } catch (error) {
      console.error('Auth context error in component:', error);
      
      // Show a fallback UI instead of crashing
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center p-8 bg-white rounded-lg shadow-lg">
            <div className="text-red-500 mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Application Error</h2>
            <p className="text-gray-600 mb-4">
              There was an error starting the application.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              useAuth must be used within an AuthProvider. Make sure your component is wrapped with &lt;AuthProvider&gt;.
            </p>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Clear Data &amp; Reload
            </button>
          </div>
        </div>
      );
    }
  };

  ComponentWithAuth.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name})`;
  return ComponentWithAuth;
}

// Safe useAuth hook that provides fallback
export function useSafeAuth() {
  try {
    return useAuth();
  } catch (error) {
    console.warn('useAuth failed, providing fallback:', error);
    return {
      user: null,
      loading: true,
      login: async () => false,
      logout: () => {}
    };
  }
}
