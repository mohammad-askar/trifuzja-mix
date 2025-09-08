// 📁 app/components/Header.tsx
// 🔧 رأس الموقع بعد إزالة رابط “Categories” وإظهار الشارة حسب صفحة Facebook المختارة

'use client';

import {
  Home,
  Newspaper,
  User,
  LogIn,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/* ---------- Types ---------- */
type Locale = 'en' | 'pl';
interface HeaderProps { locale: Locale }
interface NavLink { href: string; label: string; icon: LucideIcon }

/* ---------- i18n ---------- */
const T: Record<Locale, Record<string,string>> = {
  en: { home:'Home', articles:'Articles', login:'Login', logout:'Logout', dashboard:'Dashboard' },
  pl: { home:'Strona główna', articles:'Artykuły', login:'Zaloguj', logout:'Wyloguj', dashboard:'Panel' },
};

/* ---------- Component ---------- */
export default function Header({ locale }: HeaderProps) {
  const { data: session } = useSession();
  const pathname   = usePathname();
  const search     = useSearchParams();
  const router     = useRouter();

  const [menuOpen,setMenuOpen] = useState(false);
  const [langOpen,setLangOpen] = useState(false);
  const [scrolled,setScrolled] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const menuRef    = useRef<HTMLDivElement>(null);
  const langRef    = useRef<HTMLDivElement>(null);

  /* ---------- scroll shadow ---------- */
  useEffect(()=>{ const h=()=>setScrolled(window.scrollY>20);
    window.addEventListener('scroll',h); return()=>window.removeEventListener('scroll',h);
  },[]);

  /* ---------- click‑outside ---------- */
  useEffect(()=>{ const close=(e:MouseEvent)=>{
    if(menuOpen && menuRef.current&&!menuRef.current.contains(e.target as Node)
      &&menuBtnRef.current&&!menuBtnRef.current.contains(e.target as Node)) setMenuOpen(false);
    if(langOpen && langRef.current&&!langRef.current.contains(e.target as Node)) setLangOpen(false);
  }; document.addEventListener('mousedown',close);
     return ()=>document.removeEventListener('mousedown',close);
  },[menuOpen,langOpen]);

  /* ---------- esc ---------- */
  useEffect(()=>{ const esc=(e:KeyboardEvent)=>{ if(e.key==='Escape'){setMenuOpen(false);setLangOpen(false);} };
    window.addEventListener('keydown',esc); return()=>window.removeEventListener('keydown',esc);
  },[]);

  /* ---------- language switch ---------- */
  const switchLang=(l:Locale)=>{
    localStorage.setItem('preferredLocale',l);
    const stripped=pathname.replace(/^\/(en|pl)/,'');
    router.push(`/${l}${stripped||''}`);
  };

  const t=T[locale];

  /* ---------- nav links (بدون Categories) ---------- */
/* ---------- nav links ---------- */
const raw: (NavLink | false)[] = [
  { href: '',            label: t.home,     icon: Home },
  { href: '/articles',   label: t.articles, icon: Newspaper },
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
            Trifuzja Mix
          </span>
        </Link>

        {/* mobile toggle */}
        <button ref={menuBtnRef} onClick={()=>setMenuOpen(!menuOpen)} aria-label="Toggle menu"
                className="sm:hidden text-white">
          {menuOpen ? <X className="w-6 h-6"/> : <Menu className="w-6 h-6"/>}
        </button>

        {/* desktop nav */}
        <nav className="hidden sm:flex items-center gap-4 text-sm">
          {navLinks.map(({href,label,icon:Icon})=>(
            <Link key={label} href={`/${locale}${href}`} className={linkClass(href)}>
              <Icon className="w-4 h-4"/>{label}
              {href==='/articles' && badge}
            </Link>
          ))}

          {session && (
            <button onClick={()=>signOut({callbackUrl:`/${locale}`})}
                    className="flex items-center gap-2 px-3 py-1 rounded-md hover:bg-white/5 transition">
              <LogOut className="w-4 h-4"/>{t.logout}
            </button>
          )}

          {/* language switcher */}
          <div className="relative ml-2" ref={langRef}>
            <button onClick={()=>setLangOpen(!langOpen)}
                    className="flex items-center gap-2 bg-zinc-800 px-3 py-1 rounded-md border border-zinc-700">
              <Image src={`/flags/${locale}.png`} alt={locale} width={20} height={14}/>
              {locale.toUpperCase()} <span className="text-xs">▼</span>
            </button>
            {langOpen && (
              <div className="absolute right-0 mt-2 w-28 bg-zinc-800 border border-zinc-700 rounded shadow">
                {(['en','pl'] as Locale[]).map(code=>(
                  <button key={code} onClick={()=>{switchLang(code);setLangOpen(false);}}
                          className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-700
                                      ${code===locale && 'bg-zinc-700'}`}>
                    <Image src={`/flags/${code}.png`} alt={code} width={20} height={14}/>
                    {code.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* mobile nav */}
      <div ref={menuRef}
           className={`sm:hidden overflow-hidden transition-all duration-300
             ${menuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0 -translate-y-2'}
             bg-gray-900/90 backdrop-blur px-4`}>
        <nav className="flex flex-col gap-3 py-4 text-sm">
          {navLinks.map(({href,label})=>(
            <Link key={label} href={`/${locale}${href}`} onClick={()=>setMenuOpen(false)} className="py-2">
              {label} {href==='/articles' && badge}
            </Link>
          ))}

          {session && (
            <button onClick={()=>{signOut({callbackUrl:`/${locale}`});setMenuOpen(false);}}
                    className="text-left py-2">
              {t.logout}
            </button>
          )}

          {/* language mobile */}
          <div className="flex gap-2 mt-3">
            {(['en','pl'] as Locale[]).map(code=>(
              <button key={code} onClick={()=>{switchLang(code);setMenuOpen(false);}}
                      className={`border px-2 py-1 rounded-md flex items-center gap-1
                                  ${locale===code ? 'bg-blue-600' : 'bg-zinc-700'}`}>
                <Image src={`/flags/${code}.png`} alt={code} width={20} height={14}/>
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}
