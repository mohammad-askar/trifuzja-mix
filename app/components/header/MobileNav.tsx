// 📁 app/components/header/MobileNav.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';
import type { Locale, NavLink } from '../Header';

interface Props {
  locale: Locale;
  navLinks: NavLink[];
  badgeForArticles: ReactNode;
  isLoggedIn: boolean;
  tLogout: string;
  onSignOut: () => void;
  onNavigate: () => void;
  switchLang: (l: Locale) => void;
}

/**
 * SAFELY build a localized href.
 * Prevents:
 * - /undefined/...
 * - //double-slashes
 * - accidental bad concatenation
 */
function buildHref(locale: Locale | undefined, href: string) {
  const safeLocale: Locale = locale === 'pl' || locale === 'en' ? locale : 'en';
  const safeHref = href?.startsWith('/') ? href : `/${href ?? ''}`;
  return `/${safeLocale}${safeHref}`.replace(/\/{2,}/g, '/');
}

export default function MobileNav({
  locale,
  navLinks,
  badgeForArticles,
  isLoggedIn,
  tLogout,
  onSignOut,
  onNavigate,
  switchLang,
}: Props) {
  return (
    <nav className="flex flex-col gap-3 py-4 text-sm">
      {navLinks.map(({ href, label }) => (
        <Link
          key={href}
          href={buildHref(locale, href)}
          onClick={onNavigate}
          className="py-2"
        >
          {label} {href === '/articles' && badgeForArticles}
        </Link>
      ))}

      {isLoggedIn && (
        <button
          type="button"
          onClick={() => {
            onSignOut();
            onNavigate();
          }}
          className="text-left py-2"
        >
          {tLogout}
        </button>
      )}

      {/* language mobile */}
      <div className="flex gap-2 mt-3">
        {(['en', 'pl'] as Locale[]).map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => {
              switchLang(code);
              onNavigate();
            }}
            aria-pressed={locale === code}
            aria-label={`Switch language to ${code.toUpperCase()}`}
            className={`border px-2 py-1 rounded-md flex items-center gap-1
                        ${locale === code ? 'bg-blue-600' : 'bg-zinc-700'}`}
          >
            <Image src={`/flags/${code}.png`} alt={code} width={20} height={14} />
            {code.toUpperCase()}
          </button>
        ))}
      </div>
    </nav>
  );
}
