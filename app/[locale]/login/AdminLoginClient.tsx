//E:\trifuzja-mix\app\[locale]\login\AdminLoginClient.tsx
'use client';

import { useState } from 'react';
import { signIn, type SignInResponse } from 'next-auth/react';
import { useParams } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import Image from 'next/image';
import { Mail, Lock, Eye, EyeOff, Shield } from 'lucide-react';

type Locale = 'en' | 'pl';

const TEXT = {
  en: {
    title: 'Admin Login',
    email: 'Email',
    password: 'Password',
    login: 'Login',
    logging: 'Logging in…',
    emptyMail: 'Please enter your email',
    badMail: 'Invalid email',
    emptyPass: 'Please enter your password',
    shortPass: 'Min 6 characters',
    failed: 'Login failed',
    success: 'Logged in!',
    unknown: 'Unexpected error',
    show: 'Show password',
    hide: 'Hide password',
  },
  pl: {
    title: 'Logowanie administratora',
    email: 'E-mail',
    password: 'Hasło',
    login: 'Zaloguj',
    logging: 'Logowanie…',
    emptyMail: 'Wpisz e-mail',
    badMail: 'Nieprawidłowy e-mail',
    emptyPass: 'Wpisz hasło',
    shortPass: 'Min. 6 znaków',
    failed: 'Błąd logowania',
    success: 'Zalogowano!',
    unknown: 'Nieoczekiwany błąd',
    show: 'Pokaż hasło',
    hide: 'Ukryj hasło',
  },
} as const;

function isLocale(v: unknown): v is Locale {
  return v === 'en' || v === 'pl';
}

export default function AdminLoginClient() {
  const params = useParams();
  const locale: Locale = isLocale(params?.locale) ? params.locale : 'en';
  const t = TEXT[locale] ?? TEXT.en;

  const [email, setEmail] = useState<string>('');
  const [password, setPass] = useState<string>('');
  const [loading, setLoad] = useState<boolean>(false);
  const [showPass, setShow] = useState<boolean>(false);

  const validMail = (v: string): boolean => /\S+@\S+\.\S+/.test(v);

  const strength =
    password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    if (!email) {
      toast.error(t.emptyMail);
      return;
    }
    if (!validMail(email)) {
      toast.error(t.badMail);
      return;
    }
    if (!password) {
      toast.error(t.emptyPass);
      return;
    }
    if (password.length < 6) {
      toast.error(t.shortPass);
      return;
    }

    setLoad(true);

    try {
      // ✅ IMPORTANT: do not pass callbackUrl when redirect:false
      const res: SignInResponse | undefined = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      setLoad(false);

      if (!res) {
        toast.error(t.unknown);
        return;
      }

      if (res.error) {
        toast.error(t.failed);
        return;
      }

      toast.success(t.success);

      // ✅ Go directly to dashboard
      window.location.assign(`/${locale}/admin/dashboard`);
    } catch {
      setLoad(false);
      toast.error(t.unknown);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
      <Toaster position="bottom-left" />
      <div className="w-full max-w-md rounded-lg shadow-2xl p-8">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Image src="/images/logo.png" alt="Logo" width={40} height={40} />
          <h1 className="text-2xl font-semibold text-gray-800">{t.title}</h1>
        </div>

        <form onSubmit={onSubmit} className="space-y-6" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              {t.email}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                disabled={loading}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300
                           focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              {t.password}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                autoComplete="current-password"
                disabled={loading}
                value={password}
                onChange={(e) => setPass(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2 rounded-md border border-gray-300
                           focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                type="button"
                tabIndex={-1}
                aria-label={showPass ? t.hide : t.show}
                onClick={() => setShow((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {password.length > 0 && (
              <div className="mt-2 h-1 w-full bg-gray-200 rounded">
                <div
                  className={`h-full rounded ${
                    strength === 1
                      ? 'bg-red-500 w-1/3'
                      : strength === 2
                      ? 'bg-yellow-500 w-2/3'
                      : 'bg-green-500 w-full'
                  }`}
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700
                        text-white py-2 rounded-md font-semibold transition
                        ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {loading && <Shield className="w-4 h-4 animate-spin" />}
            {loading ? t.logging : t.login}
          </button>
        </form>
      </div>
    </div>
  );
}
