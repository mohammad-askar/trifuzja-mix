// 📁 app/components/header/LanguageSwitcher.tsx
'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Locale } from '../Header';

export default function LanguageSwitcher({ locale }: { locale: Locale }) {
  const [open,setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  const switchLang=(l:Locale)=>{
    localStorage.setItem('preferredLocale',l);
    const stripped=pathname.replace(/^\/(en|pl)/,'');
    router.push(`/${l}${stripped||''}`);
    setOpen(false);
  };

  // click outside
  useEffect(()=>{ const close=(e:MouseEvent)=>{
    if(open && ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
  }; document.addEventListener('mousedown',close);
     return ()=>document.removeEventListener('mousedown',close);
  },[open]);

  return (
    <div className="relative ml-2" ref={ref}>
      <button onClick={()=>setOpen(!open)}
              className="flex items-center gap-2 bg-zinc-800 px-3 py-1 rounded-md border border-zinc-700">
        <Image src={`/flags/${locale}.png`} alt={locale} width={20} height={14}/>
        {locale.toUpperCase()} <span className="text-xs">▼</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-28 bg-zinc-800 border border-zinc-700 rounded shadow">
          {(['en','pl'] as Locale[]).map(code=>(
            <button key={code} onClick={()=>switchLang(code)}
                    className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-700
                                ${code===locale && 'bg-zinc-700'}`}>
              <Image src={`/flags/${code}.png`} alt={code} width={20} height={14}/>
              {code.toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
