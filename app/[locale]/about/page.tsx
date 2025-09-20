// app/[locale]/about/page.tsx
import type { Metadata } from 'next';

export const dynamic = 'force-static';

type Locale = 'en' | 'pl';
const LOCALES: Locale[] = ['en', 'pl'];

const i18n = {
  en: {
    title: 'About Us',
    intro1:
      'Initiativa Autonoma is an independent publishing project, designed as a space for content created outside of convention – freely, consciously, and in diverse forms, with an emphasis on reliable storytelling and responsibility toward the audience.',
    intro2:
      'It does not rely on a traditional editorial structure. Instead, it develops flexibly, in tune with topics that deserve attention – without haste, without pressure, and without a format imposed from above.',
    intro3:
      "The project’s direction is guided by its founding team, who ensure the coherence and quality of published materials. It is a space that does not confine itself to one field or one narrative. It is open – to themes, forms, and approaches.",
      intro4:
      "The idea for the initiative grew out of earlier activities carried out on social media. Rather than developing them separately, the creators decided to bring them together under one banner.",
    contactLink: 'Go to contact page',
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
      "Pomysł na inicjatywę wyrósł z wcześniejszych działań prowadzonych w mediach społecznościowych. Zamiast rozwijać je osobno, twórcy postanowili zebrać je pod wspólnym szyldem.",
      contactLink: 'Przejdź do strony kontaktu',
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
    title: `${t.title} | Trifuzja Mix`,
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

  return (
    <main className="min-h-screen flex justify-center px-4 pt-22 pb-24 bg-gradient-to-br from-blue-50 via-sky-50 to-emerald-50 dark:from-zinc-800 dark:via-zinc-900 dark:to-zinc-950">
      <article className="w-full max-w-4xl rounded-3xl bg-white/85 dark:bg-zinc-900/85 shadow-xl ring-1 ring-gray-100 dark:ring-zinc-800 backdrop-blur-lg">
        {/* top accent */}
        <div className="h-[3px] w-full bg-gradient-to-r from-sky-500 via-indigo-500 to-fuchsia-600" />

        <div className="prose dark:prose-invert max-w-none px-6 md:px-10 py-6">
          <h1 className="!mb-4 text-center font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-fuchsia-600 dark:from-sky-400 dark:to-fuchsia-400">
            {t.title}
          </h1>

          <p>{t.intro1}</p>
          <br/>
          <p>{t.intro2}</p>
          <br/>
          <p>{t.intro3}</p>
          <br/>
          <p>{t.intro4}</p>
          <br/>
          <p className='gradient-to-r from-sky-500 via-indigo-500 to-fuchsia-600'>
            <a
              href={`/${loc}/contact`}
              className="inline-flex items-center  gap-1 underline  decoration-sky-500 hover:text-sky-600"
            >
              {t.contactLink} →
            </a>
          </p>
        </div>
      </article>
    </main>
  );
}
