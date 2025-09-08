//E:\trifuzja-mix\app\components\ui\Toggle.tsx
import React from "react";

export function Toggle({
  checked,
  onCheckedChange,
  ...props
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={() => onCheckedChange(!checked)}
      className={`w-12 h-6 flex items-center rounded-full px-1 transition ${
        checked ? "bg-blue-600" : "bg-gray-300"
      }`}
      {...props}
    >
      <span
        className={`h-4 w-4 bg-white rounded-full shadow transform transition ${
          checked ? "translate-x-6" : "translate-x-0"
        }`}
      />
    </button>
  );
}
