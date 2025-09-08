/* components/ui/switch.tsx */
'use client';

import React, { forwardRef } from 'react';
import { clsx } from 'clsx';

export interface SwitchProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** colour when ON */
  color?: 'blue' | 'green' | 'indigo' | 'emerald' | 'rose';
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, disabled, color = 'blue', ...props }, ref) => {
    const shades = {
      blue:    'bg-blue-600 peer-checked:bg-blue-600',
      green:   'bg-green-600 peer-checked:bg-green-600',
      indigo:  'bg-indigo-600 peer-checked:bg-indigo-600',
      emerald: 'bg-emerald-600 peer-checked:bg-emerald-600',
      rose:    'bg-rose-600 peer-checked:bg-rose-600',
    }[color];

    return (
      <label className={clsx('inline-flex items-center cursor-pointer', disabled && 'opacity-50')}>
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          disabled={disabled}
          className="peer sr-only"
          {...props}
        />
        <div
          className={clsx(
            'h-5 w-9 rounded-full transition-colors duration-200',
            'bg-zinc-400 peer-checked:translate-x-0',
            shades,
            className,
          )}
        >
          <span
            className={clsx(
              'block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200',
              'translate-x-0 peer-checked:translate-x-4',
            )}
          />
        </div>
      </label>
    );
  },
);

Switch.displayName = 'Switch';
export default Switch;
