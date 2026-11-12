"use client";

import Link from "next/link";
import { ArrowRight, ChevronRight, Info, Sprout } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./services-assist-homeopathy.module.css";

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
    safety: "La idoneidad y necesidad de cualquier remedio deben revisarse con un profesional cualificado. La homeopatía carece de pruebas fiables de eficacia para tratar enfermedades y no sustituye la atención médica.",
    consultation: "Consulta de psicohomeopatía",
    master: "Andrey · en línea y en Toronto",
    details: "Comenta tu situación y confirma el formato de la sesión.",
    action: "Solicitar consulta", note: "Horario y precio se confirman antes de reservar.",
  },
} as const;

/** Mobile Assist offers library exploration, no prescribing, diagnosis, or network inference. */
export function ServicesAssistHomeopathy({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  // Published primary library covers RU and EN; ES uses its EN descriptions.
  const libraryLocale = locale === "es" ? "en" : locale;
  return <section className={styles.panel} data-assist-homeopathy aria-labelledby="assist-homeopathy-title">
    <div className={styles.heading}>
      <span className={styles.mark} aria-hidden="true"><Sprout size={19} /></span>
      <div><p className={styles.eyebrow}>{t.eyebrow}</p><h3 id="assist-homeopathy-title">{t.heading}</h3></div>
    </div>
    <p className={styles.lead}>{t.lead}</p>
    <div className={styles.cards}>
      {remedies.map((item, index) => <Link
        key={item.slug}
        className={styles.remedy}
        data-assist-remedy={item.slug}
        href={"/" + libraryLocale + "/homeopathy/remedies/" + item.slug}
        prefetch={false}
        aria-label={item.name + ": " + t.descriptions[index] + ". " + t.read}>
        {/* Original author-approved archive image, not a guessed botanical photograph. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.photo} alt={item.name} width={86} height={82} loading="lazy" decoding="async" />
        <span className={styles.remedyCopy}>
          <strong>{item.name}</strong><span>{t.descriptions[index]}</span><small>{t.read}</small>
        </span>
        <ChevronRight size={19} aria-hidden="true" />
      </Link>)}
    </div>
    <p className={styles.safety}><Info size={18} aria-hidden="true" /><span>{t.safety}</span></p>
    <aside className={styles.booking} aria-label={t.consultation}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.portrait} src="/images/holistic-house/andy-about.png"
        alt="Andrey Litvinov" width={92} height={114} loading="lazy" decoding="async" />
      <div className={styles.bookingContent}>
        <h4>{t.consultation}</h4><p className={styles.name}>{t.master}</p>
        <p className={styles.details}>{t.details}</p>
        <Link href="#consultation" className={styles.cta} prefetch={false}>
          {t.action}<ArrowRight size={17} aria-hidden="true" />
        </Link>
        <small>{t.note}</small>
      </div>
    </aside>
  </section>;
}
