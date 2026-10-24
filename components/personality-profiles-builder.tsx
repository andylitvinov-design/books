"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Check, ChevronDown, ClipboardList, Compass, LockKeyhole, Sparkles, Sun, UserRound } from "lucide-react";
import styles from "./personality-profiles-builder.module.css";
import { recommendProfileBattery } from "@/lib/profile/profile-battery";

type Locale = "en" | "ru" | "es";
type Template = "personal" | "business" | "wellbeing" | "comprehensive";
type Area = "body" | "energy" | "business" | "money" | "health" | "growth";
type PublicTest = { key: string; title: string; axes: string[]; minutes: number | null; questions: number | null };
type Props = { locale: Locale; tests: PublicTest[] };

const areaAxes: Record<Area, readonly string[]> = {
  body: ["embodiment", "sleep", "stress"],
  energy: ["energy", "resource", "self_support"],
  business: ["clarity", "focus", "functioning"],
  // Money is an area of reflection about decisions and capacity, NOT a test of
  // income, financial health, entrepreneurship aptitude, or financial success.
  money: ["functioning", "meaning", "self_support"],
  // Wellbeing topics are educational self-reports, not medical assessments.
  health: ["sleep", "stress", "mood", "energy"],
  growth: ["meaning", "personality", "emotional_regulation", "relationships"],
};
const allAreas = Object.keys(areaAxes) as Area[];
const defaultAreas: Record<Template, Area[]> = {
  personal: ["body", "energy", "growth"],
  business: ["business", "money", "energy"],
  wellbeing: ["body", "energy", "health"],
  comprehensive: [...allAreas],
};
const allAxesFor = (areas: Area[]) => [...new Set(areas.flatMap(area => areaAxes[area]))];

const axesCopy: Record<string, Record<Locale, string>> = {
  embodiment: { en: "Body awareness", ru: "Контакт с телом", es: "Conciencia corporal" },
  sleep: { en: "Sleep and rest", ru: "Сон и отдых", es: "Sueño y descanso" },
  stress: { en: "Perceived stress", ru: "Воспринимаемый стресс", es: "Estrés percibido" },
  energy: { en: "Energy", ru: "Энергия", es: "Energía" },
  resource: { en: "Personal resources", ru: "Личные ресурсы", es: "Recursos personales" },
  self_support: { en: "Self-support", ru: "Самоподдержка", es: "Apoyo personal" },
  clarity: { en: "Mental clarity", ru: "Ясность мышления", es: "Claridad mental" },
  focus: { en: "Focus", ru: "Концентрация", es: "Concentración" },
  functioning: { en: "Everyday functioning", ru: "Действия и эффективность", es: "Actividades cotidianas" },
  meaning: { en: "Meaning and direction", ru: "Смысл и направление", es: "Sentido y dirección" },
  mood: { en: "Current mood", ru: "Текущее настроение", es: "Estado emocional" },
  personality: { en: "Personality patterns", ru: "Личностные особенности", es: "Patrones personales" },
  emotional_regulation: { en: "Emotional awareness", ru: "Осознание эмоций", es: "Conciencia emocional" },
  relationships: { en: "Relationships", ru: "Отношения", es: "Relaciones" },
};

