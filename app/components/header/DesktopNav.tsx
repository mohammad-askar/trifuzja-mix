// 📁 app/components/header/DesktopNav.tsx
'use client';

import Link from 'next/link';
import { LogOut } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';
import type { Locale, NavLink } from '../Header';

interface Props {
  locale: Locale;
  navLinks: NavLink[];
  linkClass: (href: string) => string;
  badgeForArticles: React.ReactNode;
  isLoggedIn: boolean;
  tLogout: string;
  onSignOut: () => void;
}

export default function DesktopNav({
  locale,
  navLinks,
  linkClass,
  badgeForArticles,
  isLoggedIn,
  tLogout,
  onSignOut,
}: Props) {
  return (
    <nav className="hidden sm:flex items-center gap-4 text-sm">
      {navLinks.map(({ href, label, icon: Icon }) => (
        <Link key={label} href={`/${locale}${href}`} className={linkClass(href)}>
          <Icon className="w-4 h-4" />
          {label}
          {href === '/articles' && badgeForArticles}
        </Link>
      ))}

      {isLoggedIn && (
        <button
          onClick={onSignOut}
          className="flex items-center gap-2 px-3 py-1 rounded-md transition
                     hover:bg-white/5 hover:text-blue-300
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
        >
          <LogOut className="w-4 h-4" />
          {tLogout}
        </button>
      )}

      <LanguageSwitcher locale={locale} />
    </nav>
  );
}
