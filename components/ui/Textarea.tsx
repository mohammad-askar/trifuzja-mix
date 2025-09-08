// E:\trifuzja-mix\app\components\ui\textarea.tsx
import React from "react";
import clsx from "clsx";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={clsx(
      "w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-300",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
