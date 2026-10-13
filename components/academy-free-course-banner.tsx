import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3, Sparkles } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./academy-free-course-banner.module.css";

const copy = {
  en: {
    eyebrow: "HOLISTIC HOUSE · FREE SELF-GUIDED COURSE",
    title: "Free psychological support & personal growth course",
    description: "Choose what matters now — stress, confidence or concentration. Start with a few check-in tests, then explore 14 days of small, practical exercises at your own pace.",
    duration: "14 days",
    daily: "5–12 min a day",
    cta: "Start my free course",
    note: "Your choices and progress are only saved with your consent.",
    caution: "Self-guided education and support, not a diagnosis, psychotherapy or emergency care.",
    visualTitle: "A small step every day",
    visualDays: "DAYS",
    visualSteps: ["Choose a focus", "Check your starting point", "Build your daily practice"],
  },
  ru: {
    eyebrow: "HOLISTIC HOUSE · БЕСПЛАТНЫЙ КУРС",
    title: "Бесплатный курс психокоррекции и поддержки",
    description: "Выберите то, что важно сейчас: снижение стресса, уверенность или концентрация. Пройдите тесты для оценки исходного состояния и начните 14 дней коротких практик в своём темпе.",
    duration: "14 дней",
    daily: "5–12 мин в день",
    cta: "Начать бесплатный курс",
    note: "Ваш выбор и прогресс сохраняются только с вашего согласия.",
    caution: "Самостоятельная программа поддержки, не диагностика, психотерапия или экстренная помощь.",
    visualTitle: "Маленький шаг каждый день",
    visualDays: "ДНЕЙ",
    visualSteps: ["Выбрать тему", "Пройти тесты", "Практиковать ежедневно"],
  },
  es: {
    eyebrow: "HOLISTIC HOUSE · CURSO GRATUITO",
    title: "Curso gratuito de apoyo psicológico y crecimiento personal",
    description: "Elige lo que más te importa: estrés, confianza o concentración. Realiza una evaluación inicial con cuestionarios y explora 14 días de prácticas breves a tu propio ritmo.",
    duration: "14 días",
    daily: "5–12 min al día",
    cta: "Empezar gratis",
    note: "El curso se abrirá en inglés. Tus datos solo se guardan con tu consentimiento.",
    caution: "Aprendizaje y apoyo autónomo; no sustituye el diagnóstico, la psicoterapia ni la atención urgente.",
    visualTitle: "Un pequeño paso cada día",
    visualDays: "DÍAS",
    visualSteps: ["Elegir un tema", "Evaluar el inicio", "Practicar cada día"],
  },
} as const;

export function AcademyFreeCourseBanner({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  // The personal-course workspace currently supports en/ru only.
  const courseLocale = locale === "es" ? "en" : locale;

  return (
    <section className={styles.banner} aria-labelledby="academy-free-course-title">
      <div className={styles.content}>
        <p className={styles.eyebrow}><Sparkles aria-hidden="true" size={15} />{t.eyebrow}</p>
        <h2 id="academy-free-course-title" className={styles.title}>{t.title}</h2>
        <p className={styles.description}>{t.description}</p>
        <div className={styles.facts}>
          <span><CalendarDays aria-hidden="true" size={17} />{t.duration}</span>
          <span><Clock3 aria-hidden="true" size={17} />{t.daily}</span>
        </div>
        <div className={styles.actions}>
          <Link href={`/${courseLocale}/app/course`} prefetch={false} className={styles.cta}>
            {t.cta}<ArrowRight aria-hidden="true" size={19} />
          </Link>
          <span className={styles.note}>{t.note}</span>
        </div>
        <p className={styles.caution}>{t.caution}</p>
      </div>
      <div className={styles.visual} aria-hidden="true">
        <div className={styles.orbit}>
          <span className={styles.orbitNumber}>14</span>
          <span className={styles.orbitDays}>{t.visualDays}</span>
        </div>
        <div className={styles.visualCaption}>{t.visualTitle}</div>
        <div className={styles.steps}>
          {t.visualSteps.map((step, index) => (
            <span className={styles.step} key={step}>
              <span className={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span>
              {step}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
