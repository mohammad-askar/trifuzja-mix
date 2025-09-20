//E:\trifuzja-mix\app\[locale]\terms\page.tsx
import type { Metadata } from 'next';

export const dynamic = 'force-static';

type Locale = 'en' | 'pl';
const LOCALES: Locale[] = ['en', 'pl'];

const PROVIDER = {
  name: 'Initiativa Autonoma',
  street: 'Street 1',
  cityZip: '00-000 City',
  country: 'Polska',
  email: 'contact@example.com',
};

const i18n = {
  en: {
    title: 'Terms & Conditions',
    updatedLabel: 'Last updated:',
    sections: {
      introH: 'Introduction',
      intro: 'The website provides publicly available content (articles). By using the site you accept these Terms.',
      acceptableH: 'Acceptable Use',
      acceptable: [
        'No unlawful activity, rights infringement, or spam.',
        'No attempts to bypass security or abusive scraping.',
      ],
      ipH: 'Intellectual Property',
      ip: 'Layout, logo and site content are protected. Copying without permission is prohibited except as permitted by law.',
      liabilityH: 'Liability',
      liability: 'The site is provided “as is”. To the extent permitted by law, we exclude liability for indirect damages.',
      contactH: 'Contact & Provider',
      lawH: 'Governing Law & Jurisdiction',
      law: 'These Terms are governed by Polish law. Courts at the provider’s seat have jurisdiction, subject to mandatory consumer rules.',
    },
  },
  pl: {
    title: 'Regulamin',
    updatedLabel: 'Ostatnia aktualizacja:',
    sections: {
      introH: 'Wstęp',
      intro: 'Serwis udostępnia treści publiczne (artykuły). Korzystając z serwisu akceptujesz niniejszy Regulamin.',
      acceptableH: 'Dozwolony sposób korzystania',
      acceptable: [
        'Zakaz działań bezprawnych, naruszeń dóbr osób trzecich, spamu.',
        'Zakaz prób obchodzenia zabezpieczeń i nadmiernego scrapingu.',
      ],
      ipH: 'Własność intelektualna',
      ip: 'Układ, logo oraz treści w serwisie są chronione. Kopiowanie bez zgody jest zabronione poza dozwolonym użytkiem.',
      liabilityH: 'Odpowiedzialność',
      liability: 'Serwis udostępniany jest „as is”. W zakresie dozwolonym przez prawo wyłączamy odpowiedzialność za szkody pośrednie.',
      contactH: 'Kontakt i Usługodawca',
      lawH: 'Prawo właściwe i jurysdykcja',
      law: 'Regulamin podlega prawu polskiemu. Właściwe są sądy miejscowo właściwe dla siedziby Usługodawcy, z poszanowaniem praw konsumentów.',
    },
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
    title: `${t.title} | Initiativa Autonoma`,
    description:
      loc === 'pl' ? 'Regulamin korzystania z serwisu Initiativa Autonoma.' : 'Terms of use for Initiativa Autonoma.',
    alternates: { canonical: `/${loc}/terms` },
  };
}

export default async function TermsPage({
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
    <main className="min-h-screen flex justify-center px-4 pt-22 pb-24 bg-gradient-to-br from-blue-50 via-sky-50 to-emerald-50 dark:from-zinc-800 dark:via-zinc-900 dark:to-zinc-950">
      <article className="w-full max-w-4xl rounded-3xl bg-white/85 dark:bg-zinc-900/85 shadow-xl ring-1 ring-gray-100 dark:ring-zinc-800 backdrop-blur-lg">
        <div className="h-[3px] w-full bg-gradient-to-r from-sky-500 via-indigo-500 to-fuchsia-600" />
        <div className="prose dark:prose-invert max-w-none px-6 md:px-10 py-6">
          <h1 className="!mb-5 text-center font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-fuchsia-600 dark:from-sky-400 dark:to-fuchsia-400">
            {t.title}
          </h1>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            {i18n[loc].updatedLabel} <time dateTime={updatedISO}>{updatedHuman}</time>
          </p>

          <h2>{t.sections.introH}</h2>
          <p>{t.sections.intro}</p>

          <h2>{t.sections.acceptableH}</h2>
          <ul>
            {t.sections.acceptable.map((li) => (
              <li key={li}>{li}</li>
            ))}
          </ul>

          <h2>{t.sections.ipH}</h2>
          <p>{t.sections.ip}</p>

          <h2>{t.sections.liabilityH}</h2>
          <p>{t.sections.liability}</p>

          <h2>{t.sections.contactH}</h2>
          <p>
            <strong>{loc === 'pl' ? 'Usługodawca:' : 'Provider:'}</strong>{' '}
            {PROVIDER.name}, {PROVIDER.street}, {PROVIDER.cityZip}, {PROVIDER.country}.{' '}
            <strong>Email:</strong> {PROVIDER.email}
          </p>

          <h2>{t.sections.lawH}</h2>
          <p>{t.sections.law}</p>
        </div>
      </article>
    </main>
  );
}
