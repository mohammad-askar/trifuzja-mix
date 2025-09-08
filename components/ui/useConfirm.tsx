'use client';

import { useRef, useState } from 'react';
import Modal, { ModalHandle } from './Modal';

interface Options {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface InternalOptions extends Required<Omit<Options, 'title' | 'message' | 'confirmText' | 'cancelText' | 'danger'>> {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  danger: boolean;
}

export function useConfirm() {
  const modalRef = useRef<ModalHandle | null>(null);
  /** مرجع للـ resolver – يقبل null كبداية */
  const resolverRef = useRef<((v: boolean) => void) | null>(null);

  const [opts, setOpts] = useState<InternalOptions>({
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    danger: false,
  });

  function confirm(options: Options) {
    return new Promise<boolean>(resolve => {
      setOpts({
        title: options.title ?? 'Confirm',
        message: options.message ?? 'Are you sure?',
        confirmText: options.confirmText ?? 'Confirm',
        cancelText: options.cancelText ?? 'Cancel',
        danger: options.danger ?? false,
      });
      resolverRef.current = resolve;
      modalRef.current?.open();
    });
  }

  function handleClose(result: boolean) {
    modalRef.current?.close();
    resolverRef.current?.(result);
    // تفريغ المرجع (اختياري للأمان)
    resolverRef.current = null;
  }

  const modalNode = (
    <Modal
      ref={modalRef}
      title={opts.title}
      onClose={() => {
        // إذا أُغلِق من الخارج (ضغط خارج / ESC) ولم نستدع handleClose
        if (resolverRef.current) {
          resolverRef.current(false);
          resolverRef.current = null;
        }
      }}
      maxWidthClass="max-w-sm"
      labelledById="confirm-dialog-title"
      describedById="confirm-dialog-desc"
      footer={
        <>
          <button
            type="button"
            onClick={() => handleClose(false)}
            className="px-4 py-2 rounded-md border text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
            data-autofocus
          >
            {opts.cancelText}
          </button>
          <button
            type="button"
            onClick={() => handleClose(true)}
            className={`px-4 py-2 rounded-md text-sm font-medium text-white shadow ${
              opts.danger
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {opts.confirmText}
          </button>
        </>
      }
    >
      <p id="confirm-dialog-desc" className="leading-relaxed text-sm">
        {opts.message}
      </p>
    </Modal>
  );

  return { confirm, ConfirmModal: modalNode };
}