const copy = {
  en: {
    kicker: "FREE SELF-DISCOVERY", title: "Build your personal profile",
    lead: "Understand your strengths, resources and areas for growth. Start with free self-tests that match your goals, then explore your results and plan practical next steps.",
    benefits: ["Choose what to explore", "Free tests with clear scales", "SWOT + personal development"],
    entryButton: "Create my profile",
    entryHint: "Take free tests & explore development recommendations",
    journeyTitle: "How it works",
    journey: [
      ["Choose your focus", "Personal life, work, wellbeing or the bigger picture. You decide which topics matter."],
      ["Take free tests", "Review the suggested questionnaires and choose which ones to complete."],
      ["Explore results & next steps", "Read your test feedback, reflect on your strengths and save development goals in My Space."],
    ],
    entryNote: "You can explore without an account. Sign in only when you want to save results privately.",
    returnIntro: "How it works", wizardKicker: "Your free profile", selectTemplate: "Choose this",
    stages: ["Profile", "Topics", "Scales", "Tests"],
    profileTitle: "What would you like to explore first?",
    profileHelp: "Choose the starting point closest to your goal. You can adjust the topics, scales and tests before you begin.",
    templates: {
      personal: ["Personal profile", "Personality, relationships, resources and growth."],
      business: ["Business profile", "Focus, work capacity and money-related choices."],
      wellbeing: ["Wellbeing profile", "Body, energy, rest and everyday balance."],
      comprehensive: ["Comprehensive profile", "A wider view across all six life areas."],
    },
    topicTitle: "Which areas matter to you right now?",
    topicHelp: "Select one or several areas. These are topics for reflection, not diagnoses or financial ratings.",
    areas: {
      body: ["Body", "Awareness · rest · stress"], energy: ["Energy", "Vitality · resources · support"],
      business: ["Business", "Focus · clarity · functioning"], money: ["Money", "Decisions · priorities · support"],
      health: ["Health & wellbeing", "Sleep · mood · stress"], growth: ["Development", "Meaning · emotions · relationships"],
    },
    scaleTitle: "Choose the scales for your profile",
    scaleHelp: "Keep all suggested scales or select only what interests you. Each test measures only the scales declared in its source.",
    selectAll: "Select all", clearAll: "Clear all", selected: "selected",
    testTitle: "Your recommended free test selection",
    testHelp: "We matched your chosen scales to existing, startable questionnaires. Adjust the selection before beginning.",
    testCount: "tests", minutes: "min", questions: "questions",
    more: "See more matching tests", less: "Show fewer",
    chosen: "Your selection", unmeasured: "Some selected topics may not have a suitable free questionnaire yet. No score will be invented.",
    swotTitle: "What happens after the tests? · SWOT + development",
    swot: [
      ["Strengths", "Which resources and patterns help you already?"],
      ["Growth areas", "What would you like to practise or understand?"],
      ["Opportunities", "What support and next steps are available?"],
      ["Challenges", "Which practical obstacles deserve attention?"],
    ],
    swotNote: "SWOT is a guided reflection using your own interpretation, not an automatically inferred personality verdict.",
    next: "Continue", back: "Back", start: "Start selected free tests",
    noTests: "No eligible free test measures this selection. Go back and choose other scales.",
    private: "Results can be saved in your protected account. Build your profile and set voluntary development goals there, after the tests.",
    myProfile: "My saved profile", myPath: "My development path",
    esNote: "", disclaimer: "Educational self-reflection only; not a medical diagnosis, financial assessment, or guaranteed outcome.",
  },
  ru: {
    kicker: "БЕСПЛАТНОЕ САМОПОЗНАНИЕ", title: "Создайте свой профиль",
    lead: "Узнайте свои сильные стороны, ресурсы и направления роста. Подберите бесплатные тесты по важным для вас темам, изучите результаты и наметьте следующие шаги.",
    benefits: ["Выберите темы", "Бесплатные тесты и шкалы", "SWOT + программа развития"],
    entryButton: "Создать свой профиль",
    entryHint: "Пройти тесты и получить рекомендации по развитию",
    journeyTitle: "Как это работает",
    journey: [
      ["Выберите свою задачу", "Личность, бизнес, самочувствие или несколько сфер сразу. Вы решаете, что важно."],
      ["Пройдите бесплатные тесты", "Мы предложим подходящие опросники, а вы сможете изменить их набор."],
      ["Получите результаты и рекомендации", "Изучите отчёты, определите сильные стороны и сохраните цели развития в личном кабинете."],
    ],
    entryNote: "Выбирать темы можно без регистрации. Для приватного сохранения результатов понадобится вход в кабинет.",
    returnIntro: "Как это работает", wizardKicker: "Ваш бесплатный профиль", selectTemplate: "Выбрать",
    stages: ["Профиль", "Темы", "Шкалы", "Тесты"],
    profileTitle: "Что вы хотите изучить в первую очередь?",
    profileHelp: "Начните с самой важной задачи. На следующих шагах можно изменить темы, шкалы и набор тестов.",
    templates: {
      personal: ["Личностный профиль", "Личность, отношения, ресурсы, развитие."],
      business: ["Бизнес-профиль", "Концентрация, работа и решения о деньгах."],
      wellbeing: ["Профиль благополучия", "Тело, энергия, отдых и устойчивость."],
      comprehensive: ["Комплексный профиль", "Все шесть направлений жизни."],
    },
    topicTitle: "Какие сферы вам сейчас важны?",
    topicHelp: "Отметьте одну или несколько сфер. Это темы самопознания, а не диагнозы или оценка финансов.",
    areas: {
      body: ["Тело", "Ощущения · отдых · напряжение"], energy: ["Энергия", "Ресурсы · восстановление · опора"],
      business: ["Бизнес", "Фокус · ясность · действия"], money: ["Деньги", "Решения · приоритеты · поддержка"],
      health: ["Здоровье и самочувствие", "Сон · эмоции · стресс"], growth: ["Развитие", "Смысл · эмоции · отношения"],
    },
    scaleTitle: "Выберите шкалы своего профиля",
    scaleHelp: "Можно выбрать все предложенные шкалы или оставить только нужные. Тест измеряет лишь те шкалы, которые заявлены для него.",
    selectAll: "Выбрать все", clearAll: "Снять все", selected: "выбрано",
    testTitle: "Предложенный набор бесплатных тестов",
    testHelp: "Мы сопоставили выбранные шкалы с существующими доступными тестами. Перед началом можно изменить набор.",
    testCount: "тестов", minutes: "мин", questions: "вопросов",
    more: "Показать больше подходящих тестов", less: "Показать меньше",
    chosen: "Ваш выбор", unmeasured: "Для части тем может не оказаться подходящего бесплатного теста. Баллы не придумываются.",
    swotTitle: "После тестов: SWOT и программа развития",
    swot: [
      ["Сильные стороны", "Какие ресурсы и качества уже помогают?"],
      ["Зоны роста", "Что хочется лучше понять или развить?"],
      ["Возможности", "На какую поддержку и шаги можно опереться?"],
      ["Препятствия", "Какие обстоятельства важно учитывать?"],
    ],
    swotNote: "SWOT — упражнение для собственной рефлексии, а не автоматически поставленный психологический вердикт.",
    next: "Далее", back: "Назад", start: "Пройти выбранные тесты бесплатно",
    noTests: "Для выбранных шкал пока нет подходящего бесплатного теста. Вернитесь к выбору шкал.",
    private: "Результаты можно сохранить в защищённом кабинете. Там доступен личный профиль и цели программы развития.",
    myProfile: "Мой профиль", myPath: "Моя программа развития",
    esNote: "", disclaimer: "Для самопознания; не является медицинской диагностикой, финансовой оценкой или гарантией результата.",
  },
  es: {
    kicker: "AUTOCONOCIMIENTO GRATUITO", title: "Crea tu perfil personal",
    lead: "Descubre tus fortalezas, recursos y áreas de crecimiento. Elige pruebas gratuitas según tus objetivos, revisa los resultados y decide tus próximos pasos.",
    benefits: ["Elige tus temas", "Pruebas y escalas gratis", "DAFO + desarrollo"],
    entryButton: "Crear mi perfil",
    entryHint: "Haz pruebas gratis y descubre recomendaciones",
    journeyTitle: "Cómo funciona",
    journey: [
      ["Elige tu objetivo", "Vida personal, trabajo, bienestar o una visión más amplia. Tú decides qué explorar."],
      ["Realiza pruebas gratuitas", "Revisa los cuestionarios sugeridos y elige cuáles quieres completar."],
      ["Explora resultados y próximos pasos", "Lee los informes, identifica fortalezas y guarda tus metas de desarrollo en Mi espacio."],
    ],
    entryNote: "Puedes explorar sin cuenta. Inicia sesión solo si quieres guardar los resultados de forma privada.",
    returnIntro: "Cómo funciona", wizardKicker: "Tu perfil gratuito", selectTemplate: "Elegir",
    stages: ["Perfil", "Temas", "Escalas", "Pruebas"],
    profileTitle: "¿Qué te gustaría explorar primero?",
    profileHelp: "Empieza por tu objetivo más importante. Podrás ajustar áreas, escalas y pruebas antes de comenzar.",
    templates: {
      personal: ["Perfil personal", "Personalidad, relaciones, recursos y desarrollo."],
      business: ["Perfil empresarial", "Concentración, trabajo y decisiones económicas."],
      wellbeing: ["Perfil de bienestar", "Cuerpo, energía, descanso y equilibrio."],
      comprehensive: ["Perfil integral", "Una visión de las seis áreas."],
    },
    topicTitle: "¿Qué áreas te importan ahora?",
    topicHelp: "Elige una o varias áreas para reflexionar, no como diagnóstico ni puntuación financiera.",
    areas: {
      body: ["Cuerpo", "Conciencia · descanso · estrés"], energy: ["Energía", "Vitalidad · recursos · apoyo"],
      business: ["Negocios", "Concentración · claridad · acción"], money: ["Dinero", "Decisiones · prioridades · apoyo"],
      health: ["Salud y bienestar", "Sueño · emociones · estrés"], growth: ["Desarrollo", "Sentido · emociones · relaciones"],
    },
    scaleTitle: "Selecciona las escalas de tu perfil",
    scaleHelp: "Elige todas las escalas o solo las que te interesan. Cada prueba mide únicamente sus escalas declaradas.",
    selectAll: "Seleccionar todas", clearAll: "Desmarcar", selected: "seleccionadas",
    testTitle: "Tus pruebas gratuitas recomendadas",
    testHelp: "Relacionamos tus escalas con cuestionarios reales y disponibles. Puedes ajustar la selección.",
    testCount: "pruebas", minutes: "min", questions: "preguntas",
    more: "Ver más pruebas compatibles", less: "Ver menos",
    chosen: "Tu selección", unmeasured: "Es posible que algunas áreas no tengan una prueba gratuita adecuada. No se inventan puntuaciones.",
    swotTitle: "Después de las pruebas · DAFO y desarrollo",
    swot: [
      ["Fortalezas", "¿Qué recursos ya te ayudan?"],
      ["Áreas de crecimiento", "¿Qué te gustaría aprender o practicar?"],
      ["Oportunidades", "¿Qué apoyo o pasos tienes disponibles?"],
      ["Desafíos", "¿Qué obstáculos prácticos debes considerar?"],
    ],
    swotNote: "El DAFO es una reflexión guiada, no un veredicto automático sobre tu personalidad.",
    next: "Continuar", back: "Atrás", start: "Comenzar pruebas gratuitas",
    noTests: "No hay una prueba gratuita adecuada para estas escalas. Regresa y cambia tu elección.",
    private: "Guarda tus resultados en tu cuenta protegida y define tus propias metas de desarrollo.",
    myProfile: "Mi perfil guardado", myPath: "Mi plan de desarrollo",
    esNote: "Los cuestionarios se presentan en inglés mientras se revisan las traducciones españolas.",
    disclaimer: "Solo para autorreflexión; no es diagnóstico médico, evaluación financiera ni garantía de resultados.",
  },
} as const;

