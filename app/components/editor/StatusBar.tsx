'use client';

export default function StatusBar({
  saving,
  dirty,
  dirtyCount,
  savedAtText,
  unsavedText,
}: {
  saving: boolean;
  dirty: boolean;
  dirtyCount: number;
  savedAtText: string | null; // e.g. "Saved 02:34:12" or null
  unsavedText: string;
}) {
  return (
    <div className="border-t pt-3 mt-2 text-xs text-gray-600 dark:text-gray-400">
      <div className="flex items-center gap-3">
        {saving && <span>Saving…</span>}
        {!saving && !dirty && savedAtText && <span>{savedAtText}</span>}
        {(dirtyCount > 0 || dirty) && <span className="text-orange-600">{unsavedText}</span>}
      </div>
    </div>
  );
}
