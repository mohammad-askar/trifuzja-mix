'use client';
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import { Fragment } from 'react';

interface Props {
  open: boolean;
  setOpen: (v: boolean) => void;
  onConfirm: () => void;
  /* النصوص تُمرَّر من المكوّن الأب */
  title: string;
  message: string;
  cancelLabel: string;
  deleteLabel: string;
}

export default function ConfirmDelete({
  open,
  setOpen,
  onConfirm,
  title,
  message,
  cancelLabel,
  deleteLabel,
}: Props) {
  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={setOpen} className="fixed inset-0 z-50">
        <div className="min-h-screen flex items-center justify-center p-4 bg-black/50">
          <TransitionChild
            as={Fragment}
            enter="duration-200 ease-out"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="duration-150 ease-in"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <DialogPanel className="w-full max-w-sm bg-gray-900 p-6 text-gray-200 rounded-lg border border-gray-700">
              <DialogTitle className="text-lg font-semibold mb-4">
                {title}
              </DialogTitle>
              <p className="mb-6">{message}</p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600"
                >
                  {cancelLabel}
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    setOpen(false);
                  }}
                  className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white"
                >
                  {deleteLabel}
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
