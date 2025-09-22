// app/[locale]/contact/page.tsx
import type { Metadata } from 'next';
import ContactForm from './ContactForm';

export const dynamic = 'force-static';

type Locale = 'en' | 'pl';
const LOCALES: Locale[] = ['en', 'pl'];

// اسم الموقع كمصدر وحيد للحقيقة
const SITE_NAME = 'Initiativa Autonoma';

const i18n = {
  en: {
    title: 'Contact Us',
    subtitle: 'Feel free to reach out by filling the form below.',
    placeholders: { name: 'Your name', email: 'Your email', message: 'Your message' },
    button: 'Send Message',
    privacyNote:
      'By sending this message you consent to processing your data for handling your inquiry. See the Privacy Policy for details.',
    success: 'Thanks! Your message has been sent.',
    error: 'Something went wrong. Please try again.',
    invalidEmail: 'Please enter a valid email address.',
    required: 'This field is required.',
  },
  pl: {
    title: 'Skontaktuj się z nami',
    subtitle: 'Wypełnij formularz, aby się z nami skontaktować.',
    placeholders: { name: 'Twoje imię', email: 'Twój e-mail', message: 'Twoja wiadomość' },
    button: 'Wyślij wiadomość',
    privacyNote:
      'Wysyłając wiadomość wyrażasz zgodę na przetwarzanie danych w celu obsługi zapytania. Szczegóły w Polityce Prywatności.',
    success: 'Dziękujemy! Twoja wiadomość została wysłana.',
    error: 'Coś poszło nie tak. Spróbuj ponownie.',
    invalidEmail: 'Podaj poprawny adres e-mail.',
    required: 'To pole jest wymagane.',
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
        ? 'Formularz kontaktowy serwisu Initiativa Autonoma.'
        : 'Contact form for Initiativa Autonoma.',
    alternates: { canonical: `/${loc}/contact` },
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const loc: Locale = LOCALES.includes(locale) ? locale : 'en';
  const t = i18n[loc];

  return (
    <main className="min-h-screen flex justify-center px-4 pt-18 pb-24 bg-gradient-to-br from-blue-50 via-sky-50 to-emerald-50 dark:from-zinc-800 dark:via-zinc-900 dark:to-zinc-950">
      <article className="w-full max-w-4xl rounded-3xl bg-white/85 dark:bg-zinc-900/85 shadow-xl ring-1 ring-gray-100 dark:ring-zinc-800 backdrop-blur-lg">
        {/* top accent */}
        <div className="h-[3px] w-full bg-gradient-to-r from-sky-500 via-indigo-500 to-fuchsia-600" />
        <div className="prose dark:prose-invert max-w-none px-6 md:px-10 py-6">
          <h1 className="!mb-2 text-center font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-fuchsia-600 dark:from-sky-400 dark:to-fuchsia-400">
            {t.title}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-center !mt-0">{t.subtitle}</p>

          {/* Client form */}
          <div className="not-prose mt-6">
            <ContactForm locale={loc} t={t} />
          </div>
        </div>
      </article>
    </main>
  );
}