export function PersonalityProfilesBuilder({ locale, tests }: Props) {
  const t = copy[locale];
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const wizardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (started) wizardRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  }, [started]);
  const [template, setTemplate] = useState<Template>("personal");
  const [areas, setAreas] = useState<Area[]>(defaultAreas.personal);
  const [selectedAxes, setSelectedAxes] = useState<string[]>(allAxesFor(defaultAreas.personal));
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [showMore, setShowMore] = useState(false);
  const accountLocale = locale === "es" ? "en" : locale;

  const availableAxes = allAxesFor(areas);
  const matches = useMemo(() => tests
    .map(test => ({ ...test, matches: test.axes.filter(axis => selectedAxes.includes(axis)) }))
    .filter(test => test.matches.length > 0)
    .sort((a, b) => b.matches.length - a.matches.length ||
      (a.minutes ?? 99) - (b.minutes ?? 99) || a.key.localeCompare(b.key))
    .slice(0, 24), [tests, selectedAxes]);
  const displayTests = showMore ? matches : matches.slice(0, 6);
  const chosenTests = matches.filter(test => selectedKeys.includes(test.key));
  const coverage = new Set(chosenTests.flatMap(test => test.matches));
  const minutes = chosenTests.reduce((sum, test) => sum + (test.minutes || 0), 0);

  function chooseTemplate(next: Template) {
    setTemplate(next);
    const suggested = defaultAreas[next];
    setAreas([...suggested]);
    setSelectedAxes(allAxesFor(suggested));
    setSelectedKeys([]);
    setShowMore(false);
    setStep(1);
  }

  function toggleArea(area: Area) {
    const next = areas.includes(area) ? areas.filter(item => item !== area) : [...areas, area];
    setAreas(next);
    setSelectedAxes(allAxesFor(next));
    setSelectedKeys([]);
  }

  function goForward() {
    if (step === 1 && areas.length) setStep(2);
    if (step === 2 && selectedAxes.length) {
      setSelectedKeys([...recommendProfileBattery(matches, selectedAxes)]);
      setShowMore(false);
      setStep(3);
    }
  }

  const base = "/" + accountLocale;
  const testHref = base + "/client?startTests=" + encodeURIComponent(selectedKeys.join(","));

  return <div className={styles.shell} data-personality-profile-builder>
    {!started ? <>
      <header className={styles.hero}>
        <div className={styles.heroPhoto} aria-hidden="true" />
        <div className={styles.heroCopy}>
          <p className={styles.kicker}><Sparkles size={16} aria-hidden="true" />{t.kicker}</p>
          <h1>{t.title}</h1>
          <p>{t.lead}</p>
          <button type="button" className={styles.begin} data-profile-begin
            onClick={() => setStarted(true)}>
            <span><strong>{t.entryButton}</strong><small>{t.entryHint}</small></span>
            <ArrowRight size={24} aria-hidden="true" />
          </button>
        </div>
      </header>
      <section className={styles.roadmap} aria-labelledby="profile-builder-journey-title">
        <h2 id="profile-builder-journey-title">{t.journeyTitle}</h2>
        <ol className={styles.roadmapSteps}>
          {t.journey.map((item, index) => <li key={item[0]}>
            <span className={styles.roadmapNumber} aria-hidden="true">{index + 1}</span>
            <div><strong>{item[0]}</strong><p>{item[1]}</p></div>
          </li>)}
        </ol>
        <p className={styles.entryNote}><LockKeyhole size={15} aria-hidden="true" />{t.entryNote}</p>
      </section>
    </> : <>
    <div className={styles.wizardTop} ref={wizardRef}>
      <button type="button" className={styles.returnIntro} onClick={() => { setStarted(false); setStep(0); }}>
        <ArrowLeft size={16} aria-hidden="true" />{t.returnIntro}
      </button>
      <span className={styles.wizardKicker}><Sparkles size={15} aria-hidden="true" />{t.wizardKicker}</span>
    </div>
    <nav className={styles.progress} aria-label={locale === "ru" ? "Шаги конструктора" : locale === "es" ? "Pasos" : "Builder steps"}>
      {t.stages.map((label, index) =>
        <button key={label} type="button" aria-current={step === index ? "step" : undefined}
          disabled={index > step} onClick={() => setStep(index)} className={step === index ? styles.activeStage : ""}>
          <span>{index + 1}</span>{label}
        </button>)}
    </nav>

    <div className={styles.panel}>
      {step === 0 && <section aria-labelledby="profile-builder-step-title">
        <h2 id="profile-builder-step-title">{t.profileTitle}</h2>
        <p className={styles.help}>{t.profileHelp}</p>
        <div className={styles.templateGrid}>
          {(Object.keys(t.templates) as Template[]).map(key =>
            <button type="button" key={key} className={styles.templateCard} onClick={() => chooseTemplate(key)}
              data-profile-kind={key}>
              <span className={styles.templateIcon} aria-hidden="true">
                {key === "personal" ? <UserRound size={21} /> : key === "business" ? <BriefcaseBusiness size={21} />
                  : key === "wellbeing" ? <Sun size={21} /> : <Compass size={21} />}
              </span>
              <span className={styles.templateBody}>
                <strong>{t.templates[key][0]}</strong>
                <span>{t.templates[key][1]}</span>
                <small className={styles.templateSelect}>{t.selectTemplate}<ArrowRight size={15} aria-hidden="true" /></small>
              </span>
            </button>)}
        </div>
      </section>}

      {step === 1 && <section aria-labelledby="profile-builder-step-title">
        <p className={styles.templateLabel}>{t.templates[template][0]}</p>
        <h2 id="profile-builder-step-title">{t.topicTitle}</h2>
        <p className={styles.help}>{t.topicHelp}</p>
        <div className={styles.areaGrid}>
          {allAreas.map(area =>
            <button type="button" key={area} aria-pressed={areas.includes(area)}
              className={styles.areaCard} onClick={() => toggleArea(area)}>
              <span className={styles.selectDot}>{areas.includes(area) && <Check size={14} aria-hidden="true" />}</span>
              <span><strong>{t.areas[area][0]}</strong><small>{t.areas[area][1]}</small></span>
            </button>)}
        </div>
      </section>}

      {step === 2 && <section aria-labelledby="profile-builder-step-title">
        <h2 id="profile-builder-step-title">{t.scaleTitle}</h2>
        <p className={styles.help}>{t.scaleHelp}</p>
        <div className={styles.scaleBar}>
          <span>{selectedAxes.length} {t.selected}</span>
          <div>
            <button type="button" onClick={() => setSelectedAxes([...availableAxes])}>{t.selectAll}</button>
            <button type="button" onClick={() => setSelectedAxes([])}>{t.clearAll}</button>
          </div>
        </div>
        <div className={styles.scaleList}>
          {availableAxes.map(axis =>
            <button key={axis} type="button" className={styles.scaleChip}
              aria-pressed={selectedAxes.includes(axis)}
              onClick={() => setSelectedAxes(previous => previous.includes(axis)
                ? previous.filter(item => item !== axis) : [...previous, axis])}>
              <span className={styles.selectDot}>{selectedAxes.includes(axis) && <Check size={13} aria-hidden="true" />}</span>
              {axesCopy[axis]?.[locale] || axis}
            </button>)}
        </div>
      </section>}

      {step === 3 && <section aria-labelledby="profile-builder-step-title">
        <h2 id="profile-builder-step-title">{t.testTitle}</h2>
        <p className={styles.help}>{t.testHelp}</p>
        <div className={styles.testCount}><ClipboardList size={17} aria-hidden="true" />
          <strong>{chosenTests.length} {t.testCount}</strong>
          {minutes > 0 && <span>· {minutes} {t.minutes}</span>}
          <span>· {coverage.size}/{selectedAxes.length} {t.selected}</span>
        </div>
        {matches.length > 0 ? <>
          <div className={styles.testList}>
            {displayTests.map(test =>
              <label key={test.key} className={styles.testRow}>
                <input type="checkbox" checked={selectedKeys.includes(test.key)}
                  onChange={() => setSelectedKeys(previous => previous.includes(test.key)
                    ? previous.filter(key => key !== test.key) : previous.length < 12 ? [...previous, test.key] : previous)} />
                <span className={styles.testText}><strong>{test.title}</strong>
                  <small>{test.questions ? test.questions + " " + t.questions : ""}
                    {test.questions && test.minutes ? " · " : ""}
                    {test.minutes ? test.minutes + " " + t.minutes : ""}</small>
                  <span>{test.matches.map(axis => axesCopy[axis]?.[locale] || axis).join(" · ")}</span>
                </span>
              </label>)}
          </div>
          {matches.length > 6 &&
            <button type="button" className={styles.moreTests} onClick={() => setShowMore(!showMore)}>
              {showMore ? t.less : t.more}<ChevronDown size={16} aria-hidden="true" />
            </button>}
          {coverage.size < selectedAxes.length && <p className={styles.caution}>{t.unmeasured}</p>}
        </> : <p className={styles.caution} role="status">{t.noTests}</p>}
        <details className={styles.swot}>
          <summary>{t.swotTitle}<ChevronDown size={17} aria-hidden="true" /></summary>
          <div className={styles.swotGrid}>{t.swot.map(item =>
            <div key={item[0]}><strong>{item[0]}</strong><p>{item[1]}</p></div>)}</div>
          <p className={styles.swotNote}>{t.swotNote}</p>
        </details>
      </section>}

      {step > 0 && <div className={styles.actions}>
        <button type="button" className={styles.back} onClick={() => setStep(step - 1)}><ArrowLeft size={17} />{t.back}</button>
        {step < 3
          ? <button type="button" className={styles.primary} disabled={step === 1 ? areas.length === 0 : selectedAxes.length === 0}
              onClick={goForward}>{t.next}<ArrowRight size={17} /></button>
          : selectedKeys.length > 0
            ? <Link href={testHref} prefetch={false} className={styles.primary} data-profile-start-tests>
                {t.start}<ArrowRight size={17} /></Link>
            : <button type="button" disabled className={styles.primary}>{t.start}</button>}
      </div>}
    </div>

    <aside className={styles.privateInfo}>
      <LockKeyhole size={19} aria-hidden="true" />
      <div><p>{t.private}</p>
        <div className={styles.privateLinks}>
          <Link href={base + "/app/portrait"} prefetch={false}>{t.myProfile}<ArrowRight size={14} /></Link>
          <Link href={base + "/app/portfolio#hh-development-program"} prefetch={false}>{t.myPath}<ArrowRight size={14} /></Link>
        </div>
      </div>
    </aside>
    </>}
    {t.esNote && <p className={styles.languageNotice}>{t.esNote}</p>}
    <p className={styles.disclaimer}>{t.disclaimer}</p>
  </div>;
}
