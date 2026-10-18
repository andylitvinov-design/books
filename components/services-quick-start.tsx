import { ArrowRight, ClipboardList, MessageCircle } from "lucide-react";
import { AcquisitionEventLink } from "@/components/acquisition-event-link";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./services-quick-start.module.css";

const content = {
  en: {
    intro: "Already know how you want to begin?",
    free: "Free written situation review",
    paid: "Personal session · from €50",
    note: "A written review is not a live call. Session availability is confirmed before payment.",
  },
  ru: {
    intro: "Уже знаете, с чего хотите начать?",
    free: "Бесплатный письменный разбор",
    paid: "Личная сессия · от €50",
    note: "Разбор — письменно, не созвон. Дату личной встречи согласуем до оплаты.",
  },
  es: {
    intro: "¿Ya sabes cómo quieres empezar?",
    free: "Revisión escrita gratuita",
    paid: "Sesión personal · desde €50",
    note: "La revisión es por escrito, no una llamada. La sesión se confirma antes del pago.",
  },
} as const;

/** One compact direct path before optional service search.
 * Links only: never sends a message, starts a payment or creates a lead.
 */
export function ServicesQuickStart({ locale }: { locale: PublicLocale }) {
  const t = content[locale];
  return (
    <nav className={styles.quickStart} aria-label={t.intro} data-services-quick-start>
      <span className={styles.intro}>{t.intro}</span>
      <div className={styles.actions}>
        <AcquisitionEventLink event="service_view" prefetch={false}
          href={`/${locale}/services/free-situation-review`} className={styles.free}
          attributes={{ "data-services-quick-action": "free-written-review" }}>
          <ClipboardList size={17} aria-hidden="true" /><span>{t.free}</span><ArrowRight size={16} aria-hidden="true" />
        </AcquisitionEventLink>
        <AcquisitionEventLink event="service_view" prefetch={false}
          href={`/${locale}/services/alchemy-of-soul`} className={styles.paid}
          attributes={{ "data-services-quick-action": "personal-session" }}>
          <MessageCircle size={17} aria-hidden="true" /><span>{t.paid}</span><ArrowRight size={16} aria-hidden="true" />
        </AcquisitionEventLink>
      </div>
      <small>{t.note}</small>
    </nav>
  );
}
