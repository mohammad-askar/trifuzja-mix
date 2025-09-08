'use client';

import { useEffect, useState } from 'react';

export default function EditorTest() {
  const [Editor, setEditor] = useState<React.ReactNode>(null);

  useEffect(() => {
    import('./TiptapDirect').then((mod) => {
      setEditor(<mod.TiptapEditor />);
    });
  }, []);

  return (
    <main className="p-10">
      <h1 className="text-2xl font-bold mb-4">Editor Test</h1>
      {Editor}
    </main>
  );
}
