import React, { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn, focusRing, transitions } from './utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  helperText?: string;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  leftIcon,
  rightIcon,
  helperText,
  containerClassName,
  className,
  ...props
}, ref) => {
  const inputClasses = cn(
    'w-full px-3 py-2.5 text-sm border rounded-lg',
    transitions.default,
    focusRing,
    'focus:ring-blue-500 focus:border-blue-500',
    'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
    'placeholder:text-gray-400',
    error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300',
    (leftIcon && 'pl-10') as string | boolean | null | undefined,
    (rightIcon && 'pr-10') as string | boolean | null | undefined,
    className
  );

  return (
    <div className={containerClassName}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {leftIcon}
          </div>
        )}
        <input ref={ref} className={inputClasses} {...props} a autoComplete="off"utoComplete="off" />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="mt-1.5 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';