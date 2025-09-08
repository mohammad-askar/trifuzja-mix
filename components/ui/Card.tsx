// E:\trifuzja-mix\components\ui\card.tsx
import React from "react";

export function Card({ children, className }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={"bg-white rounded-2xl shadow-md p-0 " + (className || "")}>
      {children}
    </div>
  );
}
export function CardHeader({ children }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className="p-6 border-b">{children}</div>;
}
export function CardTitle({ children }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className="text-2xl font-bold">{children}</h2>;
}
export function CardContent({ children }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className="p-6">{children}</div>;
}
