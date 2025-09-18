/* eslint-disable @next/next/no-img-element */
// cSpell:ignore lowlight
'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  Dispatch,
  SetStateAction,
  MouseEvent as ReactMouseEvent,
} from 'react';
import {
  useEditor,
  EditorContent,
  ReactNodeViewRenderer,
  NodeViewWrapper,
} from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TiptapImage from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { lowlight } from 'lowlight';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import CharacterCount from '@tiptap/extension-character-count';
import { Node as ProseMirrorNode } from 'prosemirror-model';
import { mergeAttributes } from '@tiptap/core';
import dynamic from 'next/dynamic';

import { FontSize } from './editor/extensions/FontSize';
import EditorMenuBar from './EditorMenuBar';

interface Props {
  content: string;
  setContent: Dispatch<SetStateAction<string>>;
  placeholder?: string;
  minHeightPx?: number;
  theme?: 'auto' | 'light' | 'dark';
}

type Align = 'left' | 'center' | 'right' | 'inline';

type ImageAttributes = {
  src: string | null;
  alt: string | null;
  title: string | null;
  width: number;
  align: Align;
  rounded: boolean;
  shadow: boolean;
};

/* مساحة القص */
type CropPoint = { x: number; y: number };
type CropArea = { x: number; y: number; width: number; height: number };

/* --------------------------- قصّ الصورة (Crop) ------------------------- */
type CropperProps = {
  image: string;
  crop: CropPoint;
  zoom: number;
  aspect?: number;
  onCropChange: (p: CropPoint) => void;
  onZoomChange: (z: number) => void;
  onCropComplete: (area: CropArea, areaPixels: CropArea) => void;
};

const Cropper = dynamic<CropperProps>(
  () =>
    import('react-easy-crop') as unknown as Promise<
      React.ComponentType<CropperProps>
    >,
  { ssr: false },
);

/** يُنتج Blob من الجزء المقتطع */
async function getCroppedBlob(imageSrc: string, area: CropArea): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(area.width);
  canvas.height = Math.round(area.height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(
    img,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    area.width,
    area.height,
  );

  return await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve((b as Blob) ?? new Blob()), 'image/jpeg', 0.92),
  );
}

/* --------------------------- رفع الصور API --------------------------- */
async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  const json: { url?: string; error?: string } = await res.json();
  if (!res.ok || !json.url) throw new Error(json.error || 'upload failed');
  return json.url;
}

