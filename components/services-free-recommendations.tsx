import Link from "next/link";
import { ArrowRight, ClipboardCheck, FileText, Leaf, Sparkles } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./services-free-recommendations.module.css";

const COPY = {
  en: {
    eyebrow: "RECOMMENDED · ALWAYS FREE",
    title: "3 free ways to begin",
    intro: "Start with a helpful first step before deciding whether you need personal support.",
    note: "Self-check tests and the symbolic Wu Xing profile are not medical diagnoses.",
    items: [
      {
        title: "Stress & personality profile",
        description: "Explore key self-check scales and begin building your personal profile.",
        action: "Take tests",
        href: "/en/client/tests",
      },
      {
        title: "Free situation review",
        description: "Share your question and receive a personal written reflection.",
        action: "Start review",
        href: "/en/services/free-situation-review",
      },
      {
        title: "Wu Xing resource profile",
        description: "Explore your resources through a symbolic five-element model.",
        action: "Explore profile",
        href: "/en/services/dao-health-profile",
      },
    ],
  },
  ru: {
    eyebrow: "РЕКОМЕНДУЕМ · ВСЕГДА БЕСПЛАТНО",
    title: "3 бесплатные услуги для начала",
    intro: "Начните с подходящего вам формата, прежде чем выбирать личную консультацию.",
    note: "Тесты самооценки и символический профиль У-Син не являются медицинской диагностикой.",
    items: [
      {
        title: "Стресс и психопрофиль",
        description: "Пройдите ключевые тесты и начните формировать личный профиль.",
        action: "Пройти тесты",
        href: "/ru/client/tests",
      },
      {
        title: "Бесплатный разбор ситуации",
        description: "Опишите свой запрос и получите персональный письменный разбор.",
        action: "Начать разбор",
        href: "/ru/services/free-situation-review",
      },
      {
        title: "Профиль ресурсов У-Син",
        description: "Исследуйте свои ресурсы через символическую модель пяти элементов.",
        action: "Открыть профиль",
        href: "/ru/services/dao-health-profile",
      },
    ],
  },
  es: {
    eyebrow: "RECOMENDADOS · SIEMPRE GRATIS",
    title: "3 servicios gratuitos para empezar",
    intro: "Da un primer paso antes de elegir un acompañamiento individual.",
    note: "Las pruebas están disponibles en inglés y ruso. No son diagnósticos médicos; Wu Xing es un modelo simbólico.",
    items: [
      {
        title: "Estrés y perfil personal",
        description: "Explora escalas de autoevaluación y empieza a crear tu perfil.",
        action: "Ver pruebas",
        href: "/en/client/tests",
      },
      {
        title: "Revisión de tu situación",
        description: "Comparte tu pregunta para recibir una reflexión personal por escrito.",
        action: "Empezar",
        href: "/es/services/free-situation-review",
      },
      {
        title: "Perfil de recursos Wu Xing",
        description: "Explora tus recursos mediante un modelo simbólico de cinco elementos.",
        action: "Ver perfil",
        href: "/en/services/dao-health-profile",
      },
    ],
  },
} as const;

const ICONS = [ClipboardCheck, FileText, Leaf] as const;

export function ServicesFreeRecommendations({ locale }: { locale: PublicLocale }) {
  const t = COPY[locale];

  return (
    <section className={styles.frame} id="recommended-free-services" data-services-free-recommendations
      aria-labelledby="recommended-free-services-title" lang={locale}>
      <header className={styles.header}>
        <p className={styles.eyebrow}><Sparkles size={15} aria-hidden="true" />{t.eyebrow}</p>
        <h2 id="recommended-free-services-title">{t.title}</h2>
        <p className={styles.intro}>{t.intro}</p>
      </header>
      <div className={styles.grid}>
        {t.items.map((item, index) => {
          const Icon = ICONS[index];
          return (
            <Link className={styles.card} key={item.title} href={item.href} prefetch={false}
              data-free-service-card={index + 1}>
              <span className={styles.icon}><Icon size={21} strokeWidth={1.8} aria-hidden="true" /></span>
              <strong className={styles.cardTitle}>{item.title}</strong>
              <span className={styles.cardDescription}>{item.description}</span>
              <span className={styles.cardAction}>{item.action}<ArrowRight size={16} aria-hidden="true" /></span>
            </Link>
          );
        })}
      </div>
      <p className={styles.note}>{t.note}</p>
    </section>
  );
}
