"use client";

import Link from "next/link";

import { AcquisitionEventLink } from "@/components/acquisition-event-link";
import { LOCAL_ACQUISITION } from "@/data/local-acquisition";
import type { Locale } from "@/data/remedies";

import styles from "./personal-work-journey.module.css";

const copy = {
  ru: {
    eyebrow: "Мой подход к индивидуальной работе",
    compactTitle: "Сначала опора. Затем ясность и движение.",
    compactIntro: "Меня до сих пор удивляет, как работа с внутренними образами помогает человеку иначе увидеть свои желания и возможности. Но иногда даже для глубокой работы сначала нужен внутренний ресурс.",
    fullTitle: "Как я предлагаю работать со мной",
    fullIntro: "Мы можем двигаться от поиска опоры к пониманию своих желаний и затем к конкретным решениям. Это не обязательный курс из трёх ступеней: порядок и методы мы выбираем вместе, исходя из вашего запроса.",
    steps: [
      {
        title: "Найти опору",
        short: "Понять текущее состояние и что сейчас поддерживает вас.",
        detail: "Начинаем с разговора о состоянии, напряжении и доступных ресурсах. При желании можно отдельно обсудить гомеопатию как дополнительную практику — без обещаний устранения симптомов и без замены медицинской помощи.",
      },
      {
        title: "Прояснить желания",
        short: "Исследовать свой запрос через образы и внутренние переживания.",
        detail: "В образной терапии и работе с внутренними частями исследуем ваши желания, чувства, ограничения и то, что мешает сделать следующий шаг. Цель — лучше понять себя и найти направление.",
      },
      {
        title: "Перейти к действиям",
        short: "Посмотреть на отношения, роли и возможные решения шире.",
        detail: "Системные и архетипические расстановки позволяют по-новому рассмотреть ситуацию, свои роли и варианты действий. Они помогают исследовать выбор, но не предсказывают и не гарантируют внешние события.",
      },
    ],
    note: "Не всем нужны все три этапа. Гомеопатия — только дополнительная практика, не доказанный способ лечения и не замена стандартной или неотложной медицинской помощи.",
    compactAction: "Подробнее о личной работе",
    freeAction: "Начать с бесплатного self-check",
    contactAction: "Обсудить мой запрос",
  },
  en: {
    eyebrow: "My approach to personal work",
    compactTitle: "First, find your footing. Then clarity and movement.",
    compactIntro: "I am still surprised by how working with inner imagery can help someone see their wishes and possibilities differently. But sometimes we need enough inner resources before we feel ready to go deeper.",
    fullTitle: "How I suggest we work together",
    fullIntro: "We can move from finding a sense of support to understanding what you want, and then to practical choices. This is not a required three-step program: we choose the methods and sequence together based on your needs.",
    steps: [
      {
        title: "Find your footing",
        short: "Understand where you are and what helps you feel supported.",
        detail: "We begin by discussing how you feel, what is difficult and what resources you have. If you wish, we can also discuss homeopathy as a complementary practice, without promises of symptom relief or replacing medical care.",
      },
      {
        title: "Clarify what you want",
        short: "Explore your question through imagery and inner experience.",
        detail: "Guided imagery and parts-oriented work invite you to explore wishes, emotions and patterns that may keep you stuck. The aim is a clearer understanding of yourself and your possible next step.",
      },
      {
        title: "Move towards action",
        short: "Look more broadly at roles, relationships and choices.",
        detail: "Systemic and archetypal constellations offer a way to reflect on a situation, explore your role within it and consider options. They do not predict or guarantee external events.",
      },
    ],
    note: "You do not need all three stages. Homeopathy is a complementary practice, not an evidence-based treatment or a substitute for standard or urgent medical care.",
    compactAction: "Explore my approach",
    freeAction: "Start with a free self-check",
    contactAction: "Discuss my situation",
  },
} as const;

export function PersonalWorkJourney({
  locale,
  variant = "full",
}: {
  locale: Locale;
  variant?: "compact" | "full";
}) {
  const text = copy[locale];
  const compact = variant === "compact";
  const titleId = compact ? "journey-preview-title" : "personal-path-title";
  const href = "/" + locale + "/services#personal-path";

  return (
    <section
      id={compact ? undefined : "personal-path"}
      className={styles.section + " " + (compact ? styles.compact : styles.full)}
      aria-labelledby={titleId}
      data-personal-work-journey={variant}
    >
      <div className={styles.intro}>
        <p className={styles.eyebrow}>{text.eyebrow}</p>
        <h2 id={titleId}>{compact ? text.compactTitle : text.fullTitle}</h2>
        <p>{compact ? text.compactIntro : text.fullIntro}</p>
      </div>

      <ol className={styles.steps}>
        {text.steps.map((step, index) => (
          <li className={styles.step} key={step.title}>
            <span className={styles.number} aria-hidden="true">{"0" + (index + 1)}</span>
            <div>
              <h3>{step.title}</h3>
              <p>{compact ? step.short : step.detail}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className={styles.bottom}>
        {compact ? (
          <Link className={styles.primaryLink} href={href}>
            {text.compactAction}<span aria-hidden="true">→</span>
          </Link>
        ) : (
          <>
            <p className={styles.note}>{text.note}</p>
            <div className={styles.actions}>
              <AcquisitionEventLink
                href={LOCAL_ACQUISITION[locale].selfCheck.href}
                event="self_check_start"
                className={styles.primaryLink}
              >
                {text.freeAction}<span aria-hidden="true">→</span>
              </AcquisitionEventLink>
              <Link className={styles.secondaryLink} href="#consultation">
                {text.contactAction}<span aria-hidden="true">→</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
