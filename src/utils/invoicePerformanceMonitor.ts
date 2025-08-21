/**
 * 🚀 PRODUCTION-GRADE: Performance Monitoring & Optimization Utilities
 * 
 * Enterprise-level performance monitoring for 100k+ invoice records
 */

import { useState, useCallback, useEffect } from 'react';

// Performance thresholds for different operations
export const PERFORMANCE_THRESHOLDS = {
    QUERY_SLOW: 1000,      // 1 second
    QUERY_VERY_SLOW: 3000, // 3 seconds
    RENDER_SLOW: 100,      // 100ms
    MEMORY_HIGH: 100,      // 100MB
    RECORDS_VIRTUAL_SCROLL: 1000, // Enable virtual scroll threshold
    RECORDS_PAGINATION_ONLY: 10000 // Switch to pagination-only mode
} as const;

// Performance metrics interface
export interface PerformanceMetrics {
    queryTime: number;
    renderTime: number;
    memoryUsage: number;
    recordsLoaded: number;
    cacheHits: number;
    cacheHitRate: number;
    totalQueries: number;
    averageQueryTime: number;
    slowQueries: number;
    lastUpdated: number;
}

// Performance monitor class
export class InvoicePerformanceMonitor {
    private metrics: PerformanceMetrics = {
        queryTime: 0,
        renderTime: 0,
        memoryUsage: 0,
        recordsLoaded: 0,
        cacheHits: 0,
        cacheHitRate: 0,
        totalQueries: 0,
        averageQueryTime: 0,
        slowQueries: 0,
        lastUpdated: 0
    };

    private queryTimes: number[] = [];
    private maxHistorySize = 100;

    /**
     * 🚀 PRODUCTION: Track query performance
     */
    trackQuery(queryTime: number, recordCount: number, wasCached: boolean = false): void {
        this.queryTimes.push(queryTime);

        // Keep only recent query times
        if (this.queryTimes.length > this.maxHistorySize) {
            this.queryTimes.shift();
        }

        this.metrics.queryTime = queryTime;
        this.metrics.recordsLoaded = recordCount;
        this.metrics.totalQueries++;
        this.metrics.averageQueryTime = this.queryTimes.reduce((a, b) => a + b, 0) / this.queryTimes.length;
        this.metrics.lastUpdated = Date.now();

        if (wasCached) {
            this.metrics.cacheHits++;
        }

        if (queryTime > PERFORMANCE_THRESHOLDS.QUERY_SLOW) {
            this.metrics.slowQueries++;
            console.warn(`🐢 [PERFORMANCE] Slow invoice query: ${queryTime}ms for ${recordCount} records`);
        }

        this.metrics.cacheHitRate = (this.metrics.cacheHits / this.metrics.totalQueries) * 100;

        // Emit performance warning if needed
        this.checkPerformanceWarnings(queryTime, recordCount);
    }

    /**
     * 🚀 PRODUCTION: Track render performance
     */
    trackRender(renderTime: number): void {
        this.metrics.renderTime = renderTime;

        if (renderTime > PERFORMANCE_THRESHOLDS.RENDER_SLOW) {
            console.warn(`🐢 [PERFORMANCE] Slow render: ${renderTime}ms`);
        }
    }

    /**
     * 🚀 PRODUCTION: Track memory usage
     */
    trackMemory(): void {
        if (typeof performance !== 'undefined' && 'memory' in performance) {
            const memory = (performance as any).memory;
            this.metrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB

            if (this.metrics.memoryUsage > PERFORMANCE_THRESHOLDS.MEMORY_HIGH) {
                console.warn(`🚨 [PERFORMANCE] High memory usage: ${this.metrics.memoryUsage.toFixed(2)}MB`);
            }
        }
    }

    /**
     * 🚀 PRODUCTION: Get current metrics
     */
    getMetrics(): PerformanceMetrics {
        this.trackMemory();
        return { ...this.metrics };
    }

    /**
     * 🚀 PRODUCTION: Get performance recommendations
     */
    getRecommendations(): string[] {
        const recommendations: string[] = [];

        if (this.metrics.averageQueryTime > PERFORMANCE_THRESHOLDS.QUERY_SLOW) {
            recommendations.push('Consider adding database indexes for frequently queried fields');
        }

        if (this.metrics.cacheHitRate < 30) {
            recommendations.push('Increase cache TTL or optimize caching strategy');
        }

        if (this.metrics.recordsLoaded > PERFORMANCE_THRESHOLDS.RECORDS_VIRTUAL_SCROLL) {
            recommendations.push('Enable virtual scrolling for better performance with large datasets');
        }

        if (this.metrics.memoryUsage > PERFORMANCE_THRESHOLDS.MEMORY_HIGH) {
            recommendations.push('Reduce the number of records loaded simultaneously');
        }

        if (this.metrics.slowQueries > this.metrics.totalQueries * 0.1) {
            recommendations.push('Optimize slow queries - consider pagination or filtering');
        }

        return recommendations;
    }

