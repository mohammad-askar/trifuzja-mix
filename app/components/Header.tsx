// 📁 app/components/Header.tsx
'use client';

import {
  Home,
  Newspaper,
  User,
  LogIn,
  Menu,
  X,
  PlayCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import DesktopNav from './header/DesktopNav';
import MobileNav from './header/MobileNav';

/* ---------- Types ---------- */
export type Locale = 'en' | 'pl';
interface HeaderProps { locale: Locale }
export interface NavLink { href: string; label: string; icon: LucideIcon }

/* ---------- i18n ---------- */
const T: Record<Locale, Record<string,string>> = {
  en: { home:'Home', articles:'Articles', videos:'Videos', login:'Login', logout:'Logout', dashboard:'Dashboard' },
  pl: { home:'Strona główna', articles:'Artykuły', videos:'Wideo', login:'Zaloguj', logout:'Wyloguj', dashboard:'Panel' },
};

export default function Header({ locale }: HeaderProps) {
  const { data: session } = useSession();
  const pathname   = usePathname();
  const search     = useSearchParams();
  const router     = useRouter();

  const [menuOpen,setMenuOpen] = useState(false);
  const [scrolled,setScrolled] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const menuRef    = useRef<HTMLDivElement>(null);

  /* ---------- scroll shadow ---------- */
  useEffect(()=>{ const h=()=>setScrolled(window.scrollY>20);
    window.addEventListener('scroll',h); return()=>window.removeEventListener('scroll',h);
  },[]);

  /* ---------- click-outside (للقائمة الجوال) ---------- */
  useEffect(()=>{ const close=(e:MouseEvent)=>{
    if(menuOpen && menuRef.current&&!menuRef.current.contains(e.target as Node)
      &&menuBtnRef.current&&!menuBtnRef.current.contains(e.target as Node)) setMenuOpen(false);
  }; document.addEventListener('mousedown',close);
     return ()=>document.removeEventListener('mousedown',close);
  },[menuOpen]);

  /* ---------- esc ---------- */
  useEffect(()=>{ const esc=(e:KeyboardEvent)=>{ if(e.key==='Escape'){setMenuOpen(false);} };
    window.addEventListener('keydown',esc); return()=>window.removeEventListener('keydown',esc);
  },[]);

  /* ---------- language switch ---------- */
  const switchLang=(l:Locale)=>{
    localStorage.setItem('preferredLocale',l);
    const stripped=pathname.replace(/^\/(en|pl)/,'');
    router.push(`/${l}${stripped||''}`);
  };

  const t=T[locale];

  /* ---------- nav links ---------- */
  const raw: (NavLink | false)[] = [
    { href: '',            label: t.home,     icon: Home },
    { href: '/articles',   label: t.articles, icon: Newspaper },
    { href: '/videos',     label: t.videos,   icon: PlayCircle }, // ✅ جديد
    session ? { href: '/admin/dashboard', label: t.dashboard, icon: User } : false,
    !session ? { href: '/login', label: t.login, icon: LogIn } : false,
  ];
  const navLinks: NavLink[] = raw.filter(Boolean) as NavLink[];

  /* ---------- helpers ---------- */
  const relPath = pathname.replace(`/${locale}`,'') || '/';
  const linkClass=(href:string)=>{
    const active = href==='' ? relPath==='/' : relPath.startsWith(href);
    return `flex items-center gap-2 px-3 py-1 rounded-md transition
      ${active?'bg-white/10 text-blue-400':'hover:bg-white/5 hover:text-blue-300'}`;
  };

  /* ---------- current FB page badge ---------- */
  const currentPage = search.get('page');   // health | diy | travel | null
  const badge = currentPage
    ? <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-700 uppercase">
        {currentPage}
      </span>
    : null;

  /* ---------- sign out ---------- */
  const handleSignOut = () => signOut({ callbackUrl: `/${locale}` });

  /* ---------- JSX ---------- */
  return (
    <header className={`fixed inset-x-0 top-0 z-50 h-16 backdrop-blur border-b transition-colors
        ${scrolled ? 'bg-gray-900/90 text-gray-300 border-gray-700 shadow-md'
                   : 'bg-gray-900/90 text-gray-300 border-transparent'}`}>
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3 h-16">
        {/* logo */}
        <Link href={`/${locale}`} className="flex items-center gap-2 group">
          <Image src="/images/logo.png" alt="Logo" width={40} height={40}
                 className="rounded-md group-hover:opacity-80 transition" />
          <span className="text-white font-semibold text-lg group-hover:translate-x-1 transition">
            Initiativa Autonoma
          </span>
        </Link>

        {/* mobile toggle */}
        <button ref={menuBtnRef} onClick={()=>setMenuOpen(!menuOpen)} aria-label="Toggle menu"
                className="sm:hidden text-white">
          {menuOpen ? <X className="w-6 h-6"/> : <Menu className="w-6 h-6"/>}
        </button>

        {/* desktop nav */}
        <DesktopNav
          locale={locale}
          navLinks={navLinks}
          linkClass={linkClass}
          badgeForArticles={badge}
          isLoggedIn={!!session}
          tLogout={t.logout}
          onSignOut={handleSignOut}
        />
      </div>

      {/* mobile nav */}
      <div ref={menuRef}
           className={`sm:hidden overflow-hidden transition-all duration-300
             ${menuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0 -translate-y-2'}
             bg-gray-900/90 backdrop-blur px-4`}>
        <MobileNav
          locale={locale}
          navLinks={navLinks}
          badgeForArticles={badge}
          isLoggedIn={!!session}
          tLogout={t.logout}
          onSignOut={()=>{ handleSignOut(); setMenuOpen(false); }}
          onNavigate={()=>setMenuOpen(false)}
          switchLang={switchLang}
        />
      </div>
    </header>
  );
}
