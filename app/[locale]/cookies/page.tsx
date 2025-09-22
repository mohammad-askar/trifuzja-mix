// app/[locale]/cookies/page.tsx
import type { Metadata } from 'next';

export const dynamic = 'force-static';

type Locale = 'en' | 'pl';
const LOCALES: Locale[] = ['en', 'pl'];

// اسم الموقع كمصدر وحيد للحقيقة
const SITE_NAME = 'Initiativa Autonoma';

const i18n = {
  en: {
    title: 'Cookies Policy',
    updatedLabel: 'Last updated:',
    whatH: 'What we use',
    what:
      'We do not use analytics or marketing cookies for visitors. Only strictly necessary technical cookies may be present (e.g., for site operation or the admin panel). No consent banner is shown because we do not place non-essential cookies.',
    necessaryH: 'Strictly necessary cookies (examples)',
    necessary: [
      'Session or CSRF tokens used to keep the site secure.',
      'Load balancing or caching cookies used to deliver pages.',
      'Preference cookies essential to remember your language or privacy choices.',
    ],
    embedsH: 'Third-party embeds',
    embeds:
      'Video embeds (e.g., YouTube) are either loaded in privacy-enhanced mode or only after you click to load (click-to-load). Until you click, no non-essential cookies from the provider are set.',
    manageH: 'Managing preferences',
    manage:
      'If we add analytics/marketing tools in the future, we will first ask for your consent and provide a control to accept or reject non-essential cookies. You can also adjust your browser settings to block or delete cookies.',
  },
  pl: {
    title: 'Polityka Cookies',
    updatedLabel: 'Ostatnia aktualizacja:',
    whatH: 'Co wykorzystujemy',
    what:
      'Nie stosujemy cookies analitycznych ani marketingowych dla odwiedzających. Mogą występować wyłącznie techniczne cookies niezbędne do działania serwisu lub panelu administratora. Nie wyświetlamy banera zgody, ponieważ nie umieszczamy ciasteczek niewymagających zgody.',
    necessaryH: 'Cookies niezbędne (przykłady)',
    necessary: [
      'Sesyjne lub CSRF – zapewniają bezpieczeństwo działania serwisu.',
      'Równoważenie obciążenia lub cache – potrzebne do dostarczania stron.',
      'Preferencje konieczne – zapamiętanie języka lub wyborów prywatności.',
    ],
    embedsH: 'Osadzenia zewnętrzne',
    embeds:
      'Materiały wideo (np. YouTube) ładujemy w trybie rozszerzonej prywatności albo dopiero po kliknięciu użytkownika (click-to-load). Do momentu kliknięcia dostawca nie ustawia niezbędnych do zgody cookies.',
    manageH: 'Zarządzanie preferencjami',
    manage:
      'Jeśli w przyszłości dodamy narzędzia analityczne/marketingowe, najpierw poprosimy o zgodę i udostępnimy mechanizm akceptacji/odrzucenia ciasteczek nieniezbędnych. Preferencje możesz też ustawić w przeglądarce (blokowanie/usuwanie cookies).',
  },
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const loc: Locale = LOCALES.includes(locale) ? locale : 'en';
  const t = i18n[loc];
  return {
    title: `${t.title} | ${SITE_NAME}`,
    description:
      loc === 'pl'
        ? `Polityka cookies serwisu ${SITE_NAME}.`
        : `Cookies policy of ${SITE_NAME}.`,
    alternates: { canonical: `/${loc}/cookies` },
  };
}

export default async function CookiesPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const loc: Locale = LOCALES.includes(locale) ? locale : 'en';
  const t = i18n[loc];

  const updatedISO = '2025-09-14';
  const updatedHuman = new Date(updatedISO).toLocaleDateString(
    loc === 'pl' ? 'pl-PL' : 'en-GB',
    { year: 'numeric', month: 'long', day: 'numeric' },
  );

  return (
    <main className="min-h-screen flex justify-center px-4 pt-18 pb-24 bg-gradient-to-br from-blue-50 via-sky-50 to-emerald-50 dark:from-zinc-800 dark:via-zinc-900 dark:to-zinc-950">
      <article className="w-full max-w-4xl rounded-3xl bg-white/85 dark:bg-zinc-900/85 shadow-xl ring-1 ring-gray-100 dark:ring-zinc-800 backdrop-blur-lg">
        <div className="h-[3px] w-full bg-gradient-to-r from-sky-500 via-indigo-500 to-fuchsia-600" />
        <div className="prose dark:prose-invert max-w-none px-6 md:px-10 py-6">
          <h1 className="!mb-5 text-center font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-fuchsia-600 dark:from-sky-400 dark:to-fuchsia-400">
            {t.title}
          </h1>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t.updatedLabel} <time dateTime={updatedISO}>{updatedHuman}</time>
          </p>

          <h2>{t.whatH}</h2>
          <p>{t.what}</p>

          <h2>{t.necessaryH}</h2>
          <ul>
            {t.necessary.map((li) => (
              <li key={li}>{li}</li>
            ))}
          </ul>

          <h2>{t.embedsH}</h2>
          <p>{t.embeds}</p>

          <h2>{t.manageH}</h2>
          <p>{t.manage}</p>
        </div>
      </article>
    </main>
  );
}
