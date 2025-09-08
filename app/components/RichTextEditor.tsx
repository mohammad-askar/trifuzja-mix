// components/RichTextEditor.tsx
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import Image from '@tiptap/extension-image';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';

export default function RichTextEditor() {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Heading.configure({ levels: [2, 3] }),
      TextStyle,
      Color,
      Image,
    ],
    content: '<p>Your content…</p>',
  });

  return <EditorContent editor={editor} className="rounded-b-md bg-zinc-900" />;
}
