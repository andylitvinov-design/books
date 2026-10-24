"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ArrowRight, BookOpen, Check, CheckCircle2, ChevronRight, ClipboardList, Compass, HeartHandshake, Leaf, Sparkles, X } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./tests-coaching-switchboard.module.css";

type Path = "profile" | "temple" | "coaching" | "support";
type ProfileKind = "personal" | "relationships" | "business" | "whole";
type Scale = "personality" | "resources" | "wellbeing" | "balance" | "stress";
type Stage = "invite" | "practice" | "done";

const scaleOrder: Scale[] = ["personality", "resources", "wellbeing", "balance", "stress"];
// All IDs are already cleared, guest-startable catalog entries. This public
// selector is only a recommendation UI, never a parallel scorer or report DB.
const startableTests: Record<Scale, string> = {
  personality: "mini-ipip-20",
  resources: "hh-resource-pulse",
  wellbeing: "hh-weekly-pulse",
  balance: "hh-monthly-profile",
  stress: "hh-current-state",
};
const defaultScales: Record<ProfileKind, Scale[]> = {
  personal: ["personality", "resources", "wellbeing"],
  relationships: ["personality", "resources", "balance"],
  business: ["personality", "resources", "balance"],
  whole: [...scaleOrder],
};
const pathOrder: Path[] = ["profile", "temple", "coaching", "support"];
const profileKinds: ProfileKind[] = ["personal", "relationships", "business", "whole"];

