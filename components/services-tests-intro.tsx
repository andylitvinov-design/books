import Link from "next/link";
import { ArrowRight, ClipboardCheck, Sparkles } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./services-tests-intro.module.css";

const copy = {
  en: {
    eyebrow: "HOLISTIC HOUSE · FREE TESTS",
    heading: "Begin with a free test. Explore personal services.",
    lead: "Explore stress, relationships, energy, business and personal effectiveness. Start with self-checks, then choose personal support if useful.",
    start: "Take free tests",
    browse: "See my services",
    note: "Some individual tests work without registration. Saving a set and tracking progress requires Google sign-in. These are self-checks, not medical diagnoses.",
    numberLabel: "TOPICS",
    visualLabel: "Find your starting point",
    href: "/en/client/tests",
  },
  ru: {
    eyebrow: "HOLISTIC HOUSE · БЕСПЛАТНЫЕ ТЕСТЫ",
    heading: "Начните с бесплатных тестов. Выберите личную работу.",
    lead: "Стресс, отношения, энергия, бизнес и деньги, личная эффективность. Начните с самооценки, а ниже выберите подходящую услугу.",
    start: "Пройти бесплатные тесты",
    browse: "Посмотреть мои услуги",
    note: "Некоторые отдельные тесты доступны без регистрации. Для сохранения набора и динамики нужен вход через Google. Это самооценка, не медицинская диагностика.",
    numberLabel: "ТЕМ",
    visualLabel: "Найдите свою точку входа",
    href: "/ru/client/tests",
  },
  es: {
    eyebrow: "HOLISTIC HOUSE · PRUEBAS GRATUITAS",
    heading: "Empieza con pruebas gratuitas. Explora mis servicios.",
    lead: "Estrés, relaciones, energía, negocios y desarrollo personal. Explora las pruebas de autoobservación y elige acompañamiento individual si te resulta útil.",
    start: "Explorar pruebas gratuitas",
    browse: "Ver mis servicios",
    note: "Los cuestionarios están disponibles actualmente en inglés y ruso. No son diagnósticos médicos; algunas pruebas permiten empezar sin registrarse.",
    numberLabel: "TEMAS",
    visualLabel: "Encuentra por dónde empezar",
    href: "/es/client",
  },
} as const;

export function ServicesTestsIntro({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  return (
    <section className={styles.banner} aria-labelledby="services-tests-heading" data-services-tests-intro lang={locale}>
      <div className={styles.copy}>
        <p className={styles.eyebrow}><Sparkles size={16} aria-hidden="true" />{t.eyebrow}</p>
        <h1 id="services-tests-heading">{t.heading}</h1>
        <p className={styles.lead}>{t.lead}</p>
        <div className={styles.actions}>
          <Link className={styles.cta} href={t.href} prefetch={false} data-services-test-action>
            <ClipboardCheck size={19} aria-hidden="true" />{t.start}<ArrowRight size={19} aria-hidden="true" />
          </Link>
          <Link className={styles.more} href="#solutions">{t.browse}<ArrowRight size={17} aria-hidden="true" /></Link>
        </div>
        <p className={styles.note}>{t.note}</p>
      </div>
      <div className={styles.visual} aria-hidden="true">
        <div className={styles.orbit}><strong>5</strong><span>{t.numberLabel}</span></div>
        <span className={styles.visualLabel}>{t.visualLabel}</span>
      </div>
    </section>
  );
}
