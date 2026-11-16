"use client";

import Link from "next/link";
import { ArrowRight, ChevronRight, Info, Sprout } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./services-assist-homeopathy.module.css";
import { matchRemedyDescriptions } from "@/lib/remedies/assist-matcher.mjs";
import media from "@/data/assist-remedy-media.json";

// Author-approved public archival images and real library pages.
// This is a fixed educational showcase, not patient-specific matching.
const remedies = [
  { slug: "gelsemium", name: "Gelsemium", photo: "/media/remedies/gelsemium/message158-1.jpg" },
  { slug: "ignatia-amara", name: "Ignatia amara", photo: "/media/remedies/ignatia-amara/message54-1.jpg" },
  { slug: "nux-vomica", name: "Nux vomica", photo: "/media/remedies/nux-vomica/message1070-1.jpg" },
] as const;

const copy = {
  ru: {
    heading: "Гомеопатия", eyebrow: "Из библиотеки «Алхимия души»",
    lead: "Три образа препаратов для знакомства с авторским подходом — не персональное назначение.",
    read: "Читать описание", descriptions: [
      "Волнение, страх и замирание перед важным шагом",
      "Невысказанные переживания, утрата и внутренняя боль",
      "Перегрузка, внутренняя спешка и стремление всё контролировать",
    ],
    matched: "Найдены похожие описания в авторском архиве, но это не выбор препарата для лечения.",
    excerpt: "Совпавшие признаки",
    poem: "Стих-настройка",
    empty: "Недостаточно характерных деталей. Уточните ощущения, когда они возникают и что их меняет.",
    urgent: "При таких симптомах не следует выбирать препарат по каталогу. Обратитесь за срочной медицинской помощью.",
    safety: "Точный выбор препарата и необходимость его применения обсуждаются со специалистом. Гомеопатия не имеет надёжных доказательств эффективности для лечения заболеваний и не заменяет медицинскую помощь.",
    consultation: "Консультация по психогомеопатии",
    master: "Андрей · онлайн и в Торонто",
    details: "Разобрать свой запрос лично и уточнить подходящий формат встречи.",
    action: "Запросить запись", note: "Время и стоимость подтверждаются до записи.",
  },
  en: {
    heading: "Homeopathy", eyebrow: "From the Alchemy of the Soul library",
    lead: "Three traditional remedy portraits to explore — not personalised prescriptions.",
    read: "Read description", descriptions: [
      "Feeling frozen or fearful before an important step",
      "Unexpressed feelings, grief and inner emotional pain",
      "Overload, rushing and the urge to control everything",
    ],
    matched: "Similar descriptions in the author’s archive, not a treatment recommendation.",
    excerpt: "Matching features",
    poem: "Original poem",
    empty: "Not enough distinctive details. Describe the sensations, when they happen and what affects them.",
    urgent: "Do not select a remedy from this catalogue for these symptoms. Seek urgent medical care.",
    safety: "Discuss the suitability and necessity of any remedy with a qualified professional. Homeopathy lacks reliable evidence of effectiveness for treating medical conditions and does not replace medical care.",
    consultation: "Psycho-homeopathy consultation",
    master: "Andrey · online and in Toronto",
    details: "Discuss your own question and confirm the appropriate session format.",
    action: "Request a session", note: "Availability and price are confirmed before booking.",
  },
  es: {
    heading: "Homeopatía", eyebrow: "De la biblioteca Alquimia del Alma",
    lead: "Tres retratos tradicionales de remedios para conocer el método, no prescripciones personales.",
    read: "Leer descripción", descriptions: [
      "Temor e inmovilidad antes de un paso importante",
      "Emociones no expresadas, pérdida y dolor interior",
      "Sobrecarga, prisas y necesidad de controlarlo todo",
    ],
    matched: "Descripciones similares del archivo, no una recomendación de tratamiento.",
    excerpt: "Rasgos coincidentes",
    poem: "Poema (en ruso)",
    empty: "Faltan detalles distintivos. Describe las sensaciones, cuándo aparecen y qué las cambia.",
    urgent: "No elijas un remedio del catálogo para estos síntomas. Busca atención médica urgente.",
    safety: "La idoneidad y necesidad de cualquier remedio deben revisarse con un profesional cualificado. La homeopatía carece de pruebas fiables de eficacia para tratar enfermedades y no sustituye la atención médica.",
    consultation: "Consulta de psicohomeopatía",
    master: "Andrey · en línea y en Toronto",
    details: "Comenta tu situación y confirma el formato de la sesión.",
    action: "Solicitar consulta", note: "Horario y precio se confirman antes de reservar.",
  },
} as const;

