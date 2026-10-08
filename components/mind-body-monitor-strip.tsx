import Link from "next/link";
import { ArrowUpRight, Compass } from "lucide-react";

import type { PublicLocale } from "@/lib/public-locales";

const copy = {
  en: {
    title: "Free situation assessment",
    note: "Clarify a goal, business challenge or personal concern — and your next step.",
    action: "Request free assessment",
  },
  ru: {
    title: "Бесплатная диагностика ситуации",
    note: "Проясним цель, проблему или точку ступора и найдём следующий шаг.",
    action: "Записаться бесплатно",
  },
  es: {
    title: "Evaluación inicial gratuita",
    note: "Aclara tu meta o dificultad personal y encuentra el siguiente paso.",
    action: "Solicitar evaluación",
  },
} as const;

export function MindBodyMonitorStrip({ locale }: { locale: PublicLocale }) {
  const text = copy[locale];
  // The detailed introductory assessment currently has EN/RU routes only.
  const href = locale === "es"
    ? "/en/services/free-situation-review"
    : `/${locale}/services/free-situation-review`;

  return (
    <aside className="mind-body-monitor-strip" aria-label={text.title} data-monitor-strip>
      <Link className="mind-body-monitor-strip__inner" href={href} data-monitor-action="free-situation-review">
        <span className="mind-body-monitor-strip__icon" aria-hidden="true">
          <Compass size={22} strokeWidth={1.6} />
        </span>
        <span className="mind-body-monitor-strip__copy">
          <strong>{text.title}</strong>
          <small>{text.note}</small>
        </span>
        <span className="mind-body-monitor-strip__action">
          {text.action}
          <ArrowUpRight size={18} strokeWidth={1.9} aria-hidden="true" />
        </span>
      </Link>
    </aside>
  );
}
