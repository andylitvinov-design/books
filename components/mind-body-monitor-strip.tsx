import Link from "next/link";

import type { PublicLocale } from "@/lib/public-locales";

const copy = {
  en: {
    title: "Check your state — free",
    wuXing: "Personal Wu Xing Check",
    tests: "Monitoring Tests",
    note: "Self-reflection and wellbeing tracking. Not a medical diagnosis.",
  },
  ru: {
    title: "Проверьте своё состояние — бесплатно",
    wuXing: "Личная оценка по У-Син",
    tests: "Тесты мониторинга",
    note: "Для самонаблюдения и отслеживания состояния. Не является медицинской диагностикой.",
  },
  es: {
    title: "Revisa tu estado — gratis",
    wuXing: "Perfil personal Wu Xing",
    tests: "Tests de seguimiento",
    note: "Para autoobservación y seguimiento del bienestar. No es un diagnóstico médico.",
  },
} as const;

export function MindBodyMonitorStrip({ locale }: { locale: PublicLocale }) {
  const text = copy[locale];

  return (
    <aside className="mind-body-monitor-strip" aria-label={text.title} data-monitor-strip>
      <div className="mind-body-monitor-strip__inner">
        <div className="mind-body-monitor-strip__copy">
          <strong>{text.title}</strong>
          <small>{text.note}</small>
        </div>
        <div className="mind-body-monitor-strip__actions">
          <Link href={`/${locale}/wu-xing`} data-monitor-action="wu-xing">
            {text.wuXing}
          </Link>
          <Link href={`/${locale}/client#cabinet-tests`} data-monitor-action="tests">
            {text.tests}
          </Link>
        </div>
      </div>
    </aside>
  );
}
