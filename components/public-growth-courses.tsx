import Link from "next/link";
import { ArrowRight, BookOpenCheck, CheckCircle2, CircleHelp, Clock3, ShieldCheck, SlidersHorizontal, Sparkles, Target, Waves } from "lucide-react";
import { PublicSiteHeader } from "@/components/public-site-header";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./public-growth-courses.module.css";

const copy = {
  ru: {
    eyebrow: "HOLISTIC HOUSE · ПРОГРАММЫ ПОДДЕРЖКИ",
    title: "Мои курсы",
    lead: "Небольшие шаги, которые помогают лучше понимать себя и находить внутреннюю опору.",
    intro: "Выберите важную для вас тему, начните с коротких тестов и проходите 14-дневный курс в своём темпе — по одному завершённому уроку за раз.",
    start: "Начать бесплатно", learn: "Посмотреть программы",
    heroTag: "14 дней · личный темп", visualTitle: "Ваша точка опоры",
    visualText: "Один урок, одна практика, один небольшой шаг.",
    badge: "Первый курс бесплатно",
    eyebrowPrograms: "ВЫБЕРИТЕ СВОЁ НАПРАВЛЕНИЕ",
    programsTitle: "С чего хотите начать?", programsIntro: "Три готовые программы или индивидуальный маршрут под вашу цель.",
    cardAction: "Выбрать программу", days: "14-дневная программа",
    stress: { title: "Антистресс", pain: "Трудно расслабиться и выключить напряжение", description: "Наблюдаем свои реакции, находим короткие паузы и способы восстановления.", result: "Спокойствие · устойчивость · восстановление" },
    confidence: { title: "Внутренняя уверенность", pain: "Сомнения и слишком строгий внутренний критик", description: "Работаем с внутренней поддержкой, личными границами и уверенностью в выборе.", result: "Опора · свой голос · границы" },
    focus: { title: "Фокус и энергия", pain: "Трудно собраться, начать и удержать внимание", description: "Развиваем мягкую концентрацию, ясность приоритетов и посильные действия.", result: "Ясность · действие · свой темп" },
    personal: "Мой персональный курс", personalDesc: "Не нашли своё направление? Сформируйте программу вокруг ваших целей и актуальных вопросов.", personalAction: "Составить свой курс",
    eyebrowHow: "ПРОСТОЙ ПУТЬ", howTitle: "Как проходит курс",
    steps: [
      { title: "Выберите тему", description: "Определите запрос или начните с готовой программы." },
      { title: "Изучите свой профиль", description: "Пройдите предложенные тесты, чтобы увидеть исходную точку." },
      { title: "Осваивайте по одному уроку", description: "Короткая практика и отметка о завершении. Следующий урок откроется, когда вы закончите текущий." },
    ],
    methodKicker: "НАША МЕТОДИКА", methodTitle: "Метод ОПОРА: как работают наши курсы", methodText: "Пять шагов от осознания до действия. Узнайте, как мы объединяем психологические подходы, короткие практики и персональный маршрут.", methodLink: "Узнать о методе ОПОРА",
    bottomTitle: "Готовы сделать первый шаг?",
    bottomText: "Начните бесплатно. Вы сможете возвращаться к урокам, отмечать наблюдения и видеть изменения в личном кабинете.",
    bottomAction: "Записаться на курс бесплатно", ask: "Узнать о личной поддержке",
    note: "Курсы предназначены для самоисследования и образовательной поддержки, а не для постановки диагноза или замены медицинской и психотерапевтической помощи. Для начала понадобится вход в личный кабинет.",
  },
  en: {
    eyebrow: "HOLISTIC HOUSE · GUIDED LEARNING",
    title: "My courses",
    lead: "Small, meaningful steps to understand yourself and build inner support.",
    intro: "Choose what matters, start with brief assessments and follow a 14-day learning journey at your own pace — one completed lesson at a time.",
    start: "Start for free", learn: "Explore the programmes",
    heroTag: "14 days · your pace", visualTitle: "Find your footing",
    visualText: "One lesson, one practice, one small step.",
    badge: "Your first course is free",
    eyebrowPrograms: "FIND YOUR STARTING POINT",
    programsTitle: "What would you like to work on?", programsIntro: "Choose one of three guided programmes or create a personal learning path.",
    cardAction: "Choose programme", days: "14-day programme",
    stress: { title: "Stress Relief", pain: "It's hard to switch off and unwind", description: "Notice reactions, practise small pauses and make space for recovery.", result: "Calm · steadiness · recovery" },
    confidence: { title: "Inner Confidence", pain: "Self-doubt and a harsh inner critic", description: "Explore self-support, boundaries and confidence in everyday decisions.", result: "Support · voice · boundaries" },
    focus: { title: "Focus & Energy", pain: "It's hard to focus and get started", description: "Build gentle attention, clear priorities and manageable daily action.", result: "Clarity · action · your pace" },
    personal: "My personal course", personalDesc: "Need a different topic? Shape a learning path around your goals and questions.", personalAction: "Create my course",
    eyebrowHow: "A SIMPLE PATH", howTitle: "How your course works",
    steps: [
      { title: "Choose a focus", description: "Pick a guided programme or define your own question." },
      { title: "Explore your starting point", description: "Complete suggested assessments to better understand your current experience." },
      { title: "One lesson at a time", description: "Try a short practice and mark it complete. The next lesson follows when you're ready." },
    ],
    methodKicker: "OUR APPROACH", methodTitle: "The OPORA Method: how our courses work", methodText: "Five steps from awareness to action. Discover the psychology-informed principles behind your personal learning journey.", methodLink: "Explore the OPORA Method",
    bottomTitle: "Ready for a first step?",
    bottomText: "Start for free. Return to your lessons, write observations and review your changes from your personal cabinet.",
    bottomAction: "Join a free course", ask: "Explore personal support",
    note: "These programmes offer educational self-reflection, not diagnosis or a replacement for medical or mental health care. You will sign in to your private cabinet to begin.",
  },
  es: {
    eyebrow: "HOLISTIC HOUSE · PROGRAMAS DE APOYO",
    title: "Mis cursos",
    lead: "Pequeños pasos para conocerte mejor y cultivar tu apoyo interior.",
    intro: "Elige un tema, comienza con pruebas breves y sigue un recorrido de 14 días a tu ritmo: una lección completada cada vez.",
    start: "Empezar gratis", learn: "Ver los programas",
    heroTag: "14 días · a tu ritmo", visualTitle: "Tu punto de apoyo",
    visualText: "Una lección, una práctica, un pequeño paso.",
    badge: "Tu primer curso es gratis",
    eyebrowPrograms: "ELIGE TU CAMINO",
    programsTitle: "¿Por dónde quieres empezar?", programsIntro: "Tres programas guiados o una ruta personal según tus objetivos.",
    cardAction: "Elegir programa", days: "Programa de 14 días",
    stress: { title: "Menos estrés", pain: "Cuesta desconectar y relajarte", description: "Observa tus reacciones y encuentra pausas para recuperarte.", result: "Calma · estabilidad · recuperación" },
    confidence: { title: "Confianza interior", pain: "Dudas y autocrítica", description: "Explora el apoyo interior, los límites y tus decisiones.", result: "Apoyo · voz · límites" },
    focus: { title: "Enfoque y energía", pain: "Cuesta concentrarte y empezar", description: "Cultiva una atención amable y pequeñas acciones sostenibles.", result: "Claridad · acción · tu ritmo" },
    personal: "Mi curso personal", personalDesc: "¿Otro tema? Crea una ruta de aprendizaje centrada en tus objetivos.", personalAction: "Crear mi curso",
    eyebrowHow: "UN CAMINO SENCILLO", howTitle: "Cómo funciona",
    steps: [
      { title: "Elige un tema", description: "Escoge un programa o define tu propia pregunta." },
      { title: "Conoce tu punto de partida", description: "Completa las pruebas sugeridas para reflexionar sobre tu situación actual." },
      { title: "Una lección a la vez", description: "Practica, marca la lección como terminada y después sigue con la siguiente." },
    ],
    methodKicker: "NUESTRA METODOLOGÍA", methodTitle: "Método OPORA: cómo funcionan los cursos", methodText: "Cinco pasos de la conciencia a la acción, basados en enfoques psicológicos y adaptados a tu recorrido personal.", methodLink: "Conocer el método OPORA",
    bottomTitle: "¿Listo/a para empezar?",
    bottomText: "Empieza gratis. Vuelve a tus lecciones, anota observaciones y revisa los cambios desde tu espacio personal.",
    bottomAction: "Inscribirme gratis", ask: "Conocer el apoyo personal",
    note: "Los cursos ofrecen reflexión educativa, no diagnósticos ni sustituyen la atención médica o psicológica. Para empezar, entrarás a tu espacio personal en inglés.",
  },
} as const;

