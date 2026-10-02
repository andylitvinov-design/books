import Link from "next/link";

const copy = {
  en: { eyebrow: "A quiet first step", title: "Request a personal consultation", text: "Share a short note about what you would like to explore, and choose a comfortable way to continue the conversation.", action: "Request a consultation" },
  ru: { eyebrow: "Спокойный первый шаг", title: "Запросить личную консультацию", text: "Оставьте короткую заявку о том, что хотите разобрать, и выберите удобный способ продолжить разговор.", action: "Запросить консультацию" },
  es: { eyebrow: "Un primer paso tranquilo", title: "Solicitar una consulta personal", text: "Escribe una breve nota sobre lo que te gustaría explorar y elige una forma cómoda de continuar la conversación.", action: "Solicitar una consulta" },
} as const;

export function PublicConsultationCta({ locale }: { locale: "en" | "ru" | "es" }) {
  const text = copy[locale];
  return <aside className="public-consultation-cta" aria-label={text.title} data-consultation-cta lang={locale}>
    <div><p>{text.eyebrow}</p><h2>{text.title}</h2><span>{text.text}</span></div>
    <Link href={`/${locale}/about#personal-consultation-title`}>{text.action}<span aria-hidden="true">→</span></Link>
  </aside>;
}