    /**
     * 🚀 PRODUCTION: Performance score (0-100)
     */
    getPerformanceScore(): number {
        let score = 100;

        // Query performance (40% of score)
        if (this.metrics.averageQueryTime > PERFORMANCE_THRESHOLDS.QUERY_VERY_SLOW) {
            score -= 40;
        } else if (this.metrics.averageQueryTime > PERFORMANCE_THRESHOLDS.QUERY_SLOW) {
            score -= 20;
        }

        // Cache performance (30% of score)
        score -= (100 - this.metrics.cacheHitRate) * 0.3;

        // Memory usage (20% of score)
        if (this.metrics.memoryUsage > PERFORMANCE_THRESHOLDS.MEMORY_HIGH * 2) {
            score -= 20;
        } else if (this.metrics.memoryUsage > PERFORMANCE_THRESHOLDS.MEMORY_HIGH) {
            score -= 10;
        }

        // Slow queries ratio (10% of score)
        const slowQueryRatio = this.metrics.slowQueries / Math.max(this.metrics.totalQueries, 1);
        score -= slowQueryRatio * 100 * 0.1;

        return Math.max(0, Math.min(100, score));
    }

    /**
     * 🚀 PRODUCTION: Reset metrics
     */
    reset(): void {
        this.metrics = {
            queryTime: 0,
            renderTime: 0,
            memoryUsage: 0,
            recordsLoaded: 0,
            cacheHits: 0,
            cacheHitRate: 0,
            totalQueries: 0,
            averageQueryTime: 0,
            slowQueries: 0,
            lastUpdated: 0
        };
        this.queryTimes = [];
    }

    /**
     * 🚀 PRODUCTION: Check for performance warnings
     */
    private checkPerformanceWarnings(queryTime: number, recordCount: number): void {
        // Alert for very slow queries
        if (queryTime > PERFORMANCE_THRESHOLDS.QUERY_VERY_SLOW) {
            console.error(`🚨 [CRITICAL] Very slow query: ${queryTime}ms for ${recordCount} records`);
        }

        // Suggest virtual scrolling for large datasets
        if (recordCount > PERFORMANCE_THRESHOLDS.RECORDS_VIRTUAL_SCROLL && queryTime > PERFORMANCE_THRESHOLDS.QUERY_SLOW) {
            console.info(`💡 [SUGGESTION] Consider virtual scrolling for ${recordCount} records`);
        }

        // Suggest pagination-only for very large datasets
        if (recordCount > PERFORMANCE_THRESHOLDS.RECORDS_PAGINATION_ONLY) {
            console.info(`💡 [SUGGESTION] Switch to pagination-only mode for ${recordCount} records`);
        }
    }
}

// Global performance monitor instance
export const invoicePerformanceMonitor = new InvoicePerformanceMonitor();

/**
 * 🚀 PRODUCTION: Performance measurement decorators
 */
export function measureQueryTime<T>(
    _target: any,
    _propertyName: string,
    descriptor: TypedPropertyDescriptor<T>
): TypedPropertyDescriptor<T> | void {
    const method = descriptor.value as any;

    descriptor.value = async function (this: any, ...args: any[]) {
        const start = performance.now();
        const result = await method.apply(this, args);
        const duration = performance.now() - start;

        invoicePerformanceMonitor.trackQuery(duration, Array.isArray(result) ? result.length : 1);

        return result;
    } as any;

    return descriptor;
}

/**
 * 🚀 PRODUCTION: Performance hook for React components
 */
export function useInvoicePerformance() {
    const [metrics, setMetrics] = useState<PerformanceMetrics>(
        invoicePerformanceMonitor.getMetrics()
    );

    const updateMetrics = useCallback(() => {
        setMetrics(invoicePerformanceMonitor.getMetrics());
    }, []);

    useEffect(() => {
        const interval = setInterval(updateMetrics, 5000); // Update every 5 seconds
        return () => clearInterval(interval);
    }, [updateMetrics]);

    return {
        metrics,
        updateMetrics,
        getRecommendations: () => invoicePerformanceMonitor.getRecommendations(),
        getPerformanceScore: () => invoicePerformanceMonitor.getPerformanceScore(),
        reset: () => invoicePerformanceMonitor.reset()
    };
}

/**
 * 🚀 PRODUCTION: Utility functions for performance optimization
 */
export const PerformanceUtils = {
    /**
     * Determine optimal pagination size based on performance
     */
    getOptimalPageSize(totalRecords: number, averageQueryTime: number): number {
        if (averageQueryTime > PERFORMANCE_THRESHOLDS.QUERY_SLOW) {
            return Math.min(25, Math.max(10, Math.floor(totalRecords / 100)));
        }
        if (totalRecords > 50000) return 100;
        if (totalRecords > 10000) return 50;
        if (totalRecords > 1000) return 25;
        return 20;
    },

    /**
     * Check if virtual scrolling should be enabled
     */
    shouldUseVirtualScroll(recordCount: number, queryTime: number): boolean {
        return recordCount > PERFORMANCE_THRESHOLDS.RECORDS_VIRTUAL_SCROLL &&
            queryTime < PERFORMANCE_THRESHOLDS.QUERY_VERY_SLOW;
    },

    /**
     * Format performance metrics for display
     */
    formatMetrics(metrics: PerformanceMetrics): string {
        return `${metrics.queryTime}ms • ${metrics.recordsLoaded} records • ${metrics.cacheHitRate.toFixed(1)}% cache hit`;
    },

    /**
     * Get performance color indicator
     */
    getPerformanceColor(score: number): string {
        if (score >= 80) return 'text-green-600 bg-green-100';
        if (score >= 60) return 'text-yellow-600 bg-yellow-100';
        if (score >= 40) return 'text-orange-600 bg-orange-100';
        return 'text-red-600 bg-red-100';
    }
};
