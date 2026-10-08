import Image from "next/image";
import Link from "next/link";
import { HeartPulse, HeartHandshake, Route } from "lucide-react";
import type { Locale } from "@/data/remedies";
import styles from "./personal-work-journey.module.css";

const copy = {
  ru: {
    eyebrow: "Три типа моих услуг",
    title: "Три подхода к вашим запросам",
    compactIntro: "Это три разные услуги, а не обязательные этапы. Выберите, что ближе вашему запросу, или начните с бесплатной диагностики ситуации.",
    fullIntro: "Для разных жизненных ситуаций — разные способы работы. Посмотрите, какой запрос вам сейчас близок.",
    services: [
      {
        title: "Гомеопатия",
        problem: "Усталость, бессилие, физические симптомы, психосоматика",
        displayTitle: "Психогомеопатия и личный ресурс",
        detailFull: "Начните с бесплатной вводной сессии: исследуем ваше состояние, ощущения и возможные пути поддержки личного ресурса. Работа не заменяет медицинскую помощь.",
        fullAction: "Бесплатная сессия по психогомеопатии",
        freeSlug: "free-situation-review?topic=wellbeing",
        focus: "Личный ресурс и самочувствие",
        short: "Обсудить нехватку ресурса, состояние и симптомы.",
        detail: "Индивидуальная дополнительная консультация о самочувствии, текущем состоянии и симптомах. Гомеопатия не имеет надёжных доказательств эффективности лечения заболеваний и не заменяет медицинскую помощь.",
        action: "Консультация по гомеопатии",
        slug: "andy-litvinov/homeopathy-consultation",
      },
      {
        title: "Образная терапия",
        problem: "Грусть, одиночество, потеря опоры и ясности",
        displayTitle: "Индивидуальный курс образной терапии",
        detailFull: "Через личные сеансы и образы бессознательного исследуем чувства, внутренние конфликты и опору. Цель — больше устойчивости, личной силы и понимания, что делать дальше.",
        fullAction: "Записаться на личные сеансы",
        freeSlug: null,
        focus: "Разобрать проблему и укрепить устойчивость",
        short: "Исследовать внутренние блоки, чувства и повторяющиеся реакции.",
        detail: "Психотерапевтическая работа с образами и внутренними частями для исследования проблемы, эмоциональных реакций, личной силы, границ и внутренней устойчивости.",
        action: "Сессии образной терапии",
        slug: "imagery-therapy",
      },
      {
        title: "Расстановки и архетипическая работа",
        problem: "Есть цель, но непонятно, как к ней прийти",
        displayTitle: "Системные расстановки и архетипическая поддержка",
        detailFull: "Исследуем системные связи, внутренние препятствия и новые возможности, чтобы яснее увидеть варианты движения к личным и деловым целям.",
        fullAction: "Записаться на расстановку",
        freeSlug: null,
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
    note: "Гомеопатия не имеет надёжных доказательств лечения медицинских состояний и не заменяет диагностику или лечение. Скорость и результат личной работы не гарантируются. При физических симптомах обратитесь к врачу.",
  },
  en: {
    eyebrow: "My three services",
    title: "Three approaches to real-life challenges",
    compactIntro: "These are three different services, not a required sequence. Choose what speaks to your situation, or start with a free situation assessment.",
    fullIntro: "Low energy, emotional struggles or goals that feel out of reach: each situation deserves a different approach.",
    services: [
      {
        title: "Homeopathy",
        problem: "Exhaustion, low energy, physical or psychosomatic symptoms",
        displayTitle: "Psychohomeopathy & personal resources",
        detailFull: "Start with a free introductory session to explore how you feel, what you are experiencing and possible ways to support your personal resources. This does not replace medical care.",
        fullAction: "Start with a free psychohomeopathy session",
        freeSlug: "free-situation-review?topic=wellbeing",
        focus: "Personal resources & wellbeing",
        short: "Discuss low energy, wellbeing and symptoms.",
        detail: "A complementary one-to-one consultation about how you feel and your symptoms. Homeopathy lacks reliable evidence for treating medical conditions and does not replace standard or urgent medical care.",
        action: "Homeopathy consultation",
        slug: "andy-litvinov/homeopathy-consultation",
      },
      {
        title: "Guided imagery therapy",
        problem: "Sadness, loneliness, uncertainty about what comes next",
        displayTitle: "Personal guided imagery sessions",
        detailFull: "In one-to-one sessions, explore emotions, inner conflicts and images from the unconscious. The aim is to develop a stronger inner foundation, clarity and direction.",
        fullAction: "Explore personal imagery sessions",
        freeSlug: null,
        focus: "Explore a difficulty & build inner stability",
        short: "Explore inner blocks, feelings and repeating reactions.",
        detail: "Psychotherapy-informed imagery and parts-oriented work to explore difficulties, emotional responses, boundaries, personal strengths and inner stability.",
        action: "Guided imagery sessions",
        slug: "imagery-therapy",
      },
      {
        title: "Systemic & archetypal constellations",
        problem: "You have a goal but cannot see a clear way forward",
        displayTitle: "Systemic constellations & archetypal support",
        detailFull: "Explore roles, patterns, obstacles and possibilities through systemic and archetypal work, to see more ways forward in your relationships, business or personal goals.",
        fullAction: "Book a constellation session",
        freeSlug: null,
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
    note: "Homeopathy has no reliable evidence for treating medical conditions and does not replace medical diagnosis or treatment. Progress and outcomes are not guaranteed. Consult a medical professional about physical symptoms.",
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
        {text.services.map((service, index) => {
          const ServiceIcon = [HeartPulse, HeartHandshake, Route][index];
          const photos = [
            "/images/holistic-house/distance-homeopathy.webp",
            "/images/holistic-house/video-posters/hypnotherapy-en-v1.webp",
            "/images/holistic-house/video-posters/constellations-en-v1.webp",
          ];
          return (
            <article className={styles.service} key={service.slug}>
              <div className={styles.servicePhoto}>
                <Image src={photos[index]} alt="" fill sizes={compact ? "(max-width: 880px) 100vw, 350px" : "(max-width: 880px) 100vw, 360px"} loading="lazy" />
              </div>
              <div>
                {!compact && <span className={styles.iconWrap}><ServiceIcon size={26} strokeWidth={1.7} aria-hidden="true" /></span>}
                <p className={styles.focus}>{compact ? service.focus : service.problem}</p>
                <h3>{compact ? service.title : service.displayTitle}</h3>
                <p className={styles.description}>{compact ? service.short : service.detailFull}</p>
              </div>
              <div>
                <Link className={styles.serviceLink} href={"/" + locale + "/services/" + (!compact && service.freeSlug ? service.freeSlug : service.slug)}>
                  {compact ? service.action : service.fullAction}<span aria-hidden="true">→</span>
                </Link>
                {!compact && service.freeSlug && (
                  <Link className={styles.moreLink} href={"/" + locale + "/services/" + service.slug}>
                    {locale === "ru" ? "Подробнее о подходе" : "Learn about the approach"}
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {compact && <aside className={styles.free}>
        <div>
          <p className={styles.eyebrow}>{text.freeEyebrow}</p>
          <h3>{text.freeTitle}</h3>
          <p>{text.freeText}</p>
        </div>
        <Link className={styles.primaryLink} href={"/" + locale + "/services/free-situation-review"}>
          {text.freeAction}<span aria-hidden="true">→</span>
        </Link>
      </aside>}
      {!compact && <p className={styles.note}>{text.note}</p>}
    </section>
  );
}
