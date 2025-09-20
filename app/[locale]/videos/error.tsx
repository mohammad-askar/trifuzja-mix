//E:\trifuzja-mix\app\[locale]\videos\error.tsx
'use client';

export default function ErrorVideos({ error }: { error: Error & { digest?: string } }) {
  return (
    <main className="max-w-6xl mx-auto px-4 pt-24 pb-20">
      <h1 className="text-3xl font-bold mb-4">Oops!</h1>
      <p className="text-zinc-400">Something went wrong while loading videos.</p>
      <pre className="mt-4 rounded bg-zinc-900 p-3 text-xs text-zinc-400 overflow-auto">
        {error.message}
      </pre>
    </main>
  );
}