/* --------------------- NodeView لصورة قابلة للتحجيم -------------------- */
function ResizableImageView(props: NodeViewProps) {
  const { node, updateAttributes, selected, deleteNode } = props;
  const wrapperRef = useRef<HTMLSpanElement>(null);

  const nodeAttrs = node.attrs as ImageAttributes;
  const src = String(nodeAttrs.src ?? '');
  const alt = nodeAttrs.alt ? String(nodeAttrs.alt) : '';
  const width = Math.max(20, Math.min(100, Number(nodeAttrs.width ?? 100)));
  const align = (nodeAttrs.align ?? 'center') as Align;
  const rounded = nodeAttrs.rounded !== false;
  const shadow  = nodeAttrs.shadow  !== false;

  // ===== تغيير الحجم بالسحب (المقبض السفلي) =====
  const startX = useRef(0);
  const startW = useRef(width);
  const containerW = useRef(0);
  const resizing = useRef(false);

  const onMouseDown = (e: ReactMouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    resizing.current = true;
    startX.current = e.clientX;
    startW.current = width;
    containerW.current =
      wrapperRef.current?.parentElement?.clientWidth ??
      wrapperRef.current?.clientWidth ??
      0;

    const onMove = (ev: MouseEvent) => {
      if (!resizing.current || containerW.current === 0) return;
      const dx = ev.clientX - startX.current;
      const deltaPercent = (dx / containerW.current) * 100;
      const next = Math.round(
        Math.max(20, Math.min(100, startW.current + deltaPercent)),
      );
      updateAttributes({ width: next });
    };

    const onUp = () => {
      resizing.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // ===== سحب الشريط العلوي لعمل float (مع معاينة حيّة) =====
  const floatDragging = useRef(false);
  const rafId = useRef<number | null>(null);
  const lastPreviewAlign = useRef<Align>(align);

  const applyPreviewAlign = (next: Align) => {
    if (lastPreviewAlign.current === next) return;
    lastPreviewAlign.current = next;
    updateAttributes({ align: next });
  };

  const onFloatPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    floatDragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onFloatPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!floatDragging.current) return;
    e.preventDefault();

    // نحسب موضع المؤشّر داخل منطقة المحرّر
    const root = wrapperRef.current?.closest('.ProseMirror') as HTMLElement | null;
    const rect = root?.getBoundingClientRect();
    if (!rect) return;

    const relX = e.clientX - rect.left;  // بكسلات من يسار المحرّر
    const third = rect.width / 3;

    // يسار = left ، يمين = right ، الوسط = inline (بدون float)
    const next: Align = relX < third ? 'left' : relX > 2 * third ? 'right' : 'inline';

    if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => applyPreviewAlign(next));
  };

  const onFloatPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!floatDragging.current) return;
    onFloatPointerMove(e); // تأكيد آخر معاينة
    floatDragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
  };

  // ===== أدوات صغيرة =====
  const setAlign      = (v: Align) => updateAttributes({ align: v });
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
      {/* شريط علوي: اسحبه يمين/يسار لتغيير التعويم */}
      <div
        onPointerDown={onFloatPointerDown}
        onPointerUp={onFloatPointerUp}
        onPointerMove={onFloatPointerMove}
        className="absolute top-0 left-0 right-0 h-5 z-20 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-blue-500/10 group-hover:bg-blue-500/20 rounded-t"
        title="اسحب يمين/يسار لتعويم الصورة"
        aria-label="Drag left/right to float"
        style={{ touchAction: 'none' }}
      />

      {/* الصورة نفسها (قابلة للسحب داخل المستند) */}
      <img
        src={src}
        alt={alt}
        className={[
          'w-full h-auto select-none',
          rounded ? 'rounded-xl' : '',
          shadow ? 'shadow-md' : '',
          selected ? 'ring-2 ring-blue-500/60' : '',
        ].join(' ')}
        draggable
        data-drag-handle
      />

      {/* زر حذف في الزاوية */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          deleteNode();
        }}
        title="حذف الصورة"
        aria-label="Remove image"
        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow opacity-0 group-hover:opacity-100 z-30"
      >
        ×
      </button>

      {/* مقبض تغيير الحجم */}
      <button
        type="button"
        onMouseDown={onMouseDown}
        title="Resize"
        aria-label="Resize"
        className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow hover:bg-blue-700 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity"
      >
        ↔
      </button>

      {/* شريط أدوات يظهر عند تحديد الصورة */}
      {selected && (
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white/95 dark:bg-zinc-900/95 backdrop-blur px-2 py-1 shadow z-10">
          <label className="text-[10px] text-gray-600 dark:text-gray-300">W</label>
          <input
            type="range"
            min={20}
            max={100}
            step={5}
            value={width}
            onChange={(e) => updateAttributes({ width: Number(e.target.value) })}
          />
          <span className="text-[10px] w-10 text-right tabular-nums">{width}%</span>

          <div className="h-5 w-px bg-gray-200 dark:bg-zinc-700" />

          <button
            title="Align left"
            onClick={() => setAlign('left')}
            className={`h-6 px-2 rounded border text-[10px] ${
              align === 'left'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700'
            }`}
          >
            L
          </button>
          <button
            title="Inline"
            onClick={() => setAlign('inline')}
            className={`h-6 px-2 rounded border text-[10px] ${
              align === 'inline'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700'
            }`}
          >
            I
          </button>
          <button
            title="Center"
            onClick={() => setAlign('center')}
            className={`h-6 px-2 rounded border text-[10px] ${
              align === 'center'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700'
            }`}
          >
            C
          </button>
          <button
            title="Align right"
            onClick={() => setAlign('right')}
            className={`h-6 px-2 rounded border text-[10px] ${
              align === 'right'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700'
            }`}
          >
            R
          </button>

          <div className="h-5 w-px bg-gray-200 dark:bg-zinc-700" />

          <button
            title="Rounded"
            onClick={toggleRounded}
            className={`h-6 px-2 rounded border text-[10px] ${
              rounded
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700'
            }`}
          >
            ◼︎↺
          </button>
          <button
            title="Shadow"
            onClick={toggleShadow}
            className={`h-6 px-2 rounded border text-[10px] ${
              shadow
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700'
            }`}
          >
            ☼
          </button>

            {/* زر حذف داخل الشريط */}
          <button
            title="حذف الصورة"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              deleteNode();
            }}
            className="h-6 px-2 rounded border text-[10px] bg-red-600 text-white border-red-600"
          >
            🗑
          </button>
        </div>
      )}
    </NodeViewWrapper>
  );
}



