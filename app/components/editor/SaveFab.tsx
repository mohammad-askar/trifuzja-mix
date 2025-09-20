'use client';

import { useEffect, useRef, useState } from 'react';

export default function SaveFab({
  disabled,
  busy,
  label,
  /** سليكتور الفوتر */
  footerSelector = 'footer',
  /** المسافة الاعتيادية من الأسفل عندما لا يكون الفوتر ظاهر */
  baseBottom = 16, // px
  /** الهامش الإضافي فوق الفوتر عندما يظهر */
  liftOverFooterBy = 16, // px
}: {
  disabled: boolean;
  busy: boolean;
  label: string;
  footerSelector?: string;
  baseBottom?: number;
  liftOverFooterBy?: number;
}) {
  const [bottom, setBottom] = useState<number>(baseBottom);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const footer = document.querySelector(footerSelector);
    if (!footer) {
      setBottom(baseBottom);
      return;
    }

    // راقب ظهور الفوتر داخل نافذة المتصفّح
    const io = new IntersectionObserver(
      (entries) => {
        const isVisible = entries[0]?.isIntersecting ?? false;
        if (!btnRef.current) return;

        // لو الفوتر ظاهر: ارفع الزر فوقه (ارتفاع الفوتر + مسافة أمان)
        // لو غير ظاهر: رجّع الزر لأسفل الشاشة بمسافة baseBottom
        if (isVisible) {
          const fh = (footer as HTMLElement).getBoundingClientRect().height || 0;
          setBottom(Math.max(baseBottom, fh + liftOverFooterBy));
        } else {
          setBottom(baseBottom);
        }
      },
      { root: null, threshold: 0 } // نسبة ظهور بسيطة تكفي
    );

    io.observe(footer);
    return () => io.disconnect();
  }, [footerSelector, baseBottom, liftOverFooterBy]);

  return (
    <div
      className="fixed right-50 z-[40]"
      style={{ bottom }} // 👈 الارتفاع ديناميكي
    >
      <button
        ref={btnRef}
        // بدون type كما طلبت
        disabled={disabled || busy}
        className="inline-flex items-center gap-2
                   rounded-full px-5 py-3 text-sm font-semibold
                   text-white bg-blue-600 hover:bg-blue-700
                   disabled:opacity-50 disabled:cursor-not-allowed
                   shadow-lg"
        aria-label={busy ? 'Saving…' : label}
        title={busy ? 'Saving…' : label}
      >
        {busy && (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          </svg>
        )}
        <span>{busy ? 'Saving…' : label}</span>
      </button>
    </div>
  );
}
