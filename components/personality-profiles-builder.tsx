"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Brain, BriefcaseBusiness, Check, ChevronDown, ClipboardList, Compass, HeartHandshake, HeartPulse, LockKeyhole, Sparkles } from "lucide-react";
import styles from "./personality-profiles-builder.module.css";
import { recommendProfileBattery } from "@/lib/profile/profile-battery";
import { appFetch } from "@/lib/app/client-fetch";
import { PENDING_TEST_SELECTION_KEY, makeTestSelectionIntent } from "@/lib/app/test-selection-intent";

type Locale = "en" | "ru" | "es";
type Focus = "identity" | "wellbeing" | "relationships" | "work" | "purpose";
type Area = "traits" | "support" | "emotions" | "recovery" | "body" | "connection" | "work" | "money" | "meaning";
type PublicTest = { key: string; title: string; axes: string[]; minutes: number | null; questions: number | null };
type Props = { locale: Locale; tests: PublicTest[] };

// Topics map to questionnaire dimensions, not diagnoses or financial outcomes.
const areaAxes: Record<Area, readonly string[]> = {
  traits: ["personality"],
  support: ["resource", "self_support"],
  emotions: ["stress", "mood", "emotional_regulation"],
  recovery: ["sleep", "energy"],
  body: ["embodiment"],
  connection: ["relationships"],
  work: ["clarity", "focus", "functioning"],
  money: ["functioning", "meaning", "self_support"], // money choices, never a score of income/success
  meaning: ["meaning"],
};
const focusAreas: Record<Focus, Area[]> = {
  identity: ["traits", "support"],
  wellbeing: ["emotions", "recovery", "body"],
  relationships: ["connection"],
  work: ["work", "money"],
  purpose: ["meaning"],
};
const allAreas = Object.keys(areaAxes) as Area[];
const areasFor = (focuses: Focus[]) => [...new Set(focuses.flatMap(focus => focusAreas[focus]))];
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
    browseTests: "Or browse free tests without creating a profile",
    journeyTitle: "How it works",
    journey: [
      ["Choose your focus", "Personal life, work, wellbeing or the bigger picture. You decide which topics matter."],
      ["Take free tests", "Review the suggested questionnaires and choose which ones to complete."],
      ["Explore results & next steps", "Read your test feedback, reflect on your strengths and save development goals in My Space."],
    ],
    entryNote: "You can explore without an account. Sign in only when you want to save results privately.",
    returnIntro: "How it works", wizardKicker: "Your free profile", selectTemplate: "Select this",
    stages: ["Focus", "Topics", "Scales", "Tests", "Ready"],
    profileTitle: "What would you like to understand or improve?",
    profileHelp: "Choose one or several interests. Each adds to the same personal profile; you can explore the rest later.",
    focusAdd: "Select this", focusSelected: "Selected",
    unifiedNote: "ONE PERSONAL PROFILE · GROWING OVER TIME",
    layerTitle: "How your profile grows · four distinct layers",
    layerNote: "One private profile, not five diagnoses or one overall health/success score. Sections fill only when you choose and have suitable evidence.",
    layers: [["My foundation","Personality patterns, personal strengths and values."],["My state","Recent energy, stress and recovery, with dates."],["My life","Work, relationships and your life context."],["My growth","Goals and practices you choose yourself."]],
    focuses: {
      identity: ["Personality & potential", "Traits, values, strengths and personal resources."],
      wellbeing: ["Emotional wellbeing", "Stress, energy, rest and emotional balance."],
      relationships: ["Relationships & closeness", "Connection, communication and personal boundaries."],
      work: ["Career & money", "Focus, career choices and financial habits."],
      purpose: ["Meaning & direction", "Values, goals and a sense of purpose."],
    },
    topicTitle: "Choose the specific topics that matter",
    topicHelp: "We've suggested topics from your interests. Refine them before choosing actual measured scales.",
    areas: {
      traits: ["Personality traits", "Patterns · strengths"],
      support: ["Resources & self-support", "Support · self-kindness"],
      emotions: ["Emotions & stress", "Mood · regulation"],
      recovery: ["Energy & rest", "Recovery · sleep"],
      body: ["Body awareness", "Awareness · comfort"],
      connection: ["Relationships", "Connection · communication"],
      work: ["Work & focus", "Clarity · daily actions"],
      money: ["Money decisions", "Choices · habits, not income"],
      meaning: ["Purpose & values", "Meaning · direction"],
    },
    scaleTitle: "Choose the scales for your profile",
    scaleHelp: "Only real source-declared dimensions can be measured. Keep the suggestions or select what you want to explore.",
    selectAll: "Select all", clearAll: "Clear all", selected: "selected",
    testTitle: "Your recommended free test selection",
    testHelp: "These are existing, eligible free questionnaires matched to your topics. Edit the set before confirming.",
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
    next: "Continue", back: "Back", start: "Yes, take these tests",
    review: "Review my test path", readyKicker: "YOUR PERSONAL TEST PATH",
    readyTitle: "Ready to build your profile?",
    readyHelp: "To create your profile, take the following free tests in order. You can review this list before starting.",
    saveToCabinet: "Save my selected tests in my Cabinet",
    saveToCabinetHelp: "Continue with Google to keep this selected test plan in My Tests. Guest answers or earlier guest results are never imported automatically.",
    saveToCabinetBusy: "Preparing your Cabinet…",
    saveToCabinetError: "Google sign-in could not start. Try again or continue as a guest.",
    saveToCabinetCheckError: "Could not verify your account. You can still start these tests as a guest.",
    saveToCabinetStorageError: "Browser storage is unavailable. Allow site storage to keep your selection through Google sign-in, or continue as a guest.",
    guestChoice: "Or start these tests as a guest with the button below.",
    readyFoot: "One test at a time. You will see your progress at the top, and you can choose to save results privately in your Cabinet.",
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
    browseTests: "Или пройти бесплатные тесты без создания профиля",
    journeyTitle: "Как это работает",
    journey: [
      ["Выберите свою задачу", "Личность, бизнес, самочувствие или несколько сфер сразу. Вы решаете, что важно."],
      ["Пройдите бесплатные тесты", "Мы предложим подходящие опросники, а вы сможете изменить их набор."],
      ["Получите результаты и рекомендации", "Изучите отчёты, определите сильные стороны и сохраните цели развития в личном кабинете."],
    ],
    entryNote: "Выбирать темы можно без регистрации. Для приватного сохранения результатов понадобится вход в кабинет.",
    returnIntro: "Как это работает", wizardKicker: "Ваш бесплатный профиль", selectTemplate: "Выбрать",
    stages: ["Запрос", "Темы", "Шкалы", "Тесты", "Начало"],
    profileTitle: "Что вы хотите понять или улучшить?",
    profileHelp: "Выберите одно или несколько направлений. Всё войдёт в один личный профиль — остальное можно изучить позже.",
    focusAdd: "Выбрать", focusSelected: "Выбрано",
    unifiedNote: "ОДИН ЛИЧНЫЙ ПРОФИЛЬ · ПОПОЛНЯЕТСЯ СО ВРЕМЕНЕМ",
    layerTitle: "Как формируется профиль · четыре разных слоя",
    layerNote: "Один приватный профиль, а не пять диагнозов или единый процент здоровья и успешности. Разделы заполняются при наличии подходящих данных и по вашему выбору.",
    layers: [["Моя основа","Особенности личности, сильные стороны и ценности."],["Моё состояние","Самочувствие, энергия и стресс с указанием даты."],["Моя жизнь","Работа, отношения и личные обстоятельства."],["Моё развитие","Цели и практики, которые вы выбираете сами."]],
    focuses: {
      identity: ["Личность и потенциал", "Особенности, ценности, сильные стороны и ресурсы."],
      wellbeing: ["Самочувствие и ресурсы", "Стресс, энергия, отдых и эмоциональная устойчивость."],
      relationships: ["Отношения и близость", "Доверие, общение и личные границы."],
      work: ["Карьера и деньги", "Фокус, профессиональные решения и финансовые привычки."],
      purpose: ["Смыслы и направление", "Ценности, цели и ощущение смысла жизни."],
    },
    topicTitle: "Уточните важные для вас темы",
    topicHelp: "Мы предложили темы на основе вашего выбора. Измените их перед выбором измеряемых шкал.",
    areas: {
      traits: ["Особенности личности", "Качества · сильные стороны"],
      support: ["Ресурсы и поддержка", "Опора · бережность к себе"],
      emotions: ["Эмоции и стресс", "Настроение · регуляция"],
      recovery: ["Энергия и отдых", "Восстановление · сон"],
      body: ["Контакт с телом", "Осознанность · комфорт"],
      connection: ["Отношения", "Связь · общение"],
      work: ["Работа и фокус", "Ясность · действия"],
      money: ["Решения о деньгах", "Привычки, не уровень дохода"],
      meaning: ["Ценности и смысл", "Цели · направление"],
    },
    scaleTitle: "Выберите шкалы своего профиля",
    scaleHelp: "Можно выбрать лишь реальные шкалы, указанные в источниках тестов. Оставьте предложенные или выберите свои.",
    selectAll: "Выбрать все", clearAll: "Снять все", selected: "выбрано",
    testTitle: "Предложенный набор бесплатных тестов",
    testHelp: "Здесь существующие доступные бесплатные тесты по вашим темам. Измените набор до подтверждения.",
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
    next: "Далее", back: "Назад", start: "Да, пройти эти тесты",
    review: "Проверить план тестов", readyKicker: "ВАШ ПУТЬ К ЛИЧНОМУ ПРОФИЛЮ",
    readyTitle: "Всё готово для создания профиля",
    readyHelp: "Для создания профиля предлагаем пройти следующие бесплатные тесты по порядку. Подтвердите список перед началом.",
    saveToCabinet: "Сохранить выбранные тесты в кабинете",
    saveToCabinetHelp: "Войдите через Google, чтобы сохранить набор в «Моих тестах». Гостевые ответы и прошлые гостевые результаты автоматически не переносятся.",
    saveToCabinetBusy: "Открываем ваш кабинет…",
    saveToCabinetError: "Не удалось начать вход через Google. Повторите попытку или продолжите без кабинета.",
    saveToCabinetCheckError: "Не удалось проверить вход. Тесты всё равно можно пройти как гость.",
    saveToCabinetStorageError: "Хранение данных сайта недоступно. Разрешите его для сохранения подборки через Google или продолжите как гость.",
    guestChoice: "Или начните тесты без регистрации кнопкой ниже.",
    readyFoot: "Тесты идут один за другим. Сверху будет виден общий прогресс, а результаты можно сохранить в защищённом кабинете по вашему желанию.",
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
    browseTests: "O hacer pruebas gratuitas sin crear un perfil",
    journeyTitle: "Cómo funciona",
    journey: [
      ["Elige tu objetivo", "Vida personal, trabajo, bienestar o una visión más amplia. Tú decides qué explorar."],
      ["Realiza pruebas gratuitas", "Revisa los cuestionarios sugeridos y elige cuáles quieres completar."],
      ["Explora resultados y próximos pasos", "Lee los informes, identifica fortalezas y guarda tus metas de desarrollo en Mi espacio."],
    ],
    entryNote: "Puedes explorar sin cuenta. Inicia sesión solo si quieres guardar los resultados de forma privada.",
    returnIntro: "Cómo funciona", wizardKicker: "Tu perfil gratuito", selectTemplate: "Elegir",
    stages: ["Interés", "Temas", "Escalas", "Pruebas", "Inicio"],
    profileTitle: "¿Qué quieres comprender o mejorar?",
    profileHelp: "Elige uno o varios temas. Todos forman parte de un único perfil personal que puedes ampliar después.",
    focusAdd: "Elegir", focusSelected: "Elegido",
    unifiedNote: "UN PERFIL PERSONAL · CRECE CONTIGO",
    layerTitle: "Cómo crece tu perfil · cuatro capas distintas",
    layerNote: "Un perfil privado, no cinco diagnósticos ni una puntuación global de salud o éxito. Cada sección requiere datos adecuados y tu elección.",
    layers: [["Mi base","Rasgos de personalidad, fortalezas y valores."],["Mi estado","Energía, estrés y descanso reciente con fecha."],["Mi vida","Trabajo, relaciones y contexto personal."],["Mi desarrollo","Objetivos y prácticas que tú eliges."]],
    focuses: {
      identity: ["Personalidad y potencial", "Rasgos, valores, fortalezas y recursos."],
      wellbeing: ["Bienestar emocional", "Estrés, energía, descanso y equilibrio emocional."],
      relationships: ["Relaciones y cercanía", "Conexión, comunicación y límites personales."],
      work: ["Carrera y dinero", "Concentración, decisiones laborales y hábitos financieros."],
      purpose: ["Sentido y dirección", "Valores, objetivos y propósito personal."],
    },
    topicTitle: "Elige los temas específicos para explorar",
    topicHelp: "Sugerimos temas según tus intereses. Ajústalos antes de seleccionar escalas medibles.",
    areas: {
      traits: ["Rasgos personales", "Patrones · fortalezas"],
      support: ["Recursos y apoyo", "Apoyo · autocompasión"],
      emotions: ["Emociones y estrés", "Ánimo · regulación"],
      recovery: ["Energía y descanso", "Recuperación · sueño"],
      body: ["Conciencia corporal", "Sensaciones · comodidad"],
      connection: ["Relaciones", "Conexión · comunicación"],
      work: ["Trabajo y enfoque", "Claridad · acciones"],
      money: ["Decisiones de dinero", "Hábitos, no nivel de ingresos"],
      meaning: ["Sentido y valores", "Metas · dirección"],
    },
    scaleTitle: "Selecciona las escalas de tu perfil",
    scaleHelp: "Solo medimos las dimensiones declaradas en los cuestionarios. Puedes cambiar las sugerencias.",
    selectAll: "Seleccionar todas", clearAll: "Desmarcar", selected: "seleccionadas",
    testTitle: "Tus pruebas gratuitas recomendadas",
    testHelp: "Pruebas gratuitas existentes y aptas para tus temas. Revisa y edita la lista antes de confirmar.",
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
    next: "Continuar", back: "Atrás", start: "Sí, empezar estas pruebas",
    review: "Revisar mi plan de pruebas", readyKicker: "TU RUTA DE PRUEBAS PERSONALES",
    readyTitle: "Tu perfil empieza aquí",
    readyHelp: "Para crear tu perfil, realiza estas pruebas gratuitas en orden. Confirma la lista antes de empezar.",
    saveToCabinet: "Guardar las pruebas elegidas en mi espacio",
    saveToCabinetHelp: "Accede con Google para guardar tu selección en Mis pruebas. Tus respuestas y resultados de invitado no se importarán automáticamente.",
    saveToCabinetBusy: "Abriendo tu espacio…",
    saveToCabinetError: "No se pudo iniciar sesión con Google. Inténtalo de nuevo o continúa sin entrar.",
    saveToCabinetCheckError: "No pudimos verificar tu cuenta. Puedes hacer estas pruebas como invitado.",
    saveToCabinetStorageError: "No se puede guardar la selección en este navegador. Habilita el almacenamiento o continúa como invitado.",
    guestChoice: "O empieza como invitado con el botón de abajo.",
    readyFoot: "Avanza prueba por prueba. Verás el progreso total arriba y podrás guardar los resultados de forma privada si lo deseas.",
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
  }, [started, step]);
  const [focuses, setFocuses] = useState<Focus[]>(["identity"]);
  const [areas, setAreas] = useState<Area[]>(areasFor(["identity"]));
  const [selectedAxes, setSelectedAxes] = useState<string[]>(allAxesFor(areasFor(["identity"])));
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [showMore, setShowMore] = useState(false);
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountError, setAccountError] = useState("");
  const accountLocale = locale === "es" ? "en" : locale;

  const availableAxes = allAxesFor(areas);
  const matches = useMemo(() => tests
    .map(test => ({ ...test, matches: test.axes.filter(axis => selectedAxes.includes(axis)) }))
    .filter(test => test.matches.length > 0)
    .sort((a, b) => b.matches.length - a.matches.length ||
      (a.minutes ?? 99) - (b.minutes ?? 99) || a.key.localeCompare(b.key))
    .slice(0, 24), [tests, selectedAxes]);
  const displayTests = showMore ? matches : matches.slice(0, 6);
  const chosenTests = selectedKeys.flatMap(key => matches.filter(test => test.key === key));
  const coverage = new Set(chosenTests.flatMap(test => test.matches));
  const minutes = chosenTests.reduce((sum, test) => sum + (test.minutes || 0), 0);

  function toggleFocus(focus: Focus) {
    setFocuses(previous => previous.includes(focus)
      ? previous.filter(item => item !== focus) : [...previous, focus]);
  }

  function toggleArea(area: Area) {
    const next = areas.includes(area) ? areas.filter(item => item !== area) : [...areas, area];
    setAreas(next);
    setSelectedAxes(allAxesFor(next));
    setSelectedKeys([]);
  }

  function goForward() {
    if (step === 0 && focuses.length) {
      const suggested = areasFor(focuses);
      setAreas(suggested);
      setSelectedAxes(allAxesFor(suggested));
      setSelectedKeys([]);
      setShowMore(false);
      setStep(1);
    }
    if (step === 1 && areas.length) setStep(2);
    if (step === 2 && selectedAxes.length) {
      setSelectedKeys([...recommendProfileBattery(matches, selectedAxes)]);
      setShowMore(false);
      setStep(3);
    }
    if (step === 3 && selectedKeys.length > 0) setStep(4);
  }

  const base = "/" + accountLocale;
  const testHref = base + "/client?startTests=" + encodeURIComponent(selectedKeys.join(","));

  async function saveSelectionWithGoogle() {
    if (accountBusy || selectedKeys.length === 0) return;
    setAccountError("");
    // The only cross-navigation state is a TTL-limited whitelist of eligible
    // questionnaire keys, not the user interests, answers or health results.
    try {
      window.sessionStorage.setItem(
        PENDING_TEST_SELECTION_KEY,
        makeTestSelectionIntent(selectedKeys),
      );
    } catch {
      setAccountError(t.saveToCabinetStorageError);
      return;
    }
    setAccountBusy(true);
    try {
      try {
        await appFetch("auth/contact-profile");
        // No duplicate Google flow for a currently authenticated visitor.
        window.location.assign(base + "/app/tests?selection=pending");
        return;
      } catch (cause) {
        if ((cause as { status?: number })?.status !== 401) {
          setAccountError(t.saveToCabinetCheckError);
          return;
        }
      }
      // This is the existing whitelisted OAuth continuation; My Tests
      // rechecks eligibility and saves the account-owned plan only on success.
      const response = await appFetch("auth/start", {
        locale: accountLocale, continueTo: "tests",
      });
      if (typeof response?.redirectUrl !== "string" ||
          !/^https:\/\//.test(response.redirectUrl)) {
        throw new Error("AUTH_START_UNAVAILABLE");
      }
      window.location.assign(response.redirectUrl);
    } catch {
      setAccountError(t.saveToCabinetError);
    } finally {
      setAccountBusy(false);
    }
  }

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
          <Link className={styles.browseTests} href={'/' + locale + '/tests'} prefetch={false} data-profile-direct-tests>
            {t.browseTests}<ArrowRight size={15} aria-hidden="true" />
          </Link>
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
        <div className={styles.templateGrid} data-profile-focus-selection>
          {(Object.keys(t.focuses) as Focus[]).map(key =>
            <button type="button" key={key} className={styles.templateCard}
              aria-pressed={focuses.includes(key)} onClick={() => toggleFocus(key)} data-profile-focus={key}>
              <span className={styles.templateIcon} aria-hidden="true">
                {key === "identity" ? <Brain size={21} /> : key === "wellbeing" ? <HeartPulse size={21} />
                  : key === "relationships" ? <HeartHandshake size={21} /> : key === "work" ? <BriefcaseBusiness size={21} /> : <Compass size={21} />}
              </span>
              <span className={styles.templateBody}>
                <strong>{t.focuses[key][0]}</strong>
                <span>{t.focuses[key][1]}</span>
                <small className={styles.templateSelect}>{focuses.includes(key) ? t.focusSelected : t.focusAdd}</small>
              </span>
              <span className={styles.focusCheck} aria-hidden="true">{focuses.includes(key) && <Check size={16} />}</span>
            </button>)}
        </div>
        <details className={styles.layerDetails} data-profile-four-layers>
          <summary>{t.layerTitle}<ChevronDown size={16} aria-hidden="true" /></summary>
          <p>{t.layerNote}</p>
          <ol>{t.layers.map(layer => <li key={layer[0]}><strong>{layer[0]}</strong><span>{layer[1]}</span></li>)}</ol>
        </details>
      </section>}

      {step === 1 && <section aria-labelledby="profile-builder-step-title">
        <p className={styles.templateLabel}>{t.unifiedNote}</p>
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

      {step === 4 && <section aria-labelledby="profile-builder-step-title" data-profile-test-review-slide>
        <div className={styles.reviewIntro}>
          <div className={styles.reviewIcon} aria-hidden="true"><ClipboardList size={24} /></div>
          <p className={styles.templateLabel}>{t.readyKicker}</p>
          <h2 id="profile-builder-step-title">{t.readyTitle}</h2>
          <p className={styles.help}>{t.readyHelp}</p>
          <p className={styles.reviewTotal}>
            <ClipboardList size={17} aria-hidden="true" />
            <strong>{chosenTests.length} {t.testCount}</strong>
            {minutes > 0 && <span>· ~{minutes} {t.minutes}</span>}
          </p>
        </div>
        <ol className={styles.reviewTests}>
          {chosenTests.map((test, index) =>
            <li key={test.key} className={styles.reviewTest} data-profile-review-test={test.key}>
              <span className={styles.reviewNumber} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <span className={styles.reviewTestText}>
                <strong>{test.title}</strong>
                <small>{test.questions ? test.questions + " " + t.questions : ""}
                  {test.questions && test.minutes ? " · " : ""}
                  {test.minutes ? "~" + test.minutes + " " + t.minutes : ""}</small>
              </span>
              <Check size={18} className={styles.reviewCheck} aria-hidden="true" />
            </li>)}
        </ol>
        <div className={styles.accountOffer} data-profile-google-cabinet-offer>
          <LockKeyhole size={20} aria-hidden="true" />
          <div className={styles.accountOfferBody}>
            <button type="button" className={styles.googleButton}
              onClick={saveSelectionWithGoogle} disabled={accountBusy || selectedKeys.length === 0}
              data-profile-google-signin>
              {accountBusy ? t.saveToCabinetBusy : t.saveToCabinet}<ArrowRight size={16} aria-hidden="true" />
            </button>
            <p>{t.saveToCabinetHelp}</p>
            <small>{t.guestChoice}</small>
            {accountError && <p role="alert" className={styles.accountError}>{accountError}</p>}
          </div>
        </div>
        <p className={styles.reviewFoot}><LockKeyhole size={16} aria-hidden="true" />{t.readyFoot}</p>
      </section>}

      <div className={styles.actions}>
        {step > 0 && <button type="button" className={styles.back} onClick={() => setStep(step - 1)}><ArrowLeft size={17} />{t.back}</button>}
        {step === 0
          ? <button type="button" className={styles.primary} disabled={focuses.length === 0}
              onClick={goForward} data-profile-confirm-focus>{t.next}<ArrowRight size={17} /></button>
          : step < 3
            ? <button type="button" className={styles.primary} disabled={step === 1 ? areas.length === 0 : selectedAxes.length === 0}
                onClick={goForward}>{t.next}<ArrowRight size={17} /></button>
            : step === 3
              ? <button type="button" className={styles.primary} disabled={selectedKeys.length === 0}
                  onClick={goForward} data-profile-review-tests>{t.review}<ArrowRight size={17} /></button>
              : selectedKeys.length > 0
                ? <Link href={testHref} prefetch={false} className={styles.primary} data-profile-start-tests>
                    {t.start}<ArrowRight size={17} /></Link>
                : <button type="button" disabled className={styles.primary}>{t.start}</button>}
      </div>
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
