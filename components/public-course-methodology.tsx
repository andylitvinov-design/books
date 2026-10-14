import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpenCheck, CheckCircle2, Compass, HeartHandshake, Leaf, RefreshCw, ShieldCheck, Sparkles, Target } from "lucide-react";
import { PublicSiteHeader } from "@/components/public-site-header";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./public-course-methodology.module.css";

const sources = [
  { name: "CBT · NHS Thought record", href: "https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/self-help-cbt-techniques/thought-record/" },
  { name: "ACT · Psychological flexibility", href: "https://contextualscience.org/six_core_processes_act" },
  { name: "COM-B · Michie et al. (2011)", href: "https://doi.org/10.1186/1748-5908-6-42" },
  { name: "Learning science · Dunlosky et al. (2013)", href: "https://doi.org/10.1177/1529100612453266" },
] as const;

const copy = {
  ru: {
    eyebrow: "HOLISTIC HOUSE · МЕТОДИКА КУРСОВ",
    back: "Все курсы",
    title: "Метод ОПОРА",
    subtitle: "От осознания к действию",
    intro: "Мы создали 14-урочную систему обучения психологическим навыкам. Она помогает лучше замечать привычные реакции, находить доступные ресурсы и пробовать новые способы поведения в обычной жизни — без обещаний мгновенных перемен.",
    heroNote: "14 последовательных уроков · индивидуальный маршрут · свой темп",
    primary: "Выбрать курс", secondary: "Как это работает",
    visualEyebrow: "МАЛЕНЬКИЕ ШАГИ. РЕАЛЬНЫЙ ОПЫТ.",
    visualPhrase: "Замечать себя. Находить опору. Действовать осознанно.",
    mechanicsEyebrow: "ПЯТЬ ШАГОВ В ОДНОМ МЕТОДЕ",
    mechanicsTitle: "Как устроена ОПОРА",
    mechanicsIntro: "В каждом уроке мы возвращаемся к одному циклу: замечаем, делаем паузу, выбираем ресурс и безопасный следующий шаг, затем учимся на опыте.",
    steps: [
      { letter: "О", en: "Observe", name: "Осознать", desc: "Определить ситуацию и навык, который хочется развивать." },
      { letter: "П", en: "Pause", name: "Поймать реакцию", desc: "Замечать мысли и чувства, находить пространство для паузы." },
      { letter: "О", en: "Orient", name: "Опереться", desc: "Выбрать подходящую внутреннюю или внешнюю поддержку." },
      { letter: "Р", en: "Respond", name: "Решить и попробовать", desc: "Сделать один небольшой, посильный шаг в жизни." },
      { letter: "А", en: "Adapt", name: "Анализировать и адаптировать", desc: "Отметить наблюдения и скорректировать следующий шаг." },
    ],
    scienceEyebrow: "МЕТОДОЛОГИЧЕСКАЯ ОСНОВА",
    scienceTitle: "На какие подходы мы опираемся",
    scienceLead: "Наш метод объединяет образовательные элементы известных психологических подходов. Авторской является организация 14 уроков и их персонализация, а не сами техники.",
    pillars: [
      { title: "Когнитивно-поведенческий подход (КПТ)", text: "Помогает наблюдать связь ситуаций, мыслей, чувств и привычных действий; искать более гибкий ответ." },
      { title: "ACT — психологическая гибкость", text: "Учит замечать переживания, не требуя их немедленного исчезновения, и действовать в соответствии с ценностями." },
      { title: "COM-B и изменение поведения", text: "Учитывает навыки, реальные условия и мотивацию: одного желания измениться бывает недостаточно." },
      { title: "Психология обучения", text: "Повторение главного навыка, лёгкое вспоминание и перенос упражнений в разные жизненные ситуации." },
    ],
    journeyEyebrow: "ПОШАГОВОЕ ОБУЧЕНИЕ",
    journeyTitle: "Четыре этапа за 14 уроков",
    journey: [
      { days: "01–03", name: "Осознание", text: "Узнаём свою цель и привычные реакции." },
      { days: "04–07", name: "Опора и гибкость", text: "Осваиваем паузу, ресурс и новые варианты ответа." },
      { days: "08–11", name: "Применение", text: "Пробуем посильные действия в повседневности." },
      { days: "12–14", name: "Закрепление", text: "Собираем личный набор инструментов и план продолжения." },
    ],
    personalTitle: "Не один сценарий для всех",
    personalText: "Перед стартом вы выбираете тему, проходите подходящие тесты или используете совместимые прежние результаты и подтверждаете свои направления развития. Уроки подбираются из подготовленной библиотеки по вашему запросу; если упражнение не подошло, можно выбрать более мягкий вариант.",
    rhythmTitle: "Ваш темп имеет значение",
    rhythmText: "Незаконченный первый урок остаётся первым и завтра. Следующий появляется после завершения текущего. Оценки самочувствия необязательны, а перерывы не считаются неудачей.",
    evidenceTitle: "Почему мы не обещаем чудес",
    evidenceText: "Исследования поддерживают отдельные подходы, на которые мы опираемся. Однако эффективность именно нашей комбинации ОПОРА ещё не подтверждена отдельными клиническими исследованиями. Результат курса — освоение и применение навыков, а не гарантированное изменение симптомов за 14 дней.",
    sourcesTitle: "Материалы для тех, кто хочет узнать больше",
    sourcesIntro: "Первоисточники об отдельных компонентах методики (не исследования курса Holistic House):",
    finalTitle: "Один маленький шаг может стать началом нового опыта",
    finalText: "Выберите важную тему и начните с персонального маршрута. Первый курс доступен бесплатно.",
    disclaimer: "Образовательная программа самопомощи. Не является медицинской диагностикой, лечением или заменой психотерапии и другой профессиональной помощи.",
  },
  en: {
    eyebrow: "HOLISTIC HOUSE · COURSE METHODOLOGY",
    back: "All courses",
    title: "The OPORA Method",
    subtitle: "From awareness to action",
    intro: "Our 14-lesson learning framework helps you notice familiar reactions, discover accessible resources, and practise different responses in everyday life — without promising instant change.",
    heroNote: "14 sequential lessons · a personal path · your own pace",
    primary: "Explore courses", secondary: "How it works",
    visualEyebrow: "SMALL STEPS. REAL-LIFE LEARNING.",
    visualPhrase: "Notice yourself. Find support. Choose your next step.",
    mechanicsEyebrow: "FIVE STEPS, ONE PRACTICAL CYCLE",
    mechanicsTitle: "What OPORA stands for",
    mechanicsIntro: "Each lesson returns to a simple cycle: notice, pause, find a resource, try a safe step, and learn from what happened.",
    steps: [
      { letter: "O", en: "Observe", name: "Observe", desc: "Name a real-life situation and a skill you'd like to practise." },
      { letter: "P", en: "Pause", name: "Pause", desc: "Notice thoughts and feelings, creating a little room for choice." },
      { letter: "O", en: "Orient", name: "Orient", desc: "Find a fitting internal or external source of support." },
      { letter: "R", en: "Respond", name: "Respond", desc: "Choose one small, manageable action." },
      { letter: "A", en: "Adapt", name: "Adapt", desc: "Reflect on the experience and adjust what you try next." },
    ],
    scienceEyebrow: "RESEARCH-INFORMED FOUNDATIONS",
    scienceTitle: "What informs our approach",
    scienceLead: "OPORA brings together educational ideas from established psychological approaches. Our contribution is the structure and personalization, not the invention of those techniques.",
    pillars: [
      { title: "Cognitive behavioural principles (CBT)", text: "Notice the links between situations, thoughts, feelings and actions, and explore realistic alternatives." },
      { title: "ACT and psychological flexibility", text: "Notice difficult experiences without needing to remove them before acting on what matters." },
      { title: "COM-B and behaviour change", text: "Consider skills, opportunities and motivation instead of treating change as a matter of willpower alone." },
      { title: "Learning science", text: "Revisit key skills, recall them in your own words and practise in different everyday contexts." },
    ],
    journeyEyebrow: "A GENTLE LEARNING PATH",
    journeyTitle: "Four stages, 14 lessons",
    journey: [
      { days: "01–03", name: "Awareness", text: "Clarify your goal and recognise familiar reactions." },
      { days: "04–07", name: "Support & flexibility", text: "Practise a pause, accessible resources and other responses." },
      { days: "08–11", name: "Everyday application", text: "Try manageable actions in ordinary situations." },
      { days: "12–14", name: "Integration", text: "Build your own toolkit and next-steps plan." },
    ],
    personalTitle: "Not the same script for everyone",
    personalText: "Start by choosing a topic, reviewing suitable assessments or compatible previous results, and approving your learning goals. Lessons draw from a reviewed practice library to fit your focus. Gentler alternatives are available when a practice doesn't feel right.",
    rhythmTitle: "Progress at your pace",
    rhythmText: "An unfinished first lesson stays Lesson 1 tomorrow. The next unlocks only after you complete the current one. Check-ins are optional and pauses aren't failures.",
    evidenceTitle: "A grounded promise",
    evidenceText: "Research supports individual approaches that inform OPORA. This specific combination, however, has not been independently validated in clinical trials. We focus on learning practical skills, not guaranteeing symptom changes in 14 days.",
    sourcesTitle: "Explore the supporting research",
    sourcesIntro: "Original sources for individual elements, not studies of the Holistic House programme:",
    finalTitle: "One small step can open a new possibility",
    finalText: "Choose a focus and begin your personal learning journey. Your first course is free.",
    disclaimer: "Educational self-help only. Not a diagnosis, treatment, or replacement for professional medical or psychological care.",
  },
  es: {
    eyebrow: "HOLISTIC HOUSE · METODOLOGÍA",
    back: "Todos los cursos",
    title: "Método OPORA",
    subtitle: "De la conciencia a la acción",
    intro: "Un recorrido de 14 lecciones para reconocer reacciones habituales, encontrar recursos y ensayar respuestas diferentes en la vida diaria, sin prometer cambios instantáneos.",
    heroNote: "14 lecciones progresivas · ruta personal · a tu ritmo",
    primary: "Ver cursos", secondary: "Cómo funciona",
    visualEyebrow: "PEQUEÑOS PASOS. EXPERIENCIA REAL.",
    visualPhrase: "Obsérvate. Encuentra apoyo. Elige tu siguiente paso.",
    mechanicsEyebrow: "CINCO PASOS, UN CICLO PRÁCTICO",
    mechanicsTitle: "Cómo funciona OPORA",
    mechanicsIntro: "Cada lección sigue un ciclo: observar, hacer una pausa, buscar apoyo, intentar un paso seguro y aprender de la experiencia.",
    steps: [
      { letter: "O", en: "Observe", name: "Observar", desc: "Identificar una situación y una habilidad que quieras desarrollar." },
      { letter: "P", en: "Pause", name: "Pausar", desc: "Reconocer pensamientos y emociones, dejando espacio para elegir." },
      { letter: "O", en: "Orient", name: "Orientarse", desc: "Encontrar un apoyo interno o externo adecuado." },
      { letter: "R", en: "Respond", name: "Responder", desc: "Elegir una acción pequeña y posible." },
      { letter: "A", en: "Adapt", name: "Adaptar", desc: "Reflexionar y ajustar el siguiente paso." },
    ],
    scienceEyebrow: "BASES INFORMADAS POR LA INVESTIGACIÓN",
    scienceTitle: "En qué nos inspiramos",
    scienceLead: "OPORA combina elementos educativos de enfoques psicológicos conocidos. La organización y personalización son propias, no las técnicas originales.",
    pillars: [
      { title: "Principios cognitivo-conductuales (TCC)", text: "Observar relaciones entre situaciones, pensamientos, emociones y conductas, y explorar alternativas realistas." },
      { title: "ACT y flexibilidad psicológica", text: "Reconocer experiencias difíciles sin exigir que desaparezcan para actuar según los propios valores." },
      { title: "COM-B y cambio de conducta", text: "Considerar capacidades, oportunidades y motivación, no solo fuerza de voluntad." },
      { title: "Ciencia del aprendizaje", text: "Repetir las habilidades clave, recordarlas y aplicarlas en diferentes situaciones." },
    ],
    journeyEyebrow: "UN CAMINO PROGRESIVO",
    journeyTitle: "Cuatro etapas, 14 lecciones",
    journey: [
      { days: "01–03", name: "Conciencia", text: "Identificar metas y reacciones habituales." },
      { days: "04–07", name: "Apoyo y flexibilidad", text: "Practicar pausas, recursos y nuevas respuestas." },
      { days: "08–11", name: "Aplicación", text: "Probar pequeñas acciones en la vida cotidiana." },
      { days: "12–14", name: "Integración", text: "Crear herramientas propias y un plan de continuación." },
    ],
    personalTitle: "Un camino adaptado a ti",
    personalText: "Eliges un tema, revisas pruebas adecuadas o resultados anteriores compatibles y confirmas tus objetivos. Las lecciones se seleccionan de una biblioteca revisada y ofrecen alternativas más suaves.",
    rhythmTitle: "A tu propio ritmo",
    rhythmText: "Si no terminas la primera lección, mañana seguirá siendo la primera. La siguiente solo se desbloquea tras completar la actual. Las autoevaluaciones son opcionales.",
    evidenceTitle: "Sin promesas exageradas",
    evidenceText: "La investigación respalda componentes de los enfoques que usamos; la combinación específica OPORA todavía no cuenta con validación clínica independiente. Nos centramos en aprender habilidades, no en garantizar resultados en 14 días.",
    sourcesTitle: "Fuentes y referencias",
    sourcesIntro: "Fuentes originales sobre los componentes, no estudios del programa Holistic House:",
    finalTitle: "Un pequeño paso puede abrir nuevas posibilidades",
    finalText: "Elige un objetivo y comienza. El primer curso es gratuito.",
    disclaimer: "Programa educativo de autoayuda. No sustituye diagnóstico, tratamiento ni atención profesional.",
  },
} as const;

