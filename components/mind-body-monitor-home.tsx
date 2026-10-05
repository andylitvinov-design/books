import {
  Brain,
  CloudRain,
  HeartPulse,
  ListChecks,
  Moon,
  Sprout,
  Stethoscope,
  Zap,
} from "lucide-react";
import Link from "next/link";

import type { PublicLocale } from "@/lib/public-locales";

const copy = {
  en: {
    kicker: "Free mind–body monitoring",
    title: "A clearer picture of how you’re doing",
    intro:
      "Short self-checks can help you see what is affecting your wellbeing and everyday effectiveness right now — stress, mood, mental clarity, energy, sleep, or body symptoms — and get simple recommendations for what to pay attention to next.",
    choose: "What matters most right now?",
    topics: [
      { key: "anxiety", label: "Anxiety & worry", icon: HeartPulse },
      { key: "stress", label: "Stress & overload", icon: Zap },
      { key: "clarity", label: "Clarity & productivity", icon: Brain },
      { key: "body", label: "Body symptoms & psychosomatics", icon: Stethoscope },
      { key: "mood", label: "Low mood & sadness", icon: CloudRain },
      { key: "sleep", label: "Sleep & recovery", icon: Moon },
    ],
    recommended: "Free · recommended start",
    stateTitle: "Start with a quick check-in",
    stateText: "5 questions · about 1 minute · no sign-in required",
    stateAction: "Start free monitoring",
    testsTitle: "Explore monitoring tests",
    testsText: "Mood · stress · energy · clarity · relationships · recovery",
    testsAction: "View free tests",
    wuTitle: "Personal Wu Xing Profile",
    wuText: "An optional reflective five-elements framework, kept separate from clinical screening.",
    wuAction: "Explore Wu Xing",
    resultNote:
      "You’ll get a simple summary and practical next-step recommendations. This is self-monitoring and educational guidance, not a diagnosis.",
  },
  ru: {
    kicker: "Бесплатный мониторинг состояния",
    title: "Понять своё состояние чуть яснее",
    intro:
      "Короткие самопроверки помогают увидеть, что сейчас сильнее влияет на самочувствие и повседневную эффективность — стресс, настроение, ясность мышления, энергия, сон или телесные симптомы — и получить простые рекомендации, на что обратить внимание дальше.",
    choose: "Что сейчас важнее всего?",
    topics: [
      { key: "anxiety", label: "Волнение и тревога", icon: HeartPulse },
      { key: "stress", label: "Стресс и перегрузка", icon: Zap },
      { key: "clarity", label: "Ясность мышления и продуктивность", icon: Brain },
      { key: "body", label: "Симптомы и психосоматика", icon: Stethoscope },
      { key: "mood", label: "Грусть и снижение настроения", icon: CloudRain },
      { key: "sleep", label: "Сон и восстановление", icon: Moon },
    ],
    recommended: "Бесплатно · рекомендуемый старт",
    stateTitle: "Начните с короткой проверки",
    stateText: "5 вопросов · около 1 минуты · без регистрации",
    stateAction: "Начать бесплатный мониторинг",
    testsTitle: "Другие тесты мониторинга",
    testsText: "Настроение · стресс · энергия · ясность · отношения · восстановление",
    testsAction: "Открыть бесплатные тесты",
    wuTitle: "Личный профиль У-Син",
    wuText: "Дополнительная рефлексивная модель пяти элементов, отдельно от клинических скринингов.",
    wuAction: "Открыть У-Син",
    resultNote:
      "После проверки вы получите краткий итог и практические рекомендации по следующим шагам. Это самонаблюдение и образовательная информация, а не диагноз.",
  },
  es: {
    kicker: "Monitoreo mente–cuerpo gratuito",
    title: "Una imagen más clara de cómo estás",
    intro:
      "Las autoevaluaciones breves pueden ayudarte a ver qué está afectando más tu bienestar y funcionamiento cotidiano — estrés, ánimo, claridad mental, energía, sueño o síntomas físicos — y recibir recomendaciones sencillas sobre qué observar después.",
    choose: "¿Qué te importa más ahora?",
    topics: [
      { key: "anxiety", label: "Ansiedad y preocupación", icon: HeartPulse },
      { key: "stress", label: "Estrés y sobrecarga", icon: Zap },
      { key: "clarity", label: "Claridad y productividad", icon: Brain },
      { key: "body", label: "Síntomas físicos y psicosomática", icon: Stethoscope },
      { key: "mood", label: "Ánimo bajo y tristeza", icon: CloudRain },
      { key: "sleep", label: "Sueño y recuperación", icon: Moon },
    ],
    recommended: "Gratis · inicio recomendado",
    stateTitle: "Empieza con una revisión breve",
    stateText: "5 preguntas · aproximadamente 1 minuto · sin registro",
    stateAction: "Iniciar monitoreo gratuito",
    testsTitle: "Explorar tests de seguimiento",
    testsText: "Ánimo · estrés · energía · claridad · relaciones · recuperación",
    testsAction: "Ver tests gratuitos",
    wuTitle: "Perfil personal Wu Xing",
    wuText: "Un marco reflexivo opcional de cinco elementos, separado del cribado clínico.",
    wuAction: "Explorar Wu Xing",
    resultNote:
      "Recibirás un resumen sencillo y recomendaciones prácticas para los siguientes pasos. Es autoobservación y orientación educativa, no un diagnóstico.",
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

      <div className="monitor-home-start__choice" aria-labelledby="monitor-home-focus-title">
        <h3 id="monitor-home-focus-title">{text.choose}</h3>
        <div className="monitor-home-start__focus-grid">
          {text.topics.map(({ key, label, icon: Icon }) => (
            <Link
              className="monitor-home-start__focus"
              data-monitor-focus={key}
              href={`/${locale}/client?focus=${key}#cabinet-tests`}
              key={key}
            >
              <span aria-hidden="true"><Icon /></span>
              <strong>{label}</strong>
            </Link>
          ))}
        </div>
      </div>

      <div className="monitor-home-start__grid">
        <Link className="monitor-home-start__card monitor-home-start__card--primary" href={`/${locale}/client#cabinet-tests`}>
          <span className="monitor-home-start__icon" aria-hidden="true"><HeartPulse /></span>
          <span className="monitor-home-start__eyebrow">{text.recommended}</span>
          <strong>{text.stateTitle}</strong>
          <small>{text.stateText}</small>
          <span>{text.stateAction}<span aria-hidden="true">→</span></span>
        </Link>

        <Link className="monitor-home-start__card" href={`/${locale}/client#cabinet-tests`}>
          <span className="monitor-home-start__icon" aria-hidden="true"><ListChecks /></span>
          <strong>{text.testsTitle}</strong>
          <small>{text.testsText}</small>
          <span>{text.testsAction}<span aria-hidden="true">→</span></span>
        </Link>

        <Link className="monitor-home-start__card" href={`/${locale}/wu-xing`}>
          <span className="monitor-home-start__icon" aria-hidden="true"><Sprout /></span>
          <strong>{text.wuTitle}</strong>
          <small>{text.wuText}</small>
          <span>{text.wuAction}<span aria-hidden="true">→</span></span>
        </Link>
      </div>

      <p className="monitor-home-start__result-note">{text.resultNote}</p>
    </section>
  );
}
