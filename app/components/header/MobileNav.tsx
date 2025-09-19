// 📁 app/components/header/MobileNav.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { Locale, NavLink } from '../Header';

interface Props {
  locale: Locale;
  navLinks: NavLink[];
  badgeForArticles: React.ReactNode;
  isLoggedIn: boolean;
  tLogout: string;
  onSignOut: () => void;
  onNavigate: () => void;
  switchLang: (l: Locale) => void;
}

export default function MobileNav({
  locale, navLinks, badgeForArticles, isLoggedIn, tLogout, onSignOut, onNavigate, switchLang,
}: Props) {
  return (
    <nav className="flex flex-col gap-3 py-4 text-sm">
      {navLinks.map(({href,label})=>(
        <Link key={label} href={`/${locale}${href}`} onClick={onNavigate} className="py-2">
          {label} {href==='/articles' && badgeForArticles}
        </Link>
      ))}

      {isLoggedIn && (
        <button onClick={onSignOut} className="text-left py-2">
          {tLogout}
        </button>
      )}

      {/* language mobile */}
      <div className="flex gap-2 mt-3">
        {(['en','pl'] as Locale[]).map(code=>(
          <button key={code} onClick={()=>{switchLang(code); onNavigate();}}
                  className={`border px-2 py-1 rounded-md flex items-center gap-1
                              ${locale===code ? 'bg-blue-600' : 'bg-zinc-700'}`}>
            <Image src={`/flags/${code}.png`} alt={code} width={20} height={14}/>
            {code.toUpperCase()}
          </button>
        ))}
      </div>
    </nav>
  );
}
