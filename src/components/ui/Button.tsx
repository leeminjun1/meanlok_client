import * as React from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'default' | 'ghost' | 'outline' | 'destructive';
type ButtonSize = 'sm' | 'md';

const variants: Record<ButtonVariant, string> = {
  default:
    'bg-neutral-900 text-white hover:bg-neutral-700 disabled:bg-neutral-300',
  ghost: 'bg-transparent text-neutral-700 hover:bg-neutral-100',
  outline:
    'bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50 disabled:text-neutral-400',
  destructive: 'bg-red-600 text-white hover:bg-red-500 disabled:bg-red-300',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  className,
  variant = 'default',
  size = 'md',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
