"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, BookOpen, CheckCircle2, Compass, GraduationCap, Leaf, Sparkles } from "lucide-react";

import type { PublicLocale } from "@/lib/public-locales";
import styles from "./home-master-path.module.css";

type Mode = "personal" | "master";

const copy = {
  en: {
    eyebrow: "HOLISTIC HOUSE · YOUR PATH",
    heading: "Discover your path. Share what you learn.",
    choose: "Choose your path",
    personal: "For myself",
    master: "Become a Master",
    personalTitle: "Start with yourself",
    personalHint: "Free self-checks, learning and your own development space.",
    shortcuts: ["Get to know myself", "Learn Reiki for free", "My development path"],
    masterTitle: "Your path to energy practice",
    proPath: "Open the full Pro journey",
    masterHint: "New to energywork? Explore the steps. Already practicing? You can list a service now.",
    publish: "List a service for free",
    create: "Create your own course",
    free: "Free",
    stages: [
      { title: "Discover yourself", action: "Take free tests" },
      { title: "Take a free course", action: "Start Reiki Practitioner" },
      { title: "Receive a free service", action: "Ask for a written review" },
      { title: "Professional training", action: "Explore advanced Reiki" },
      { title: "Become a Master", action: "Explore the Pro path" },
    ],
    review: "A practitioner profile and basic service listing are free. Public listings require review; free study is not a professional qualification. The steps are suggestions, not prerequisites.",
  },
  ru: {
    eyebrow: "HOLISTIC HOUSE · ВАШ ПУТЬ",
    heading: "Узнай себя. Развивай практику. Делись опытом.",
    choose: "Выберите свой путь",
    personal: "Для себя",
    master: "Стать мастером",
    personalTitle: "Начни с себя",
    personalHint: "Бесплатные тесты, обучение и личный путь развития.",
    shortcuts: ["Узнать себя", "Бесплатный курс Рейки", "Мой путь развития"],
    masterTitle: "Твой путь в энергопрактике",
    proPath: "Открыть полный путь «Профи»",
    masterHint: "Новичок? Начни с обучения. Уже практикуешь? Можешь сразу добавить свою услугу.",
    publish: "Опубликовать услугу бесплатно",
    create: "Создать свой курс",
    free: "Бесплатно",
    stages: [
      { title: "Узнай себя", action: "Пройти бесплатные тесты" },
      { title: "Пройди бесплатный курс", action: "Начать курс «Практик Рейки»" },
      { title: "Получи бесплатную услугу", action: "Запросить письменный разбор" },
      { title: "Профессиональное обучение", action: "Углублённые курсы Рейки" },
      { title: "Стань мастером", action: "Открыть путь «Профи»" },
    ],
    review: "Профиль мастера и базовое размещение услуг бесплатны. Публикация — после модерации; бесплатный курс не даёт автоматической квалификации. Этапы — рекомендации, а не обязательные условия.",
  },
  es: {
    eyebrow: "HOLISTIC HOUSE · TU CAMINO",
    heading: "Conócete. Aprende. Comparte tu práctica.",
    choose: "Elige tu camino",
    personal: "Para mí",
    master: "Ser profesional",
    personalTitle: "Empieza por ti",
    personalHint: "Pruebas gratis, aprendizaje y desarrollo personal.",
    shortcuts: ["Conocerme mejor", "Aprender Reiki gratis", "Mi camino de desarrollo"],
    masterTitle: "Tu camino en las prácticas energéticas",
    proPath: "Abrir el camino Pro",
    masterHint: "¿Estás empezando? Explora los pasos. ¿Ya practicas? Puedes añadir tu servicio hoy.",
    publish: "Publicar un servicio gratis",
    create: "Crear mi curso",
    free: "Gratis",
    stages: [
      { title: "Conócete mejor", action: "Hacer pruebas gratis" },
      { title: "Haz un curso gratis", action: "Empezar Reiki Practitioner" },
      { title: "Recibe un servicio gratis", action: "Pedir revisión escrita" },
      { title: "Formación profesional", action: "Explorar Reiki avanzado" },
      { title: "Sé profesional", action: "Abrir camino Pro" },
    ],
    review: "El perfil profesional y la publicación básica de servicios son gratuitos. Las publicaciones requieren revisión; un curso gratuito no otorga certificación profesional. Los pasos son opcionales.",
  },
} as const;

