/**
 * 🚀 PRODUCTION-GRADE: Performance Dashboard Component
 * 
 * Real-time performance monitoring for invoice system
 */

import React from 'react';
import { useInvoicePerformance, PerformanceUtils } from '../utils/invoicePerformanceMonitor';
import type { PerformanceTestSuite } from '../utils/invoicePerformanceTest';

interface PerformanceDashboardProps {
    onRunTests?: () => void;
    showDetailedMetrics?: boolean;
    className?: string;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
    onRunTests,
    showDetailedMetrics = false,
    className = ''
}) => {
    const { metrics, getRecommendations, getPerformanceScore, reset } = useInvoicePerformance();
    const [testResults, setTestResults] = React.useState<PerformanceTestSuite | null>(null);
    const [isRunningTests, setIsRunningTests] = React.useState(false);

    const performanceScore = getPerformanceScore();
    const recommendations = getRecommendations();
    const scoreColor = PerformanceUtils.getPerformanceColor(performanceScore);

    const handleRunQuickTest = async () => {
        if (!onRunTests) return;

        setIsRunningTests(true);
        try {
            await onRunTests();
        } catch (error) {
            console.error('Performance test failed:', error);
        } finally {
            setIsRunningTests(false);
        }
    };

    const handleReset = () => {
        reset();
        setTestResults(null);
    };

    if (!showDetailedMetrics) {
        // Compact performance indicator
        return (
            <div className={`inline-flex items-center space-x-2 text-sm ${className}`}>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${scoreColor}`}>
                    {performanceScore.toFixed(0)}%
                </div>
                <span className="text-gray-600">
                    {PerformanceUtils.formatMetrics(metrics)}
                </span>
            </div>
        );
    }

    // Full performance dashboard
    return (
        <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-semibold text-gray-900">Performance Dashboard</h3>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${scoreColor}`}>
                        Score: {performanceScore.toFixed(1)}/100
                    </div>
                </div>

                <div className="flex space-x-2">
                    {onRunTests && (
                        <button
                            onClick={handleRunQuickTest}
                            disabled={isRunningTests}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors"
                        >
                            {isRunningTests ? 'Running Tests...' : 'Quick Test'}
                        </button>
                    )}
                    <button
                        onClick={handleReset}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors"
                    >
                        Reset
                    </button>
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <MetricCard
                    title="Query Time"
                    value={`${metrics.queryTime.toFixed(1)}ms`}
                    subValue={`Avg: ${metrics.averageQueryTime.toFixed(1)}ms`}
                    color={metrics.queryTime > 1000 ? 'red' : metrics.queryTime > 500 ? 'yellow' : 'green'}
                />

                <MetricCard
                    title="Records Loaded"
                    value={metrics.recordsLoaded.toLocaleString()}
                    subValue={`${metrics.totalQueries} queries`}
                    color="blue"
                />

                <MetricCard
                    title="Cache Hit Rate"
                    value={`${metrics.cacheHitRate.toFixed(1)}%`}
                    subValue={`${metrics.cacheHits} hits`}
                    color={metrics.cacheHitRate > 70 ? 'green' : metrics.cacheHitRate > 40 ? 'yellow' : 'red'}
                />

                <MetricCard
                    title="Memory Usage"
                    value={`${metrics.memoryUsage.toFixed(1)}MB`}
                    subValue="Current heap"
                    color={metrics.memoryUsage > 100 ? 'red' : metrics.memoryUsage > 50 ? 'yellow' : 'green'}
                />
            </div>

            {/* Performance Recommendations */}
            {recommendations.length > 0 && (
                <div className="mb-6">
                    <h4 className="text-md font-medium text-gray-900 mb-3">💡 Performance Recommendations</h4>
                    <div className="space-y-2">
                        {recommendations.map((rec, index) => (
                            <div key={index} className="flex items-start space-x-2 text-sm">
                                <span className="text-yellow-500 mt-0.5">⚠️</span>
                                <span className="text-gray-700">{rec}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Query Performance Chart */}
            <div className="mb-6">
                <h4 className="text-md font-medium text-gray-900 mb-3">Query Performance Trend</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>Average: {metrics.averageQueryTime.toFixed(1)}ms</span>
                        <span>Slow Queries: {metrics.slowQueries}/{metrics.totalQueries}</span>
                        <span>Last Updated: {new Date(metrics.lastUpdated).toLocaleTimeString()}</span>
                    </div>

                    {/* Simple performance bar */}
                    <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                        <div
                            className={`h-2 rounded-full transition-all duration-500 ${metrics.averageQueryTime > 2000 ? 'bg-red-500' :
                                    metrics.averageQueryTime > 1000 ? 'bg-yellow-500' : 'bg-green-500'
                                }`}
                            style={{
                                width: `${Math.min(100, (metrics.averageQueryTime / 3000) * 100)}%`
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Test Results */}
            {testResults && (
                <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3">Latest Test Results</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <span className="text-gray-600">Tests Passed:</span>
                                <div className="font-medium text-green-600">
                                    {testResults.passedTests}/{testResults.totalTests}
                                </div>
                            </div>
                            <div>
                                <span className="text-gray-600">Avg Query:</span>
                                <div className="font-medium">{testResults.averageQueryTime.toFixed(1)}ms</div>
                            </div>
                            <div>
                                <span className="text-gray-600">Peak Memory:</span>
                                <div className="font-medium">{testResults.peakMemoryUsage.toFixed(1)}MB</div>
                            </div>
                            <div>
                                <span className="text-gray-600">Overall Score:</span>
                                <div className="font-medium">{testResults.overallScore.toFixed(1)}/100</div>
                            </div>
                        </div>

                        {testResults.failedTests > 0 && (
                            <div className="mt-3 p-3 bg-red-50 rounded border">
                                <div className="text-sm text-red-800 font-medium">
                                    ❌ {testResults.failedTests} test(s) failed
                                </div>
                                <div className="text-xs text-red-600 mt-1">
                                    Check console for detailed error messages
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Development Mode Indicator */}
            {process.env.NODE_ENV === 'development' && (
                <div className="mt-4 text-xs text-gray-500 border-t pt-4">
                    🚀 Performance monitoring active in development mode
                </div>
            )}
        </div>
    );
};

interface MetricCardProps {
    title: string;
    value: string;
    subValue?: string;
    color: 'red' | 'yellow' | 'green' | 'blue';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subValue, color }) => {
    const colorClasses = {
        red: 'border-red-200 bg-red-50',
        yellow: 'border-yellow-200 bg-yellow-50',
        green: 'border-green-200 bg-green-50',
        blue: 'border-blue-200 bg-blue-50'
    };

    const textColorClasses = {
        red: 'text-red-700',
        yellow: 'text-yellow-700',
        green: 'text-green-700',
        blue: 'text-blue-700'
    };

    return (
        <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
            <div className="text-sm font-medium text-gray-600">{title}</div>
            <div className={`text-2xl font-bold ${textColorClasses[color]}`}>{value}</div>
            {subValue && <div className="text-xs text-gray-500 mt-1">{subValue}</div>}
        </div>
    );
};

/**
 * 🚀 PRODUCTION: Compact Performance Indicator
 * Use this in headers or status bars
 */
export const PerformanceIndicator: React.FC<{ className?: string }> = ({ className = '' }) => {
    return (
        <PerformanceDashboard
            showDetailedMetrics={false}
            className={className}
        />
    );
};

/**
 * 🚀 PRODUCTION: Performance Badge Component
 * Use this for quick performance status
 */
export const PerformanceBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
    const { getPerformanceScore } = useInvoicePerformance();
    const score = getPerformanceScore();
    const color = PerformanceUtils.getPerformanceColor(score);

    return (
        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${color} ${className}`}>
            ⚡ {score.toFixed(0)}%
        </div>
    );
};

export default PerformanceDashboard;
