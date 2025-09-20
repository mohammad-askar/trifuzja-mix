import { useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { T } from './i18n';
import type { Locale } from './article.types';

export function useDebouncedCallback<A extends unknown[]>(
  fn: (...args: A) => void,
  delay = 1000,
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return useCallback((...args: A) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { fn(...args); }, delay);
  }, [fn, delay]);
}

export function useUpload(locale: Locale, onUrl: (url: string) => void) {
  return useDropzone({
    onDrop: async (files: File[]) => {
      if (!files[0]) return;
      const fd = new FormData();
      fd.append('file', files[0]);
      try {
        const r = await fetch('/api/upload', { method: 'POST', body: fd });
        const parsed = (await r.json()) as { url?: string; error?: string };
        if (!r.ok || !parsed.url) throw new Error(parsed.error || 'upload');
        onUrl(parsed.url);
        toast.success(T[locale].uploadOk);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'upload error');
      }
    },
  });
}
