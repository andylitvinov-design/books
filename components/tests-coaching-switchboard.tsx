"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, BookOpen, Check, CheckCircle2, ClipboardList, Compass, HeartHandshake, Leaf, Sparkles, X } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./tests-coaching-switchboard.module.css";

type Path = "profile" | "temple" | "coaching" | "support";
type Stage = "invite" | "practice" | "done";

const pathOrder: Path[] = ["profile", "temple", "coaching", "support"];

const messages = {
  en: {
    eyebrow: "YOUR PERSONAL STARTING POINT",
    title: "Tests & Coaching",
    lead: "A question, a fresh perspective, a small step forward. Begin where you are.",
    hint: "What would feel most helpful today?",
    paths: {
      profile: { name: "Know Yourself", detail: "Tests, personal profile & growth plan", cta: "Build my profile" },
      temple: { name: "Temple Insights", detail: "Taoist symbols & temple archetypes", cta: "Explore insights" },
      coaching: { name: "Coaching Sessions", detail: "Choose your topic and discover suitable coaching sessions", cta: "Choose a session" },
      support: { name: "Practice & Support", detail: "Small exercises, courses & personal care", cta: "Find support" },
    },
    close: "All four paths",
    profileLead: "Build a personal, business, wellbeing or comprehensive profile in the dedicated free Profile Builder.",
    profileDetail: "Choose your life areas, select or customize the scales and free tests, then review your results and development options.",
    profileKinds: { personal: "Personal", relationships: "Relationships", business: "Work & business", whole: "Whole-person" },
    scalesTitle: "What would you like to explore?",
    scales: {
      personality: "Personality traits", resources: "Inner resources",
      wellbeing: "Everyday wellbeing", balance: "Life balance", stress: "Current state & stress",
    },
    selectAll: "Select all", clear: "Clear",
    recommended: "Your suggested tests", steps: "Start with any assessment. You can return for the others.",
    tests: {
      personality: "Personality baseline · IPIP",
      resources: "Resources & inner support",
      wellbeing: "Weekly wellbeing",
      balance: "Life profile",
      stress: "Current state check-in",
    },
    start: "Start this free test", noScale: "Choose at least one scale to see your tests.",
    testCatalog: "View full Test Explorer",
    mySpace: "My Space · reports & development",
    afterTests: "After completing tests, review the actual results and choose your development goals in My Space. Scores alone do not diagnose or create a guaranteed plan.",
    templeLead: "A symbolic reflection, not a prediction or a psychological test. Your question stays in this browser.",
    daoLabel: "I Ching · 64 hexagrams", daoDescription: "Write a question below and receive a randomly drawn symbol with reflections and a small next step.",
    archetypeLabel: "Temple archetypes", archetypeDescription: "Explore the existing Greek and Egyptian guided traditions.",
    greek: "Greek tradition", egypt: "Egyptian tradition",
    personalReading: "Request a personal Daoist reading",
    supportLead: "A little steadiness can begin in two minutes. Choose your pace; stop whenever you like.",
    immediate: "Find your ground", immediateDetail: "A gentle, guided way to notice support around you.",
    try: "Try a 2-minute practice", skip: "Not now",
    exerciseTitle: "Notice the support around you",
    exercise: "If it feels comfortable, notice your feet touching the floor. Look around and name three neutral things you can see. Let your breath find its own pace. There is nothing to achieve.",
    gentle: "Lighter option: simply notice one colour in the room, without changing your breathing.",
    done: "I've practised", completion: "You made room for a moment of attention. Notice what, if anything, feels different.",
    again: "Repeat the exercise", programme: "14-day OPORA practice",
    programmeDetail: "Seven supportive skills practised gently over 14 days.",
    personalSupport: "Request personal support",
    personalSupportDetail: "Explore a private consultation without an automatic booking or payment.",
    disclaimer: "Educational self-reflection. This is not diagnosis, emergency care, or a substitute for professional support.",
  },
  ru: {
    eyebrow: "ВАШ ПЕРВЫЙ ШАГ",
    title: "Тесты и коучинг",
    lead: "Один вопрос, новый взгляд, небольшой шаг. Начните с того, что важно сейчас.",
    hint: "Что сейчас было бы для вас полезнее?",
    paths: {
      profile: { name: "Познать себя", detail: "Тесты, профиль и программа развития", cta: "Создать профиль" },
      temple: { name: "Храмовые подсказки", detail: "Даосские символы и архетипы", cta: "Получить подсказку" },
      coaching: { name: "Коучинг-сессии", detail: "Выберите тему и найдите подходящую коуч-сессию", cta: "Подобрать сессию" },
      support: { name: "Практика и поддержка", detail: "Упражнения, курсы и личная помощь", cta: "Найти поддержку" },
    },
    close: "Все направления",
    profileLead: "Для личностного, бизнес-, ресурсного или комплексного профиля используйте единый бесплатный конструктор.",
    profileDetail: "Выберите сферы и шкалы, отредактируйте набор бесплатных тестов и посмотрите результаты и направления развития.",
    profileKinds: { personal: "Личность", relationships: "Отношения", business: "Работа и бизнес", whole: "Комплексный" },
    scalesTitle: "Что вы хотите исследовать?",
    scales: {
      personality: "Черты личности", resources: "Внутренние ресурсы",
      wellbeing: "Самочувствие", balance: "Баланс сфер жизни", stress: "Текущее состояние и стресс",
    },
    selectAll: "Выбрать всё", clear: "Снять выбор",
    recommended: "Рекомендуемые тесты", steps: "Начните с любого теста. К остальным можно вернуться.",
    tests: {
      personality: "Базовый профиль личности · IPIP",
      resources: "Ресурсы и внутренняя опора",
      wellbeing: "Самочувствие за неделю",
      balance: "Профиль сфер жизни",
      stress: "Текущее состояние",
    },
    start: "Пройти тест бесплатно", noScale: "Отметьте хотя бы одну шкалу.",
    testCatalog: "Все тесты", mySpace: "Моё пространство · отчёты и развитие",
    afterTests: "После тестов посмотрите реальные результаты и выберите цели развития в личном кабинете. Баллы не являются диагнозом и не обещают готовую программу сами по себе.",
    templeLead: "Символическая практика для размышления, а не предсказание или психологический тест. Вопрос остаётся в этом браузере.",
    daoLabel: "И-Цзин · 64 гексаграммы", daoDescription: "Напишите вопрос ниже — получите случайную гексаграмму, толкование и небольшой практический шаг.",
    archetypeLabel: "Храмовые архетипы", archetypeDescription: "Исследуйте существующие греческие и египетские традиции.",
    greek: "Греческая традиция", egypt: "Египетская традиция",
    personalReading: "Запросить личное даосское чтение",
    supportLead: "Иногда двух минут достаточно, чтобы почувствовать опору. Выберите свой темп; остановиться можно в любой момент.",
    immediate: "Найти опору прямо сейчас", immediateDetail: "Бережная практика внимания к тому, что поддерживает.",
    try: "Попробовать · 2 минуты", skip: "Не сейчас",
    exerciseTitle: "Заметьте опору вокруг",
    exercise: "Если вам комфортно, почувствуйте соприкосновение стоп с полом. Осмотритесь и назовите три нейтральных предмета. Позвольте дыханию идти в естественном темпе. Ничего не нужно достигать.",
    gentle: "Облегчённый вариант: просто найдите один цвет вокруг, не меняя дыхание.",
    done: "Я попробовал", completion: "Вы уделили внимание себе. Заметьте, изменилось ли что-то, без необходимости улучшения.",
    again: "Повторить", programme: "14 дней практики ОПОРА",
    programmeDetail: "Семь бережных навыков поддержки за 14 дней.",
    personalSupport: "Запросить личную поддержку",
    personalSupportDetail: "Узнать о консультации без автоматической оплаты и записи.",
    disclaimer: "Самоисследование и обучение, не диагностика, не экстренная и не медицинская помощь.",
  },
  es: {
    eyebrow: "TU PRIMER PASO",
    title: "Tests y coaching",
    lead: "Una pregunta, una nueva perspectiva, un pequeño paso. Empieza donde estás.",
    hint: "¿Qué te ayudaría más hoy?",
    paths: {
      profile: { name: "Conócete", detail: "Tests, perfil y plan de desarrollo", cta: "Crear mi perfil" },
      temple: { name: "Reflexiones del templo", detail: "Símbolos taoístas y arquetipos", cta: "Explorar símbolos" },
      coaching: { name: "Sesiones de coaching", detail: "Elige un tema y encuentra la sesión adecuada", cta: "Elegir sesión" },
      support: { name: "Práctica y apoyo", detail: "Ejercicios, cursos y apoyo personal", cta: "Buscar apoyo" },
    },
    close: "Las cuatro opciones",
    profileLead: "Crea tu perfil personal, empresarial, de bienestar o integral con nuestro único editor gratuito.",
    profileDetail: "Elige áreas, escalas y pruebas gratuitas; después explora resultados y opciones de desarrollo.",
    profileKinds: { personal: "Personal", relationships: "Relaciones", business: "Trabajo y negocios", whole: "Integral" },
    scalesTitle: "¿Qué quieres explorar?",
    scales: {
      personality: "Rasgos de personalidad", resources: "Recursos internos",
      wellbeing: "Bienestar", balance: "Equilibrio vital", stress: "Estado actual y estrés",
    },
    selectAll: "Seleccionar todas", clear: "Borrar selección",
    recommended: "Tests sugeridos", steps: "Empieza con cualquier test; puedes volver por los demás.",
    tests: {
      personality: "Perfil de personalidad · IPIP",
      resources: "Recursos y apoyo interior",
      wellbeing: "Bienestar semanal",
      balance: "Perfil vital",
      stress: "Estado actual",
    },
    start: "Hacer este test gratis", noScale: "Selecciona al menos una escala.",
    testCatalog: "Ver todos los tests", mySpace: "Mi espacio · informes y desarrollo",
    afterTests: "Tras completar los tests, revisa tus resultados reales y elige metas de desarrollo en Mi espacio. No son diagnósticos ni garantizan resultados.",
    templeLead: "Reflexión simbólica, no una predicción ni una prueba psicológica. La pregunta permanece en este navegador.",
    daoLabel: "I Ching · 64 hexagramas", daoDescription: "Escribe una pregunta abajo para recibir un símbolo aleatorio, una reflexión y un paso sencillo.",
    archetypeLabel: "Arquetipos del templo", archetypeDescription: "Explora las tradiciones guiadas griega y egipcia.",
    greek: "Tradición griega", egypt: "Tradición egipcia",
    personalReading: "Solicitar una lectura taoísta personal",
    supportLead: "Un poco de calma puede empezar en dos minutos. Elige tu ritmo; puedes parar cuando quieras.",
    immediate: "Encuentra tu punto de apoyo", immediateDetail: "Una práctica suave para notar lo que te sostiene.",
    try: "Probar · 2 minutos", skip: "Ahora no",
    exerciseTitle: "Nota el apoyo alrededor",
    exercise: "Si te resulta cómodo, nota tus pies en el suelo. Mira alrededor y nombra tres objetos neutros. Deja que tu respiración vaya a su ritmo. No necesitas lograr nada.",
    gentle: "Versión más suave: simplemente observa un color en la habitación sin cambiar la respiración.",
    done: "He practicado", completion: "Te has dedicado un momento. Observa si algo ha cambiado, sin exigencia de mejorar.",
    again: "Repetir", programme: "14 días de OPORA",
    programmeDetail: "Siete habilidades amables de apoyo en 14 días.",
    personalSupport: "Solicitar apoyo personal",
    personalSupportDetail: "Explorar una consulta sin reserva ni pago automático.",
    disclaimer: "Reflexión educativa; no es diagnóstico, atención de emergencia ni sustituto de un profesional.",
  },
} as const;

