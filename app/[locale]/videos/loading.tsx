// app/[locale]/videos/loading.tsx
export default function LoadingVideos() {
  return (
    <main className="max-w-6xl mx-auto px-4 pt-24 pb-20">
      <div className="h-7 w-40 rounded bg-zinc-800/70 mb-6 animate-pulse" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-zinc-800 p-3">
            <div className="aspect-video rounded-lg bg-zinc-800/70 animate-pulse" />
            <div className="mt-3 h-5 w-3/4 rounded bg-zinc-800/70 animate-pulse" />
            <div className="mt-2 h-4 w-2/3 rounded bg-zinc-800/70 animate-pulse" />
          </div>
        ))}
      </div>
    </main>
  );
}
