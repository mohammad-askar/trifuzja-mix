// app/not-found.tsx  (Server Component — no hooks)
import Link from 'next/link';

export default function NotFoundGlobal() {
  // We don't infer locale here to avoid hydration issues.
  // Your localized 404 at app/[locale]/not-found.tsx will handle per-locale cases.
  // This global one just points users somewhere safe.

  return (
    <main className="min-h-[calc(100vh-64px)] bg-white-900 text-white">
      {/* Subtle background flair */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-blue-500/10 via-transparent to-transparent" />
      </div>

      <section className="mx-auto max-w-3xl px-4 pt-24 pb-16">
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gray-900/90 shadow-xl ring-1 ring-inset ring-white/10">
          {/* Header strip */}
          <div className="h-1 w-full bg-gradient-to-r from-rose-500 via-blue-500 to-emerald-500 opacity-60" />

          <div className="p-8 md:p-10">
            {/* Illustration */}
            <div className="mb-6 flex justify-center">
              <svg aria-hidden viewBox="0 0 200 120" className="h-20 w-40 opacity-80">
                <defs>
                  <linearGradient id="g" x1="0" x2="1">
                    <stop offset="0%" stopColor="#60a5fa" />
                    <stop offset="100%" stopColor="#34d399" />
                  </linearGradient>
                </defs>
                <rect x="18" y="20" width="164" height="80" rx="14" fill="url(#g)" opacity="0.15" />
                <rect x="38" y="38" width="124" height="64" rx="10" className="text-zinc-800" fill="currentColor" />
                <path d="M70 58h60v4H70zM70 70h36v4H70z" fill="#60a5fa" opacity=".7" />
              </svg>
            </div>

            <h1 className="text-center text-3xl font-extrabold tracking-tight">
              404 — Page not found
            </h1>
            <p className="mt-3 text-center text-sm text-zinc-400">
              We couldn’t find the page you were looking for.
            </p>

            {/* Actions */}
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {/* Point to English home/articles as a safe default */}
              <Link
                href="/en"
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
              >
                Home
                <span aria-hidden>↗</span>
              </Link>

              <Link
                href="/en/articles"
                className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-white/0 px-5 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/10"
              >
                Browse articles
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
