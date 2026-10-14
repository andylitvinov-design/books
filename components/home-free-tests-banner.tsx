import Link from "next/link";
import { ArrowRight, ChartNoAxesCombined, ClipboardCheck, Sparkles } from "lucide-react";
import type { Locale } from "@/data/remedies";
import styles from "./academy-free-course-banner.module.css";
import homeStyles from "./home-free-tests-banner.module.css";

const copy = {
  ru: {
    eyebrow: "HOLISTIC HOUSE · БЕСПЛАТНЫЕ ТЕСТЫ",
    title: "Пройдите бесплатные тесты и лучше поймите себя",
    description: "Выберите то, что важно сейчас: отношения, бизнес и деньги, стресс, энергия или личная эффективность. Пройдите тематические тесты, узнайте свои результаты и получите рекомендации.",
    topics: "5 направлений",
    results: "Результаты и динамика",
    action: "Выбрать тему и пройти тесты",
    note: "Начните бесплатно — с темы, которая важна именно вам.",
    caution: "Самооценка для личного развития, не медицинская диагностика.",
    visualCaption: "От вопроса — к ясности",
    visualLabel: "НАПРАВЛЕНИЙ",
    steps: ["Выберите тему", "Пройдите подходящие тесты", "Изучите результаты"],
  },
  en: {
    eyebrow: "HOLISTIC HOUSE · FREE SELF-CHECK TESTS",
    title: "Explore free tests and understand yourself better",
    description: "Choose what matters now: relationships, business and money, stress, energy or personal effectiveness. Take relevant self-check tests, see your results and explore practical recommendations.",
    topics: "5 topic areas",
    results: "Results and trends",
    action: "Choose a topic and take free tests",
    note: "Start free — with the topic that matters to you.",
    caution: "Self-reflection for personal growth, not a medical diagnosis.",
    visualCaption: "From questions to clarity",
    visualLabel: "TOPICS",
    steps: ["Choose your topic", "Take relevant tests", "Explore your results"],
  },
} as const;

/** The CTA intentionally leads to the thematic chooser, not the legacy unfiltered test catalogue. */
export function HomeFreeTestsBanner({ locale }: { locale: Locale }) {
  const t = copy[locale];

  return (
    <div className={homeStyles.placement} data-home-free-tests-banner>
      <section className={`${styles.banner} ${homeStyles.banner}`} aria-labelledby="home-free-tests-title">
        <div className={styles.content}>
          <p className={styles.eyebrow}><Sparkles size={15} aria-hidden="true" />{t.eyebrow}</p>
          <h2 id="home-free-tests-title" className={styles.title}>{t.title}</h2>
          <p className={styles.description}>{t.description}</p>
          <div className={styles.facts}>
            <span><ClipboardCheck size={17} aria-hidden="true" />{t.topics}</span>
            <span><ChartNoAxesCombined size={17} aria-hidden="true" />{t.results}</span>
          </div>
          <div className={styles.actions}>
            <Link className={styles.cta} href="#hh-topic-journeys" prefetch={false}>
              {t.action}<ArrowRight size={19} aria-hidden="true" />
            </Link>
            <span className={styles.note}>{t.note}</span>
          </div>
          <p className={styles.caution}>{t.caution}</p>
        </div>
        <div className={styles.visual} aria-hidden="true">
          <div className={styles.orbit}>
            <span className={styles.orbitNumber}>5</span>
            <span className={styles.orbitDays}>{t.visualLabel}</span>
          </div>
          <div className={styles.visualCaption}>{t.visualCaption}</div>
          <div className={styles.steps}>
            {t.steps.map((step, index) => (
              <span className={styles.step} key={step}>
                <span className={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span>
                {step}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
