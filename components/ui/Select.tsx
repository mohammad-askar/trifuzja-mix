// E:\trifuzja-mix\app\components\ui\select.tsx
import React from "react";

// نأخذ جميع خواص <select> الأصلية ثم نحذف onChange و value لإعادة تعريفهما
type NativeSelectProps = Omit<
  React.ComponentPropsWithoutRef<"select">,
  "onChange" | "value"
>;

interface SelectProps extends NativeSelectProps {
  value: string;
  onChange?: (value: string) => void; // تظل كما تستخدمها
  children: React.ReactNode;
}

export function Select({ value, onChange, children, ...props }: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
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

export function SelectItem({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  return <option value={value}>{children}</option>;
}
