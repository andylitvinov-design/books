"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Brain, Check, FileText, GraduationCap, HeartHandshake, Send, ShieldCheck } from "lucide-react";
import { AcquisitionEventLink } from "@/components/acquisition-event-link";
import type { Locale } from "@/data/remedies";
import styles from "./consultation-choice-capture.module.css";


type FreeOffer = "selfTest" | "analysis" | "reiki";

const offerOrder: FreeOffer[] = ["selfTest", "analysis", "reiki"];
const offerIcons = { selfTest: Brain, analysis: FileText, reiki: GraduationCap };

const copy = {
  en: {
    eyebrow: "THREE FREE OPTIONS · HOLISTIC HOUSE",
    title: "Choose a free starting point",
    lead: "Take a self-test, request personal analysis or start learning Reiki — all free.",
    question: "How would you like to begin?",
    offers: {
      selfTest: {
        title: "Free Self-Test",
        compactTitle: "Free self-test",
        description: "Explore stress, personality and personal resources with free self-check questionnaires.",
        action: "Take a free self-test",
        note: "Next: choose your topic, complete the tests and explore your results. These are self-reflection tools, not medical diagnoses.",
      },
      analysis: {
        title: "Free Personal Analysis",
        compactTitle: "Free personal analysis",
        description: "Complete a short questionnaire and send your Me / Goal / Problem drawing for a personal written review.",
        action: "Get my free personal analysis",
        note: "Next: fill in the form and send your drawing. You will receive a personal written review, not a free live consultation.",
      },
      reiki: {
        title: "Free Reiki Practitioner Program",
        compactTitle: "Free Reiki practitioner program",
        description: "Learn about Tantra Reiki, Reiki Yggdrasil and Kundalini Reiki through free interactive lessons.",
        action: "Start free Reiki practitioner program",
        note: "Next: study the lessons, watch videos and answer questions. You may request teacher-led Level 1 initiations after completing the tasks; these are not automatic.",
      },
    },
    free: "Free to start",
    withoutBooking: "No paid session required",
    paid: "Looking for a personal paid consultation? See options (€50 / 30 min or €100 / 60 min)",
    telegram: "Or write on Telegram",
    disclaimer: "Self-tests are not medical diagnoses. Personal analysis is a written review. Reiki study does not automatically grant an initiation or certificate.",
  },
  ru: {
    eyebrow: "ТРИ БЕСПЛАТНЫХ ВОЗМОЖНОСТИ · HOLISTIC HOUSE",
    title: "С чего начать бесплатно?",
    lead: "Пройдите самотест, получите личный разбор или начните обучение Рейки — бесплатно.",
    question: "Как вы хотите начать?",
    offers: {
      selfTest: {
        title: "Бесплатный самотест",
        compactTitle: "Бесплатные тесты",
        description: "Исследуйте стресс, особенности личности и внутренние ресурсы с помощью бесплатных опросников.",
        action: "Пройти бесплатные тесты",
        note: "Далее: выберите тему и пройдите тесты. Посмотрите результаты и пояснения. Это инструменты самопознания, не медицинская диагностика.",
      },
      analysis: {
        title: "Бесплатный личный анализ",
        compactTitle: "Личный разбор",
        description: "Заполните небольшую анкету и пришлите рисунок «Я / Цель / Проблема» для письменного разбора.",
        action: "Получить бесплатный личный разбор",
        note: "Далее: заполните анкету и отправьте рисунок. Вы получите персональный письменный разбор, а не бесплатную онлайн-консультацию.",
      },
      reiki: {
        title: "Бесплатная программа «Практик Рейки»",
        compactTitle: "Программа «Практик Рейки»",
        description: "Изучайте Тантра Рейки, Рейки Иггдрасиль и Кундалини Рейки в интерактивном курсе.",
        action: "Начать бесплатный курс «Практик Рейки»",
        note: "Далее: изучайте уроки, смотрите видео и отвечайте на вопросы. После выполнения заданий можно запросить инициации 1-й ступени у преподавателя; автоматически они не предоставляются.",
      },
    },
    free: "Бесплатно",
    withoutBooking: "Без обязательной платной сессии",
    paid: "Нужна личная платная консультация? Форматы: €50 / 30 мин или €100 / 60 мин",
    telegram: "Или напишите в Telegram",
    disclaimer: "Опросники не ставят медицинский диагноз. Личный разбор предоставляется письменно. Обучение Рейки не означает автоматической инициации или сертификации.",
  },
} as const;

