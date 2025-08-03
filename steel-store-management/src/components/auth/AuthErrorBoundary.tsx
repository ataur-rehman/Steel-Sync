import React from 'react';
import { AuthProvider } from '../../hooks/useAuth';
import { DatabaseProvider } from '../../hooks/useDatabase';

interface AuthErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class AuthErrorBoundary extends React.Component<
  { children: React.ReactNode },
  AuthErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): AuthErrorBoundaryState {
    console.error('AuthErrorBoundary caught error:', error);
    return { hasError: true, error };
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
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="text-center">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                Authentication Error
              </h1>
              <p className="text-gray-600 mb-4">
                There was an error initializing the authentication system.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                <p className="text-sm text-red-800">
                  {this.state.error?.message || 'Unknown authentication error'}
                </p>
              </div>
              <button
                onClick={() => {
                  // Clear any corrupted localStorage
                  localStorage.clear();
                  // Reload the page
                  window.location.reload();
                }}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Reload Application
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
