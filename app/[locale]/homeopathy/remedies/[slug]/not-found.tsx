import Link from "next/link";
import { headers } from "next/headers";

const copy = {
  en: { heading: "Remedy not found", lead: "This entry is not present in the verified educational catalog.", back: "← Remedy directory" },
  ru: { heading: "Препарат не найден", lead: "Такой карточки нет в проверенном образовательном каталоге.", back: "← Справочник препаратов" },
  es: { heading: "Remedio no encontrado", lead: "Esta ficha no figura en el catálogo educativo verificado.", back: "← Catálogo de remedios" },
} as const;

export default async function RemedyNotFound() {
  const selected = (await headers()).get("x-public-page-locale");
  const locale = selected === "ru" || selected === "es" ? selected : "en";
  const text = copy[locale];
  return <main className="homeopathy-shell" lang={locale}>
    <title>{`404 — ${text.heading} | Holistic House`}</title>
    <meta name="description" content={text.lead} />
    <section className="remedy-empty"><p className="homeopathy-kicker">Holistic House</p>
      <h1>{text.heading}</h1><p>{text.lead}</p>
      <Link href={`/${locale}/homeopathy/remedies`}>{text.back}</Link>
    </section>
  </main>;
}
