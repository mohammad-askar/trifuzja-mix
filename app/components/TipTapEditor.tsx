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
import { EditorContent, useEditor, Editor } from '@tiptap/react';
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
import { lowlight } from 'lowlight';               // ✔️ لا خطأ Export

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

interface Props {
  content: string;
  setContent: Dispatch<SetStateAction<string>>;
  placeholder?: string;
  minHeightPx?: number;
  theme?: 'auto' | 'light' | 'dark';
}

/* رفع صورة وترجيع الرابط */
const uploadImage = async (file: File): Promise<string> => {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  const json: { url?: string; error?: string } = await res.json();
  if (!res.ok || !json.url) throw new Error(json.error || 'upload failed');
  return json.url;
};

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
    (ed: Editor, url: string, alt?: string) => ed.chain().focus().setImage({ src: url, alt }).run(),
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
      Image.configure({ HTMLAttributes: { class: 'my-3 rounded max-w-full mx-auto' } }),
      Placeholder.configure({ placeholder }),
      Highlight,
      HorizontalRule,
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: { class: 'my-3 rounded bg-zinc-900/90 text-zinc-100 p-3 text-sm overflow-x-auto' },
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

  /* مزامنة خارجيّة */
  useEffect(() => {
    if (editor && editor.getHTML() !== content) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  /* لصق صورة */
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith('image/'));
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
        <span className={dark ? 'text-zinc-400' : 'text-zinc-500'}>Loading…</span>
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
        <EditorMenuBar editor={editor} onInsertImage={openDialog} uploadingImage={uploading} />
        <span
          className={`ml-auto text-xs ${
            editor.storage.characterCount.characters() > 5000 ? 'text-red-600' : 'text-gray-500 dark:text-zinc-400'
          }`}
        >
          {editor.storage.characterCount.characters()} / 5000
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
          if (f.size > 5 * 1024 * 1024) return alert('Max 5 MB');
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
