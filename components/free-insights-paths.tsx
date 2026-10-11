"use client";

import Link from "next/link";
import { ArrowUpRight, Brain, Compass, Flower2 } from "lucide-react";
import { AcquisitionEventLink } from "@/components/acquisition-event-link";
import type { Locale } from "@/data/remedies";
import styles from "./free-insights-paths.module.css";

type OfferId = "stress" | "situation" | "wu";
type OfferCopy = { id: OfferId; label: string; title: string; description: string; action: string };
const COPY: Record<Locale, { eyebrow: string; title: string; intro: string; paths: OfferCopy[] }> = {
  en: {
    eyebrow: "START HERE · COMPLIMENTARY",
    title: "Three free ways to understand yourself",
    intro: "Try a self-check or request a personal written reflection. Choose just the one you need — there is no obligation to book a session.",
    paths: [
      {
        id: "stress",
        label: "Free self-check",
        title: "Stress & psychological profile",
        description: "Explore your stress level and psychological patterns with guided tests. Save your results if you wish.",
        action: "Explore free tests",
      },
      {
        id: "situation",
        label: "Free written review",
        title: "Personal situation analysis",
        description: "Describe your question and draw Me / Goal / Problem. Request Andrey's personal written reflection.",
        action: "Request free review",
      },
      {
        id: "wu",
        label: "Complimentary gift",
        title: "Wu Xing resource profile",
        description: "Request a personal reflection on your resources using Andrey's symbolic five-element model.",
        action: "Request my gift",
      },
    ],
  },
  ru: {
    eyebrow: "НАЧНИТЕ ЗДЕСЬ · БЕСПЛАТНО",
    title: "Три бесплатных способа лучше понять себя",
    intro: "Пройдите тест самостоятельно или закажите личный письменный разбор. Выберите только то, что сейчас полезно — без обязательства записываться на сессию.",
    paths: [
      {
        id: "stress",
        label: "Бесплатные тесты",
        title: "Стресс и психопрофиль",
        description: "Исследуйте уровень стресса и психологические особенности. Результаты можно сохранить в кабинете.",
        action: "Пройти бесплатные тесты",
      },
      {
        id: "situation",
        label: "Бесплатный разбор",
        title: "Личный анализ ситуации",
        description: "Опишите вопрос, нарисуйте «Я / Цель / Проблема» и запросите персональный письменный разбор.",
        action: "Заказать бесплатный анализ",
      },
      {
        id: "wu",
        label: "Подарок",
        title: "Профиль ресурсов У-Син",
        description: "Закажите личный обзор ресурсов по авторской символической модели пяти стихий.",
        action: "Получить подарок",
      },
    ],
  },
};
const ICONS = { stress: Brain, situation: Compass, wu: Flower2 };

export function FreeInsightsPaths({
  locale,
  variant = "public",
  testHref,
}: {
  locale: Locale;
  variant?: "public" | "cabinet";
  testHref?: string;
}) {
  const content = COPY[locale];
  const inCabinet = variant === "cabinet";
  const headingId = inCabinet ? "cabinet-free-insights-title" : "free-insights-title";
  return (
    <section
      id={inCabinet ? undefined : "free-insights"}
      className={[styles.shell, inCabinet ? styles.cabinet : ""].filter(Boolean).join(" ")}
      aria-labelledby={headingId}
      data-free-insights={variant}
    >
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>{content.eyebrow}</p>
          <h2 id={headingId}>{content.title}</h2>
        </div>
        <p className={styles.intro}>{content.intro}</p>
      </header>
      <div className={styles.grid}>
        {content.paths.map((path, index) => {
          const Icon = ICONS[path.id];
          const href = path.id === "stress"
            ? (testHref || "/" + locale + "/client")
            : "/" + locale + "/services/" + (path.id === "situation" ? "free-situation-review" : "dao-health-profile");
          const action = <>{path.action}<ArrowUpRight size={16} aria-hidden="true" /></>;
          return (
            <article className={styles.item} key={path.id} data-free-insights-offer={path.id}>
              <div className={styles.meta}>
                <Icon size={18} strokeWidth={1.6} aria-hidden="true" />
                <span className={styles.number}>0{index + 1}</span>
                <span className={styles.label}>{path.label}</span>
              </div>
              <h3>{path.title}</h3>
              <p>{path.description}</p>
              {inCabinet ? (
                <Link className={styles.action} href={href} prefetch={false}>{action}</Link>
              ) : (
                <AcquisitionEventLink
                  className={styles.action}
                  href={href}
                  event={path.id === "stress" ? "self_check_start" : "service_request_start"}
                >{action}</AcquisitionEventLink>
              )}
            </article>
          );
        })}
      </div>
      <p className={styles.note}>
        {locale === "ru"
          ? "Тесты не ставят медицинский диагноз. Личные разборы выполняются письменно после получения вашего запроса; это не бесплатный звонок."
          : "Self-checks are not medical diagnoses. Personal reviews are written after your request is received, not free live calls."}
      </p>
    </section>
  );
}