/* ---------------------- امتداد Image المخصص (float/width) -------------- */
const ResizableImage = TiptapImage.extend({
  name: 'image',
  addOptions() {
    return {
      ...TiptapImage.options,
      inline: true, // الصورة يمكن أن تكون ضمن السطر
      allowBase64: true,
    };
  },
  draggable: true,
  selectable: true,
  inline() {
    return this.options.inline;
  },
  group() {
    return this.options.inline ? 'inline' : 'block';
  },

  // بدون أي استخدام لـ any: نعرّف السمات الأساسية + المخصّصة صراحةً
  addAttributes() {
    return {
      // سمات الصورة الأساسية
      src: {
        default: null as string | null,
        parseHTML: (el: HTMLElement) => el.getAttribute('src'),
        renderHTML: (attrs: ImageAttributes) => ({ src: attrs.src ?? '' }),
      },
      alt: {
        default: null as string | null,
        parseHTML: (el: HTMLElement) => el.getAttribute('alt'),
        renderHTML: (attrs: ImageAttributes) =>
          attrs.alt ? { alt: attrs.alt } : {},
      },
      title: {
        default: null as string | null,
        parseHTML: (el: HTMLElement) => el.getAttribute('title'),
        renderHTML: (attrs: ImageAttributes) =>
          attrs.title ? { title: attrs.title } : {},
      },

      // السمات الإضافية
      width: {
        default: 100 as number,
        parseHTML: (el: HTMLElement) => {
          const m = (el.getAttribute('style') ?? '').match(
            /width:\s*([\d.]+)%/,
          );
          return m?.[1]
            ? Math.max(20, Math.min(100, parseFloat(m[1])))
            : 100;
        },
        renderHTML: (attrs: ImageAttributes) => ({
          style: `width:${Math.max(
            20,
            Math.min(100, Number(attrs.width ?? 100)),
          )}%;`,
        }),
      },
      align: {
        default: 'inline' as Align,
        parseHTML: (el: HTMLElement) =>
          (el.getAttribute('data-align') as Align) ?? 'inline',
        renderHTML: (attrs: ImageAttributes) => ({ 'data-align': attrs.align }),
      },
      rounded: {
        default: true as boolean,
        parseHTML: (el: HTMLElement) =>
          el.getAttribute('data-rounded') !== 'false',
        renderHTML: (attrs: ImageAttributes) => ({
          'data-rounded': String(attrs.rounded),
        }),
      },
      shadow: {
        default: true as boolean,
        parseHTML: (el: HTMLElement) =>
          el.getAttribute('data-shadow') !== 'false',
        renderHTML: (attrs: ImageAttributes) => ({
          'data-shadow': String(attrs.shadow),
        }),
      },
    };
  },

  renderHTML({
    node,
    HTMLAttributes,
  }: {
    node: ProseMirrorNode;
    HTMLAttributes: Record<string, unknown>;
  }) {
    const { width, align, rounded, shadow } = node.attrs as ImageAttributes;
    const w = Math.max(20, Math.min(100, Number(width ?? 100)));

    const cls = [
      'tiptap-img',
      align === 'center'
        ? 'block mx-auto my-4 clear-both'
        : 'inline-block align-top',
      align === 'left' ? 'float-left mr-4 my-2' : '',
      align === 'right' ? 'float-right ml-4 my-2' : '',
      align === 'inline' ? 'mx-2 my-2' : '',
      rounded ? 'rounded-xl' : '',
      shadow ? 'shadow-md' : '',
    ]
      .filter(Boolean)
      .join(' ');

    const finalAttrs = mergeAttributes(HTMLAttributes, {
      class: cls,
      style: `width:${w}%;`,
    });

    return ['img', finalAttrs];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});

/* ---------------------------- المكوّن الرئيسي --------------------------- */
export default function TipTapEditor({
  content,
  setContent,
  placeholder = 'Write something…',
  minHeightPx = 260,
  theme = 'auto',
}: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // حالة القصّ
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<CropPoint>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [croppedAreaPixels, setCroppedAreaPixels] =
    useState<CropArea | null>(null);
  const pendingFileRef = useRef<File | null>(null);

  const dark =
    theme === 'auto'
      ? typeof window !== 'undefined' &&
        document.documentElement.classList.contains('dark')
      : theme === 'dark';

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextStyle,
      Color,
      FontSize,
      Link.configure({ autolink: true, openOnClick: false }),
      ResizableImage,
      Placeholder.configure({ placeholder }),
      Highlight,
      HorizontalRule,
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class:
            'my-3 rounded bg-zinc-900/90 text-zinc-100 p-3 text-sm overflow-x-auto',
        },
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      CharacterCount.configure({ limit: 50000 }),
    ],
    content,
    onUpdate: ({ editor: ed }) => setContent(ed.getHTML()),
    editorProps: {
      attributes: {
        class:
          'tiptap prose dark:prose-invert max-w-none focus:outline-none p-3 md:p-4',
      },
      handleDrop: (_view, event) => {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;
        const file = files[0];
        if (file.type.startsWith('image/')) {
          event.preventDefault();
          openCropper(file);
          return true;
        }
        return false;
      },
    },
    immediatelyRender: false,
  });

  const insertImg = useCallback(
    (url: string, altText?: string) => {
      if (!editor || editor.isDestroyed) return;
      editor
        .chain()
        .focus()
        .setImage({ src: url, alt: altText ?? '' })
        // ابدأ كـ inline لتستطيع سحب الشريط لليمين/اليسار بسهولة
        .updateAttributes('image', { width: 40, align: 'inline' as const })
        .run();
    },
    [editor],
  );

  const openCropper = useCallback((file: File) => {
    pendingFileRef.current = file;
    setCropSrc(URL.createObjectURL(file));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }, []);

  const uploadCropped = useCallback(async () => {
    if (!pendingFileRef.current || !cropSrc || !croppedAreaPixels) return;
    setUploading(true);
    try {
      const blob = await getCroppedBlob(cropSrc, croppedAreaPixels);
      const file = new File([blob], 'crop.jpg', { type: 'image/jpeg' });
      const url = await uploadImage(file);
      insertImg(url, pendingFileRef.current.name);
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
      setCropSrc(null);
      pendingFileRef.current = null;
    }
  }, [cropSrc, croppedAreaPixels, insertImg]);

  const uploadOriginal = useCallback(async () => {
    if (!pendingFileRef.current) return;
    setUploading(true);
    try {
      const url = await uploadImage(pendingFileRef.current);
      insertImg(url, pendingFileRef.current.name);
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
      setCropSrc(null);
      pendingFileRef.current = null;
    }
  }, [insertImg]);

  const handleImageUpload = useCallback(
    async (file: File) => {
      if (file.size > 5 * 1024 * 1024) {
        alert('Max file size is 5 MB');
        return;
      }
      openCropper(file);
    },
    [openCropper],
  );

  // مزامنة المحتوى القادم من الخارج
  useEffect(() => {
    if (editor && !editor.isDestroyed && editor.getHTML() !== content) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  // لصق الصور من الحافظة
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = Array.from(e.clipboardData?.files ?? []).find((f) =>
        f.type.startsWith('image/'),
      );
      if (file) {
        e.preventDefault();
        handleImageUpload(file);
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [handleImageUpload]);

  if (!editor) {
    return (
      <div
        className={`flex items-center justify-center h-32 rounded border ${
          dark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-300'
        }`}
      >
        <span className={dark ? 'text-zinc-400' : 'text-zinc-500'}>
          Loading…
        </span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-md border shadow ${
        dark ? 'bg-zinc-900/90 border-zinc-700' : 'bg-white border-zinc-300'
      }`}
    >
      <EditorMenuBar
        editor={editor}
        onInsertImage={() => fileInput.current?.click()}
        uploadingImage={uploading}
      />

      <div className="p-1">
        <div
          style={{ minHeight: minHeightPx }}
          className={`rounded border ${
            dark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-300'
          }`}
        >
          <EditorContent editor={editor} />
        </div>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          if (e.target.files?.[0]) {
            handleImageUpload(e.target.files[0]);
          }
        }}
      />

      {/* مودال القص */}
      {cropSrc && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
            <div className="relative h-[60vh]">
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={16 / 9}
                onCropChange={(p: CropPoint) => setCrop(p)}
                onZoomChange={(z: number) => setZoom(z)}
                onCropComplete={(_: CropArea, area: CropArea) =>
                  setCroppedAreaPixels(area)
                }
              />
            </div>
            <div className="flex items-center justify-between gap-3 p-3 border-t border-gray-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <label className="text-sm">Zoom</label>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-2 rounded border bg-white dark:bg-zinc-800"
                  onClick={() => {
                    setCropSrc(null);
                    pendingFileRef.current = null;
                  }}
                >
                  Cancel
                </button>
                <button
                  className="px-3 py-2 rounded border bg-white dark:bg-zinc-800"
                  onClick={uploadOriginal}
                  disabled={uploading}
                >
                  Insert original
                </button>
                <button
                  className="px-3 py-2 rounded bg-blue-600 text-white"
                  onClick={uploadCropped}
                  disabled={uploading || !croppedAreaPixels}
                >
                  {uploading ? 'Uploading…' : 'Crop & insert'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
