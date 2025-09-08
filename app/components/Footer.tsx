"use client";

import { useState } from "react";
import { ChevronUp } from "lucide-react";
import { FaFacebookF, FaYoutube, FaTiktok } from "react-icons/fa";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";

type Locale = "en" | "pl";

const translations: Record<Locale, Record<string, string>> = {
  en: {
    copyright: "All rights reserved",
    subscribe: "Subscribe to our newsletter",
    placeholder: "Enter your email",
    thanks: "Thank you for subscribing!",
    invalidEmail: "Please enter a valid email address",
    subscribeError: "Subscription failed. Please try again.",
    backToTop: "Back to top",
    links: "Links",
    about: "About Us",
    contact: "Contact",
    privacy: "Privacy Policy",
    terms: "Terms & Conditions",
    imprint: "Imprint",
  },
  pl: {
    copyright: "Wszystkie prawa zastrzeżone",
    subscribe: "Zapisz się do newslettera",
    placeholder: "Twój adres e-mail",
    thanks: "Dziękujemy za zapis!",
    invalidEmail: "Proszę wprowadzić poprawny adres e-mail",
    subscribeError: "Subskrypcja nie powiodła się. Spróbuj ponownie.",
    backToTop: "Do góry",
    links: "Linki",
    about: "O nas",
    contact: "Kontakt",
    privacy: "Polityka prywatności",
    terms: "Regulamin",
    imprint: "Impressum",
  },
};

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function Footer({ locale }: { locale: Locale }) {
  const year = new Date().getFullYear();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const t = translations[locale] ?? translations.en;

  /* -------- handlers -------- */
  const handleScrollTop = () =>
    window.scrollTo({ top: 0, behavior: "smooth" });

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      toast.error(t.invalidEmail);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      toast.success(t.thanks);
      setEmail("");
    } catch {
      toast.error(t.subscribeError);
    } finally {
      setLoading(false);
    }
  };

  /* -------- JSX -------- */
  return (
    <footer className="relative bg-gray-900/90 backdrop-blur border-t border-gray-700 text-gray-300 shadow-md pt-16 pb-32 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12 relative z-10">
        {/* logo + description */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Image src="/images/logo.png" alt="Logo" width={32} height={32} />
            <span className="font-semibold text-white text-lg">Trifuzja Mix</span>
          </div>
          <p className="text-sm text-gray-400">
            {locale === "pl"
              ? "Odkrywaj najlepsze artykuły i treści na Trifuzja Mix."
              : "Explore the best articles and content on Trifuzja Mix."}
          </p>
        </div>

        {/* links */}
        <div className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-white mb-2">{t.links}</span>
          <Link href={`/${locale}`} className="hover:text-blue-400">Home</Link>
          <Link href={`/${locale}/articles`} className="hover:text-blue-400">Articles</Link>
          <Link href={`/${locale}/about`} className="hover:text-blue-400">{t.about}</Link>
          <Link href={`/${locale}/contact`} className="hover:text-blue-400">{t.contact}</Link>
          <Link href={`/${locale}/privacy`} className="hover:text-blue-400">{t.privacy}</Link>
          <Link href={`/${locale}/terms`} className="hover:text-blue-400">{t.terms}</Link>
          <Link href={`/${locale}/imprint`} className="hover:text-blue-400">{t.imprint}</Link>
        </div>

        {/* subscribe */}
        <div className="flex flex-col gap-3">
          <span className="font-semibold text-white">{t.subscribe}</span>
          <form onSubmit={handleSubscribe} className="flex max-w-md" noValidate>
            <input
              type="email"
              required
              value={email}
              disabled={loading}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.placeholder}
              className="flex-1 px-4 py-2 bg-zinc-800 text-white border border-zinc-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-md transition disabled:opacity-60"
            >
              {loading ? "…" : "OK"}
            </button>
          </form>
        </div>

        {/* socials + top */}
        <div className="flex flex-col items-start sm:items-end gap-4">
          <div className="flex gap-4 text-white text-xl">
            <a
              href="https://tiktok.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-pink-400 transition"
              aria-label="TikTok"
            >
              <FaTiktok />
            </a>
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-red-500 transition"
              aria-label="YouTube"
            >
              <FaYoutube />
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-500 transition"
              aria-label="Facebook"
            >
              <FaFacebookF />
            </a>
          </div>
          <button
            onClick={handleScrollTop}
            className="flex items-center gap-1 text-xs hover:text-white transition mt-2"
            aria-label={t.backToTop}
          >
            <ChevronUp size={16} /> {t.backToTop}
          </button>
        </div>
      </div>

      {/* bottom bar */}
      <div className="mt-10 text-center text-xs text-gray-500 border-t border-gray-700 pt-6">
        © {year} Trifuzja Mix — {t.copyright}
      </div>

      {/* decorative wave */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden pointer-events-none">
        <svg
          className="block w-[200%] h-24 rotate-180 scale-x-[-1]"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M0,0 C300,100 900,0 1200,100 L1200,0 L0,0 Z" fill="#1f2937" />
        </svg>
      </div>
    </footer>
  );
}
