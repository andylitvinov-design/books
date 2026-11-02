import Link from "next/link";
import { tantraVoices } from "@/data/academy/energywork-ai-curriculum";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./tantra-learner-review-cards.module.css";

const copy = {
  en: {
    eyebrow: "LEARNER EXPERIENCES",
    title: "Voices from Tantra Reiki",
    tantraIntro: "Four complete personal accounts preserved from the original Tantra Reiki archive. They describe individual experiences, not guaranteed outcomes.",
    practitionerIntro: "These are personal experiences with Tantra Reiki practices featured in the programme, not reviews of the entire five-lesson Reiki Practitioner course. Results are individual.",
    source: "View original programme",
  },
  ru: {
    eyebrow: "ОТЗЫВЫ УЧЕНИКОВ",
    title: "Голоса участников Тантра Рейки",
    tantraIntro: "Четыре полных отзыва из оригинального архива Тантра Рейки: личный опыт участников, а не обещание результата.",
    practitionerIntro: "Это личные впечатления о практиках Тантра Рейки, представленных в программе, а не отзывы обо всём пятиурочном курсе Reiki Practitioner. Опыт каждого индивидуален.",
    source: "Исходная программа",
  },
  es: {
    eyebrow: "EXPERIENCIAS DE ALUMNOS",
    title: "Voces de Tantra Reiki",
    tantraIntro: "Cuatro testimonios completos del archivo original de Tantra Reiki. Se muestran en inglés para conservar su versión archivada; son experiencias personales, no resultados garantizados.",
    practitionerIntro: "Experiencias individuales con Tantra Reiki, una de las prácticas del programa, no reseñas del curso completo Reiki Practitioner. Los textos se muestran en inglés según el archivo; no garantizan resultados.",
    source: "Ver el programa original",
  },
} as const;

const spanishAttribution: Record<string, string> = {
  margaret: "Margaret · participante",
  olga: "Olga · participante",
  litten: "Litten · participante",
  "tantra-level-1": "Participante anónima · Nivel 1",
};

export function TantraLearnerReviewCards({
  locale,
  headingId,
  context = "tantra",
}: {
  locale: PublicLocale;
  headingId: string;
  context?: "tantra" | "practitioner";
}) {
  const t = copy[locale];
  const reviewLanguage = locale === "es" ? "en" : locale;

  return (
    <div className={styles.root} data-tantra-full-learner-reviews data-review-count={tantraVoices.length}>
      <div className={styles.heading}>
        <p className={styles.eyebrow}>{t.eyebrow}</p>
        <h2 id={headingId}>{t.title}</h2>
        <p>{context === "practitioner" ? t.practitionerIntro : t.tantraIntro}</p>
      </div>
      <div className={styles.grid}>
        {tantraVoices.map((review, index) => (
          <figure className={styles.card} key={review.id} data-tantra-review-id={review.id}>
            <span className={styles.ordinal} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <blockquote className={styles.quote} lang={reviewLanguage}>
              <p>{review.quote[reviewLanguage]}</p>
            </blockquote>
            <figcaption className={styles.caption}>
              <strong>{locale === "es" ? spanishAttribution[review.id] : review.attribution[reviewLanguage]}</strong>
              <Link href={"/" + locale + "/academy/" + review.sourcePath + "#tantra-full-source"}>
                {t.source} <span aria-hidden="true">↗</span>
              </Link>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
