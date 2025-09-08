// E:\trifuzja-mix\app\components\ui\label.tsx
import React from "react";

export function Label({ children, htmlFor, className }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      htmlFor={htmlFor}
      className={"block mb-1 font-medium text-gray-700 " + (className || "")}
    >
      {children}
    </label>
  );
}
