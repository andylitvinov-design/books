import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3, Sparkles } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./academy-free-course-banner.module.css";

const copy = {
  en: {
    eyebrow: "HOLISTIC HOUSE · FREE AI COURSES",
    title: "OPORA Stress Relief — free 14-day course",
    description: "Fourteen gentle lessons and seven practical skills for managing everyday stress. Optional check-ins and short exercises, at your own pace.",
    duration: "14 days",
    daily: "5–12 min a day",
    cta: "Start my free course", learn: "Learn about the course", myCourses: "My courses",
    note: "Your choices and progress are only saved with your consent.",
    caution: "Self-guided education and support, not a diagnosis, psychotherapy or emergency care.",
    visualTitle: "A small step every day",
    visualDays: "DAYS",
    visualSteps: ["Check in gently", "Choose your focus", "Practise each day"],
  },
  ru: {
    eyebrow: "HOLISTIC HOUSE · БЕСПЛАТНЫЕ ИИ-КУРСЫ",
    title: "ОПОРА — Антистресс · бесплатный курс на 14 дней",
    description: "Четырнадцать занятий и семь навыков саморегуляции повседневного стресса. Необязательные замеры и короткие упражнения в вашем темпе.",
    duration: "14 дней",
    daily: "5–12 мин в день",
    cta: "Начать бесплатный курс", learn: "Подробнее о курсе", myCourses: "Мои курсы",
    note: "Ваш выбор и прогресс сохраняются только с вашего согласия.",
    caution: "Самостоятельная программа поддержки, не диагностика, психотерапия или экстренная помощь.",
    visualTitle: "Маленький шаг каждый день",
    visualDays: "ДНЕЙ",
    visualSteps: ["Отметить своё состояние", "Выбрать личный фокус", "Практиковать ежедневно"],
  },
  es: {
    eyebrow: "HOLISTIC HOUSE · CURSOS DE IA GRATUITOS",
    title: "OPORA Antiestrés — curso gratuito de 14 días",
    description: "Catorce lecciones y siete habilidades para afrontar el estrés cotidiano, con cuestionarios opcionales y prácticas breves a tu ritmo.",
    duration: "14 días",
    daily: "5–12 min al día",
    cta: "Empezar gratis", learn: "Conocer el curso", myCourses: "Mis cursos",
    note: "El curso se abrirá en inglés. Tus datos solo se guardan con tu consentimiento.",
    caution: "Aprendizaje y apoyo autónomo; no sustituye el diagnóstico, la psicoterapia ni la atención urgente.",
    visualTitle: "Un pequeño paso cada día",
    visualDays: "DÍAS",
    visualSteps: ["Observar tu estado", "Elegir tu enfoque", "Practicar cada día"],
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
          <Link href={`/${courseLocale}/app/course?program=stress`} prefetch={false} className={styles.cta}>
            {t.cta}<ArrowRight aria-hidden="true" size={19} />
          </Link>
          <Link href={"/" + locale + "/courses/antistress"} className={styles.learn}>{t.learn}<ArrowRight aria-hidden="true" size={16} /></Link>
          <Link href={"/" + locale + "/academy/free-ai-courses#my-courses"} className={styles.learn}>{t.myCourses}<ArrowRight aria-hidden="true" size={16} /></Link>
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
