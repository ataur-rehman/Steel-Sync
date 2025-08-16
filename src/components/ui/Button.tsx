// src/components/ui/Button.tsx
import React, { forwardRef } from 'react';
import { cn, colorVariants, sizeVariants, transitions, focusRing } from './utils';
import type { ColorVariant, Size, IconProps, LoadingState } from './types';

export interface ButtonProps 
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, 
          IconProps, 
          LoadingState {
  variant?: ColorVariant;
  size?: Size;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  fullWidth = false,
  children,
  className,
  disabled,
  ...props
}, ref) => {
  const baseClasses = cn(
    'inline-flex items-center justify-center font-medium rounded-lg',
    transitions.default,
    focusRing,
    'disabled:opacity-50 disabled:cursor-not-allowed',
    fullWidth && 'w-full'
  );

  const variantClasses = {
    primary: `bg-blue-600 text-white ${colorVariants.primary.bgHover} focus:ring-blue-500 shadow-sm hover:shadow-md`,
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-blue-500 shadow-sm hover:shadow-md',
    success: `${colorVariants.success.bg} text-white ${colorVariants.success.bgHover} focus:ring-emerald-500 shadow-sm hover:shadow-md`,
    warning: `${colorVariants.warning.bg} text-white ${colorVariants.warning.bgHover} focus:ring-amber-500 shadow-sm hover:shadow-md`,
    danger: `${colorVariants.danger.bg} text-white ${colorVariants.danger.bgHover} focus:ring-red-500 shadow-sm hover:shadow-md`,
    ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:ring-gray-500'
  };

  const sizeClasses = {
    sm: `${sizeVariants.sm.padding} ${sizeVariants.sm.text} gap-1.5`,
    md: `${sizeVariants.md.padding} ${sizeVariants.md.text} gap-2`,
    lg: `${sizeVariants.lg.padding} ${sizeVariants.lg.text} gap-2`,
    xl: `${sizeVariants.xl.padding} ${sizeVariants.xl.text} gap-3`
  };

  const iconSize = sizeVariants[size].icon;

  return (
    <button
      ref={ref}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className={cn('animate-spin rounded-full border-2 border-current border-t-transparent', iconSize)} />
      )}
      {!loading && icon && iconPosition === 'left' && (
        <span className={iconSize}>{icon}</span>
      )}
      {children}
      {!loading && icon && iconPosition === 'right' && (
        <span className={iconSize}>{icon}</span>
      )}
    </button>
  );
});

Button.displayName = 'Button';