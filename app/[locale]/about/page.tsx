// app/[locale]/about/page.tsx
import type { Metadata } from 'next';

export const dynamic = 'force-static';

type Locale = 'en' | 'pl';
const LOCALES: Locale[] = ['en', 'pl'];

// اسم الموقع كمصدر وحيد للحقيقة
const SITE_NAME = 'Initiativa Autonoma';

// نوع ترجمة صارم بدون any
type AboutT = {
  title: string;
  intro1: string;
  intro2: string;
  intro3: string;
  intro4: string;
  contactLink: string;
  addressTitle: string;
  name: string;
  addressLine1: string;
  addressLine2: string;
  addressLine3?: string; // اختياري (للإنجليزية فقط هنا)
};

// قاموس اللغات مضبوط على النوع أعلاه
const i18n: Record<Locale, AboutT> = {
  en: {
    title: 'About Us',
    intro1:
      'Initiativa Autonoma is an independent publishing project, designed as a space for content created outside of convention – freely, consciously, and in diverse forms, with an emphasis on reliable storytelling and responsibility toward the audience.',
    intro2:
      'It does not rely on a traditional editorial structure. Instead, it develops flexibly, in tune with topics that deserve attention – without haste, without pressure, and without a format imposed from above.',
    intro3:
      "The project’s direction is guided by its founding team, who ensure the coherence and quality of published materials. It is a space that does not confine itself to one field or one narrative. It is open – to themes, forms, and approaches.",
    intro4:
      'The idea for the initiative grew out of earlier activities carried out on social media. Rather than developing them separately, the creators decided to bring them together under one banner.',
    contactLink: 'Go to contact page',
    addressTitle: 'Correspondence address',
    name: 'Patrycja Konkowska',
    addressLine1: '15B/7 Darzyborska Street',
    addressLine2: '61-303 Poznań',
    addressLine3: 'Poland',
  },
  pl: {
    title: 'O nas',
    intro1:
      'Initiativa Autonoma to niezależny projekt publikacyjny, zaprojektowany jako przestrzeń dla treści tworzonych poza schematem – swobodnie, świadomie i w różnorodnej formie, z naciskiem na rzetelną narrację i odpowiedzialność wobec odbiorcy.',
    intro2:
      'Nie opiera się na klasycznej strukturze redakcyjnej. Zamiast tego rozwija się elastycznie, w rytmie tematów, które zasługują na uważność – bez pośpiechu, bez presji, bez formatu narzuconego z góry.',
    intro3:
      'Za kierunek projektu odpowiada zespół założycielski, który czuwa nad spójnością i jakością publikowanych materiałów. To przestrzeń, która nie zamyka się w jednej dziedzinie ani jednej narracji. Jest otwarta – na tematy, formy i podejścia.',
    intro4:
      'Pomysł na inicjatywę wyrósł z wcześniejszych działań prowadzonych w mediach społecznościowych. Zamiast rozwijać je osobno, twórcy postanowili zebrać je pod wspólnym szyldem.',
    contactLink: 'Przejdź do strony kontaktu',
    addressTitle: 'Adres do korespondencji',
    name: 'Patrycja Konkowska',
    addressLine1: 'ul. Darzyborska 15B/7',
    addressLine2: '61-303 Poznań',
  },
};

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
        ? 'Kilka słów o platformie Initiativa Autonoma i naszej misji.'
        : 'About Initiativa Autonoma and our mission.',
    alternates: { canonical: `/${loc}/about` },
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const loc: Locale = LOCALES.includes(locale) ? locale : 'en';
  const t = i18n[loc];

  // JSON-LD (Organization) — دون استخدام window
  const siteUrlEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '');
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: siteUrlEnv || undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'ul. Darzyborska 15B/7',
      postalCode: '61-303',
      addressLocality: 'Poznań',
      addressCountry: loc === 'pl' ? 'Polska' : 'Poland',
    },
  };

  return (
    <main className="min-h-screen flex justify-center px-4 pt-18 pb-24 bg-gradient-to-br from-blue-50 via-sky-50 to-emerald-50 dark:from-zinc-800 dark:via-zinc-900 dark:to-zinc-950">
      <article className="w-full max-w-4xl rounded-3xl bg-white/85 dark:bg-zinc-900/85 shadow-xl ring-1 ring-gray-100 dark:ring-zinc-800 backdrop-blur-lg">
        {/* top accent */}
        <div className="h-[3px] w-full bg-gradient-to-r from-sky-500 via-indigo-500 to-fuchsia-600" />

        <div
          className="
            prose dark:prose-invert max-w-none px-6 md:px-10 py-6
            prose-p:leading-7
          "
        >
          <h1 className="!mb-5 text-center font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-fuchsia-600 dark:from-sky-400 dark:to-fuchsia-400">
            {t.title}
          </h1>

          <p>{t.intro1}</p>
          <p>{t.intro2}</p>
          <p>{t.intro3}</p>
          <p>{t.intro4}</p>

          {/* Correspondence address */}
          <section
            aria-labelledby="correspondence-address"
            className="not-prose my-6 rounded-2xl border border-sky-200 dark:border-sky-800 bg-sky-50/70 dark:bg-sky-900/20 p-4"
          >
            <h2 id="correspondence-address" className="text-base font-semibold">
              {t.addressTitle}
            </h2>
            <address className="mt-2 not-italic leading-6">
              <div>{t.name}</div>
              <div>{t.addressLine1}</div>
              <div>{t.addressLine2}</div>
              {t.addressLine3 ? <div>{t.addressLine3}</div> : null}
            </address>
          </section>

          {/* CTA: Contact Link as a modern pill button */}
          <div className="mt-6">
            <a
              href={`/${loc}/contact`}
              className="group inline-flex items-center gap-2 rounded-full px-5 py-2.5
                         text-sm font-semibold text-white
                         bg-gradient-to-r from-sky-600 via-indigo-600 to-fuchsia-600
                         shadow-sm hover:shadow-lg transition-all duration-200
                         hover:brightness-110 active:brightness-95
                         focus-visible:outline-none focus-visible:ring-2
                         focus-visible:ring-offset-2 focus-visible:ring-indigo-500
                         dark:focus-visible:ring-offset-zinc-900"
            >
              <span>{t.contactLink}</span>
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
                className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
              >
                <path d="M7.5 4.5a1 1 0 0 1 1.7-.7l5 5a1 1 0 0 1 0 1.4l-5 5a1 1 0 1 1-1.4-1.4L10.6 11H3a1 1 0 1 1 0-2h7.6L7.8 6.2a1 1 0 0 1-.3-.7Z" />
              </svg>
            </a>
          </div>
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
