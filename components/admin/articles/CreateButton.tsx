// 📁 E:\trifuzja-mix\components\admin\articles\CreateButton.tsx
'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function CreateButton({ locale }: { locale: string }) {
  return (
    <Link href={`/${locale}/admin/articles/new`}>
      <Button size="sm" className="flex items-center gap-1">
        <Plus className="w-4 h-4" /> New
      </Button>
    </Link>
  );
}
