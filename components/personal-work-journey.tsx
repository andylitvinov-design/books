import Link from "next/link";
import type { Locale } from "@/data/remedies";
import styles from "./personal-work-journey.module.css";

const copy = {
  ru: {
    eyebrow: "Три типа моих услуг",
    title: "Выберите направление работы",
    compactIntro: "Это три разные услуги, а не обязательные этапы. Выберите, что ближе вашему запросу, или начните с бесплатной диагностики ситуации.",
    fullIntro: "Можно работать с состоянием и личным ресурсом, разбирать внутреннюю проблему или искать новые возможности для целей и отношений. Направления самостоятельные — выбор зависит от вашего запроса.",
    services: [
      {
        title: "Психогомеопатия",
        focus: "Личный ресурс и самочувствие",
        short: "Обсудить нехватку ресурса, состояние и симптомы.",
        detail: "Индивидуальная дополнительная консультация о самочувствии, текущем состоянии и симптомах. Гомеопатия не имеет надёжных доказательств эффективности лечения заболеваний и не заменяет медицинскую помощь.",
        action: "Подробнее о психогомеопатии",
        slug: "andy-litvinov/homeopathy-consultation",
      },
      {
        title: "Образная психотерапия",
        focus: "Разобрать проблему и укрепить устойчивость",
        short: "Исследовать внутренние блоки, чувства и повторяющиеся реакции.",
        detail: "Психотерапевтическая работа с образами и внутренними частями для исследования проблемы, эмоциональных реакций, личной силы, границ и внутренней устойчивости.",
        action: "Сессии образной психотерапии",
        slug: "imagery-therapy",
      },
      {
        title: "Расстановки и архетипическая поддержка",
        focus: "Цели, возможности и направление движения",
        short: "Увидеть новые возможности и шаги к личным или деловым целям.",
        detail: "Системные расстановки и архетипические подходы помогают исследовать роли, отношения, бизнес и варианты решений. Внешние результаты и скорость достижения целей не гарантируются.",
        action: "Расстановочная сессия",
        slug: "andy-litvinov/personal-constellation-session",
      },
    ],
    freeEyebrow: "Входящая услуга · бесплатно",
    freeTitle: "Не знаете, что выбрать?",
    freeText: "Начните с бесплатной диагностики ситуации: цель, бизнес или проблема. Вместе попробуем найти точку ступора, область возможного роста и подходящий формат дальнейшей работы. Это не медицинская диагностика.",
    freeAction: "Бесплатная диагностика ситуации",
    note: "Вы сами выбираете, продолжать ли работу. При медицинских симптомах обращайтесь к квалифицированному медицинскому специалисту.",
  },
  en: {
    eyebrow: "My three services",
    title: "Choose the kind of personal work you need",
    compactIntro: "These are three different services, not a required sequence. Choose what speaks to your situation, or start with a free situation assessment.",
    fullIntro: "We can explore your wellbeing and resources, an inner difficulty, or possibilities for your relationships, business and goals. You can choose the direction that fits your question.",
    services: [
      {
        title: "Psychohomeopathy",
        focus: "Personal resources & wellbeing",
        short: "Discuss low energy, wellbeing and symptoms.",
        detail: "A complementary one-to-one consultation about how you feel and your symptoms. Homeopathy lacks reliable evidence for treating medical conditions and does not replace standard or urgent medical care.",
        action: "Explore psychohomeopathy",
        slug: "andy-litvinov/homeopathy-consultation",
      },
      {
        title: "Guided imagery psychotherapy",
        focus: "Explore a difficulty & build inner stability",
        short: "Explore inner blocks, feelings and repeating reactions.",
        detail: "Psychotherapy-informed imagery and parts-oriented work to explore difficulties, emotional responses, boundaries, personal strengths and inner stability.",
        action: "Explore imagery sessions",
        slug: "imagery-therapy",
      },
      {
        title: "Constellations & archetypal support",
        focus: "Goals, choices & new possibilities",
        short: "Explore possibilities and next steps for personal or business goals.",
        detail: "Systemic constellations and archetypal approaches explore roles, relationships, business questions and choices. Faster progress or external outcomes cannot be guaranteed.",
        action: "Constellation session",
        slug: "andy-litvinov/personal-constellation-session",
      },
    ],
    freeEyebrow: "Free introductory service",
    freeTitle: "Not sure where to begin?",
    freeText: "Start with a free situation assessment for a goal, business or personal problem. We can identify where you feel stuck, explore possible areas for growth and decide which approach fits. This is not a medical diagnosis.",
    freeAction: "Free situation & goal assessment",
    note: "You decide whether to continue. Medical symptoms require assessment by a qualified healthcare professional.",
  },
} as const;

export function PersonalWorkJourney({ locale, variant = "full" }: { locale: Locale; variant?: "compact" | "full" }) {
  const text = copy[locale];
  const compact = variant === "compact";
  const titleId = compact ? "journey-preview-title" : "personal-path-title";
  return (
    <section
      id={compact ? undefined : "personal-path"}
      className={[styles.section, compact ? styles.compact : styles.full].join(" ")}
      aria-labelledby={titleId}
      data-personal-work-journey={variant}
      lang={locale}
    >
      <header className={styles.intro}>
        <p className={styles.eyebrow}>{text.eyebrow}</p>
        <h2 id={titleId}>{text.title}</h2>
        <p>{compact ? text.compactIntro : text.fullIntro}</p>
      </header>
      <div className={styles.services}>
        {text.services.map((service) => (
          <article className={styles.service} key={service.slug}>
            <div>
              <p className={styles.focus}>{service.focus}</p>
              <h3>{service.title}</h3>
              <p className={styles.description}>{compact ? service.short : service.detail}</p>
            </div>
            <Link className={styles.serviceLink} href={"/" + locale + "/services/" + service.slug}>
              {service.action}<span aria-hidden="true">→</span>
            </Link>
          </article>
        ))}
      </div>
      <aside className={styles.free}>
        <div>
          <p className={styles.eyebrow}>{text.freeEyebrow}</p>
          <h3>{text.freeTitle}</h3>
          <p>{text.freeText}</p>
        </div>
        <Link className={styles.primaryLink} href={"/" + locale + "/services/free-situation-review"}>
          {text.freeAction}<span aria-hidden="true">→</span>
        </Link>
      </aside>
      {!compact && <p className={styles.note}>{text.note}</p>}
    </section>
  );
}
