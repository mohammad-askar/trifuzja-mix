// app/[locale]/privacy/page.tsx
import type { Metadata } from 'next';

export const dynamic = 'force-static';

// ثوابت اللغة + نوع مضبوط
const LOCALES = ['en', 'pl'] as const;
type Locale = typeof LOCALES[number];

function isLocale(x: unknown): x is Locale {
  return typeof x === 'string' && (LOCALES as readonly string[]).includes(x);
}

// اسم الموقع كمصدر وحيد للحقيقة
const SITE_NAME = 'MENSITIVA';

// بيانات المزوّد (حدّث البريد لاحقًا)
const PROVIDER = {
  legalName: 'Patrycja Konkowska',
  brandName: SITE_NAME,
  street: 'ul. Darzyborska 15B/7',
  cityZip: '61-303 Poznań',
  email: 'contact@example.com', // ← بدّلها ببريدك الرسمي
} as const;

const i18n: Record<Locale, {
  title: string;
  updatedLabel: string;
  introH: string;
  intro: string;
  dataH: string;
  data: string[];
  rightsH: string;
  rights: string;
  contactH: string;
  country: string;
  providerLineLabel: string;
}> = {
  en: {
    title: 'Privacy Policy',
    updatedLabel: 'Last updated:',
    introH: 'Overview',
    intro:
      'We value your privacy. We do not collect personal data unless explicitly provided by you (e.g., newsletter signup).',
    dataH: 'What data we process',
    data: [
      'Technical logs necessary to operate the site (e.g., IP, user agent) kept for a limited time.',
      'Email address if you subscribe to our newsletter (with explicit consent).',
    ],
    rightsH: 'Your rights',
    rights:
      'You have the right to access, rectify, erase, or restrict processing of your personal data. You may withdraw consent at any time without affecting the lawfulness of processing based on consent before its withdrawal.',
    contactH: 'Contact',
    country: 'Poland',
    providerLineLabel: 'Provider',
  },
  pl: {
    title: 'Polityka Prywatności',
    updatedLabel: 'Ostatnia aktualizacja:',
    introH: 'Zarys',
    intro:
      'Szanujemy Twoją prywatność. Nie zbieramy danych osobowych, chyba że zostaną one dobrowolnie podane (np. zapis do newslettera).',
    dataH: 'Jakie dane przetwarzamy',
    data: [
      'Techniczne logi niezbędne do działania serwisu (np. IP, user agent) przechowywane przez ograniczony czas.',
      'Adres e-mail, jeśli zapiszesz się do newslettera (za Twoją wyraźną zgodą).',
    ],
    rightsH: 'Twoje prawa',
    rights:
      'Masz prawo dostępu do danych, ich sprostowania, usunięcia oraz ograniczenia przetwarzania. Możesz wycofać zgodę w dowolnym momencie – bez wpływu na zgodność z prawem przetwarzania sprzed wycofania.',
    contactH: 'Kontakt',
    country: 'Polska',
    providerLineLabel: 'Usługodawca',
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params; // ✅ Next 15 requires await
  const loc: Locale = isLocale(locale) ? locale : 'en';
  const t = i18n[loc];

  return {
    title: `${t.title} | ${SITE_NAME}`,
    description:
      loc === 'pl'
        ? `Polityka prywatności serwisu ${SITE_NAME}.`
        : `Privacy policy of ${SITE_NAME}.`,
    alternates: { canonical: `/${loc}/privacy` },
  };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params; // ✅ Next 15 requires await
  const loc: Locale = isLocale(locale) ? locale : 'en';
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

          <h2>{t.introH}</h2>
          <p>{t.intro}</p>

          <h2>{t.dataH}</h2>
          <ul>
            {t.data.map((li) => (
              <li key={li}>{li}</li>
            ))}
          </ul>

          <h2>{t.rightsH}</h2>
          <p>{t.rights}</p>

          <h2>{t.contactH}</h2>
          <p>
            <strong>{t.providerLineLabel}:</strong> {PROVIDER.legalName} &mdash; {PROVIDER.brandName}
            <br />
            {PROVIDER.street}, {PROVIDER.cityZip}, {t.country}. <strong>Email:</strong> {PROVIDER.email}
          </p>
        </div>
      </article>
    </main>
  );
}