const pathIcons = { profile: ClipboardList, temple: Sparkles, coaching: Compass, support: HeartHandshake };
const quickCtas: Record<PublicLocale, Record<Path, string>> = {
  en: { profile: "Start free", temple: "Get inspired", coaching: "Choose by topic", support: "Try 2 minutes" },
  ru: { profile: "Начать", temple: "Подсказки", coaching: "Выбрать тему", support: "2 минуты" },
  es: { profile: "Empezar", temple: "Inspirarme", coaching: "Elegir tema", support: "Probar 2 min" },
};
const supportTime: Record<PublicLocale, string> = {
  en: "01 · A 2-MINUTE PAUSE", ru: "01 · ПРАКТИКА НА 2 МИНУТЫ", es: "01 · PAUSA DE 2 MINUTOS",
};

export function TestsCoachingSwitchboard({ locale, templeContent }: { locale: PublicLocale; templeContent: ReactNode }) {
  const t = messages[locale];
  const [path, setPath] = useState<Path | null>(null);
  const [stage, setStage] = useState<Stage>("invite");
  const detailRef = useRef<HTMLElement>(null);
  const firstCardRef = useRef<HTMLButtonElement>(null);
  const hasOpened = useRef(false);
  useEffect(() => {
    if (path) { hasOpened.current = true; detailRef.current?.focus(); }
    else if (hasOpened.current) firstCardRef.current?.focus();
  }, [path]);

  function open(next: Path) {
    setPath(current => current === next ? null : next);
  }
  return <div className={styles.root} data-tests-coaching-hub>
    <header className={styles.intro}>
      <p className={styles.eyebrow}><Sparkles size={15} aria-hidden="true" /> {t.eyebrow}</p>
      <h1 id="tests-coaching-title">{t.title}</h1>
      <p className={styles.lead}>{t.lead}</p>
      <small className={styles.hint}>{t.hint}</small>
    </header>
    <nav className={styles.grid} aria-label={t.hint} hidden={Boolean(path)}>
      {pathOrder.map((key, index) => {
        const Icon = pathIcons[key];
        const item = t.paths[key];
        const content = <>
          <span className={styles.cardTop}>
            <span className={styles.cardIcon}><Icon size={22} aria-hidden="true" /></span>
            <span className={styles.cardNumber} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          </span>
          <strong>{item.name}</strong>
          <span className={styles.description}>{item.detail}</span>
          <span className={styles.cardBottom}>
            <span className={styles.cardCta}>{quickCtas[locale][key]}</span>
            <span className={styles.cardArrow}><ArrowRight size={15} aria-hidden="true" /></span>
          </span>
        </>;
        // Coaching is already a topic-first chooser. Do not open another
        // "self-guided / traditions / personal" interstitial before it.
        return key === "coaching"
          ? <Link key={key} className={styles.card} href={`/${locale}/coaching`}
              data-tests-coaching-path={key} data-tests-coaching-direct prefetch={false}>
              {content}
            </Link>
          : <button type="button" key={key} className={styles.card}
              ref={index === 0 ? firstCardRef : undefined}
              data-tests-coaching-path={key}
              data-active={path === key ? "true" : "false"}
              aria-expanded={path === key}
              aria-controls="tests-coaching-detail"
              onClick={() => open(key)}>
              {content}
            </button>;
      })}
    </nav>
    <section id="tests-coaching-detail" ref={detailRef} tabIndex={-1} className={styles.detail} data-selected-path={path || undefined} hidden={!path} aria-live="polite" aria-label={path ? t.paths[path].name : undefined}>
      {path ? <>
        <div className={styles.detailHeader}>
          <h2>{t.paths[path].name}</h2>
          <button type="button" className={styles.close} data-tests-coaching-back onClick={() => setPath(null)} aria-label={t.close}><X size={17} aria-hidden="true" /> {t.close}</button>
        </div>
        {path === "profile" ? <div className={styles.profile} data-personality-profiles-entry>
          <p className={styles.detailLead}>{t.profileLead}</p>
          <div className={styles.subchoices}>
            <div>
              <strong><ClipboardList size={18} aria-hidden="true" /> {t.paths.profile.name}</strong>
              <p>{t.profileDetail}</p>
              <Link className={styles.primaryLink} href={`/${locale}/personality-profiles`} prefetch={false}>
                {t.paths.profile.cta} <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
          <div className={styles.links}>
            <Link href={`/${locale}/client/tests`} prefetch={false}>{t.testCatalog} <ArrowRight size={16} aria-hidden="true" /></Link>
            <Link href={`/${locale === "es" ? "en" : locale}/app`} prefetch={false}>{t.mySpace} <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          <p className={styles.fine}>{t.afterTests}</p>
        </div> : null}
        {path === "temple" ? <div data-tests-coaching-temple>
          <p className={styles.detailLead}>{t.templeLead}</p>
          <div className={styles.subchoices}>
            <div><strong><BookOpen size={18} aria-hidden="true" /> {t.daoLabel}</strong><p>{t.daoDescription}</p></div>
            <div><strong><Sparkles size={18} aria-hidden="true" /> {t.archetypeLabel}</strong><p>{t.archetypeDescription}</p>
              <div className={styles.links}>
                <Link href={`/${locale}/academy/coaching/greek`} prefetch={false}>{t.greek} <ArrowRight size={14} aria-hidden="true" /></Link>
                <Link href={`/${locale}/academy/coaching/egyptian`} prefetch={false}>{t.egypt} <ArrowRight size={14} aria-hidden="true" /></Link>
              </div>
            </div>
          </div>
          <Link className={styles.primaryLink} href={`/${locale}/temple-support`} prefetch={false}>Temple Support <ArrowRight size={16} aria-hidden="true" /></Link>
          {templeContent}
        </div> : null}
        {path === "support" ? <div className={styles.supportJourney} data-tests-coaching-support>
          <p className={styles.detailLead}>{t.supportLead}</p>
          <div className={styles.supportFeatured}>
            <span className={styles.supportStep}><Leaf size={16} aria-hidden="true" /> {supportTime[locale]}</span>
            <h3>{t.immediate}</h3>
            <p className={styles.supportFeaturedDescription}>{t.immediateDetail}</p>
            {stage === "invite" ? <button type="button" className={styles.primaryLink} onClick={() => setStage("practice")}>
              {t.try} <ArrowRight size={17} aria-hidden="true" />
            </button> : null}
            {stage === "practice" ? <div className={styles.exercise} role="region" aria-label={t.exerciseTitle}>
              <h3>{t.exerciseTitle}</h3><p>{t.exercise}</p><p>{t.gentle}</p>
              <div className={styles.links}>
                <button type="button" onClick={() => setStage("done")}><Check size={15} aria-hidden="true" /> {t.done}</button>
                <button type="button" onClick={() => setStage("invite")}>{t.skip}</button>
              </div>
            </div> : null}
            {stage === "done" ? <div className={styles.exercise} role="status">
              <p><CheckCircle2 size={17} aria-hidden="true" /> {t.completion}</p>
              <button type="button" onClick={() => setStage("practice")}>{t.again} <ArrowRight size={15} aria-hidden="true" /></button>
            </div> : null}
          </div>
          <div className={styles.supportNext}>
            <Link href={`/${locale}/courses/antistress`} prefetch={false} className={styles.supportSmall} aria-label={t.programme}>
              <span className={styles.supportSmallIcon} aria-hidden="true"><ClipboardList size={21} /></span>
              <span className={styles.supportSmallText}>
                <strong>{t.programme}</strong><span className={styles.supportSmallDescription}>{t.programmeDetail}</span>
              </span>
              <span className={styles.supportArrow} aria-hidden="true"><ArrowRight size={18} /></span>
            </Link>
            <Link href={`/${locale}/services#consultation`} prefetch={false} className={styles.supportSmall} aria-label={t.personalSupport}>
              <span className={styles.supportSmallIcon} aria-hidden="true"><HeartHandshake size={21} /></span>
              <span className={styles.supportSmallText}>
                <strong>{t.personalSupport}</strong><span className={styles.supportSmallDescription}>{t.personalSupportDetail}</span>
              </span>
              <span className={styles.supportArrow} aria-hidden="true"><ArrowRight size={18} /></span>
            </Link>
          </div>
        </div> : null}
        <p className={styles.disclaimer}>{t.disclaimer}</p>
      </> : null}
    </section>
  </div>;
}
