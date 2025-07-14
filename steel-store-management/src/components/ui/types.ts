// src/components/ui/types.ts
// TypeScript type definitions for the UI component library

export type ColorVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost';

export type Size = 'sm' | 'md' | 'lg' | 'xl';

export type Spacing = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type Position = 'top' | 'bottom' | 'left' | 'right';

export type Alignment = 'left' | 'center' | 'right';

export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface LoadingState {
  loading?: boolean;
}

export interface VariantProps {
  variant?: ColorVariant;
  size?: Size;
}

export interface IconProps {
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}