// components/ui/Input.tsx
import React from "react";
import clsx from "clsx";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, ...props }, ref) => (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={clsx(
          "w-full px-3 py-2 rounded border shadow-sm",
          "bg-white text-black",
          "dark:bg-zinc-800 dark:text-white",
          "border-gray-300 dark:border-zinc-700",
          "focus:outline-none focus:ring-2 focus:ring-blue-500",
          className
        )}
        {...props}
      />
    </div>
  )
);

Input.displayName = "Input";
