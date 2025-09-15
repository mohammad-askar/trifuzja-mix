/* eslint-disable @next/next/no-img-element */
// cSpell:ignore lowlight
'use client';

import {
  useEffect,
  useRef,
  useState,
  Dispatch,
  SetStateAction,
  useCallback,
} from 'react';
import {
  EditorContent,
  useEditor,
  Editor,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { lowlight } from 'lowlight';
import {
  Table,
  TableRow,
  TableCell,
  TableHeader,
} from '@tiptap/extension-table';
import CharacterCount from '@tiptap/extension-character-count';
import { EditorView } from '@tiptap/pm/view';

import { FontSize } from './editor/extensions/FontSize';
import EditorMenuBar from './EditorMenuBar';

/* ------------------------------------------------------------------ */
/*                         أنواع وخصائص المكوّن                        */
/* ------------------------------------------------------------------ */

interface Props {
  content: string;
  setContent: Dispatch<SetStateAction<string>>;
  placeholder?: string;
  minHeightPx?: number;
  theme?: 'auto' | 'light' | 'dark';
}

/* رفع صورة وترجيع الرابط */
async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  const json: { url?: string; error?: string } = await res.json();
  if (!res.ok || !json.url) throw new Error(json.error || 'upload failed');
  return json.url;
}

/* ------------------------------------------------------------------ */
/*      امتداد صورة مع NodeView يدعم التحجيم والمحاذاة والستايل        */
/* ------------------------------------------------------------------ */

type Align = 'left' | 'center' | 'right';

