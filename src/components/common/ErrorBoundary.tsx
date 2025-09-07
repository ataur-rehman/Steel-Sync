import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
    errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ComponentType<{ error?: Error; retry: () => void }>;
}

/**
 * 🚨 CRITICAL: Error Boundary to prevent Daily Ledger crashes from breaking the app
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return {
            hasError: true,
            error
        };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('🚨 Error Boundary caught an error:', error, errorInfo);

        // Log to external service in production
        if (process.env.NODE_ENV === 'production') {
            // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
            console.error('Production error logged:', {
                error: error.message,
                stack: error.stack,
                componentStack: errorInfo.componentStack
            });
        }

        this.setState({
            error,
            errorInfo
        });
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    };

    render() {
        if (this.state.hasError) {
            // Use custom fallback if provided
            if (this.props.fallback) {
                const FallbackComponent = this.props.fallback;
                return <FallbackComponent error={this.state.error} retry={this.handleRetry} />;
            }

            // Default error UI
            return (
                <div className="min-h-[400px] bg-red-50 border border-red-200 rounded-lg p-8 flex flex-col items-center justify-center">
                    <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
                    <h2 className="text-xl font-semibold text-red-700 mb-2">Something went wrong</h2>
                    <p className="text-red-600 text-center mb-6 max-w-md">
                        The Daily Ledger encountered an error. Your data is safe, but the page needs to be refreshed.
                    </p>

                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <details className="mb-4 text-sm text-red-600 bg-red-100 p-3 rounded">
                            <summary className="cursor-pointer font-medium">Error Details (Dev Mode)</summary>
                            <pre className="mt-2 whitespace-pre-wrap">
                                {this.state.error.message}
                                {'\n\n'}
                                {this.state.error.stack}
                            </pre>
                        </details>
                    )}

                    <button
                        onClick={this.handleRetry}
                        className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Higher-order component for wrapping components with error boundary
 */
export function withErrorBoundary<P extends object>(
    Component: React.ComponentType<P>,
    fallback?: React.ComponentType<{ error?: Error; retry: () => void }>
) {
    return function WrappedComponent(props: P) {
        return (
            <ErrorBoundary fallback={fallback}>
                <Component {...props} />
            </ErrorBoundary>
        );
    };
}

export default ErrorBoundary;
