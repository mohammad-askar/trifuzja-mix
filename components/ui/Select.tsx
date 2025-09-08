// E:\trifuzja-mix\app\components\ui\select.tsx
import React from "react";

export function Select({ value, onChange, children, ...props }: any) {
  return (
    <select
      value={value}
      onChange={e => onChange && onChange(e.target.value)}
      className="w-full px-3 py-2 rounded border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
      {...props}
    >
      {children}
    </select>
  );
}
export function SelectTrigger({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
export function SelectValue({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
export function SelectContent({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  return <option value={value}>{children}</option>;
}
