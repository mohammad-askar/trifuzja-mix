'use client';

import { forwardRef } from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

/* ✨ وسّع الأنواع لتشمل xs */
type Variant = 'default' | 'outline' | 'destructive';
type Size    = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'default',
      size    = 'md',
      loading = false,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    /* أساسيات */
    const base =
      'inline-flex items-center justify-center rounded-md font-medium transition-colors ' +
      'focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

    /* الألوان */
    const variants: Record<Variant, string> = {
      default:     'bg-blue-600 text-white hover:bg-blue-700',
      outline:     'border border-gray-300 text-gray-700 hover:bg-gray-100',
      destructive: 'bg-red-600  text-white hover:bg-red-700',
    };

    /* الأحجام – أضفنا xs */
    const sizes: Record<Size, string> = {
      xs: 'text-xs px-2 py-1',
      sm: 'text-sm px-3 py-1.5',
      md: 'text-base px-4 py-2',
      lg: 'text-lg px-6 py-3',
    };

    return (
      <button
        ref={ref}
        className={clsx(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
