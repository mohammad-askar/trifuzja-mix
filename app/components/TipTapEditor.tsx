/* eslint-disable @next/next/no-img-element */
// cSpell:ignore lowlight
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  useEditor, EditorContent,
} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { lowlight } from 'lowlight';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import CharacterCount from '@tiptap/extension-character-count';
import Paragraph from '@tiptap/extension-paragraph';
import Heading from '@tiptap/extension-heading';

import { FontSize } from './editor/extensions/FontSize';
import EditorMenuBar from './EditorMenuBar';
import { ResizableImage } from './editor/extensions/resizable-image';
import { uploadImage } from './editor/utils/image';
import CropModal from './editor/cropper/CropModal';
import { useIsMobile } from './editor/hooks/useIsMobile';

type Props = {
  content: string;
  setContent: React.Dispatch<React.SetStateAction<string>>;
  placeholder?: string;
  minHeightPx?: number;
  theme?: 'auto' | 'light' | 'dark';
};

const readNumber = (re: RegExp, style = '') =>
  (style.match(re)?.[1] ? Math.round(parseFloat(style.match(re)![1])) : 0);

const IndentableParagraph = Paragraph.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      indent: {
        default: 0,
        parseHTML: (el: HTMLElement) => {
          const data = el.getAttribute('data-indent');
          if (data) return parseInt(data, 10) || 0;
          const style = el.getAttribute('style') ?? '';
          return readNumber(/text-indent:\s*([\d.]+)em/i, style);
        },
        renderHTML: (attrs: { indent?: number }) => {
          const i = attrs.indent ?? 0;
          return { 'data-indent': String(i), style: `text-indent:${i}em;margin-left:0;padding-left:0;` };
        },
      },
    };
  },
});

const IndentableHeading = Heading.extend({
  addOptions() { return { ...this.parent?.(), levels: [1, 2, 3] }; },
  addAttributes() {
    return {
      ...this.parent?.(),
      indent: {
        default: 0,
        parseHTML: (el: HTMLElement) => {
          const data = el.getAttribute('data-indent');
          if (data) return parseInt(data, 10) || 0;
          const style = el.getAttribute('style') ?? '';
          return readNumber(/margin-left:\s*([\d.]+)em/i, style);
        },
        renderHTML: (attrs: { indent?: number }) => {
          const i = attrs.indent ?? 0;
          return { 'data-indent': String(i), style: `margin-left:${i}em;` };
        },
      },
    };
  },
});

export default function TipTapEditor({
  content, setContent, placeholder = 'Write something…', minHeightPx = 260, theme = 'auto',
}: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(
      theme === 'auto'
        ? typeof window !== 'undefined' && document.documentElement.classList.contains('dark')
        : theme === 'dark',
    );
  }, [theme]);

  // ========== حالة مودال القص ==========
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const pendingFileRef = useRef<File | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, paragraph: false }),
      IndentableParagraph,
      IndentableHeading,
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
        HTMLAttributes: { class: 'my-3 rounded bg-zinc-900/90 text-zinc-100 p-3 text-sm overflow-x-auto' },
      }),
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell,
      CharacterCount.configure({ limit: 50000 }),
    ],
    content,
    onUpdate: ({ editor: ed }) => setContent(ed.getHTML()),
    editorProps: {
      attributes: {
        class: 'tiptap prose dark:prose-invert max-w-none focus:outline-none p-3 md:p-4',
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

  // إدراج صورة — نجعل العرض أصغر على الهاتف
  const insertImg = useCallback((url: string, altText?: string) => {
    if (!editor || editor.isDestroyed) return;
    const initialWidth = isMobile ? 90 : 40; // ✅ على الهاتف أعرض 90%، وعلى الديسكتوب 40%
    editor
      .chain()
      .focus()
      .setImage({ src: url, alt: altText ?? '' })
      .updateAttributes('image', { width: initialWidth, align: isMobile ? 'center' : 'inline' })
      .run();
  }, [editor, isMobile]);

  const openCropper = useCallback((file: File) => {
    pendingFileRef.current = file;
    setCropSrc(URL.createObjectURL(file));
  }, []);

  const handleImageUpload = useCallback(async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert('Max file size is 5 MB');
      return;
    }
    openCropper(file);
  }, [openCropper]);

  // لصق الصور من الحافظة
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith('image/'));
      if (file) {
        e.preventDefault();
        handleImageUpload(file);
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [handleImageUpload]);

  // مزامنة المحتوى الخارجي
  useEffect(() => {
    if (editor && !editor.isDestroyed && editor.getHTML() !== content) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  if (!editor) {
    return (
      <div className={`flex items-center justify-center h-32 rounded border ${dark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-300'}`}>
        <span className={dark ? 'text-zinc-400' : 'text-zinc-500'}>Loading…</span>
      </div>
    );
  }

  return (
    <div className={`rounded-md border shadow ${dark ? 'bg-zinc-900/90 border-zinc-700' : 'bg-white border-zinc-300'}`}>
      <EditorMenuBar
        editor={editor}
        onInsertImage={() => fileInput.current?.click()}
        uploadingImage={false}
      />

      <div className="p-1">
        <div style={{ minHeight: minHeightPx }} className={`rounded border ${dark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-300'}`}>
          <EditorContent editor={editor} />
        </div>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]); }}
      />

      {/* مودال القص — Responsive مع cropSize أصغر على الهاتف */}
      {cropSrc && (
        <CropModal
          src={cropSrc}
          open={true}
          aspect={16 / 9}
          onCancel={() => { setCropSrc(null); pendingFileRef.current = null; }}
          onInsertOriginal={async () => {
            if (!pendingFileRef.current) return;
            const url = await uploadImage(pendingFileRef.current);
            insertImg(url, pendingFileRef.current.name);
            setCropSrc(null);
            pendingFileRef.current = null;
          }}
          onCropDone={async (blob) => {
            const file = new File([blob], 'crop.jpg', { type: 'image/jpeg' });
            const url = await uploadImage(file);
            insertImg(url, pendingFileRef.current?.name);
            setCropSrc(null);
            pendingFileRef.current = null;
          }}
        />
      )}
    </div>
  );
}
