// 📁 app/components/ConfirmDelete.tsx
'use client';

import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import { Fragment, useRef, useState } from 'react';

interface Props {
  open: boolean;
  setOpen: (v: boolean) => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  /** اقبل نصًا عاديًا أو محتوى React (سطرين، <strong>... إلخ) */
  message?: React.ReactNode;
  cancelLabel: string;
  deleteLabel: string;
  /** عطّل الإغلاق بالنقر على الخلفية/زر الهروب إن لزم */
  disableBackdropClose?: boolean;
}

export default function ConfirmDelete({
  open,
  setOpen,
  onConfirm,
  title,
  message,
  cancelLabel,
  deleteLabel,
  disableBackdropClose = false,
}: Props) {
  const [loading, setLoading] = useState(false);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  const handleClose = (v: boolean) => {
    if (disableBackdropClose || loading) return; // لا تغلق أثناء التحميل
    setOpen(v);
  };

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onConfirm();
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Transition show={open} as={Fragment}>
      <Dialog
        onClose={handleClose}
        className="fixed inset-0 z-50"
        initialFocus={cancelBtnRef}
      >
        {/* الخلفية */}
        <div className="fixed inset-0 bg-black/50" aria-hidden="true" />

        {/* الحاوية */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild
            as={Fragment}
            enter="duration-200 ease-out"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="duration-150 ease-in"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <DialogPanel className="w-full max-w-sm rounded-lg border border-gray-700 bg-gray-900 p-6 text-gray-200 shadow-lg">
              <DialogTitle className="text-lg font-semibold mb-3">
                {title}
              </DialogTitle>

              {message && (
                <div className="mb-5 text-sm text-gray-300 leading-relaxed">
                  {message}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  ref={cancelBtnRef}
                  type="button"
                  onClick={() => handleClose(false)}
                  disabled={loading}
                  className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 disabled:opacity-60"
                >
                  {cancelLabel}
                </button>

                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={loading}
                  className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white disabled:opacity-60"
                >
                  {loading ? '…' : deleteLabel}
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