export function HomepageFreeCapture({ locale }: { locale: Locale }) {
  const titleId = useId();
  const t = copy[locale];
  const [selected, setSelected] = useState<FreeOffer>("selfTest");
  const active = t.offers[selected];
  const ActiveIcon = offerIcons[selected];
  const href = selected === "selfTest" ? `/${locale}/client/tests`
    : selected === "analysis" ? `/${locale}/services/free-situation-review`
      : `/${locale}/academy/principles-of-energywork/learn`;

  return (
    <section
      className={`${styles.capture} ${styles.homeCapture}`}
      data-home-free-capture="true"
      data-consultation-capture="home-free"
      data-consultation-cta="true"
      data-conversion-kind="home-free"
      lang={locale}
      aria-labelledby={titleId}
    >
      <p className={styles.eyebrow}><HeartHandshake size={19} aria-hidden="true" />{t.eyebrow}</p>
      <h2 className={styles.title} id={titleId}>{t.title}</h2>
      <p className={styles.lead}>{t.lead}</p>
      <p className={styles.question}>{t.question}</p>
      <div className={`${styles.choices} ${styles.homeFreeChoices}`} data-choice-layout="home-free" role="group" aria-label={t.question}>
        {offerOrder.map((id, index) => {
          const Icon = offerIcons[id];
          return (
            <button
              key={id}
              type="button"
              className={`${styles.choice} ${styles.homeFreeChoice}`}
              data-home-free-option={id}
              data-selected={selected === id}
              aria-pressed={selected === id}
              aria-label={`${t.offers[id].title}. ${t.offers[id].description}`}
              onClick={() => setSelected(id)}
            >
              <span className={styles.homeFreeNumber} aria-hidden="true">0{index + 1}</span>
              <Icon size={21} strokeWidth={1.7} aria-hidden="true" />
              <span className={styles.homeFreeOptionText}>
                <strong>{t.offers[id].compactTitle}</strong>
              </span>
              {selected === id ? <Check className={styles.homeFreeCheck} size={18} strokeWidth={2.6} aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
      <AcquisitionEventLink
        prefetch={false}
        className={styles.action}
        href={href}
        event={selected === "selfTest" ? "self_check_start" : selected === "analysis" ? "service_request_start" : "service_view"}
        analyticsEvent={selected === "analysis" ? "free_situation_assessment_click" : undefined}
        attributes={{ "data-home-free-action": selected }}
      >
        <ActiveIcon size={19} aria-hidden="true" />
        <span>{active.action}</span>
        <ArrowUpRight size={20} aria-hidden="true" />
      </AcquisitionEventLink>
      <p className={styles.note}>{active.note}</p>
      <div className={styles.footer}>
        <div className={styles.assurances}>
          <span><Check size={14} aria-hidden="true" />{t.free}</span>
          <span><Check size={14} aria-hidden="true" />{t.withoutBooking}</span>
        </div>
        <div className={styles.secondary}>
          <Link prefetch={false} href={`/${locale}/services`}><ShieldCheck size={14} aria-hidden="true" />{t.paid}</Link>
          <AcquisitionEventLink
            prefetch={false}
            href="https://t.me/AndyTherapist"
            target="_blank"
            rel="noopener noreferrer"
            event="contact_click"
            attributes={{ "data-contact-channel": "telegram" }}
          >
            <Send size={14} aria-hidden="true" />{t.telegram}
          </AcquisitionEventLink>
        </div>
      </div>
      <p className={styles.disclaimer}>{t.disclaimer}</p>
    </section>
  );
}