const programmeIds = ["stress", "confidence", "focus"] as const;
const icons = { stress: Waves, confidence: ShieldCheck, focus: Target } as const;

export function PublicGrowthCourses({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const appLocale = locale === "es" ? "en" : locale;
  const courseUrl = `/${appLocale}/app/course`;

  return <main className={styles.root} lang={locale} data-public-my-courses>
    <PublicSiteHeader locale={locale} />
    <section className={styles.hero} aria-labelledby="courses-title">
      <div className={styles.heroCopy}>
        <p className={styles.kicker}><Sparkles size={16} aria-hidden="true" />{t.eyebrow}</p>
        <h1 id="courses-title">{t.title}</h1>
        <p className={styles.heroLead}>{t.lead}</p>
        <p className={styles.heroIntro}>{t.intro}</p>
        <div className={styles.heroActions}>
          <Link className={styles.primary} href={courseUrl} prefetch={false}>{t.start}<ArrowRight size={18} aria-hidden="true" /></Link>
          <a className={styles.secondary} href="#course-programmes">{t.learn}<ArrowRight size={18} aria-hidden="true" /></a>
        </div>
        <span className={styles.freeNote}><CheckCircle2 size={17} aria-hidden="true" />{t.badge}</span>
      </div>
      <div className={styles.heroVisual} aria-hidden="true">
        <div className={styles.visualPhoto} />
        <div className={styles.visualCard}>
          <span><BookOpenCheck size={18}/>{t.heroTag}</span>
          <strong>{t.visualTitle}</strong>
          <small>{t.visualText}</small>
          <div className={styles.visualProgress}><i/><i/><i/><i/><i/></div>
        </div>
      </div>
    </section>

    <section className={styles.section} id="course-programmes" aria-labelledby="course-programmes-title">
      <p className={styles.sectionKicker}>{t.eyebrowPrograms}</p>
      <h2 id="course-programmes-title">{t.programsTitle}</h2>
      <p className={styles.sectionLead}>{t.programsIntro}</p>
      <div className={styles.programmes}>
        {programmeIds.map(id => {
          const Icon = icons[id];
          const programme = t[id];
          return <article className={styles.programme} key={id} data-course-programme={id}>
            <span className={styles.programmeIcon}><Icon size={30} strokeWidth={1.6} aria-hidden="true" /></span>
            <p className={styles.programmeMeta}><Clock3 size={14} aria-hidden="true" />{t.days}</p>
            <h3>{programme.title}</h3>
            <p className={styles.programmePain}>{programme.pain}</p>
            <p className={styles.programmeText}>{programme.description}</p>
            <p className={styles.programmeResult}>{programme.result}</p>
            <Link href={`${courseUrl}?program=${id}`} prefetch={false}>{t.cardAction}<ArrowRight size={18} aria-hidden="true" /></Link>
          </article>;
        })}
      </div>
      <div className={styles.personal}>
        <span className={styles.personalIcon}><SlidersHorizontal size={27} aria-hidden="true" /></span>
        <div><h3>{t.personal}</h3><p>{t.personalDesc}</p></div>
        <Link href={`${courseUrl}?entry=personal`} prefetch={false}>{t.personalAction}<ArrowRight size={17} aria-hidden="true" /></Link>
      </div>
    </section>

    <section className={styles.how} aria-labelledby="courses-how-title">
      <p className={styles.sectionKicker}>{t.eyebrowHow}</p>
      <h2 id="courses-how-title">{t.howTitle}</h2>
      <div className={styles.steps}>{t.steps.map((step, index) =>
        <div className={styles.step} key={step.title}>
          <span className={styles.stepNumber}>0{index + 1}</span>
          <h3>{step.title}</h3><p>{step.description}</p>
        </div>)}</div>
    </section>

    <section className={styles.methodSection} aria-labelledby="courses-method-title">
      <div><p className={styles.sectionKicker}>{t.methodKicker}</p><h2 id="courses-method-title">{t.methodTitle}</h2><p>{t.methodText}</p></div>
      <Link href={`/${locale}/courses/methodology`} className={styles.methodLink}>{t.methodLink}<ArrowRight size={18} aria-hidden="true" /></Link>
    </section>

    <section className={styles.final} aria-labelledby="courses-final-title">
      <span className={styles.finalMark}><Sparkles size={29} aria-hidden="true"/></span>
      <h2 id="courses-final-title">{t.bottomTitle}</h2>
      <p>{t.bottomText}</p>
      <div className={styles.finalActions}>
        <Link className={styles.primary} href={courseUrl} prefetch={false}>{t.bottomAction}<ArrowRight size={18} aria-hidden="true" /></Link>
        <Link className={styles.finalSecondary} href={`/${locale}/services`} prefetch={false}><CircleHelp size={18} aria-hidden="true"/>{t.ask}</Link>
      </div>
    </section>
    <p className={styles.note}>{t.note}</p>
  </main>;
}