export function HomeMasterPath({ locale }: { locale: PublicLocale }) {
  const [mode, setMode] = useState<Mode>("personal");
  const t = copy[locale];
  // The private Account/My Practice supports EN/RU. Use the English Account
  // for Spanish visitors rather than sending them to a non-existent /es/app.
  const accountLocale = locale === "es" ? "en" : locale;
  const targets = [
    "/" + locale + "/client/tests",
    "/" + accountLocale + "/academy/principles-of-energywork/learn",
    "/" + locale + "/services/free-situation-review",
    "/" + locale + "/academy/reiki",
    "/" + locale + "/pro",
  ];
  const serviceEditor = "/" + accountLocale + "/app/practice?panel=services&create=1";
  const courseEditor = "/" + accountLocale + "/app/practice?panel=materials&materialTab=courses&create=1";
  const personalTargets = [
    targets[0],
    targets[1],
    "/" + accountLocale + "/app/portfolio#hh-development-program",
  ];

  return (
    <section className={styles.section} aria-labelledby="hh-home-master-path-title" data-home-master-path data-home-master-mode={mode}>
      <div className={styles.top}>
        <div className={styles.heading}>
          <p className={styles.eyebrow}><Sparkles size={15} aria-hidden="true" />{t.eyebrow}</p>
          <h2 id="hh-home-master-path-title">{t.heading}</h2>
        </div>
        <div className={styles.switch} role="group" aria-label={t.choose}>
          <button type="button" aria-pressed={mode === "personal"} onClick={() => setMode("personal")}
            className={mode === "personal" ? styles.selected : ""} data-home-path-switch="personal">
            <Compass size={16} aria-hidden="true" />{t.personal}
          </button>
          <button type="button" aria-pressed={mode === "master"} onClick={() => setMode("master")}
            className={mode === "master" ? styles.selected : ""} data-home-path-switch="master">
            <GraduationCap size={17} aria-hidden="true" />{t.master}
            <span className={styles.free}>{t.free}</span>
          </button>
        </div>
      </div>

      {mode === "personal" ? (
        <div className={styles.personal} data-home-path-panel="personal">
          <p><strong>{t.personalTitle}</strong><span>{t.personalHint}</span></p>
          <nav className={styles.shortcuts} aria-label={t.personal}>
            {t.shortcuts.map((label, index) => (
              <Link href={personalTargets[index]} key={label} prefetch={false}>
                {index === 0 ? <CheckCircle2 size={17} aria-hidden="true" /> : index === 1
                  ? <BookOpen size={17} aria-hidden="true" /> : <Leaf size={17} aria-hidden="true" />}
                {label}<ArrowRight size={15} aria-hidden="true" />
              </Link>
            ))}
          </nav>
        </div>
      ) : (
        <div className={styles.master} data-home-path-panel="master">
          <div className={styles.masterIntro}>
            <div><h3>{t.masterTitle}</h3><p>{t.masterHint}</p>
              <Link className={styles.proGuide} href={"/" + locale + "/pro"} prefetch={false} data-home-master-pro-guide>
                {t.proPath}<ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
            <div className={styles.actions}>
              <Link className={styles.primary} href={serviceEditor} prefetch={false}
                data-home-master-action="publish-service">{t.publish}<ArrowRight size={17} aria-hidden="true" /></Link>
              <Link className={styles.secondary} href={courseEditor} prefetch={false}
                data-home-master-action="create-course">{t.create}<ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
          </div>
          <ol className={styles.steps} aria-label={t.masterTitle}>
            {t.stages.map((stage, index) => (
              <li key={stage.title}>
                <span className={styles.number} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <span className={styles.stageCopy}><strong>{stage.title}</strong>
                  <Link href={targets[index]} prefetch={false}>{stage.action}<ArrowRight size={14} aria-hidden="true" /></Link>
                </span>
              </li>
            ))}
          </ol>
          <p className={styles.review}><CheckCircle2 size={16} aria-hidden="true" />{t.review}</p>
        </div>
      )}
    </section>
  );
}
