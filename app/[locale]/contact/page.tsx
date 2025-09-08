'use client';

import { useParams } from 'next/navigation';

type Locale = 'en' | 'pl';

const content: Record<Locale, {
  title: string;
  subtitle: string;
  placeholders: {
    name: string;
    email: string;
    message: string;
  };
  button: string;
}> = {
  en: {
    title: 'Contact Us',
    subtitle: 'Feel free to reach out by filling the form below.',
    placeholders: {
      name: 'Your name',
      email: 'Your email',
      message: 'Your message',
    },
    button: 'Send Message',
  },
  pl: {
    title: 'Skontaktuj się z nami',
    subtitle: 'Wypełnij formularz, aby się z nami skontaktować.',
    placeholders: {
      name: 'Twoje imię',
      email: 'Twój e-mail',
      message: 'Twoja wiadomość',
    },
    button: 'Wyślij wiadomość',
  },
};

export default function ContactPage() {
  const params = useParams();
  const locale = (params?.locale as Locale) ?? 'en';
  const t = content[locale];

  return (
    <main className="min-h-screen px-4 pt-6 pb-24">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md p-8 text-zinc-800">
        <h1 className="text-3xl font-bold mb-4">📬 {t.title}</h1>
        <p className="text-gray-600 mb-6">{t.subtitle}</p>

        <form className="grid gap-4">
          <input
            type="text"
            placeholder={t.placeholders.name}
            className="bg-gray-100 border border-gray-300 text-gray-800 px-4 py-2 rounded-md"
          />
          <input
            type="email"
            placeholder={t.placeholders.email}
            className="bg-gray-100 border border-gray-300 text-gray-800 px-4 py-2 rounded-md"
          />
          <textarea
            rows={4}
            placeholder={t.placeholders.message}
            className="bg-gray-100 border border-gray-300 text-gray-800 px-4 py-2 rounded-md"
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition"
          >
            {t.button}
          </button>
        </form>
      </div>
    </main>
  );
}
