import React from 'react';
import { AuthProvider } from '../../hooks/useAuth';
import { DatabaseProvider } from '../../hooks/useDatabase';

interface AuthErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorType: 'auth' | 'database' | 'react-dom' | 'unknown';
}

class AuthErrorBoundary extends React.Component<
  { children: React.ReactNode },
  AuthErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorType: 'unknown' };
  }

  static getDerivedStateFromError(error: Error): AuthErrorBoundaryState {
    console.error('AuthErrorBoundary caught error:', error);
    
    // Determine error type based on error message
    let errorType: AuthErrorBoundaryState['errorType'] = 'unknown';
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('insertbefore') || errorMessage.includes('removechild')) {
      errorType = 'react-dom';
    } else if (errorMessage.includes('database') || errorMessage.includes('timeout')) {
      errorType = 'database';
    } else if (errorMessage.includes('auth')) {
      errorType = 'auth';
    }
    
    return { hasError: true, error, errorType };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Authentication Error Details:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
  }

  render() {
    if (this.state.hasError) {
      const { error, errorType } = this.state;
      
      // Specific handling for React DOM errors
      if (errorType === 'react-dom') {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
              <div className="text-center">
                <div className="text-orange-500 text-6xl mb-4">🔄</div>
                <h1 className="text-xl font-semibold text-gray-900 mb-2">
                  Application Needs Refresh
                </h1>
                <p className="text-gray-600 mb-4">
                  The application encountered a React rendering issue, likely due to database initialization.
                </p>
                <div className="bg-orange-50 border border-orange-200 rounded-md p-3 mb-4">
                  <p className="text-sm text-orange-800">
                    This is usually fixed by refreshing the page after database initialization completes.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    console.log('🔧 Attempting to fix database schema before refresh...');
                    try {
                      // Try to fix database issues before refresh
                      await (window as any).fixReactDOMErrors();
                    } catch (e) {
                      console.warn('Schema fix failed, refreshing anyway:', e);
                      window.location.reload();
                    }
                  }}
                  className="w-full bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 transition-colors mb-2"
                >
                  Fix Database & Refresh
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
                >
                  Just Refresh
                </button>
              </div>
            </div>
          </div>
        );
      }
      
      // Database error handling
      if (errorType === 'database') {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
              <div className="text-center">
                <div className="text-blue-500 text-6xl mb-4">🗄️</div>
                <h1 className="text-xl font-semibold text-gray-900 mb-2">
                  Database Initialization
                </h1>
                <p className="text-gray-600 mb-4">
                  The database is still initializing. Please wait a moment.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                  <p className="text-sm text-blue-800">
                    {error?.message || 'Database initialization in progress...'}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    try {
                      // Try to ensure database is ready
                      await (window as any).ensureDatabaseReady();
                      window.location.reload();
                    } catch (e) {
                      console.error('Database readiness check failed:', e);
                      window.location.reload();
                    }
                  }}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Check Database & Retry
                </button>
              </div>
            </div>
          </div>
        );
      }
      
      // Default error handling
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="text-center">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                Application Error
              </h1>
              <p className="text-gray-600 mb-4">
                There was an error starting the application.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                <p className="text-sm text-red-800">
                  {error?.message || 'Unknown error occurred'}
                </p>
              </div>
              <button
                onClick={() => {
                  // Clear any corrupted localStorage
                  localStorage.clear();
                  // Reload the page
                  window.location.reload();
                }}
                className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
              >
                Clear Data & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Enhanced AuthProvider wrapper with error boundary
export const SafeAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthErrorBoundary>
      <AuthProvider>
        <DatabaseProvider>
          {children}
        </DatabaseProvider>
      </AuthProvider>
    </AuthErrorBoundary>
  );
};

export default AuthErrorBoundary;