const ResizableImage = Image.extend({
  name: 'image',

  // نعرّف كل السمات صراحة (بدون this.parent)
  addAttributes() {
    return {
      src: {
        default: null as string | null,
      },
      alt: {
        default: null as string | null,
      },
      title: {
        default: null as string | null,
      },
      // نسبة العرض %
      width: {
        default: 100 as number,
        parseHTML: (element: HTMLElement) => {
          const style = element.getAttribute('style') ?? '';
          const m = style.match(/width:\s*([\d.]+)%/);
          return m ? Math.max(20, Math.min(100, Number(m[1]))) : 100;
        },
        renderHTML: (attrs: { width?: number }) => {
          const w = Math.max(20, Math.min(100, Number(attrs.width ?? 100)));
          return { style: `width:${w}%` };
        },
      },
      align: {
        default: 'center' as Align,
        parseHTML: (element: HTMLElement) =>
          (element.getAttribute('data-align') as Align | null) ?? 'center',
        renderHTML: (attrs: { align?: Align }) => ({
          'data-align': (attrs.align ?? 'center') as string,
        }),
      },
      rounded: {
        default: true as boolean,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute('data-rounded') !== 'false',
        renderHTML: (attrs: { rounded?: boolean }) => ({
          'data-rounded': String(Boolean(attrs.rounded)),
        }),
      },
      shadow: {
        default: true as boolean,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute('data-shadow') !== 'false',
        renderHTML: (attrs: { shadow?: boolean }) => ({
          'data-shadow': String(Boolean(attrs.shadow)),
        }),
      },
    };
  },

  // HTML الناتج (يتضمن الكلاسات والمحاذاة والعرض)
  renderHTML({
    HTMLAttributes,
  }: {
    HTMLAttributes: Record<string, unknown>;
  }) {
    const attrs = HTMLAttributes as {
      src?: string;
      alt?: string;
      title?: string;
      width?: number;
      align?: Align;
      rounded?: boolean;
      shadow?: boolean;
      class?: string;
    };

    const w = Math.max(20, Math.min(100, Number(attrs.width ?? 100)));
    const align = (attrs.align ?? 'center') as Align;
    const rounded = attrs.rounded !== false;
    const shadow = attrs.shadow !== false;

    const cls = [
      attrs.class ?? '',
      'tiptap-img',
      'block',
      'max-w-full',
      'h-auto',
      align === 'left' ? 'float-left mr-4 my-2' : '',
      align === 'right' ? 'float-right ml-4 my-2' : '',
      align === 'center' ? 'mx-auto my-4' : '',
      rounded ? 'rounded-xl' : '',
      shadow ? 'shadow-md' : '',
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    return [
      'img',
      {
        ...attrs,
        class: cls,
        style: `width:${w}%`,
      },
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});

/* -------------------------- واجهة عرض الصورة ------------------------- */

function ResizableImageView(props: NodeViewProps) {
  const { node, updateAttributes, selected } = props;
  const wrapperRef = useRef<HTMLDivElement>(null);

  // نقرأ السمات بطريقة آمنة (بدون any)
  const nodeAttrs = node.attrs as {
    src?: string;
    alt?: string;
    width?: number;
    align?: Align;
    rounded?: boolean;
    shadow?: boolean;
  };

  const src = String(nodeAttrs.src ?? '');
  const alt = nodeAttrs.alt ? String(nodeAttrs.alt) : '';
  const width = Math.max(20, Math.min(100, Number(nodeAttrs.width ?? 100)));
  const align = (nodeAttrs.align ?? 'center') as Align;
  const rounded = nodeAttrs.rounded !== false;
  const shadow = nodeAttrs.shadow !== false;

  // سحب يدوي لتغيير العرض
  const startX = useRef<number>(0);
  const startW = useRef<number>(width);
  const containerW = useRef<number>(0);
  const dragging = useRef<boolean>(false);

  const onMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startW.current = width;
    containerW.current = wrapperRef.current?.clientWidth ?? 0;

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const dx = ev.clientX - startX.current;
      const deltaPercent =
        containerW.current > 0 ? (dx / containerW.current) * 100 : 0;
      const next = Math.max(
        20,
        Math.min(100, Math.round(startW.current + deltaPercent)),
      );
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
            'block max-w-full h-auto select-none',
            rounded ? 'rounded-xl' : '',
            shadow ? 'shadow-md' : '',
            selected ? 'ring-2 ring-blue-500/60' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          draggable={false}
        />

        {/* مقبض التحجيم */}
        <button
          type="button"
          onMouseDown={onMouseDown}
          title="Resize"
          aria-label="Resize"
          className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow hover:bg-blue-700 cursor-ew-resize"
        >
          ↔
        </button>

        {/* شريط تحكّم صغير يظهر عند التحديد */}
        {selected && (
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white/95 dark:bg-zinc-900/95 backdrop-blur px-2 py-1 shadow">
            <label className="text-[10px] text-gray-600 dark:text-gray-300">
              W
            </label>
            <input
              type="range"
              min={20}
              max={100}
              step={5}
              value={width}
              onChange={(e) => updateAttributes({ width: Number(e.target.value) })}
            />
            <span className="text-[10px] w-10 text-right tabular-nums">
              {width}%
            </span>

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

/* ------------------------------------------------------------------ */
/*                          المكوّن الرئيسي                           */
/* ------------------------------------------------------------------ */

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

const insertImg = useCallback(
  (ed: Editor, url: string, altText?: string) => {
    ed
      .chain()
      .focus()
      // أرسل الخصائص القياسية فقط
      .setImage({ src: url, alt: altText ?? '' })
      // ثم عيّن خصائصك الإضافية بأمان
      .updateAttributes('image', { width: 60, align: 'center' as const })
      .run();
  },
  [],
);


  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextStyle,
      Color,
      FontSize,
      Link.configure({ autolink: true }),
      ResizableImage.configure({
        inline: false,
        allowBase64: true,
      }),
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
      CharacterCount.configure({ limit: 5000 }),
    ],
    content,
    onUpdate: ({ editor }) => setContent(editor.getHTML()),
    editorProps: {
      handleDrop(view: EditorView, ev) {
        const file = ev.dataTransfer?.files?.[0];
        if (file?.type.startsWith('image/')) {
          ev.preventDefault();
          (async () => {
            setUploading(true);
            try {
              const url = await uploadImage(file);
              insertImg(
                (view as unknown as { editor: Editor }).editor,
                url,
                file.name,
              );
            } finally {
              setUploading(false);
            }
          })();
          return true;
        }
        return false;
      },
      attributes: {
        class: [
          'focus:outline-none max-w-none',
          `min-h-[${minHeightPx}px]`,
          'p-3 rounded border',
          dark
            ? 'prose prose-invert bg-zinc-900/90 border-zinc-700'
            : 'prose bg-white border-zinc-300',
          'prose-base',
        ].join(' '),
      },
    },
    immediatelyRender: false,
  });

  // مزامنة خارجيّة
  useEffect(() => {
    if (editor && editor.getHTML() !== content) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  // لصق صورة من الحافظة
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = Array.from(e.clipboardData?.files ?? []).find((f) =>
        f.type.startsWith('image/'),
      );
      if (!file || !editor) return;
      e.preventDefault();
      setUploading(true);
      uploadImage(file)
        .then((url) => insertImg(editor, url, file.name))
        .finally(() => setUploading(false));
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [editor, insertImg]);

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

  const openDialog = () => fileInput.current?.click();

  return (
    <div
      className={`rounded-md border shadow ${
        dark ? 'bg-zinc-950/90 border-zinc-700' : 'bg-white border-zinc-300'
      }`}
    >
      {/* Toolbar */}
      <div
        className={`flex items-center gap-2 border-b px-3 py-2 sticky top-0 backdrop-blur z-10 ${
          dark ? 'bg-zinc-900/80 border-zinc-700' : 'bg-white/80 border-zinc-200'
        }`}
      >
        <EditorMenuBar
          editor={editor}
          onInsertImage={openDialog}
          uploadingImage={uploading}
        />
        <span
          className={`ml-auto text-xs ${
            editor.storage.characterCount.characters() > 5000
              ? 'text-red-600'
              : 'text-gray-500 dark:text-zinc-400'
          }`}
        >
          {editor.storage.characterCount.characters()} / 5000
        </span>
      </div>

      {/* Content */}
      <div className="px-3 py-2">
        <EditorContent editor={editor} />
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f || !editor) return;
          if (f.size > 5 * 1024 * 1024) return alert('Max 5 MB');
          setUploading(true);
          try {
            const url = await uploadImage(f);
            insertImg(editor, url, f.name);
          } finally {
            setUploading(false);
          }
        }}
      />
    </div>
  );
}
