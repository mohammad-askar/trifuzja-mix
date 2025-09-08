'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import Placeholder from '@tiptap/extension-placeholder';

interface Props {
  onChange: (html: string) => void;
}

export default function EditorContentClient({ onChange }: Props) {
  const editor = useEditor({
    content: '',
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Underline,
      Link,
      Image,
      Youtube,
      Placeholder.configure({
        placeholder: 'Write your content here...',
      }),
    ],
    editorProps: {
      attributes: {
        class: 'min-h-[300px] prose focus:outline-none p-4 bg-white rounded border',
      },
    },
  });

  if (!editor) return null;

  return <EditorContent editor={editor} />;
}
