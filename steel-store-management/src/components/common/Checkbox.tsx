import React from 'react';
import clsx from 'clsx';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  id?: string;
  error?: string;
  className?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, id, error, className, ...props }, ref) => (
    <div className="flex items-center space-x-2">
      <input
        id={id}
        ref={ref}
        type="checkbox"
        className={clsx('h-4 w-4 text-blue-600 focus:ring-2 focus:ring-blue-500 border-gray-300 rounded', className, error && 'border-red-500')}
        {...props}
      />
      {label && (
        <label htmlFor={id} className="text-sm text-gray-900 select-none">
          {label}
        </label>
      )}
      {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
    </div>
  )
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
