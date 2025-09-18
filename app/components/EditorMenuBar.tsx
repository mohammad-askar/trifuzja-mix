// 📁 app/components/EditorMenuBar.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';

export interface EditorMenuBarProps {
  editor: Editor | null;
  onInsertImage?: () => void;
  uploadingImage?: boolean;
  onSave?: () => void;
  saving?: boolean;
  /** Minimum spacing from very top if no header is found */
  stickyTopPx?: number;
  /** CSS selector to detect your fixed header and offset under it */
  offsetSelector?: string; // e.g. '#site-header' or '.app-navbar'
}

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'] as const;
const COLORS = [
  '#000000','#1f2937','#374151','#2563eb','#059669',
  '#f59e0b','#dc2626','#7c3aed','#9333ea','#f97316','#ffffff',
] as const;

type FontSize = (typeof FONT_SIZES)[number];
type HexColor = (typeof COLORS)[number];

export default function EditorMenuBar({
  editor,
  onInsertImage,
  uploadingImage = false,
  onSave,
  saving = false,
  stickyTopPx = 12,
  offsetSelector = '#site-header, header, nav, [data-sticky-header]',
}: EditorMenuBarProps) {
  /** ---------- Sticky + Mini Dock ---------- */
  const barRef = useRef<HTMLDivElement | null>(null);
  const [showMini, setShowMini] = useState<boolean>(false);

  // dynamic top offset so the bar sits under the real header
  const [computedTop, setComputedTop] = useState<number>(stickyTopPx);

  useEffect(() => {
    const header = document.querySelector(offsetSelector) as HTMLElement | null;

    const calc = () => {
      if (!header) {
        setComputedTop(stickyTopPx);
        return;
      }
      const h = header.getBoundingClientRect().height || 0;
      // add a small gap so the bar breathes under the header
      setComputedTop(h + 8);
    };

    calc();

    const ro = header ? new ResizeObserver(calc) : null;
    if (header && ro) ro.observe(header);
    window.addEventListener('resize', calc);

    return () => {
      window.removeEventListener('resize', calc);
      ro?.disconnect();
    };
  }, [offsetSelector, stickyTopPx]);

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => setShowMini(!entries[0].isIntersecting),
      { threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /** ---------- Helpers/Buttons ---------- */
  const run = (fn: () => void) => {
    if (!editor) return;
    editor.chain().focus();
    fn();
  };

  const Btn: React.FC<{
    active?: boolean;
    onClick: () => void;
    label: string;
    title?: string;
    disabled?: boolean;
  }> = ({ active, onClick, label, title, disabled }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !editor}
      title={title}
      className={`px-2 py-1 text-xs rounded border transition ${
        active
          ? 'bg-blue-600 border-blue-600 text-white'
          : 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700'
      } disabled:opacity-40`}
    >
      {label}
    </button>
  );

  const Divider: React.FC = () => <span className="w-px h-6 bg-zinc-700 mx-1" />;

  const isInLink = !!editor && editor.isActive('link');
  const isImageSelected = !!editor && editor.isActive('image');

  const currentFontSize =
    (editor?.getAttributes('textStyle')?.fontSize as string | undefined) || '';
  const currentColor =
    (editor?.getAttributes('textStyle')?.color as string | undefined) || '';

  const applyFontSize = (size: string) => {
    if (!editor) return;
    if (size === 'unset') run(() => editor.commands.unsetFontSize());
    else run(() => editor.commands.setFontSize(size as FontSize));
  };

  const applyColor = (color: string) => {
    if (!editor) return;
    if (color === 'unset') {
      run(() => editor.chain().setColor('').removeEmptyTextStyle().run());
    } else {
      run(() => editor.chain().setColor(color as HexColor).run());
    }
  };

  const canUndo = !!editor && editor.can().undo();
  const canRedo = !!editor && editor.can().redo();

  const setImageAlign = (align: 'left' | 'center' | 'right') => {
    if (!editor) return;
    run(() => editor.chain().updateAttributes('image', { align }).run());
  };

  /** ---------- Mini Dock ---------- */
  const MiniDock: React.FC = () => (
    <div className="fixed bottom-6 right-6 z-[1100]">
      <div className="flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-900/95 backdrop-blur px-2 py-1 shadow-lg">
        <Btn label="B" title="Bold" active={!!editor && editor.isActive('bold')} onClick={() => run(() => editor!.chain().toggleBold().run())} />
        <Btn label="I" title="Italic" active={!!editor && editor.isActive('italic')} onClick={() => run(() => editor!.chain().toggleItalic().run())} />
        <Btn label="U" title="Underline" active={!!editor && editor.isActive('underline')} onClick={() => run(() => editor!.chain().toggleUnderline().run())} />
        <Divider />
        <Btn label="•" title="Bullet List" active={!!editor && editor.isActive('bulletList')} onClick={() => run(() => editor!.chain().toggleBulletList().run())} />
        <Btn label="1." title="Numbered List" active={!!editor && editor.isActive('orderedList')} onClick={() => run(() => editor!.chain().toggleOrderedList().run())} />
        <Divider />
        <Btn
          label="Link"
          title="Insert Link"
          disabled={!editor || isInLink}
          onClick={() => {
            const url = window.prompt('Enter URL (https://)');
            if (!url) return;
            run(() => editor!.chain().extendMarkRange('link').setLink({ href: url }).run());
          }}
        />
        <Btn label={uploadingImage ? 'Img…' : 'Img'} title="Insert Image" onClick={() => onInsertImage?.()} disabled={uploadingImage || !editor} />
        <Divider />
        <Btn label="↶" title="Undo" disabled={!canUndo} onClick={() => run(() => editor!.chain().undo().run())} />
        <Btn label="↷" title="Redo" disabled={!canRedo} onClick={() => run(() => editor!.chain().redo().run())} />
        {onSave && (
          <>
            <Divider />
            <button
              type="button"
              title={saving ? 'Saving…' : 'Save'}
              onClick={onSave}
              disabled={saving}
              className="px-3 py-1 text-xs rounded-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </>
        )}
      </div>
    </div>
  );

  /** ---------- UI ---------- */
  return (
    <>
      {/* Sticky toolbar under the header */}
      <div
        ref={barRef}
        className="sticky z-[1000] rounded-lg border border-zinc-700 bg-zinc-900/95 backdrop-blur px-2 py-2 shadow-sm"
        style={{ top: computedTop }}
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* Headings */}
          <Btn label="H1" active={!!editor && editor.isActive('heading', { level: 1 })} onClick={() => run(() => editor!.chain().toggleHeading({ level: 1 }).run())} title="Heading 1" />
          <Btn label="H2" active={!!editor && editor.isActive('heading', { level: 2 })} onClick={() => run(() => editor!.chain().toggleHeading({ level: 2 }).run())} title="Heading 2" />
          <Btn label="H3" active={!!editor && editor.isActive('heading', { level: 3 })} onClick={() => run(() => editor!.chain().toggleHeading({ level: 3 }).run())} title="Heading 3" />
          <Divider />

          {/* Marks */}
          <Btn label="B" active={!!editor && editor.isActive('bold')} onClick={() => run(() => editor!.chain().toggleBold().run())} title="Bold" />
          <Btn label="I" active={!!editor && editor.isActive('italic')} onClick={() => run(() => editor!.chain().toggleItalic().run())} title="Italic" />
          <Btn label="U" active={!!editor && editor.isActive('underline')} onClick={() => run(() => editor!.chain().toggleUnderline().run())} title="Underline" />
          <Divider />

          {/* Lists */}
          <Btn label="•" active={!!editor && editor.isActive('bulletList')} onClick={() => run(() => editor!.chain().toggleBulletList().run())} title="Bullet List" />
          <Btn label="1." active={!!editor && editor.isActive('orderedList')} onClick={() => run(() => editor!.chain().toggleOrderedList().run())} title="Numbered List" />
          <Divider />

          {/* Image */}
          <Btn label={uploadingImage ? 'Img…' : 'Img'} onClick={() => onInsertImage?.()} disabled={uploadingImage || !editor} title="Insert Image" />

          {/* Image tools */}
          {isImageSelected && (
            <div className="flex items-center gap-1">
              <Btn label="L" title="Align image left" onClick={() => setImageAlign('left')} active={editor!.getAttributes('image')?.align === 'left'} />
              <Btn label="C" title="Align image center" onClick={() => setImageAlign('center')} active={editor!.getAttributes('image')?.align === 'center'} />
              <Btn label="R" title="Align image right" onClick={() => setImageAlign('right')} active={editor!.getAttributes('image')?.align === 'right'} />
            </div>
          )}
          <Divider />

          {/* Link */}
          <Btn
            label="Link"
            disabled={!editor || isInLink}
            onClick={() => {
              const url = window.prompt('Enter URL (https://)');
              if (!url) return;
              run(() => editor!.chain().extendMarkRange('link').setLink({ href: url }).run());
            }}
            title="Insert Link"
          />
          {isInLink && <Btn label="Unlink" onClick={() => run(() => editor!.chain().unsetLink().run())} title="Remove Link" />}
          <Divider />

          {/* Font size */}
          <div className="relative">
            <select
              className="text-xs rounded border border-zinc-700 bg-zinc-800 text-zinc-200 px-1 py-[2px]"
              value={currentFontSize}
              onChange={(e) => applyFontSize(e.target.value || 'unset')}
              title="Font size"
              disabled={!editor}
            >
              <option value="">Size</option>
              {FONT_SIZES.map((fs) => (
                <option key={fs} value={fs}>
                  {fs}
                </option>
              ))}
              <option value="unset">Reset</option>
            </select>
          </div>

          {/* Color */}
          <div className="relative">
            <select
              className="text-xs rounded border border-zinc-700 bg-zinc-800 text-zinc-200 px-1 py-[2px]"
              value={currentColor}
              onChange={(e) => applyColor(e.target.value || 'unset')}
              title="Text color"
              disabled={!editor}
            >
              <option value="">Color</option>
              {COLORS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="unset">Reset</option>
            </select>
          </div>

          <div className="flex gap-1">
            {COLORS.slice(0, 6).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => applyColor(c)}
                title={c}
                className="w-4 h-4 rounded border border-zinc-600"
                style={{ backgroundColor: c }}
                disabled={!editor}
              />
            ))}
            <button
              type="button"
              onClick={() => applyColor('unset')}
              title="Reset color"
              className="w-4 h-4 rounded border border-zinc-600 text-[10px] flex items-center justify-center bg-white font-bold disabled:opacity-40"
              disabled={!editor}
            >
              ×
            </button>
          </div>

          <Divider />

          {/* History */}
          <Btn label="↶" title="Undo" disabled={!canUndo} onClick={() => run(() => editor!.chain().undo().run())} />
          <Btn label="↷" title="Redo" disabled={!canRedo} onClick={() => run(() => editor!.chain().redo().run())} />

          {onSave && (
            <>
              <Divider />
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="px-3 py-1 text-xs rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                title={saving ? 'Saving…' : 'Save'}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          )}

          <Divider />

          {/* Clear */}
          <Btn
            label="Clear"
            title="Clear formatting"
            onClick={() => run(() => editor!.chain().clearNodes().unsetAllMarks().run())}
          />
        </div>
      </div>

      {showMini && <MiniDock />}
    </>
  );
}
