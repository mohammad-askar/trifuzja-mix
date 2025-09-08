//E:\trifuzja-mix\app\components\EditorMenuBar.tsx
'use client';
import { Editor } from '@tiptap/react';

export interface EditorMenuBarProps {
  editor: Editor | null;
  onInsertImage?: () => void;
  uploadingImage?: boolean;
}

const FONT_SIZES = ['12px','14px','16px','18px','20px','24px','28px','32px'];
const COLORS = [
  '#000000','#1f2937','#374151','#2563eb','#059669',
  '#f59e0b','#dc2626','#7c3aed','#9333ea','#f97316',
  '#ffffff'
];

export default function EditorMenuBar({
  editor,
  onInsertImage,
  uploadingImage = false,
}: EditorMenuBarProps) {
  if (!editor) return null;

  const run = (fn: () => boolean) => {
    editor.chain().focus();
    fn();
  };

  const Btn = ({
    active,
    onClick,
    label,
    title,
    disabled,
  }: {
    active?: boolean;
    onClick: () => void;
    label: string;
    title?: string;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`px-2 py-1 text-xs rounded border transition
        ${
          active
            ? 'bg-blue-600 border-blue-600 text-white'
            : 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700'
        } disabled:opacity-40`}
    >
      {label}
    </button>
  );

  const Divider = () => <span className="w-px h-6 bg-zinc-700 mx-1" />;

  const isInLink = editor.isActive('link');

  /* ---------- Helpers ---------- */
  const currentFontSize =
    (editor.getAttributes('textStyle')?.fontSize as string | undefined) || '';
  const currentColor =
    (editor.getAttributes('textStyle')?.color as string | undefined) || '';

  const applyFontSize = (size: string) => {
    if (size === 'unset') run(() => editor.commands.unsetFontSize());
    else run(() => editor.commands.setFontSize(size));
  };

  const applyColor = (color: string) => {
    if (color === 'unset') {
      run(() => editor.chain().setColor('').removeEmptyTextStyle().run());
    } else {
      run(() => editor.chain().setColor(color).run());
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Headings */}
      <Btn
        label="H1"
        active={editor.isActive('heading', { level: 1 })}
        onClick={() => run(() => editor.chain().focus().toggleHeading({ level: 1 }).run())}
        title="Heading 1"
      />
      <Btn
        label="H2"
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => run(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}
        title="Heading 2"
      />
      <Btn
        label="H3"
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => run(() => editor.chain().focus().toggleHeading({ level: 3 }).run())}
        title="Heading 3"
      />
      <Divider />

      {/* Marks */}
      <Btn
        label="B"
        active={editor.isActive('bold')}
        onClick={() => run(() => editor.chain().focus().toggleBold().run())}
        title="Bold"
      />
      <Btn
        label="I"
        active={editor.isActive('italic')}
        onClick={() => run(() => editor.chain().focus().toggleItalic().run())}
        title="Italic"
      />
      <Btn
        label="U"
        active={editor.isActive('underline')}
        onClick={() => run(() => editor.chain().focus().toggleUnderline().run())}
        title="Underline"
      />
      <Divider />

      {/* Lists */}
      <Btn
        label="•"
        active={editor.isActive('bulletList')}
        onClick={() => run(() => editor.chain().focus().toggleBulletList().run())}
        title="Bullet List"
      />
      <Btn
        label="1."
        active={editor.isActive('orderedList')}
        onClick={() => run(() => editor.chain().focus().toggleOrderedList().run())}
        title="Numbered List"
      />
      <Divider />

      {/* Image */}
      <Btn
        label={uploadingImage ? 'Img…' : 'Img'}
        onClick={() => onInsertImage?.()}
        disabled={uploadingImage}
        title="Insert Image"
      />

      {/* Link */}
      <Btn
        label="Link"
        disabled={isInLink}
        onClick={() => {
          const url = prompt('Enter URL (https://)');
          if (!url) return;
          run(() =>
            editor
              .chain()
              .focus()
              .extendMarkRange('link')
              .setLink({ href: url })
              .run(),
          );
        }}
        title="Insert Link"
      />
      {isInLink && (
        <Btn
          label="Unlink"
          onClick={() => run(() => editor.chain().focus().unsetLink().run())}
          title="Remove Link"
        />
      )}
      <Divider />

      {/* Font Size Selector */}
      <div className="relative">
        <select
          className="text-xs rounded border border-zinc-700 bg-zinc-800 text-zinc-200 px-1 py-[2px]"
          value={currentFontSize || ''}
          onChange={(e) => applyFontSize(e.target.value || 'unset')}
          title="Font size"
        >
          <option value="">Size</option>
          {FONT_SIZES.map(fs => (
            <option key={fs} value={fs}>{fs}</option>
          ))}
          <option value="unset">Reset</option>
        </select>
      </div>

      {/* Color Selector */}
      <div className="relative">
        <select
          className="text-xs rounded border border-zinc-700 bg-zinc-800 text-zinc-200 px-1 py-[2px]"
          value={currentColor || ''}
          onChange={(e) => applyColor(e.target.value || 'unset')}
          title="Text color"
        >
          <option value="">Color</option>
          {COLORS.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
          <option value="unset">Reset</option>
        </select>
      </div>

      {/* Color swatches (اختياري) */}
      {/* تستطيع إزالة هذه المجموعة لو تريد بساطة */}
      <div className="flex gap-1">
        {COLORS.slice(0,6).map(c => (
          <button
            key={c}
            type="button"
            onClick={() => applyColor(c)}
            title={c}
            className={`w-4 h-4 rounded border border-zinc-600`}
            style={{ backgroundColor: c }}
          />
        ))}
        <button
          type="button"
          onClick={() => applyColor('unset')}
          title="Reset color"
          className="w-4 h-4 rounded border border-zinc-600 text-[10px] flex items-center justify-center bg-white font-bold"
        >
          ×
        </button>
      </div>

      <Divider />

      {/* History */}
      <Btn
        label="↶"
        title="Undo"
        onClick={() => run(() => editor.chain().focus().undo().run())}
      />
      <Btn
        label="↷"
        title="Redo"
        onClick={() => run(() => editor.chain().focus().redo().run())}
      />
      <Divider />

      {/* Clear */}
      <Btn
        label="Clear"
        title="Clear formatting"
        onClick={() =>
          run(() =>
            editor
              .chain()
              .focus()
              .clearNodes()
              .unsetAllMarks()
              .run(),
          )
        }
      />
    </div>
  );
}