const stepIcons = [Target, Compass, HeartHandshake, CheckCircle2, RefreshCw] as const;

export function PublicCourseMethodology({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  return <main className={styles.root} lang={locale} data-course-methodology>
    <PublicSiteHeader locale={locale} />
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="opora-title">
        <div className={styles.heroText}>
          <Link href={`/${locale}/courses`} className={styles.back}><ArrowLeft size={17} aria-hidden="true"/>{t.back}</Link>
          <p className={styles.eyebrow}><Sparkles size={16} aria-hidden="true"/>{t.eyebrow}</p>
          <h1 id="opora-title">{t.title}</h1>
          <p className={styles.subtitle}>{t.subtitle}</p>
          <p className={styles.intro}>{t.intro}</p>
          <p className={styles.heroNote}><BookOpenCheck size={17} aria-hidden="true"/>{t.heroNote}</p>
          <div className={styles.actions}>
            <Link className={styles.primary} href={`/${locale}/courses`}>{t.primary}<ArrowRight size={18} aria-hidden="true"/></Link>
            <a href="#how-opora-works" className={styles.secondary}>{t.secondary}</a>
          </div>
        </div>
        <div className={styles.heroArt} aria-hidden="true">
          <div className={styles.artImage}/>
          <div className={styles.artCaption}><span>{t.visualEyebrow}</span><strong>{t.visualPhrase}</strong></div>
        </div>
      </section>

      <section className={styles.block} id="how-opora-works" aria-labelledby="opora-cycle-title">
        <p className={styles.sectionEyebrow}>{t.mechanicsEyebrow}</p>
        <h2 id="opora-cycle-title">{t.mechanicsTitle}</h2>
        <p className={styles.sectionLead}>{t.mechanicsIntro}</p>
        <ol className={styles.cycle}>
          {t.steps.map((step, i) => {
            const Icon = stepIcons[i];
            return <li className={styles.step} key={step.en}>
              <span className={styles.letter}>{step.letter}</span>
              <span className={styles.stepIcon}><Icon size={19} aria-hidden="true"/></span>
              <div><span className={styles.stepMeta}>{step.en}</span><h3>{step.name}</h3><p>{step.desc}</p></div>
            </li>;
          })}
        </ol>
      </section>

      <section className={styles.science} aria-labelledby="opora-science-title">
        <p className={styles.sectionEyebrow}>{t.scienceEyebrow}</p>
        <h2 id="opora-science-title">{t.scienceTitle}</h2>
        <p className={styles.sectionLead}>{t.scienceLead}</p>
        <div className={styles.pillars}>
          {t.pillars.map((item,i) => <article className={styles.pillar} key={item.title}><span>0{i+1}</span><h3>{item.title}</h3><p>{item.text}</p></article>)}
        </div>
      </section>

      <section className={styles.block} aria-labelledby="opora-journey-title">
        <p className={styles.sectionEyebrow}>{t.journeyEyebrow}</p>
        <h2 id="opora-journey-title">{t.journeyTitle}</h2>
        <ol className={styles.journey}>
          {t.journey.map(item=><li key={item.days}><span>{item.days}</span><div><h3>{item.name}</h3><p>{item.text}</p></div></li>)}
        </ol>
        <div className={styles.details}>
          <article><Leaf size={26} aria-hidden="true"/><h3>{t.personalTitle}</h3><p>{t.personalText}</p></article>
          <article><HeartHandshake size={26} aria-hidden="true"/><h3>{t.rhythmTitle}</h3><p>{t.rhythmText}</p></article>
        </div>
      </section>

      <section className={styles.evidence} aria-labelledby="opora-evidence-title">
        <div><ShieldCheck size={25} aria-hidden="true"/><h2 id="opora-evidence-title">{t.evidenceTitle}</h2><p>{t.evidenceText}</p></div>
        <details className={styles.references}><summary>{t.sourcesTitle}</summary><p>{t.sourcesIntro}</p><ul>{sources.map(s=><li key={s.href}><a href={s.href} target="_blank" rel="noopener noreferrer">{s.name}<ArrowRight size={14} aria-hidden="true"/></a></li>)}</ul></details>
      </section>

      <section className={styles.final} aria-labelledby="opora-final-title">
        <h2 id="opora-final-title">{t.finalTitle}</h2>
        <p>{t.finalText}</p>
        <Link href={`/${locale}/courses`} className={styles.finalAction}>{t.primary}<ArrowRight size={19} aria-hidden="true"/></Link>
      </section>
      <p className={styles.disclaimer}>{t.disclaimer}</p>
    </div>
  </main>;
}
