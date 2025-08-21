import React, { useState, useRef, useCallback } from 'react';

interface VirtualScrollProps {
    items: any[];
    itemHeight: number;
    containerHeight: number;
    renderItem: (item: any, index: number) => React.ReactNode;
    overscan?: number; // Number of items to render outside visible area
    className?: string;
    onScroll?: (scrollTop: number) => void;
}

/**
 * 🚀 PRODUCTION-GRADE: Virtual Scrolling Component for 100k+ Records
 * 
 * Features:
 * - Only renders visible items for optimal performance
 * - Smooth scrolling with overscan buffer
 * - Memory-efficient for extremely large datasets
 * - Responsive to container size changes
 * - Threshold-based activation (enables only when needed)
 */
export const VirtualScrollContainer: React.FC<VirtualScrollProps> = ({
    items,
    itemHeight,
    containerHeight,
    renderItem,
    overscan = 5,
    className = '',
    onScroll
}) => {
    const [scrollTop, setScrollTop] = useState(0);
    const scrollElementRef = useRef<HTMLDivElement>(null);

    // 🚀 PERFORMANCE: Calculate visible range
    const visibleRange = React.useMemo(() => {
        const start = Math.floor(scrollTop / itemHeight);
        const end = Math.min(
            start + Math.ceil(containerHeight / itemHeight),
            items.length
        );

        return {
            start: Math.max(0, start - overscan),
            end: Math.min(items.length, end + overscan)
        };
    }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

    // 🚀 PERFORMANCE: Only render visible items
    const visibleItems = React.useMemo(() => {
        return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
            ...item,
            virtualIndex: visibleRange.start + index,
            originalIndex: visibleRange.start + index
        }));
    }, [items, visibleRange]);

    // Handle scroll events
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const newScrollTop = e.currentTarget.scrollTop;
        setScrollTop(newScrollTop);
        onScroll?.(newScrollTop);
    }, [onScroll]);

    // 🚀 ACCESSIBILITY: Keyboard navigation support
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        const scrollElement = scrollElementRef.current;
        if (!scrollElement) return;

        switch (e.key) {
            case 'Home':
                e.preventDefault();
                scrollElement.scrollTo({ top: 0, behavior: 'smooth' });
                break;
            case 'End':
                e.preventDefault();
                scrollElement.scrollTo({
                    top: items.length * itemHeight,
                    behavior: 'smooth'
                });
                break;
            case 'PageUp':
                e.preventDefault();
                scrollElement.scrollBy({
                    top: -containerHeight,
                    behavior: 'smooth'
                });
                break;
            case 'PageDown':
                e.preventDefault();
                scrollElement.scrollBy({
                    top: containerHeight,
                    behavior: 'smooth'
                });
                break;
        }
    }, [items.length, itemHeight, containerHeight]);

    // Total height for scrollbar
    const totalHeight = items.length * itemHeight;

    // Offset for visible items
    const offsetY = visibleRange.start * itemHeight;

    return (
        <div
            ref={scrollElementRef}
            className={`virtual-scroll-container ${className}`}
            style={{
                height: containerHeight,
                overflow: 'auto',
                position: 'relative'
            }}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="grid"
            aria-rowcount={items.length}
            aria-label="Virtual scrolling container"
        >
            {/* Total height spacer for scrollbar */}
            <div style={{ height: totalHeight, position: 'relative' }}>
                {/* Visible items container */}
                <div
                    style={{
                        transform: `translateY(${offsetY}px)`,
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0
                    }}
                >
                    {visibleItems.map((item, index) => (
                        <div
                            key={item.id || visibleRange.start + index}
                            style={{
                                height: itemHeight,
                                position: 'relative'
                            }}
                            role="row"
                            aria-rowindex={visibleRange.start + index + 1}
                        >
                            {renderItem(item, visibleRange.start + index)}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

/**
 * 🚀 PRODUCTION-GRADE: Smart Virtual Scroll Hook
 * 
 * Automatically enables virtual scrolling when dataset exceeds threshold
 */
export const useSmartVirtualScroll = (
    itemCount: number,
    threshold: number = 1000
) => {
    const shouldUseVirtualScroll = itemCount > threshold;

    return {
        shouldUseVirtualScroll,
        threshold,
        itemCount
    };
};

/**
 * 🚀 PRODUCTION-GRADE: Performance monitoring for virtual scrolling
 */
export const useVirtualScrollPerformance = () => {
    const [metrics, setMetrics] = useState({
        renderTime: 0,
        visibleItems: 0,
        totalItems: 0,
        scrollPosition: 0
    });

    const measureRenderTime = useCallback((callback: () => void) => {
        const start = performance.now();
        callback();
        const end = performance.now();

        setMetrics(prev => ({
            ...prev,
            renderTime: end - start
        }));
    }, []);

    return {
        metrics,
        measureRenderTime,
        setMetrics
    };
};
