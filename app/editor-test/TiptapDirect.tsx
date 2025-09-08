'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

export function TiptapEditor() {
  const editor = useEditor({
    content: '<p>Hello world!</p>',
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start writing here...',
      }),
    ],
  });

  if (!editor) return null;

  return (
    <div className="border p-4 bg-white rounded">
      <EditorContent editor={editor} />
    </div>
  );
}
