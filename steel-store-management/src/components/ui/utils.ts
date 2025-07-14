// src/components/ui/utils.ts
// Utility functions for the UI component library

/**
 * Combines class names, filtering out falsy values
 */
export const cn = (...classes: (string | undefined | null | boolean)[]): string => {
  return classes.filter(Boolean).join(' ');
};

/**
 * Design system color variants
 */
export const colorVariants = {
  primary: {
    bg: 'bg-blue-600',
    bgHover: 'hover:bg-blue-700',
    text: 'text-blue-600',
    textHover: 'hover:text-blue-700',
    border: 'border-blue-300',
    ring: 'focus:ring-blue-500',
    light: 'bg-blue-50 text-blue-800'
  },
  secondary: {
    bg: 'bg-gray-600',
    bgHover: 'hover:bg-gray-700',
    text: 'text-gray-600',
    textHover: 'hover:text-gray-700',
    border: 'border-gray-300',
    ring: 'focus:ring-gray-500',
    light: 'bg-gray-50 text-gray-800'
  },
  success: {
    bg: 'bg-emerald-600',
    bgHover: 'hover:bg-emerald-700',
    text: 'text-emerald-600',
    textHover: 'hover:text-emerald-700',
    border: 'border-emerald-300',
    ring: 'focus:ring-emerald-500',
    light: 'bg-emerald-50 text-emerald-800'
  },
  warning: {
    bg: 'bg-amber-600',
    bgHover: 'hover:bg-amber-700',
    text: 'text-amber-600',
    textHover: 'hover:text-amber-700',
    border: 'border-amber-300',
    ring: 'focus:ring-amber-500',
    light: 'bg-amber-50 text-amber-800'
  },
  danger: {
    bg: 'bg-red-600',
    bgHover: 'hover:bg-red-700',
    text: 'text-red-600',
    textHover: 'hover:text-red-700',
    border: 'border-red-300',
    ring: 'focus:ring-red-500',
    light: 'bg-red-50 text-red-800'
  }
};

/**
 * Size variants for components
 */
export const sizeVariants = {
  sm: {
    text: 'text-sm',
    padding: 'px-3 py-1.5',
    height: 'h-8',
    icon: 'h-4 w-4'
  },
  md: {
    text: 'text-sm',
    padding: 'px-4 py-2',
    height: 'h-10',
    icon: 'h-5 w-5'
  },
  lg: {
    text: 'text-base',
    padding: 'px-6 py-3',
    height: 'h-12',
    icon: 'h-6 w-6'
  },
  xl: {
    text: 'text-lg',
    padding: 'px-8 py-4',
    height: 'h-14',
    icon: 'h-7 w-7'
  }
};

/**
 * Common transition classes
 */
export const transitions = {
  default: 'transition-all duration-200 ease-in-out',
  fast: 'transition-all duration-150 ease-in-out',
  slow: 'transition-all duration-300 ease-in-out'
};

/**
 * Focus ring styles
 */
export const focusRing = 'focus:outline-none focus:ring-2 focus:ring-offset-2';

/**
 * Common shadow variants
 */
export const shadows = {
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl'
};