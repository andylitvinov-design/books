import { HeartPulse, ListChecks, Sprout } from "lucide-react";
import Link from "next/link";

import type { PublicLocale } from "@/lib/public-locales";

const copy = {
  en: {
    kicker: "Mind–Body Monitor",
    title: "A simple place to start",
    intro: "Start with a quick check-in. Go deeper only if it feels useful.",
    recommended: "Recommended",
    stateTitle: "Quick State Check",
    stateText: "5 questions · about 1 minute · no sign-in required",
    stateAction: "Check how I feel",
    wuTitle: "Personal Wu Xing Profile",
    wuText: "A reflective five-elements framework, kept separate from clinical screening.",
    wuAction: "Explore Wu Xing",
    testsTitle: "Monitoring Tests",
    testsText: "Mood · stress · energy · relationships · personality · recovery",
    testsAction: "View free tests",
  },
  ru: {
    kicker: "Монитор состояния",
    title: "С чего можно начать",
    intro: "Начните с короткой самопроверки. Углубляйтесь только если вам это действительно полезно.",
    recommended: "Рекомендуем",
    stateTitle: "Быстрая проверка состояния",
    stateText: "5 вопросов · около 1 минуты · без регистрации",
    stateAction: "Проверить своё состояние",
    wuTitle: "Личный профиль У-Син",
    wuText: "Рефлексивная модель пяти элементов, отдельно от клинических скринингов.",
    wuAction: "Открыть У-Син",
    testsTitle: "Тесты мониторинга",
    testsText: "Настроение · стресс · энергия · отношения · личность · восстановление",
    testsAction: "Открыть бесплатные тесты",
  },
  es: {
    kicker: "Monitor mente–cuerpo",
    title: "Un lugar sencillo para empezar",
    intro: "Empieza con una revisión breve y profundiza solo si te resulta útil.",
    recommended: "Recomendado",
    stateTitle: "Revisión rápida del estado",
    stateText: "5 preguntas · aproximadamente 1 minuto · sin registro",
    stateAction: "Revisar cómo me siento",
    wuTitle: "Perfil personal Wu Xing",
    wuText: "Un marco reflexivo de cinco elementos, separado del cribado clínico.",
    wuAction: "Explorar Wu Xing",
    testsTitle: "Tests de seguimiento",
    testsText: "Ánimo · estrés · energía · relaciones · personalidad · recuperación",
    testsAction: "Ver tests gratuitos",
  },
} as const;

export function MindBodyMonitorHome({ locale }: { locale: PublicLocale }) {
  const text = copy[locale];

  return (
    <section className="monitor-home-start" aria-labelledby="monitor-home-title" data-monitor-home>
      <header className="monitor-home-start__heading">
        <p className="service-home-kicker">{text.kicker}</p>
        <h2 id="monitor-home-title">{text.title}</h2>
        <p>{text.intro}</p>
      </header>

      <div className="monitor-home-start__grid">
        <Link className="monitor-home-start__card monitor-home-start__card--primary" href={`/${locale}/client#cabinet-tests`}>
          <span className="monitor-home-start__icon" aria-hidden="true"><HeartPulse /></span>
          <span className="monitor-home-start__eyebrow">{text.recommended}</span>
          <strong>{text.stateTitle}</strong>
          <small>{text.stateText}</small>
          <span>{text.stateAction}<span aria-hidden="true">→</span></span>
        </Link>

        <Link className="monitor-home-start__card" href={`/${locale}/wu-xing`}>
          <span className="monitor-home-start__icon" aria-hidden="true"><Sprout /></span>
          <strong>{text.wuTitle}</strong>
          <small>{text.wuText}</small>
          <span>{text.wuAction}<span aria-hidden="true">→</span></span>
        </Link>

        <Link className="monitor-home-start__card" href={`/${locale}/client#cabinet-tests`}>
          <span className="monitor-home-start__icon" aria-hidden="true"><ListChecks /></span>
          <strong>{text.testsTitle}</strong>
          <small>{text.testsText}</small>
          <span>{text.testsAction}<span aria-hidden="true">→</span></span>
        </Link>
      </div>
    </section>
  );
}