const messages = {
  en: {
    eyebrow: "YOUR PERSONAL STARTING POINT",
    title: "Tests & Coaching",
    lead: "Know yourself, find a fresh perspective, or get gentle practical support.",
    hint: "Choose what would be most helpful today.",
    paths: {
      profile: { name: "Know Yourself", detail: "Tests, personal profile & growth plan", cta: "Build my profile" },
      temple: { name: "Temple Insights", detail: "Taoist symbols & temple archetypes", cta: "Explore insights" },
      coaching: { name: "Coaching Sessions", detail: "Guided conversations and traditions", cta: "Find a session" },
      support: { name: "Practice & Support", detail: "Small exercises, courses & personal care", cta: "Find support" },
    },
    close: "Back to four choices",
    profileLead: "Choose a kind of profile, then the scales you want to explore. We will suggest a set of existing free assessments.",
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
    coachingLead: "Choose your own method and pace. Each session explains what it is for before you begin.",
    lounge: "Explore all sessions by topic",
    self: "Self-guided coaching", selfDetail: "Free models for decisions, goals, relationships and resources.",
    traditions: "Temple traditions", traditionsDetail: "Greek and Egyptian guided courses.",
    human: "Personal session", humanDetail: "Talk with Andrey · €50 / 30 min or €100 / 60 min. Request, not an instant booking.",
    learn: "Choose a session", book: "Explore personal sessions",
    supportLead: "Pick one small, voluntary step. You can pause or stop at any point.",
    immediate: "A small practice now", immediateDetail: "Gentle orientation · around 2 minutes",
    try: "I'm ready to try", skip: "Not now",
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
    lead: "Узнайте себя, найдите новый взгляд или получите бережную поддержку.",
    hint: "Выберите, что сейчас будет полезнее.",
    paths: {
      profile: { name: "Познать себя", detail: "Тесты, профиль и программа развития", cta: "Создать профиль" },
      temple: { name: "Храмовые подсказки", detail: "Даосские символы и архетипы", cta: "Получить подсказку" },
      coaching: { name: "Коучинг-сессии", detail: "Беседа и разные традиции", cta: "Выбрать сессию" },
      support: { name: "Практика и поддержка", detail: "Упражнения, курсы и личная помощь", cta: "Найти поддержку" },
    },
    close: "К четырём направлениям",
    profileLead: "Выберите вид профиля и интересующие шкалы. Мы предложим набор существующих бесплатных тестов.",
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
    coachingLead: "Выберите метод и темп. Перед началом каждая сессия объясняет свою задачу.",
    lounge: "Все сессии с фильтром по темам",
    self: "Самостоятельный коучинг", selfDetail: "Бесплатные модели для целей, решений, отношений и ресурсов.",
    traditions: "Храмовые традиции", traditionsDetail: "Греческие и египетские программы.",
    human: "Личная сессия", humanDetail: "С Андреем · €50 / 30 мин или €100 / 60 мин. Запрос, не мгновенная бронь.",
    learn: "Выбрать сессию", book: "Изучить личные сессии",
    supportLead: "Выберите один посильный шаг. В любой момент можно остановиться.",
    immediate: "Небольшая практика сейчас", immediateDetail: "Мягкое ориентирование · около 2 минут",
    try: "Готов попробовать", skip: "Не сейчас",
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
    lead: "Conócete, encuentra otra perspectiva o recibe apoyo amable.",
    hint: "Elige qué te ayudaría hoy.",
    paths: {
      profile: { name: "Conócete", detail: "Tests, perfil y plan de desarrollo", cta: "Crear mi perfil" },
      temple: { name: "Reflexiones del templo", detail: "Símbolos taoístas y arquetipos", cta: "Explorar símbolos" },
      coaching: { name: "Sesiones de coaching", detail: "Conversaciones y tradiciones", cta: "Elegir sesión" },
      support: { name: "Práctica y apoyo", detail: "Ejercicios, cursos y apoyo personal", cta: "Buscar apoyo" },
    },
    close: "Volver a las cuatro opciones",
    profileLead: "Elige un tipo de perfil y las escalas que te interesan. Verás tests gratuitos ya disponibles.",
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
    coachingLead: "Elige el método y el ritmo. Cada sesión explica su propósito antes de empezar.",
    lounge: "Explorar sesiones por tema",
    self: "Coaching autoguiado", selfDetail: "Modelos gratuitos para metas, decisiones, relaciones y recursos.",
    traditions: "Tradiciones del templo", traditionsDetail: "Cursos guiados griegos y egipcios.",
    human: "Sesión personal", humanDetail: "Con Andrey · €50 / 30 min o €100 / 60 min. Solicitud, no reserva instantánea.",
    learn: "Elegir una sesión", book: "Explorar sesiones personales",
    supportLead: "Elige un pequeño paso voluntario. Puedes parar en cualquier momento.",
    immediate: "Una práctica ahora", immediateDetail: "Orientación suave · unos 2 minutos",
    try: "Quiero probar", skip: "Ahora no",
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

export function TestsCoachingSwitchboard({ locale, templeContent }: { locale: PublicLocale; templeContent: ReactNode }) {
  const t = messages[locale];
  const [path, setPath] = useState<Path | null>(null);
  const [profileKind, setProfileKind] = useState<ProfileKind>("personal");
  const [scales, setScales] = useState<Scale[]>(defaultScales.personal);
  const [stage, setStage] = useState<Stage>("invite");
  const selectedTests = scaleOrder.filter(scale => scales.includes(scale));

  function open(next: Path) {
    setPath(current => current === next ? null : next);
  }
  function chooseProfile(kind: ProfileKind) {
    setProfileKind(kind);
    setScales([...defaultScales[kind]]);
  }
  function toggleScale(key: Scale) {
    setScales(current => current.includes(key) ? current.filter(item => item !== key) : [...current, key]);
  }

  return <div className={styles.root} data-tests-coaching-hub>
    <header className={styles.intro}>
      <p className={styles.eyebrow}><Sparkles size={15} aria-hidden="true" /> {t.eyebrow}</p>
      <h1 id="tests-coaching-title">{t.title}</h1>
      <p className={styles.lead}>{t.lead}</p>
      <small className={styles.hint}>{t.hint}</small>
    </header>
    <nav className={styles.grid} aria-label={t.hint}>
      {pathOrder.map(key => {
        const Icon = pathIcons[key];
        const item = t.paths[key];
        return <button type="button" key={key} className={styles.card}
          data-tests-coaching-path={key}
          data-active={path === key ? "true" : "false"}
          aria-expanded={path === key}
          aria-controls="tests-coaching-detail"
          onClick={() => open(key)}>
          <span className={styles.cardTop}><Icon size={25} aria-hidden="true" /><ChevronRight size={20} aria-hidden="true" /></span>
          <strong>{item.name}</strong>
          <span className={styles.description}>{item.detail}</span>
          <span className={styles.cardCta}>{item.cta} <ArrowRight size={14} aria-hidden="true" /></span>
        </button>;
      })}
    </nav>
    <section id="tests-coaching-detail" className={styles.detail} hidden={!path} aria-live="polite" aria-label={path ? t.paths[path].name : undefined}>
      {path ? <>
        <div className={styles.detailHeader}>
          <h2>{t.paths[path].name}</h2>
          <button type="button" className={styles.close} onClick={() => setPath(null)} aria-label={t.close}><X size={17} aria-hidden="true" /> {t.close}</button>
        </div>
        {path === "profile" ? <div className={styles.profile} data-profile-builder>
          <p className={styles.detailLead}>{t.profileLead}</p>
          <div className={styles.pills} role="group" aria-label={t.paths.profile.name}>
            {profileKinds.map(kind => <button key={kind} type="button" aria-pressed={profileKind === kind}
              onClick={() => chooseProfile(kind)}>{t.profileKinds[kind]}</button>)}
          </div>
          <h3>{t.scalesTitle}</h3>
          <div className={styles.scaleActions}>
            <button type="button" onClick={() => setScales([...scaleOrder])}>{t.selectAll}</button>
            <button type="button" onClick={() => setScales([])}>{t.clear}</button>
          </div>
          <div className={styles.scaleGrid}>
            {scaleOrder.map(key => <label key={key} className={styles.scale}>
              <input type="checkbox" checked={scales.includes(key)} onChange={() => toggleScale(key)} />
              <span>{t.scales[key]}</span>
            </label>)}
          </div>
          <div className={styles.recommendations}>
            <h3>{t.recommended} <span className={styles.count}>{selectedTests.length}</span></h3>
            {selectedTests.length ? <>
              <p className={styles.fine}>{t.steps}</p>
              <ol className={styles.testList}>{selectedTests.map(scale => <li key={scale}>
                <span><CheckCircle2 size={17} aria-hidden="true" /> {t.tests[scale]}</span>
                <Link href={`/${locale === "es" ? "en" : locale}/client?startTests=${startableTests[scale]}`} prefetch={false}>{t.start} <ArrowRight size={15} aria-hidden="true" /></Link>
              </li>)}</ol>
            </> : <p className={styles.fine}>{t.noScale}</p>}
            <div className={styles.links}>
              <Link href={`/${locale}/client/tests`} prefetch={false}>{t.testCatalog} <ArrowRight size={16} aria-hidden="true" /></Link>
              <Link href={`/${locale === "es" ? "en" : locale}/app`} prefetch={false}>{t.mySpace} <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
            <p className={styles.fine}>{t.afterTests}</p>
          </div>
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
          {templeContent}
        </div> : null}
        {path === "coaching" ? <div data-tests-coaching-sessions>
          <p className={styles.detailLead}>{t.coachingLead}</p>
          <div className={styles.subchoices}>
            <div><strong><Compass size={18} aria-hidden="true" /> {t.self}</strong><p>{t.selfDetail}</p>
              <Link className={styles.primaryLink} href={`/${locale}/coaching`} prefetch={false}>{t.learn} <ArrowRight size={16} aria-hidden="true" /></Link></div>
            <div><strong><BookOpen size={18} aria-hidden="true" /> {t.traditions}</strong><p>{t.traditionsDetail}</p>
              <div className={styles.links}>
                <Link href={`/${locale}/academy/coaching/greek`} prefetch={false}>{t.greek} <ArrowRight size={15} aria-hidden="true" /></Link>
                <Link href={`/${locale}/academy/coaching/egyptian`} prefetch={false}>{t.egypt} <ArrowRight size={15} aria-hidden="true" /></Link>
              </div></div>
            <div><strong><HeartHandshake size={18} aria-hidden="true" /> {t.human}</strong><p>{t.humanDetail}</p>
              <Link className={styles.primaryLink} href={`/${locale}/services#consultation`} prefetch={false}>{t.book} <ArrowRight size={16} aria-hidden="true" /></Link></div>
          </div>
          <Link className={styles.wideLink} href={`/${locale}/coaching`} prefetch={false}>{t.lounge} <ArrowRight size={18} aria-hidden="true" /></Link>
        </div> : null}
        {path === "support" ? <div data-tests-coaching-support>
          <p className={styles.detailLead}>{t.supportLead}</p>
          <div className={styles.subchoices}>
            <div className={styles.practice}>
              <strong><Leaf size={18} aria-hidden="true" /> {t.immediate}</strong>
              <p>{t.immediateDetail}</p>
              {stage === "invite" ? <button type="button" className={styles.primaryLink} onClick={() => setStage("practice")}>{t.try} <ArrowRight size={16} aria-hidden="true" /></button> : null}
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
            <div><strong><ClipboardList size={18} aria-hidden="true" /> {t.programme}</strong>
              <p>{t.programmeDetail}</p>
              <Link className={styles.primaryLink} href={`/${locale}/courses/antistress`} prefetch={false}>{t.programme} <ArrowRight size={16} aria-hidden="true" /></Link></div>
            <div><strong><HeartHandshake size={18} aria-hidden="true" /> {t.personalSupport}</strong>
              <p>{t.personalSupportDetail}</p>
              <Link className={styles.primaryLink} href={`/${locale}/services#consultation`} prefetch={false}>{t.personalSupport} <ArrowRight size={16} aria-hidden="true" /></Link></div>
          </div>
        </div> : null}
        <p className={styles.disclaimer}>{t.disclaimer}</p>
      </> : null}
    </section>
  </div>;
}
