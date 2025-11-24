//E:\trifuzja-mix\app\components\Footer.tsx
"use client";

import { useState } from "react";
import { ChevronUp } from "lucide-react";
import { FaFacebookF, FaYoutube, FaTiktok } from "react-icons/fa";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";

type Locale = "en" | "pl";

const translations: Record<
  Locale,
  {
    copyright: string;
    subscribe: string;
    placeholder: string;
    thanks: string;
    invalidEmail: string;
    subscribeError: string;
    backToTop: string;
    links: string;
    about: string;
    contact: string;
    privacy: string;
    terms: string;
    imprint: string;
    cookies: string;
    ok: string;
    consentLabel: string;
    consentRequired: string;
    home: string;
    articles: string;
    // videos: string; // ✅ جديد
  }
> = {
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
    cookies: "Cookies Policy",
    ok: "OK",
    consentLabel:
      "I consent to receive email updates. See the Privacy Policy for details.",
    consentRequired: "Please accept the consent to subscribe.",
    home: "Home",
    articles: "Articles",
    // videos: "Videos", // ✅ جديد
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
    cookies: "Polityka Cookies",
    ok: "OK",
    consentLabel:
      "Wyrażam zgodę na otrzymywanie wiadomości e-mail. Szczegóły w Polityce Prywatności.",
    consentRequired: "Aby się zapisać, zaznacz zgodę.",
    home: "Home",
    articles: "Artykuły",
    // videos: "Wideo", // ✅ جديد
  },
};

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

type FooterProps = {
  locale: Locale;
  /** إظهار رابط سياسة الكوكيز (مفعّل افتراضيًا الآن) */
  showCookiesLink?: boolean;
  /** طلب الموافقة الصريحة على الاشتراك (موصى به قانونيًا) */
  requireNewsletterConsent?: boolean;
};

export function Footer({
  locale,
  showCookiesLink = true,
  requireNewsletterConsent = true,
}: FooterProps) {
  const year = new Date().getFullYear();
  const t = translations[locale] ?? translations.en;

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState(false);
  // honeypot ضد السبام
  const [hp, setHp] = useState("");

  const emailInvalid = email.length > 0 && !validateEmail(email);
  const disableSubmit =
    loading || emailInvalid || (requireNewsletterConsent && !consent);

  const handleScrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const handleSubscribe = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      toast.error(t.invalidEmail);
      return;
    }
    if (requireNewsletterConsent && !consent) {
      toast.error(t.consentRequired);
      return;
    }
    if (hp) {
      setEmail("");
      setConsent(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          consent: requireNewsletterConsent ? true : undefined,
          locale,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(t.thanks);
      setEmail("");
      setConsent(false);
    } catch {
      toast.error(t.subscribeError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="relative bg-gray-900/90 backdrop-blur border-t border-gray-700 text-gray-300 shadow-md pt-16 pb-32 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12 relative z-10">
        {/* logo + description */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Image
              src="/images/logo.png"
              alt="MENSITIVA logo"
              width={32}
              height={32}
              priority
            />
            <span className="font-semibold text-white text-lg">MENSITIVA</span>
          </div>
          <p className="text-sm text-gray-400">
            {locale === "pl"
              ? "Odkrywaj najlepsze treści na MENSITIVA."
              : "Explore the best content on MENSITIVA."}
          </p>
        </div>

        {/* links */}
        <nav className="flex flex-col gap-2 text-sm" aria-label={t.links}>
          <span className="font-semibold text-white mb-2">{t.links}</span>
          <Link href={`/${locale}`} className="hover:text-blue-400">
            {t.home}
          </Link>
          <Link href={`/${locale}/articles`} className="hover:text-blue-400">
            {t.articles}
          </Link>
          {/* ✅ الرابط الجديد ليتطابق مع الهيدر */}
          {/* <Link href={`/${locale}/videos`} className="hover:text-blue-400">
            {t.videos}
          </Link> */}
          <Link href={`/${locale}/about`} className="hover:text-blue-400">
            {t.about}
          </Link>
          <Link href={`/${locale}/contact`} className="hover:text-blue-400">
            {t.contact}
          </Link>
          <Link href={`/${locale}/privacy`} className="hover:text-blue-400">
            {t.privacy}
          </Link>
          <Link href={`/${locale}/terms`} className="hover:text-blue-400">
            {t.terms}
          </Link>
          <Link href={`/${locale}/imprint`} className="hover:text-blue-400">
            {t.imprint}
          </Link>
          {showCookiesLink && (
            <Link href={`/${locale}/cookies`} className="hover:text-blue-400">
              {t.cookies}
            </Link>
          )}
        </nav>

        {/* subscribe */}
        <div className="flex flex-col gap-3">
          <span className="font-semibold text-white">{t.subscribe}</span>
          <form onSubmit={handleSubscribe} className="flex flex-col gap-2 max-w-md" noValidate>
            {/* honeypot */}
            <input
              type="text"
              name="website"
              value={hp}
              onChange={(e) => setHp(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
              aria-hidden="true"
            />
            <div className="flex">
              <input
                type="email"
                required
                value={email}
                disabled={loading}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.placeholder}
                aria-label={t.placeholder}
                aria-invalid={emailInvalid}
                inputMode="email"
                autoComplete="email"
                className={[
                  "flex-1 px-4 py-2 bg-zinc-800 text-white border rounded-l-md focus:outline-none focus:ring-2",
                  emailInvalid
                    ? "border-red-500 focus:ring-red-500"
                    : "border-zinc-600 focus:ring-blue-500",
                  loading ? "opacity-60" : "",
                ].join(" ")}
              />
              <button
                type="submit"
                disabled={disableSubmit}
                className="bg-blue-600 hover:bg-blue-700 disabled:hover:bg-blue-600 text-white px-4 py-2 rounded-r-md transition disabled:opacity-60"
                aria-label={t.ok}
                title={
                  emailInvalid
                    ? t.invalidEmail
                    : requireNewsletterConsent && !consent
                    ? t.consentRequired
                    : ""
                }
              >
                {loading ? "…" : t.ok}
              </button>
            </div>
            {/* consent (GDPR) */}
            <label className="flex items-start gap-2 text-xs text-gray-400">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5"
                aria-required={requireNewsletterConsent}
              />
              <span>
                {t.consentLabel}{" "}
                <Link href={`/${locale}/privacy`} className="underline">
                  {t.privacy}
                </Link>
                {showCookiesLink && (
                  <>
                    {" "}|{" "}
                    <Link href={`/${locale}/cookies`} className="underline">
                      {t.cookies}
                    </Link>
                  </>
                )}
                .
              </span>
            </label>
          </form>
        </div>

        {/* socials + top */}
        <div className="flex flex-col items-start sm:items-end gap-4">
          <div className="flex gap-4 text-white text-xl">
            <a
              href="https://tiktok.com"
              target="_blank"
              rel="nofollow noopener noreferrer"
              className="hover:text-pink-400 transition"
              aria-label="TikTok"
            >
              <FaTiktok />
            </a>
            <a
              href="https://youtube.com"
              target="_blank"
              rel="nofollow noopener noreferrer"
              className="hover:text-red-500 transition"
              aria-label="YouTube"
            >
              <FaYoutube />
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="nofollow noopener noreferrer"
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
        © {year} MENSITIVA — {t.copyright}
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
