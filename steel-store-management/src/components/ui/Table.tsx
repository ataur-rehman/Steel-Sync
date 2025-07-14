import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn, transitions } from './utils';
import { Card } from './Card';
import { Skeleton } from './Skeleton';

export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (value: any, item: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  emptyState?: React.ReactNode;
  onRowClick?: (item: T, index: number) => void;
  className?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
}

export const Table = <T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  emptyState,
  onRowClick,
  className,
  sortBy,
  sortDirection,
  onSort
}: TableProps<T>) => {
  if (loading) {
    return (
      <Card padding="none" className={className}>
        <div className="animate-pulse">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex gap-4">
              {columns.map((_, i) => (
                <Skeleton key={i} className="h-4 flex-1" />
              ))}
            </div>
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="px-6 py-4 border-b border-gray-100">
              <div className="flex gap-4">
                {columns.map((_, j) => (
                  <Skeleton key={j} className="h-4 flex-1" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card padding="none" className={cn('overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className={cn(
                    'px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.sortable && 'cursor-pointer hover:bg-gray-100',
                    !column.align && 'text-left'
                  )}
                  style={{ width: column.width }}
                  onClick={column.sortable && onSort ? () => onSort(column.key as string) : undefined}
                >
                  <div className="flex items-center gap-1">
                    {column.header}
                    {column.sortable && sortBy === column.key && (
                      <ChevronDown className={cn(
                        'h-4 w-4',
                        transitions.default,
                        sortDirection === 'asc' && 'rotate-180'
                      )} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  {emptyState || (
                    <div className="text-gray-500">
                      <p className="text-base font-medium">No data available</p>
                      <p className="text-sm mt-1">There are no items to display</p>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              data.map((item, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={cn(
                    transitions.default,
                    onRowClick && 'cursor-pointer hover:bg-gray-50'
                  )}
                  onClick={onRowClick ? () => onRowClick(item, rowIndex) : undefined}
                >
                  {columns.map((column, colIndex) => {
                    const value = item[column.key];
                    const content = column.render 
                      ? column.render(value, item, rowIndex)
                      : value;

                    return (
                      <td
                        key={colIndex}
                        className={cn(
                          'px-6 py-4 whitespace-nowrap text-sm text-gray-900',
                          column.align === 'center' && 'text-center',
                          column.align === 'right' && 'text-right'
                        )}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};