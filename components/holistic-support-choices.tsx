"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Compass, Headphones, HeartHandshake, Sparkles } from "lucide-react";

import { IdeasDiscovery } from "@/components/ideas-discovery";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "@/app/[locale]/holistic-support/holistic-support.module.css";

const copy = {
  en: {
    eyebrow: "HOLISTIC HOUSE · PRACTICES & GUIDANCE",
    title: "Holistic Support",
    lead: "Choose a free meditation, request personal energy support, or ask a question for a symbolic Taoist insight.",
    choose: "How would you like to begin?",
    meditations: "Meditations",
    meditationsHint: "Free video and audio practices",
    energy: "Energy support",
    energyHint: "Request a session with a practitioner",
    dao: "Taoist insights",
    daoHint: "Ask a question · free I Ching reflection",
    mobileLink: "Try the new mobile Support screen",
  },
  ru: {
    eyebrow: "HOLISTIC HOUSE · ПРАКТИКИ И ПОДСКАЗКИ",
    title: "Холистическая поддержка",
    lead: "Выберите медитацию, энергетическую поддержку или бесплатную символическую подсказку по вашему вопросу.",
    choose: "С чего хотите начать?",
    meditations: "Медитации",
    meditationsHint: "Бесплатные видео- и аудиопрактики",
    energy: "Энергетическая поддержка",
    energyHint: "Запросить сессию у мастера",
    dao: "Даосские подсказки",
    daoHint: "Задать вопрос · бесплатно · И-Цзин",
    mobileLink: "Открыть новый мобильный экран поддержки",
  },
  es: {
    eyebrow: "HOLISTIC HOUSE · PRÁCTICAS Y ORIENTACIÓN",
    title: "Apoyo holístico",
    lead: "Elige una meditación gratuita, solicita apoyo energético o plantea tu pregunta para una reflexión taoísta simbólica.",
    choose: "¿Por dónde quieres empezar?",
    meditations: "Meditaciones",
    meditationsHint: "Prácticas gratuitas en vídeo y audio",
    energy: "Apoyo energético",
    energyHint: "Solicitar una sesión con un profesional",
    dao: "Consejos taoístas",
    daoHint: "Haz tu pregunta · reflexión gratuita del I Ching",
    mobileLink: "Ver la nueva pantalla móvil de apoyo",
  },
} as const;

export function HolisticSupportChoices({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const [daoOpen, setDaoOpen] = useState(false);
  const daoPanelRef = useRef<HTMLElement>(null);
  const daoHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (window.location.hash === "#dao-guidance") setDaoOpen(true);
  }, []);

  useEffect(() => {
    if (!daoOpen) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    daoPanelRef.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    daoHeadingRef.current?.focus({ preventScroll: true });
  }, [daoOpen]);

  return (
    <>
      <section className={styles.journeyHero} aria-labelledby="holistic-journey-title"
        data-holistic-first-screen data-holistic-three-choices>
        <Image src="/images/holistic-house/hero-olive-incense.webp" fill priority
          sizes="(max-width: 650px) 100vw, 1190px" alt="" className={styles.journeyBackground} />
        <div className={styles.journeyShade} aria-hidden="true" />
        <div className={styles.journeyContent}>
          <p className={styles.journeyEyebrow}>{t.eyebrow}</p>
          <h1 id="holistic-journey-title">{t.title}</h1>
          <p className={styles.journeyLead}>{t.lead}</p>
          <h2 className={styles.journeyPrompt}>{t.choose}</h2>
          <div className={styles.journeyChoices} role="group" aria-label={t.choose}>
            <a className={styles.journeyChoice} href="#meditation-practices" data-holistic-choose="meditations">
              <span className={styles.journeyChoicePhoto}>
                <Image src="/images/holistic-house/reiki-practitioner-sunrise.webp" alt="" fill
                  sizes="(max-width: 650px) 104px, 370px" />
              </span>
              <span className={styles.journeyChoiceText}>
                <span className={styles.journeyChoiceIcon}><Headphones size={18} aria-hidden="true" /></span>
                <strong>{t.meditations}</strong>
                <small>{t.meditationsHint}</small>
              </span>
              <ArrowRight className={styles.journeyArrow} size={20} aria-hidden="true" />
            </a>
            <Link className={styles.journeyChoice} href={`/${locale}/services/remote-energy-support`}
              prefetch={false} data-holistic-choose="energy">
              <span className={styles.journeyChoicePhoto}>
                <Image src="/images/holistic-house/reiki-approved-sunrise-v3.webp" alt="" fill
                  sizes="(max-width: 650px) 104px, 370px" />
              </span>
              <span className={styles.journeyChoiceText}>
                <span className={styles.journeyChoiceIcon}><HeartHandshake size={18} aria-hidden="true" /></span>
                <strong>{t.energy}</strong>
                <small>{t.energyHint}</small>
              </span>
              <ArrowRight className={styles.journeyArrow} size={20} aria-hidden="true" />
            </Link>
            <button className={styles.journeyChoice} type="button" aria-controls="dao-guidance"
              aria-expanded={daoOpen} onClick={() => setDaoOpen(open => !open)}
              data-holistic-choose="dao">
              <span className={styles.journeyChoicePhoto}>
                <Image src="/images/holistic-house/hero-olive-incense.webp" alt="" fill
                  sizes="(max-width: 650px) 104px, 370px" />
              </span>
              <span className={styles.journeyChoiceText}>
                <span className={styles.journeyChoiceIcon}><Compass size={18} aria-hidden="true" /></span>
                <strong>{t.dao}</strong>
                <small>{t.daoHint}</small>
              </span>
              <ArrowRight className={styles.journeyArrow} size={20} aria-hidden="true" />
            </button>
          </div>
          <Link className={styles.mobileExperienceLink} href={"/" + locale + "/holistic-support/mobile"} prefetch={false} data-support-alternative-link>
            <Sparkles size={18} aria-hidden="true" />{t.mobileLink}<ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>
      {daoOpen ? (
        <section ref={daoPanelRef} id="dao-guidance" className={styles.daoDestination}
          aria-label={t.dao} data-holistic-dao-screen>
          <h2 className={styles.visuallyHidden} tabIndex={-1} ref={daoHeadingRef}>{t.dao}</h2>
          <IdeasDiscovery locale={locale} variant="holistic-dao" />
        </section>
      ) : null}
    </>
  );
}
