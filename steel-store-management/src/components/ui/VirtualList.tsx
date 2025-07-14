import React, { useState, useEffect, useRef } from 'react';
import { cn } from './utils';
// Update the import path below to the correct location of Skeleton in your project
import { Skeleton } from './Skeleton';

export interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  loading?: boolean;
  emptyState?: React.ReactNode;
}

export const VirtualList = <T,>({
  items,
  itemHeight,
  height,
  renderItem,
  overscan = 5,
  className,
  loading = false,
  emptyState
}: VirtualListProps<T>) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(items.length, Math.ceil((scrollTop + height) / itemHeight) + overscan);
  const visibleItems = items.slice(startIndex, endIndex);

  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        setScrollTop(containerRef.current.scrollTop);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  if (loading) {
    return (
      <div className={cn('space-y-2', className)} style={{ height }}>
        {[...Array(Math.ceil(height / itemHeight))].map((_, i) => (
          <Skeleton key={i} className={`w-full`} height={itemHeight - 8} />
        ))}
      </div>
    );
  }

  if (items.length === 0 && emptyState) {
    return (
      <div className={cn('flex items-center justify-center', className)} style={{ height }}>
        {emptyState}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100', className)}
      style={{ height }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map((item, index) => (
          <div
            key={startIndex + index}
            style={{
              position: 'absolute',
              top: (startIndex + index) * itemHeight,
              left: 0,
              right: 0,
              height: itemHeight,
            }}
          >
            {renderItem(item, startIndex + index)}
          </div>
        ))}
      </div>
    </div>
  );
};