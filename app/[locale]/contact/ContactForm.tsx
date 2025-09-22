// app/[locale]/contact/ContactForm.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';

type Locale = 'en' | 'pl';

type Dict = {
  title: string;
  subtitle: string;
  placeholders: { name: string; email: string; message: string };
  button: string;
  privacyNote: string;
  success: string;
  error: string;
  invalidEmail: string;
  required: string;
};

type Props = { locale: Locale; t: Dict };

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function ContactForm({ locale, t }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [consent, setConsent] = useState(false);
  const [hp, setHp] = useState(''); // honeypot
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setOk(null);
    setErr(null);

    if (!name.trim() || !email.trim() || !msg.trim()) {
      setErr(t.required);
      return;
    }
    if (!validateEmail(email)) {
      setErr(t.invalidEmail);
      return;
    }
    if (!consent) {
      // لأسباب خصوصية/GDPR نطلب موافقة لإرسال الرسالة
      setErr(locale === 'pl' ? 'Zaznacz zgodę.' : 'Please check the consent box.');
      return;
    }
    if (hp) {
      // سبام: نتجاهل بصمت
      setOk(t.success);
      setName(''); setEmail(''); setMsg(''); setConsent(false);
      return;
    }

    setLoading(true);
    try {
      // إن لم يكن لديك API بعد، أنشئ /api/contact ليستقبل {name,email,message,locale}
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message: msg, locale }),
      });
      if (!res.ok) throw new Error();
      setOk(t.success);
      setName(''); setEmail(''); setMsg(''); setConsent(false);
    } catch {
      setErr(t.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate className="not-prose mt-6 grid gap-4">
      {/* honeypot */}
      <input
        type="text"
        name="website"
        value={hp}
        onChange={(e) => setHp(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1">
          <label htmlFor="name" className="text-sm text-zinc-700 dark:text-zinc-300">
            {t.placeholders.name}
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="px-4 py-2 rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="grid gap-1">
          <label htmlFor="email" className="text-sm text-zinc-700 dark:text-zinc-300">
            {t.placeholders.email}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            inputMode="email"
            autoComplete="email"
            required
            className="px-4 py-2 rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>

      <div className="grid gap-1">
        <label htmlFor="message" className="text-sm text-zinc-700 dark:text-zinc-300">
          {t.placeholders.message}
        </label>
        <textarea
          id="message"
          rows={5}
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          required
          className="px-4 py-2 rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>

      <label className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5"
          aria-required
        />
        <span>
          {t.privacyNote}{' '}
          <Link href={`/${locale}/privacy`} className="underline">
            {locale === 'pl' ? 'Polityka Prywatności' : 'Privacy Policy'}
          </Link>
          .
        </span>
      </label>

      <div className="flex items-center gap-3">
        {/* زر الإرسال – نفس ستايل زر Contact */}
        <button
          type="submit"
          disabled={loading}
          className="group inline-flex items-center gap-2 rounded-full px-5 py-2.5
                     text-sm font-semibold text-white
                     bg-gradient-to-r from-sky-600 via-indigo-600 to-fuchsia-600
                     shadow-sm hover:shadow-lg transition-all duration-200
                     hover:brightness-110 active:brightness-95
                     focus-visible:outline-none focus-visible:ring-2
                     focus-visible:ring-offset-2 focus-visible:ring-indigo-500
                     dark:focus-visible:ring-offset-zinc-900
                     disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <span>
            {loading
              ? (locale === 'pl' ? 'Wysyłanie…' : 'Sending…')
              : t.button}
          </span>
          {/* سهم يتحرك يمينًا عند التحويم */}
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
            className={`size-4 transition-transform duration-200 ${loading ? '' : 'group-hover:translate-x-0.5'}`}
          >
            <path d="M7.5 4.5a1 1 0 0 1 1.7-.7l5 5a1 1 0 0 1 0 1.4l-5 5a1 1 0 1 1-1.4-1.4L10.6 11H3a1 1 0 1 1 0-2h7.6L7.8 6.2a1 1 0 0 1-.3-.7Z" />
          </svg>
        </button>

        {ok && <span className="text-sm text-emerald-600">{ok}</span>}
        {err && <span className="text-sm text-rose-600">{err}</span>}
      </div>
    </form>
  );
}
