import Link from "next/link";
import { ArrowRight, ClipboardCheck, FileText, Leaf, ShoppingBag, Sparkles } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./services-free-recommendations.module.css";

const COPY = {
  en: {
    eyebrow: "RECOMMENDED · FREE TO START",
    title: "3 free ways to begin",
    intro: "Choose a useful first step — no payment required.",
    note: "Self-checks and the symbolic Wu Xing profile are not medical diagnoses.",
    badge: "Free",
    details: "Details",
    items: [
      {
        title: "Stress & personality profile",
        description: "Explore self-check scales and build your personal profile.",
        action: "Start tests",
        orderHref: "/en/client/tests",
        detailsHref: "/en/client",
      },
      {
        title: "Free situation review",
        description: "Receive a personal written reflection on your question.",
        action: "Order",
        orderHref: "/en/services/free-situation-review#request-free-review",
        detailsHref: "/en/services/free-situation-review",
      },
      {
        title: "Wu Xing resource profile",
        description: "Explore your resources through the five-element model.",
        action: "Order",
        orderHref: "/en/services/dao-health-profile#request-free-wu-xing",
        detailsHref: "/en/services/dao-health-profile",
      },
    ],
  },
  ru: {
    eyebrow: "РЕКОМЕНДУЕМ · НАЧНИТЕ БЕСПЛАТНО",
    title: "3 бесплатные услуги для начала",
    intro: "Выберите первый шаг — без оплаты.",
    note: "Тесты самооценки и символический профиль У-Син не являются медицинской диагностикой.",
    badge: "Бесплатно",
    details: "Детали",
    items: [
      {
        title: "Стресс и психопрофиль",
        description: "Исследуйте ключевые шкалы и начните составлять свой профиль.",
        action: "Пройти тесты",
        orderHref: "/ru/client/tests",
        detailsHref: "/ru/client",
      },
      {
        title: "Бесплатный разбор ситуации",
        description: "Получите персональный письменный взгляд на ваш запрос.",
        action: "Заказать",
        orderHref: "/ru/services/free-situation-review#request-free-review",
        detailsHref: "/ru/services/free-situation-review",
      },
      {
        title: "Профиль ресурсов У-Син",
        description: "Исследуйте свои ресурсы в модели пяти элементов.",
        action: "Заказать",
        orderHref: "/ru/services/dao-health-profile#request-free-wu-xing",
        detailsHref: "/ru/services/dao-health-profile",
      },
    ],
  },
  es: {
    eyebrow: "RECOMENDADO · EMPIEZA GRATIS",
    title: "3 servicios gratuitos para empezar",
    intro: "Elige un primer paso útil, sin pagar.",
    note: "Las pruebas y Wu Xing están disponibles en inglés. Son herramientas de reflexión, no diagnósticos.",
    badge: "Gratis",
    details: "Detalles",
    items: [
      {
        title: "Estrés y perfil personal",
        description: "Explora escalas de autoevaluación y tu perfil personal.",
        action: "Empezar",
        orderHref: "/en/client/tests",
        detailsHref: "/en/client",
      },
      {
        title: "Revisión de tu situación",
        description: "Recibe una reflexión personal por escrito sobre tu consulta.",
        action: "Solicitar",
        orderHref: "/es/services/free-situation-review#request-free-review",
        detailsHref: "/es/services/free-situation-review",
      },
      {
        title: "Perfil de recursos Wu Xing",
        description: "Explora tus recursos mediante el modelo de cinco elementos.",
        action: "Solicitar",
        orderHref: "/en/services/dao-health-profile#request-free-wu-xing",
        detailsHref: "/en/services/dao-health-profile",
      },
    ],
  },
} as const;

const ICONS = [ClipboardCheck, FileText, Leaf] as const;

export function ServicesFreeRecommendations({ locale }: { locale: PublicLocale }) {
  const t = COPY[locale];

  return (
    <section
      className={styles.frame}
      id="recommended-free-services"
      data-services-free-recommendations
      aria-labelledby="recommended-free-services-title"
      lang={locale}
    >
      <header className={styles.header}>
        <p className={styles.eyebrow}><Sparkles size={14} aria-hidden="true" />{t.eyebrow}</p>
        <h2 id="recommended-free-services-title">{t.title}</h2>
        <p className={styles.intro}>{t.intro}</p>
      </header>

      <div className={styles.grid}>
        {t.items.map((item, index) => {
          const Icon = ICONS[index];
          const ActionIcon = index === 0 ? ClipboardCheck : ShoppingBag;
          return (
            <article className={styles.card} key={item.title} data-free-service-card={index + 1}>
              <div className={styles.cardIdentity}>
                <span className={styles.icon}><Icon size={19} strokeWidth={1.8} aria-hidden="true" /></span>
                <div className={styles.cardText}>
                  <div className={styles.cardTitleRow}>
                    <h3 className={styles.cardTitle}>{item.title}</h3>
                    <span className={styles.freeBadge}>{t.badge}</span>
                  </div>
                  <p className={styles.cardDescription}>{item.description}</p>
                </div>
              </div>
              <div className={styles.actions}>
                <Link className={styles.details} href={item.detailsHref} prefetch={false} data-free-service-action="details">
                  {t.details}<ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
                </Link>
                <Link className={styles.order} href={item.orderHref} prefetch={false} data-free-service-action="order">
                  <ActionIcon size={15} strokeWidth={2} aria-hidden="true" />{item.action}
                </Link>
              </div>
            </article>
          );
        })}
      </div>
      <p className={styles.note}>{t.note}</p>
    </section>
  );
}
