/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useRef, useCallback, useEffect, useState } from 'react';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import TiptapImage from '@tiptap/extension-image';
import { mergeAttributes } from '@tiptap/core';
import { Node as ProseMirrorNode } from 'prosemirror-model';

type Align = 'left' | 'center' | 'right' | 'inline';
export type ImageAttributes = {
  src: string | null; alt: string | null; title: string | null;
  width: number; align: Align; rounded: boolean; shadow: boolean;
};

function useIsMobile(breakpointPx = 768) {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width:${breakpointPx - 1}px)`);
    const on = () => setMobile(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, [breakpointPx]);
  return mobile;
}

function ResizableImageView(props: NodeViewProps) {
  const { node, updateAttributes, selected, deleteNode } = props;
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const isMobile = useIsMobile();

  const { src, alt, width: _w, align, rounded, shadow } = {
    src: String((node.attrs as ImageAttributes).src ?? ''),
    alt: String((node.attrs as ImageAttributes).alt ?? '') || '',
    width: Math.max(20, Math.min(100, Number((node.attrs as ImageAttributes).width ?? 100))),
    align: ((node.attrs as ImageAttributes).align ?? 'center') as Align,
    rounded: (node.attrs as ImageAttributes).rounded !== false,
    shadow: (node.attrs as ImageAttributes).shadow !== false,
  };
  const width = _w;

  // ====== Resize via Pointer Events (يلمس/ماوس) ======
  const startX = useRef(0);
  const startW = useRef(width);
  const containerW = useRef(0);
  const resizing = useRef(false);

  const onPointerDownResize = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    resizing.current = true;
    startX.current = e.clientX;
    startW.current = width;
    containerW.current =
      wrapperRef.current?.parentElement?.clientWidth ??
      wrapperRef.current?.clientWidth ??
      0;
  };

  const onPointerMoveResize = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!resizing.current || containerW.current === 0) return;
    const dx = e.clientX - startX.current;
    const deltaPercent = (dx / containerW.current) * 100;
    const next = Math.round(Math.max(20, Math.min(100, startW.current + deltaPercent)));
    updateAttributes({ width: next });
  };

  const onPointerUpResize = (e: React.PointerEvent<HTMLButtonElement>) => {
    resizing.current = false;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  // ====== Mobile quick toggle (double-tap) بين 90% و 40% ======
  const lastTapRef = useRef<number>(0);
  const onImagePointerUp = () => {
    if (!isMobile) return;
    const now = Date.now();
    if (now - lastTapRef.current < 280) {
      // double-tap
      const next = width >= 85 ? 40 : 90;
      updateAttributes({ width: next, align: next >= 85 ? 'center' : 'inline' });
    }
    lastTapRef.current = now;
  };

  const setAlign = useCallback((v: Align) => updateAttributes({ align: v }), [updateAttributes]);
  const toggleRounded = () => updateAttributes({ rounded: !rounded });
  const toggleShadow  = () => updateAttributes({ shadow: !shadow });

  const wrapperClasses =
    align === 'left'
      ? 'inline-block float-left mr-4 my-2'
      : align === 'right'
      ? 'inline-block float-right ml-4 my-2'
      : align === 'inline'
      ? 'inline-block align-top mx-2 my-2'
      : 'block mx-auto my-4 clear-both';

  return (
    <NodeViewWrapper
      as="span"
      ref={wrapperRef}
      className={`relative group ${wrapperClasses}`}
      style={{ width: `${width}%` }}
      contentEditable={false}
    >
      <img
        src={src}
        alt={alt}
        draggable
        onPointerUp={onImagePointerUp}
        data-drag-handle
        className={[
          'w-full h-auto select-none touch-pan-y',
          rounded ? 'rounded-xl' : '',
          shadow ? 'shadow-md' : '',
          selected ? 'ring-2 ring-blue-500/60' : '',
        ].join(' ')}
      />

      {/* زر حذف */}
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteNode(); }}
        title="Remove image"
        aria-label="Remove image"
        className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-red-600 text-white flex items-center justify-center shadow opacity-0 group-hover:opacity-100 z-30"
      >
        ×
      </button>

      {/* مقبض تغيير الحجم — يعمل باللمس/الماوس */}
      <button
        type="button"
        onPointerDown={onPointerDownResize}
        onPointerMove={onPointerMoveResize}
        onPointerUp={onPointerUpResize}
        title="Resize"
        aria-label="Resize"
        className="absolute bottom-1 right-1 h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow hover:bg-blue-700 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ touchAction: 'none' }}
      >
        ↔
      </button>

      {/* شريط الأدوات العائم */}
      {selected && (
        <div
          className={[
            'absolute z-10 flex items-center gap-2 rounded-lg border border-gray-200 dark:border-zinc-700',
            'bg-white/95 dark:bg-zinc-900/95 backdrop-blur px-2 py-1 shadow',
            // على الموبايل: أصغر ومثبت فوق لتجنب خروج الشاشة
            'left-1/2 -translate-x-1/2',
            isMobile ? 'bottom-1 text-[10px]' : '-bottom-10',
          ].join(' ')}
          role="toolbar"
          aria-label="Image tools"
        >
          <label className="text-[10px] text-gray-600 dark:text-gray-300">W</label>
          <input
            type="range" min={20} max={100} step={5}
            value={width}
            onChange={(e) => updateAttributes({ width: Number(e.target.value) })}
            className="max-w-[120px]"
            aria-label="Image width"
          />
          <span className="text-[10px] w-10 text-right tabular-nums">{width}%</span>

          <div className="h-5 w-px bg-gray-200 dark:bg-zinc-700" />

          {(['left','inline','center','right'] as Align[]).map((a) => (
            <button
              key={a}
              title={`Align ${a}`}
              onClick={() => setAlign(a)}
              className={`h-6 px-2 rounded border text-[10px] ${
                align === a
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700'
              }`}
              aria-pressed={align === a}
            >
              {a[0].toUpperCase()}
            </button>
          ))}

          <div className="h-5 w-px bg-gray-200 dark:bg-zinc-700" />

          <button
            title="Rounded"
            onClick={toggleRounded}
            className={`h-6 px-2 rounded border text-[10px] ${
              rounded ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700'
            }`}
            aria-pressed={rounded}
          >
            ◼︎↺
          </button>
          <button
            title="Shadow"
            onClick={toggleShadow}
            className={`h-6 px-2 rounded border text-[10px] ${
              shadow ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700'
            }`}
            aria-pressed={shadow}
          >
            ☼
          </button>

          <button
            title="Remove"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteNode(); }}
            className="h-6 px-2 rounded border text-[10px] bg-red-600 text-white border-red-600"
          >
            🗑
          </button>
        </div>
      )}
    </NodeViewWrapper>
  );
}

export const ResizableImage = TiptapImage.extend({
  name: 'image',
  addOptions() {
    return { ...TiptapImage.options, inline: true, allowBase64: true };
  },
  draggable: true,
  selectable: true,
  inline() { return this.options.inline; },
  group()  { return this.options.inline ? 'inline' : 'block'; },

addAttributes() {
  return {
    src: {
      default: null as string | null,
      parseHTML: (el: HTMLElement): string | null => el.getAttribute('src'),
      renderHTML: (a: ImageAttributes): Record<string, string> =>
        a.src ? { src: a.src } : {},
    },

    alt: {
      default: null as string | null,
      parseHTML: (el: HTMLElement): string | null => el.getAttribute('alt'),
      renderHTML: (a: ImageAttributes): Record<string, string> =>
        a.alt ? { alt: a.alt } : {},
    },

    title: {
      default: null as string | null,
      parseHTML: (el: HTMLElement): string | null => el.getAttribute('title'),
      renderHTML: (a: ImageAttributes): Record<string, string> =>
        a.title ? { title: a.title } : {},
    },

    width: {
      default: 100 as number,
      parseHTML: (el: HTMLElement): number => {
        const style = el.getAttribute('style') ?? '';
        const m = style.match(/width:\s*([\d.]+)%/);
        const n = m?.[1] ? parseFloat(m[1]) : 100;
        const v = Number.isFinite(n) ? n : 100;
        return Math.max(20, Math.min(100, v));
      },
      renderHTML: (a: ImageAttributes): Record<string, string> => ({
        style: `width:${Math.max(20, Math.min(100, Number(a.width ?? 100)))}%;`,
      }),
    },

    align: {
      default: 'inline' as Align,
      parseHTML: (el: HTMLElement): Align => {
        const v = el.getAttribute('data-align');
        return v === 'left' || v === 'center' || v === 'right' || v === 'inline'
          ? v
          : 'inline';
      },
      renderHTML: (a: ImageAttributes): Record<string, string> => ({
        'data-align': a.align,
      }),
    },

    rounded: {
      default: true as boolean,
      parseHTML: (el: HTMLElement): boolean =>
        el.getAttribute('data-rounded') !== 'false',
      renderHTML: (a: ImageAttributes): Record<string, string> => ({
        'data-rounded': String(Boolean(a.rounded)),
      }),
    },

    shadow: {
      default: true as boolean,
      parseHTML: (el: HTMLElement): boolean =>
        el.getAttribute('data-shadow') !== 'false',
      renderHTML: (a: ImageAttributes): Record<string, string> => ({
        'data-shadow': String(Boolean(a.shadow)),
      }),
    },
  } as const;
},


  renderHTML({ node, HTMLAttributes }: { node: ProseMirrorNode; HTMLAttributes: Record<string, unknown>; }) {
    const { width, align, rounded, shadow } = node.attrs as ImageAttributes;
    const w = Math.max(20, Math.min(100, Number(width ?? 100)));
    const cls = [
      'tiptap-img',
      align === 'center' ? 'block mx-auto my-4 clear-both' : 'inline-block align-top',
      align === 'left' ? 'float-left mr-4 my-2' : '',
      align === 'right' ? 'float-right ml-4 my-2' : '',
      align === 'inline' ? 'mx-2 my-2' : '',
      rounded ? 'rounded-xl' : '',
      shadow ? 'shadow-md' : '',
    ].filter(Boolean).join(' ');

    const finalAttrs = mergeAttributes(HTMLAttributes, { class: cls, style: `width:${w}%;` });
    return ['img', finalAttrs];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});
