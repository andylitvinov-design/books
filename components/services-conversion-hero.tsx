import { StaticPortrait } from "@/components/static-portrait";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./services-conversion-hero.module.css";

const copy = {
  ru: {
    eyebrow: "HOLISTIC HOUSE · ЛИЧНАЯ РАБОТА",
    heading: "Больше ясности, опоры и вариантов движения",
    lead: "Три бесплатных способа начать: мониторинг психологического состояния и внутренних ресурсов, личный разбор ситуации или профиль У-Син. Личная работа — по желанию.",
    mobileLead: "Начните бесплатно: тесты самочувствия, письменный разбор ситуации или профиль ресурсов У-Син.",
    benefits: ["3 бесплатных направления", "Личная работа по желанию", "Торонто и онлайн"],
    cta: "Получить бесплатный письменный разбор",
    paidCta: "Личная консультация · от €50",
    secondary: "Все три бесплатных варианта",
    small: "Бесплатно: ваша анкета и рисунок → персональный письменный разбор. Личная встреча — отдельно и по желанию.",
    workWith: "Личная работа с Андреем Литвиновым, в Торонто и онлайн",
    solutions: "Личные форматы работы",
    imageLabel: "Лично с Андреем Литвиновым",
    caption: "Начните со своего вопроса",
  },
  en: {
    eyebrow: "HOLISTIC HOUSE · PERSONAL SUPPORT",
    heading: "More clarity, inner resources and choices",
    lead: "Three free ways to begin: free mental wellbeing and inner resources monitoring, a personal situation review, or a Wu Xing resource profile. Personal sessions are optional.",
    mobileLead: "Start free with wellbeing tests, a written situation review or a Wu Xing resource profile.",
    benefits: ["3 free starting points", "Optional one-to-one work", "Toronto & online"],
    cta: "Get a free written review",
    paidCta: "Personal consultation · from €50",
    secondary: "See all three free options",
    small: "Free: your form and drawing → personal written feedback. A live one-to-one session is separate and optional.",
    workWith: "Personal work with Andrey Litvinov, in Toronto and online",
    solutions: "Explore personal work options",
    imageLabel: "Personal work with Andrey Litvinov",
    caption: "Start with your question",
  },
  es: {
    eyebrow: "HOLISTIC HOUSE · ACOMPAÑAMIENTO PERSONAL",
    heading: "Más claridad, recursos y caminos para avanzar",
    lead: "Tres formas gratuitas de empezar: cuestionarios de autoobservación, revisión escrita de tu situación o perfil simbólico Wu Xing. Las sesiones personales son opcionales.",
    mobileLead: "Empieza gratis: cuestionarios de bienestar, revisión escrita o perfil de recursos Wu Xing.",
    benefits: ["3 maneras de empezar gratis", "Sesiones individuales opcionales", "Toronto y en línea"],
    cta: "Recibir revisión escrita gratuita",
    paidCta: "Consulta personal · desde €50",
    secondary: "Opciones gratuitas y cursos",
    small: "Gratis: formulario y dibujo → informe personal escrito. La sesión en directo es opcional y de pago.",
    workWith: "Trabajo individual con Andrey Litvinov, en Toronto y en línea",
    solutions: "Explorar los servicios personales",
    imageLabel: "Personalmente con Andrey Litvinov",
    caption: "Empieza con tu pregunta",
  },
} as const;

export function ServicesConversionHero({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  return (
    <section className={styles.hero} aria-labelledby="services-conversion-title">
      <div className={styles.copy}>
        <p className={styles.eyebrow}><span className={styles.spark} aria-hidden="true">✦</span>{t.eyebrow}</p>
        <h1 id="services-conversion-title">{t.heading}</h1>
        <p className={styles.lead}>{t.lead}</p>
        <p className={styles.mobileLead}>{t.mobileLead}</p>
        <div className={styles.actions}>
          <Link className={styles.cta} href={"/" + locale + "/services/free-situation-review"}>
            {t.cta}<ArrowUpRight size={20} aria-hidden="true" />
          </Link>
          <Link className={styles.paidLink} href={"/" + locale + "/services/free-situation-review#personal-consultation"}>
            {t.paidCta}<ArrowRight size={17} aria-hidden="true" />
          </Link>
          <Link className={styles.secondary} href="#free-insights">{t.secondary}<ArrowRight size={17} aria-hidden="true" /></Link>
          <Link className={styles.secondary} href="#solutions">{t.solutions}<ArrowRight size={17} aria-hidden="true" /></Link>
        </div>
        <p className={styles.small}>{t.small}</p>
        <p className={styles.small}>{t.workWith}</p>
        <ul className={styles.benefits}>
          {t.benefits.map(benefit => <li key={benefit}><Check size={16} strokeWidth={2.2} aria-hidden="true" />{benefit}</li>)}
        </ul>
      </div>
      <div className={styles.visual}>
        <StaticPortrait
          src="/images/holistic-house/andy-about.png"
          alt={locale === "ru" ? "Андрей Литвинов" : "Andrey Litvinov"}
          fill priority sizes="(max-width: 760px) 100vw, 42vw" className={styles.image}
        />
        <div className={styles.visualText}>
          <span className={styles.visualLabel}>{t.imageLabel}</span>
          <p>{t.caption}</p>
        </div>
      </div>
    </section>
  );
}
