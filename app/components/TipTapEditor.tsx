/* eslint-disable @next/next/no-img-element */
// cSpell:ignore lowlight
'use client';

import {
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

import { FontSize } from './editor/extensions/FontSize';
import EditorMenuBar from './EditorMenuBar';

/* ---------------------------- أنواع المكوّن ---------------------------- */
interface Props {
  content: string;
  setContent: Dispatch<SetStateAction<string>>;
  placeholder?: string;
  minHeightPx?: number;
  theme?: 'auto' | 'light' | 'dark';
}

type Align = 'left' | 'center' | 'right';

type ImageAttributes = {
  src: string | null;
  alt: string | null;
  title: string | null;
  width: number;
  align: Align;
  rounded: boolean;
  shadow: boolean;
};

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
  const { node, updateAttributes, selected } = props;
  const wrapperRef = useRef<HTMLDivElement>(null);

  const nodeAttrs = node.attrs as ImageAttributes;

  const src = String(nodeAttrs.src ?? '');
  const alt = nodeAttrs.alt ? String(nodeAttrs.alt) : '';
  const width = Math.max(20, Math.min(100, Number(nodeAttrs.width ?? 100)));
  const align = (nodeAttrs.align ?? 'center') as Align;
  const rounded = nodeAttrs.rounded !== false;
  const shadow = nodeAttrs.shadow !== false;

  const startX = useRef<number>(0);
  const startW = useRef<number>(width);
  const containerW = useRef<number>(0);
  const dragging = useRef<boolean>(false);

  const onMouseDown = (e: ReactMouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startW.current = width;
    // استخدم عرض الحاوية الأب لضمان تحجيم صحيح
    containerW.current =
      wrapperRef.current?.parentElement?.clientWidth ??
      wrapperRef.current?.clientWidth ??
      0;

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current || containerW.current === 0) return;
      const dx = ev.clientX - startX.current;
      const deltaPercent = (dx / containerW.current) * 100;
      const next = Math.round(Math.max(20, Math.min(100, startW.current + deltaPercent)));
      updateAttributes({ width: next });
    };

    const onUp = () => {
      dragging.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const setAlign = (v: Align) => updateAttributes({ align: v });
  const toggleRounded = () => updateAttributes({ rounded: !rounded });
  const toggleShadow = () => updateAttributes({ shadow: !shadow });

  const alignClasses =
    align === 'left'
      ? 'float-left mr-4 my-2'
      : align === 'right'
      ? 'float-right ml-4 my-2'
      : 'mx-auto my-4';

  return (
    <NodeViewWrapper className="relative clear-both">
      <div
        ref={wrapperRef}
        className={`group relative ${alignClasses}`}
        style={{ width: `${width}%` }}
        contentEditable={false}
      >
        <img
          src={src}
          alt={alt}
          className={[
            // 👇 مهم: w-full حتى تمتلئ الصورة الحاوية عند 100%
            'block w-full h-auto select-none',
            rounded ? 'rounded-xl' : '',
            shadow ? 'shadow-md' : '',
            selected ? 'ring-2 ring-blue-500/60' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          draggable={false}
        />

        <button
          type="button"
          onMouseDown={onMouseDown}
          title="Resize"
          aria-label="Resize"
          className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow hover:bg-blue-700 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity"
        >
          ↔
        </button>

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
              type="button"
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
              type="button"
              title="Align center"
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
              type="button"
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
              type="button"
              title="Rounded corners"
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
              type="button"
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
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

/* ---------------------- امتداد Image المخصص (Fixed) --------------------- */
const ResizableImage = TiptapImage.extend({
  name: 'image',

  addOptions() {
    return {
      ...TiptapImage.options,
      inline: false,
      allowBase64: true,
    };
  },

  addAttributes() {
    // ✅ نمط آمن لأنواع TipTap: this.parent غير معرفة في الـ types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parent = (this as any).parent?.() ?? {};

    return {
      ...parent,
      width: {
        default: 100,
        parseHTML: (element: HTMLElement): number => {
          const style = element.getAttribute('style') ?? '';
          const match = style.match(/width:\s*([\d.]+)%/);
          return match?.[1] ? parseFloat(match[1]) : 100;
        },
      },
      align: {
        default: 'center',
        parseHTML: (element: HTMLElement): Align =>
          ((element.getAttribute('data-align') as Align | null) ?? 'center'),
        renderHTML: (attributes: ImageAttributes) => ({
          'data-align': attributes.align ?? 'center',
        }),
      },
      rounded: {
        default: true,
        parseHTML: (element: HTMLElement): boolean =>
          element.getAttribute('data-rounded') !== 'false',
        renderHTML: (attributes: ImageAttributes) => ({
          'data-rounded': String(attributes.rounded ?? true),
        }),
      },
      shadow: {
        default: true,
        parseHTML: (element: HTMLElement): boolean =>
          element.getAttribute('data-shadow') !== 'false',
        renderHTML: (attributes: ImageAttributes) => ({
          'data-shadow': String(attributes.shadow ?? true),
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
    const sanitizedWidth = Math.max(20, Math.min(100, Number(width ?? 100)));

    const classString = [
      'tiptap-img',
      // 👇 مهم: w-full هنا أيضًا لإخراج HTML العرضي (للقراءة) بحيث يملأ الحاوية
      'block w-full h-auto',
      align === 'left' ? 'float-left mr-4 my-2' : '',
      align === 'right' ? 'float-right ml-4 my-2' : '',
      align === 'center' ? 'mx-auto my-4' : '',
      rounded ? 'rounded-xl' : '',
      shadow ? 'shadow-md' : '',
    ]
      .filter(Boolean)
      .join(' ');

    const finalAttrs = mergeAttributes(HTMLAttributes, {
      class: classString,
      style: `width: ${sanitizedWidth}%;`,
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
          'prose dark:prose-invert max-w-none focus:outline-none p-3 md:p-4',
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;
        const file = files[0];
        if (file.type.startsWith('image/')) {
          event.preventDefault();
          handleImageUpload(file);
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
        .updateAttributes('image', { width: 60, align: 'center' as const })
        .run();
    },
    [editor],
  );

  const handleImageUpload = useCallback(
    async (file: File) => {
      if (file.size > 5 * 1024 * 1024) {
        alert('Max file size is 5 MB');
        return;
      }
      setUploading(true);
      try {
        const url = await uploadImage(file);
        insertImg(url, file.name);
      } catch (err) {
        console.error('Image upload failed:', err);
      } finally {
        setUploading(false);
      }
    },
    [insertImg],
  );

  // حدّث محتوى المحرر عند تغيّر prop content من الخارج
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
    </div>
  );
}
