import type { Metadata } from "next";
import React from "react";

/* ------------ Locale ------------ */
type Locale = "en" | "pl";

/* ------------ Translations ------------ */
const i18n = {
  en: {
    title: "Imprint",
    heading: "Imprint (Legal Notice)",
    lastUpdate: "Last updated: ",
    blocks: [
      "**COMPANY_NAME**\n**STREET_ADDRESS**\n**POSTCODE CITY**\n**COUNTRY**",
      "Represented by: **FIRST_NAME LAST_NAME** (Managing Director)",
      "Commercial Register: **LOCAL COURT CITY**, HRB **NUMBER**",
      "VAT ID (§ 27 a UStG): **DE 123 456 789**",
    ],
    contentHeading: "Liability for Contents",
    contentText:
      "As service provider, we are liable for own contents according to § 7 (1) TMG. According to §§ 8–10 TMG we are not obliged to monitor transmitted or stored third‑party information or investigate circumstances indicating illegal activity.",
    linksHeading: "Liability for Links",
    linksText:
      "Our site contains links to external websites of third parties over whose content we have no influence. Therefore we cannot assume any liability for these external contents.",
  },
  pl: {
    title: "Impressum",
    heading: "Impressum (Nota prawna)",
    lastUpdate: "Ostatnia aktualizacja: ",
    blocks: [
      "**NAZWA_FIRMY**\n**ADRES_ULICA**\n**KOD MIASTO**\n**PAŃSTWO**",
      "Reprezentowana przez: **IMIĘ NAZWISKO** (Prezes Zarządu)",
      "Rejestr Handlowy: **SĄD REJONOWY**, KRS **NUMER**",
      "NIP / VAT UE: **PL 123 456 7890**",
    ],
    contentHeading: "Odpowiedzialność za treści",
    contentText:
      "Jako usługodawca odpowiadamy za własne treści na tych stronach zgodnie z § 7 (1) TMG. Zgodnie z §§ 8‑10 TMG nie jesteśmy jednak zobowiązani do monitorowania przekazywanych lub przechowywanych informacji ani badania okoliczności wskazujących na działalność bezprawną.",
    linksHeading: "Odpowiedzialność za linki",
    linksText:
      "Nasza oferta zawiera linki do zewnętrznych stron internetowych osób trzecich, na których zawartość nie mamy wpływu. Dlatego nie możemy ponosić odpowiedzialności za te obce treści.",
  },
} as const;

type Dict = (typeof i18n)[keyof typeof i18n];

/* ------------ Metadata ------------ */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t: Dict = i18n[locale] ?? i18n.en;
  return {
    title: `${t.title} | Trifuzja Mix`,
    description: "Legal notice for Trifuzja Mix.",
  };
}

/* ------------ Page ------------ */
export default async function ImprintPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t: Dict = i18n[locale] ?? i18n.en;

  const formattedDate = new Intl.DateTimeFormat(
    locale === "pl" ? "pl-PL" : "en-GB",
    { year: "numeric", month: "long", day: "numeric" },
  ).format(new Date());

  return (
    <main className="min-h-screen flex justify-center px-4 pt-4 pb-24 bg-gradient-to-br from-blue-50 via-sky-50 to-emerald-50 dark:from-zinc-800 dark:via-zinc-900 dark:to-zinc-950">
      {/* Card with internal scroll when needed */}
      <article className="w-full max-w-3xl max-h-[85vh] overflow-y-auto scrollbar-thin rounded-3xl bg-white/80 dark:bg-zinc-900/85 shadow-xl ring-1 ring-gray-100 dark:ring-zinc-800 backdrop-blur-lg animate-fade-in">
        {/* top accent */}
        <div className="h-[3px] w-full bg-gradient-to-r from-sky-500 via-indigo-500 to-fuchsia-600" />

        <div className="prose dark:prose-invert max-w-none px-6 md:px-10 py-6">
          <h1 className="!mb-5 text-center font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-fuchsia-600 dark:from-sky-400 dark:to-fuchsia-400">
            {t.heading}
          </h1>

          {t.blocks.map((blk) => (
            <p key={blk} className="leading-relaxed">
              {blk.split("\n").map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  <br />
                </React.Fragment>
              ))}
            </p>
          ))}

          <h2>{t.contentHeading}</h2>
          <p>{t.contentText}</p>

          <h2>{t.linksHeading}</h2>
          <p>{t.linksText}</p>

          <hr className="border-dashed" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t.lastUpdate}
            {formattedDate}
          </p>
        </div>
      </article>
    </main>
  );
}
