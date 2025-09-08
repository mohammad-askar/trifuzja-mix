'use client';

import {
  useEffect,
  useRef,
  ReactNode,
  forwardRef,
  useImperativeHandle,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

export interface ModalHandle {
  open: () => void;
  close: () => void;
}

interface ModalProps {
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose?: () => void;
  initialOpen?: boolean;
  maxWidthClass?: string; // e.g. 'max-w-md'
  labelledById?: string;
  describedById?: string;
}

const Modal = forwardRef<ModalHandle, ModalProps>(function Modal(
  {
    title,
    children,
    footer,
    onClose,
    initialOpen = false,
    maxWidthClass = 'max-w-md',
    labelledById,
    describedById,
  },
  ref,
) {
  const [open, setOpen] = useState(initialOpen);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  useImperativeHandle(ref, () => ({
    open: () => {
      lastFocusedRef.current = document.activeElement as HTMLElement | null;
      setOpen(true);
    },
    close: () => {
      setOpen(false);
    },
  }));

  /** Trap focus + Esc */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        return;
      }

      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      // التركيز الأولي
      const timer = window.setTimeout(() => {
        const auto = panelRef.current?.querySelector<HTMLElement>(
          'button[data-autofocus], [data-autofocus="true"]',
        );
        auto?.focus();
      }, 10);
      document.body.style.overflow = 'hidden';
      return () => {
        window.clearTimeout(timer);
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Restore focus + onClose callback
  useEffect(() => {
    if (!open && lastFocusedRef.current) {
      lastFocusedRef.current.focus();
    }
    if (!open && onClose) {
      onClose();
    }
  }, [open, onClose]);

  function handleOverlayMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) {
      setOpen(false);
    }
  }

  if (!open) return null;

return createPortal(
  <div
    ref={overlayRef}
    onMouseDown={handleOverlayMouseDown}
    className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-2 py-4 sm:p-6 animate-fadeIn"
    role="presentation"
  >
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledById}
      aria-describedby={describedById}
      className={`w-full ${maxWidthClass} rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl animate-scaleIn`}
    >
      {title && (
        <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <h2 id={labelledById} className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            {title}
          </h2>
        </div>
      )}
      <div className="px-5 py-4 text-sm text-zinc-700 dark:text-zinc-200">
        {children}
      </div>
      {footer && (
        <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 flex justify-end gap-3">
          {footer}
        </div>
      )}
    </div>
    <style>{`
      @keyframes fadeIn {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
      @keyframes scaleIn {
        from { opacity: 0; transform: translateY(16px) scale(.96); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
      .animate-fadeIn { animation: fadeIn .18s ease-out; }
      .animate-scaleIn { animation: scaleIn .2s cubic-bezier(.16,.8,.24,1); }
    `}</style>
  </div>,
  document.body,
);
});

export default Modal;
