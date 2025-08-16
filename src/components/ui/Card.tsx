import React from 'react';
import { cn, transitions, shadows } from './utils';
import type { Spacing } from './types';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: Spacing;
  hover?: boolean;
  border?: boolean;
}

export const Card: React.FC<CardProps> = ({
  padding = 'md',
  hover = false,
  border = true,
  children,
  className,
  ...props
}) => {
  const paddingClasses = {
    none: '',
    xs: 'p-2',
    sm: 'p-3',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10'
  };

  return (
    <div
      className={cn(
        'bg-white rounded-xl',
        transitions.default,
        border && 'border border-gray-200',
        hover && 'hover:shadow-lg hover:border-gray-300 cursor-pointer',
        !hover && shadows.sm,
        paddingClasses[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
