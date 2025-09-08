//E:\trifuzja-mix\app\[locale]\admin\articles\[slug]\ProgressBar.tsx
'use client';

import { useEffect, useState } from 'react';

export default function ProgressBar() {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const update = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      const pct = (scrollTop / (scrollHeight - clientHeight)) * 100;
      setWidth(pct);
      requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
    return () => cancelAnimationFrame(0);
  }, []);

  return (
    <span
      style={{ width: `${width}%` }}
      className="fixed left-0 top-0 h-1.5 sm:h-1 z-[60]
                 bg-gradient-to-r from-blue-500 via-sky-500 to-cyan-400
                 transition-[width] duration-200"
    />
  );
}
