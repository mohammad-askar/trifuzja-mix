// app/[locale]/imprint/page.tsx
import type { Metadata } from 'next';

type Locale = 'en' | 'pl';
export const dynamic = 'force-static';

/** اسم الموقع كمصدر وحيد للحقيقة */
const SITE_NAME = 'MENSITIVA';

/** بيانات مزوّد الخدمة (المالك/الكيان القانوني للموقع) */
const PROVIDER = {
  legalName: 'Patrycja Konkowska',               // اسم المالك/المزوّد
  brandName: SITE_NAME,                          // اسم الموقع/العلامة

  // عنوان المراسلات
  street: 'ul. Darzyborska 15B/7',
  city: 'Poznań',
  postalCode: '61-303',
  country: 'Poland',

  email: 'mensitiva1@gmail.com',                  // ← حدّثه ببريدك الرسمي إن وُجد
  phone: '',                                     // اختياري
  website: process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') || 'https://MENSITIVA.com',

  /** مُعرّفات اختيارية */
  nip: '',
  regon: '',
  krs: '',
  ceidg: '',
  hosting: '',
} as const;

const LOCALES: Locale[] = ['en', 'pl'];

const i18n = {
  en: {
    title: 'Imprint',
    heading: 'Imprint (Legal Notice)',
    updatedLabel: 'Last updated:',
    provider: 'Service provider',
    address: 'Correspondence address',
    contact: 'Contact',
    ids: 'Identifiers',
    liabilityContentH: 'Liability for contents',
    liabilityContent:
      'We are responsible for our own content provided on these pages under applicable Polish and EU law. We exercise due care; however, we cannot guarantee absolute freedom from errors.',
    linksH: 'Liability for links',
    links:
      'Our site may contain links to external third-party websites. We have no control over their content and therefore assume no liability for such external content; responsibility lies with the respective providers.',
    hostingH: 'Hosting / infrastructure',
    websiteLabel: 'Website',
    emailLabel: 'E-mail',
    phoneLabel: 'Tel.',
  },
  pl: {
    title: 'Impressum / Nota prawna',
    heading: 'Impressum (Nota prawna)',
    updatedLabel: 'Ostatnia aktualizacja:',
    provider: 'Usługodawca',
    address: 'Adres do korespondencji',
    contact: 'Kontakt',
    ids: 'Identyfikatory',
    liabilityContentH: 'Odpowiedzialność za treści',
    liabilityContent:
      'Odpowiadamy za własne treści udostępnione na stronie zgodnie z prawem polskim i UE. Dokładamy należytej staranności; nie gwarantujemy jednak całkowitego braku błędów.',
    linksH: 'Odpowiedzialność za linki',
    links:
      'Witryna może zawierać odnośniki do zewnętrznych stron. Nie mamy wpływu na ich zawartość i nie ponosimy za nią odpowiedzialności; odpowiadają właściwi dostawcy.',
    hostingH: 'Hosting / infrastruktura',
    websiteLabel: 'Strona WWW',
    emailLabel: 'E-mail',
    phoneLabel: 'Tel.',
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
        ? 'Dane identyfikacyjne usługodawcy i nota prawna serwisu MENSITIVA.'
        : 'Service provider identification and legal notice for MENSITIVA.',
    alternates: { canonical: `/${loc}/imprint` },
  };
}

export default async function ImprintPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const loc: Locale = LOCALES.includes(locale) ? locale : 'en';
  const t = i18n[loc];

  // حدّث التاريخ عند أي تعديل
  const updatedISO = '2025-09-14';
  const updatedHuman = new Date(updatedISO).toLocaleDateString(
    loc === 'pl' ? 'pl-PL' : 'en-GB',
    { year: 'numeric', month: 'long', day: 'numeric' },
  );

  // JSON-LD (من المفيد لمحركات البحث) — فصل المدينة والرمز البريدي
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: PROVIDER.brandName,
    legalName: PROVIDER.legalName,
    url: PROVIDER.website,
    email: PROVIDER.email || undefined,
    telephone: PROVIDER.phone || undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: PROVIDER.street,
      addressLocality: PROVIDER.city,
      postalCode: PROVIDER.postalCode,
      addressCountry: PROVIDER.country,
    },
    vatID: PROVIDER.nip || undefined,
  };

  return (
    <main className="min-h-screen flex justify-center px-4 pt-18 pb-24 bg-gradient-to-br from-blue-50 via-sky-50 to-emerald-50 dark:from-zinc-800 dark:via-zinc-900 dark:to-zinc-950">
      <article className="w-full max-w-4xl rounded-3xl bg-white/85 dark:bg-zinc-900/85 shadow-xl ring-1 ring-gray-100 dark:ring-zinc-800 backdrop-blur-lg">
        <div className="h-[3px] w-full bg-gradient-to-r from-sky-500 via-indigo-500 to-fuchsia-600" />
        <div className="prose dark:prose-invert max-w-none px-6 md:px-10 py-6">
          <h1 className="!mb-5 text-center font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-fuchsia-600 dark:from-sky-400 dark:to-fuchsia-400">
            {t.heading}
          </h1>

          {/* المزوّد */}
          <h2 className="!mt-0">{t.provider}</h2>
          <p className="leading-relaxed">
            <strong>{PROVIDER.legalName}</strong> &mdash; {PROVIDER.brandName}
          </p>

          {/* العنوان (مراسلات) */}
          <h3>{t.address}</h3>
          <address className="not-italic">
            {PROVIDER.street}
            <br />
            {PROVIDER.postalCode} {PROVIDER.city}
            <br />
            {PROVIDER.country}
          </address>

          {/* تواصل */}
          <h3>{t.contact}</h3>
          <p className="leading-relaxed">
            {PROVIDER.email && (
              <>
                {t.emailLabel}: <a className="underline" href={`mailto:${PROVIDER.email}`}>{PROVIDER.email}</a>
                <br />
              </>
            )}
            {PROVIDER.phone && (
              <>
                {t.phoneLabel}: <a className="underline" href={`tel:${PROVIDER.phone}`}>{PROVIDER.phone}</a>
                <br />
              </>
            )}
            {t.websiteLabel}: <a className="underline" href={PROVIDER.website}>{PROVIDER.website}</a>
          </p>

          {(PROVIDER.nip || PROVIDER.regon || PROVIDER.krs || PROVIDER.ceidg) && (
            <>
              <h3>{t.ids}</h3>
              <ul>
                {PROVIDER.nip && <li>NIP: {PROVIDER.nip}</li>}
                {PROVIDER.regon && <li>REGON: {PROVIDER.regon}</li>}
                {PROVIDER.krs && <li>KRS: {PROVIDER.krs}</li>}
                {PROVIDER.ceidg && <li>CEIDG: {PROVIDER.ceidg}</li>}
              </ul>
            </>
          )}

          <h2>{t.liabilityContentH}</h2>
          <p>{t.liabilityContent}</p>

          <h2>{t.linksH}</h2>
          <p>{t.links}</p>

          {PROVIDER.hosting && (
            <>
              <h2>{t.hostingH}</h2>
              <p className="leading-relaxed">{PROVIDER.hosting}</p>
            </>
          )}

          <hr className="border-dashed" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t.updatedLabel} <time dateTime={updatedISO}>{updatedHuman}</time>
          </p>
        </div>
      </article>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  );
}