/** One source-backed educational panel, retaining the approved photography and consultation design. */
export function ServicesAssistHomeopathy({ locale, query = "" }: { locale: PublicLocale; query?: string }) {
  const t = copy[locale];
  const libraryLocale = locale === "es" ? "en" : locale;
  const result = matchRemedyDescriptions(query, locale);
  // Explicit topic-only prompts use the approved, clearly non-personalised library examples.
  // Real free text is either matched to source symptoms or receives an honest abstention.
  const featured = ["Хочу уменьшить стресс и тревогу", "Меня беспокоят стресс и тревога",
    "I need help with stress and anxiety", "I feel stressed and anxious",
    "Busco apoyo con estrés y ansiedad", "Siento estrés y ansiedad"].includes(query.trim());
  const matched = result.status === "matches" && !featured;
  const cards = matched ? result.matches.map(({ slug, matchedSymptoms }) => ({
    slug,
    name: slug.split("-").map((part, index) => index ? part : part[0].toUpperCase() + part.slice(1)).join(" "),
    photo: (media.images as Record<string, string>)[slug] || "",
    description: matchedSymptoms.join(" · "),
    poem: media.poemSlugs.includes(slug),
  })) : featured ? remedies.map((item, index) => ({ ...item,
    description: t.descriptions[index], poem: false })) : [];
  return <section className={styles.panel} data-assist-homeopathy data-assist-homeopathy-mind aria-labelledby="assist-homeopathy-title">
    <div className={styles.heading}>
      <span className={styles.mark} aria-hidden="true"><Sprout size={19} /></span>
      <div><p className={styles.eyebrow}>{t.eyebrow}</p><h3 id="assist-homeopathy-title">{t.heading}</h3></div>
    </div>
    <p className={styles.lead}>{matched ? t.matched : t.lead}</p>
    {result.status === "urgent" ? <p role="alert" className={styles.empty}>{t.urgent}</p> :
    cards.length ? <div className={styles.cards}>
      {cards.map((item) => <div className={styles.remedyWrap} key={item.slug}>
        <Link className={styles.remedy} data-assist-remedy={item.slug}
          href={"/" + libraryLocale + "/homeopathy/remedies/" + item.slug} prefetch={false}
          aria-label={item.name + ": " + item.description + ". " + t.read}>
          {item.photo ? <>
            {/* Approved original source image, without a new remote image transformation. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.photo} alt={item.name} width={86} height={82} loading="lazy" decoding="async" />
          </> : <span className={styles.photoFallback}><Sprout size={24} aria-hidden="true" /></span>}
          <span className={styles.remedyCopy}>
            <strong>{item.name}</strong>
            {matched && <small className={styles.evidence}>{t.excerpt}</small>}
            <span>{item.description}</span><small>{t.read}</small>
          </span>
          <ChevronRight size={19} aria-hidden="true" />
        </Link>
        {item.poem && <Link className={styles.poem} prefetch={false}
          href={"/" + (locale === "es" ? "ru" : locale) + "/homeopathy/attunements/" + item.slug}>
          {t.poem}<ArrowRight size={15} aria-hidden="true" />
        </Link>}
      </div>)}
    </div> : <p className={styles.empty}>{t.empty}</p>}
    <p className={styles.safety}><Info size={18} aria-hidden="true" /><span>{t.safety}</span></p>
    {result.status !== "urgent" && <aside className={styles.booking} aria-label={t.consultation}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.portrait} src="/images/holistic-house/andy-about.png"
        alt="Andrey Litvinov" width={92} height={114} loading="lazy" decoding="async" />
      <div className={styles.bookingContent}>
        <h4>{t.consultation}</h4><p className={styles.name}>{t.master}</p>
        <p className={styles.details}>{t.details}</p>
        <Link href={"/" + locale + "/services/psychohomeopathy"} className={styles.cta} prefetch={false}>
          {t.action}<ArrowRight size={17} aria-hidden="true" />
        </Link>
        <small>{t.note}</small>
      </div>
    </aside>}
  </section>;
}
