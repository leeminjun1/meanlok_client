import * as React from 'react';
import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none',
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = 'Input';
