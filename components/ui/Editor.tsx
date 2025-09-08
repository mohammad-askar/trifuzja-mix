'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const EditorContentClient = dynamic(() => import('./EditorContentClient'), { ssr: false });

interface Props {
  onChange: (html: string) => void;
}

export default function Editor({ onChange }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <EditorContentClient onChange={onChange} />;
}
