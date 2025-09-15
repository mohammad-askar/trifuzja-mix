// app/[locale]/about/page.tsx
import type { Metadata } from 'next';

export const dynamic = 'force-static';

type Locale = 'en' | 'pl';
const LOCALES: Locale[] = ['en', 'pl'];

const i18n = {
  en: {
    title: 'About Us',
    intro1:
      'Initiativa Autonoma is a content-driven platform created to educate, inspire, and engage.',
    intro2:
      'We write articles in English and Polish to connect with a broad community.',
    intro3:
      "Whether you're here to learn something new or simply enjoy reading, you're in the right place. Welcome aboard!",
    missionH: 'Our Mission',
    mission:
      'Deliver clear, practical, and thoughtful articles that help readers grow their knowledge every day.',
    valuesH: 'Values',
    values: ['Clarity', 'Usefulness', 'Respect', 'Curiosity'],
    contactH: 'Contact',
    contactP1:
      'We love hearing from you. If you have feedback or ideas, feel free to reach out.',
    contactLink: 'Go to contact page',
  },
  pl: {
    title: 'O nas',
    intro1:
      'Initiativa Autonoma to platforma z treściami stworzona, aby edukować, inspirować i angażować.',
    intro2:
      'Piszemy artykuły po angielsku i po polsku, aby dotrzeć do szerszej społeczności.',
    intro3:
      'Niezależnie od tego, czy chcesz się czegoś nauczyć, czy po prostu lubisz czytać – jesteś we właściwym miejscu!',
    missionH: 'Nasza misja',
    mission:
      'Dostarczanie klarownych, praktycznych i przemyślanych artykułów, które pomagają czytelnikom rozwijać wiedzę każdego dnia.',
    valuesH: 'Wartości',
    values: ['Jasność', 'Użyteczność', 'Szacunek', 'Ciekawość'],
    contactH: 'Kontakt',
    contactP1:
      'Chętnie poznamy Twoją opinię. Jeśli masz uwagi lub pomysły – napisz do nas.',
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
    <main className="min-h-screen flex justify-center px-4 pt-6 pb-24 bg-gradient-to-br from-blue-50 via-sky-50 to-emerald-50 dark:from-zinc-800 dark:via-zinc-900 dark:to-zinc-950">
      <article className="w-full max-w-4xl rounded-3xl bg-white/85 dark:bg-zinc-900/85 shadow-xl ring-1 ring-gray-100 dark:ring-zinc-800 backdrop-blur-lg">
        {/* top accent */}
        <div className="h-[3px] w-full bg-gradient-to-r from-sky-500 via-indigo-500 to-fuchsia-600" />

        <div className="prose dark:prose-invert max-w-none px-6 md:px-10 py-6">
          <h1 className="!mb-4 text-center font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-fuchsia-600 dark:from-sky-400 dark:to-fuchsia-400">
            {t.title}
          </h1>

          <p>{t.intro1}</p>
          <p>{t.intro2}</p>
          <p>{t.intro3}</p>

          <h2>{t.missionH}</h2>
          <p>{t.mission}</p>

          <h2>{t.valuesH}</h2>
          <ul>
            {t.values.map((v) => (
              <li key={v}>{v}</li>
            ))}
          </ul>

          <h2>{t.contactH}</h2>
          <p>{t.contactP1}</p>
          <p>
            <a
              href={`/${loc}/contact`}
              className="inline-flex items-center gap-1 underline decoration-sky-500 hover:text-sky-600"
            >
              {t.contactLink} →
            </a>
          </p>
        </div>
      </article>
    </main>
  );
}
