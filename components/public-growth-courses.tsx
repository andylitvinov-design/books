import Link from "next/link";
import { ArrowRight, BookOpenCheck, CheckCircle2, CircleHelp, Clock3, ShieldCheck, SlidersHorizontal, Sparkles, Target, Waves } from "lucide-react";
import { PublicSiteHeader } from "@/components/public-site-header";
import { PublicCourseCabinet } from "@/components/public-course-cabinet";
import Course14DayOverview from "@/components/app/course-14-day-overview";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./public-growth-courses.module.css";
import { DiscoverySectionTabs } from "@/components/discovery-section-tabs";

const copy = {
  ru: {
    eyebrow: "HOLISTIC HOUSE · АКАДЕМИЯ",
    title: "Бесплатные ИИ-курсы", academy: "Академия",
    lead: "Небольшие шаги к спокойствию и внутренней опоре.",
    intro: "14 дней в вашем темпе. Один урок, одна практика и возможность замечать свои изменения.",
    start: "Начать бесплатно", learn: "Подробнее об Антистрессе",
    heroTag: "14 дней · личный темп", visualTitle: "Ваша точка опоры",
    visualText: "Один урок, одна практика, один небольшой шаг.",
    badge: "Первый курс бесплатно",
    eyebrowPrograms: "ВЫБЕРИТЕ СВОЁ НАПРАВЛЕНИЕ",
    programsTitle: "ОПОРА — Антистресс", programsIntro: "Сейчас открыт один 14-дневный курс: семь навыков для работы с повседневным стрессом.",
    cardAction: "Выбрать программу", days: "14-дневная программа",
    stress: { title: "Антистресс", pain: "Трудно расслабиться и выключить напряжение", description: "Наблюдаем свои реакции, находим короткие паузы и способы восстановления.", result: "Спокойствие · устойчивость · восстановление" },
    stressSkills: {
      "title": "Антистресс · 7 навыков за 14 занятий",
      "kicker": "ОПОРА · АНТИСТРЕСС",
      "intro": "В первую неделю осваиваем семь навыков, во вторую повторяем каждый глубже и самостоятельнее.",
      "skills": [
        "Замечать стресс вовремя",
        "Возвращаться в настоящее",
        "Регулировать телесное напряжение",
        "Сохранять устойчивость рядом с эмоциями",
        "Выходить из тревожных мыслей",
        "Обозначать границы и принимать поддержку",
        "Восстанавливаться и действовать самостоятельно"
      ],
      "cta": "Начать программу «Антистресс»",
      "safety": "Самостоятельное обучение управлению повседневным стрессом. Не терапия шоковой травмы или ПТСР и не замена помощи специалиста. Любую практику можно остановить или пропустить."
    },
    confidence: { title: "Внутренняя уверенность", pain: "Сомнения и слишком строгий внутренний критик", description: "Работаем с внутренней поддержкой, личными границами и уверенностью в выборе.", result: "Опора · свой голос · границы" },
    focus: { title: "Фокус и энергия", pain: "Трудно собраться, начать и удержать внимание", description: "Развиваем мягкую концентрацию, ясность приоритетов и посильные действия.", result: "Ясность · действие · свой темп" },
    personal: "Другие направления — позже", personalDesc: "Курсы уверенности и концентрации готовятся. Сейчас можно выбрать свои цели и шкалы внутри Антистресса.", personalAction: "Составить свой курс",
    eyebrowHow: "ПРОСТОЙ ПУТЬ", howTitle: "Как проходит курс",
    steps: [
      { title: "Определите свой фокус", description: "Курс Антистресс уже выбран: вы отмечаете важные лично вам навыки и цели." },
      { title: "Пройдите стартовые тесты", description: "До первого урока — Weekly Pulse (8 вопросов); GAD-7 и тест ресурсов — по желанию." },
      { title: "Замечайте изменения", description: "14 небольших уроков. Следующий — после завершения текущего; в конце можно повторить замер." },
    ],
    methodKicker: "НАША МЕТОДИКА", methodTitle: "Метод ОПОРА: как работают наши курсы", methodText: "Пять шагов от осознания до действия. Узнайте, как мы объединяем психологические подходы, короткие практики и персональный маршрут.", methodLink: "Узнать о методе ОПОРА",
    bottomTitle: "Готовы сделать первый шаг?",
    bottomText: "Начните бесплатно. Вы сможете возвращаться к урокам, отмечать наблюдения и видеть изменения в личном кабинете.",
    bottomAction: "Записаться на курс бесплатно", ask: "Узнать о личной поддержке",
    note: "Курсы предназначены для самоисследования и образовательной поддержки, а не для постановки диагноза или замены медицинской и психотерапевтической помощи. Для начала понадобится вход в личный кабинет.",
  },
  en: {
    eyebrow: "HOLISTIC HOUSE · ACADEMY",
    title: "Free AI courses", academy: "Academy",
    lead: "Small steps towards calm and inner support.",
    intro: "Fourteen days at your own pace. One lesson, one practice, and room to notice how you feel.",
    start: "Start for free", learn: "About Stress Relief",
    heroTag: "14 days · your pace", visualTitle: "Find your footing",
    visualText: "One lesson, one practice, one small step.",
    badge: "Your first course is free",
    eyebrowPrograms: "FIND YOUR STARTING POINT",
    programsTitle: "OPORA — Stress Relief", programsIntro: "One programme is open now: 14 lessons and seven practical skills for everyday stress.",
    cardAction: "Choose programme", days: "14-day programme",
    stress: { title: "Stress Relief", pain: "It's hard to switch off and unwind", description: "Notice reactions, practise small pauses and make space for recovery.", result: "Calm · steadiness · recovery" },
    stressSkills: {
      "title": "Stress Relief · 7 skills across 14 lessons",
      "kicker": "OPORA · STRESS RELIEF",
      "intro": "Week one introduces seven skills; week two revisits them with more independent practice.",
      "skills": [
        "Notice stress signals early",
        "Return attention to the present",
        "Adjust body tension gently",
        "Stay steady alongside feelings",
        "Unhook from worrying thoughts",
        "Set boundaries and seek support",
        "Recover and take manageable action"
      ],
      "cta": "Start Stress Relief",
      "safety": "Self-guided education for everyday stress, not shock-trauma or PTSD treatment and not a replacement for professional care. You may stop or skip any exercise."
    },
    confidence: { title: "Inner Confidence", pain: "Self-doubt and a harsh inner critic", description: "Explore self-support, boundaries and confidence in everyday decisions.", result: "Support · voice · boundaries" },
    focus: { title: "Focus & Energy", pain: "It's hard to focus and get started", description: "Build gentle attention, clear priorities and manageable daily action.", result: "Clarity · action · your pace" },
    personal: "More programmes are coming", personalDesc: "Confidence and focus courses are in preparation. You can choose your own goals and scales within Stress Relief.", personalAction: "Create my course",
    eyebrowHow: "A SIMPLE PATH", howTitle: "How your course works",
    steps: [
      { title: "Choose your focus", description: "Anti-Stress is selected; you choose which personal skills and goals matter." },
      { title: "Complete starting assessments", description: "Before lesson 1: Weekly Pulse (8 questions); GAD-7 and Resource Pulse are optional." },
      { title: "One lesson at a time", description: "Try a short practice and mark it complete. The next lesson follows when you're ready." },
    ],
    methodKicker: "OUR APPROACH", methodTitle: "The OPORA Method: how our courses work", methodText: "Five steps from awareness to action. Discover the psychology-informed principles behind your personal learning journey.", methodLink: "Explore the OPORA Method",
    bottomTitle: "Ready for a first step?",
    bottomText: "Start for free. Return to your lessons, write observations and review your changes from your personal cabinet.",
    bottomAction: "Join a free course", ask: "Explore personal support",
    note: "These programmes offer educational self-reflection, not diagnosis or a replacement for medical or mental health care. You will sign in to your private cabinet to begin.",
  },
  es: {
    eyebrow: "HOLISTIC HOUSE · ACADEMIA",
    title: "Cursos de IA gratuitos", academy: "Academia",
    lead: "Pequeños pasos hacia la calma y tu apoyo interior.",
    intro: "Catorce días a tu ritmo. Una lección, una práctica y espacio para observar los cambios.",
    start: "Empezar gratis", learn: "Conocer Antiestrés",
    heroTag: "14 días · a tu ritmo", visualTitle: "Tu punto de apoyo",
    visualText: "Una lección, una práctica, un pequeño paso.",
    badge: "Tu primer curso es gratis",
    eyebrowPrograms: "ELIGE TU CAMINO",
    programsTitle: "OPORA — Antiestrés", programsIntro: "Un único curso disponible: 14 lecciones y siete habilidades prácticas para el estrés cotidiano.",
    cardAction: "Elegir programa", days: "Programa de 14 días",
    stress: { title: "Menos estrés", pain: "Cuesta desconectar y relajarte", description: "Observa tus reacciones y encuentra pausas para recuperarte.", result: "Calma · estabilidad · recuperación" },
    stressSkills: {
      "title": "Menos estrés · 7 habilidades en 14 lecciones",
      "kicker": "OPORA · MENOS ESTRÉS",
      "intro": "La primera semana presenta las siete habilidades. La segunda las practica con mayor autonomía.",
      "skills": [
        "Reconocer a tiempo las señales de estrés",
        "Volver al presente",
        "Regular la tensión corporal",
        "Convivir con las emociones con estabilidad",
        "Distanciarme de pensamientos inquietantes",
        "Poner límites y pedir apoyo",
        "Recuperarme y actuar con autonomía"
      ],
      "cta": "Empezar el programa antiestrés",
      "safety": "Educación para afrontar el estrés cotidiano; no es tratamiento del trauma agudo ni del TEPT y no sustituye la ayuda profesional. Puedes detener o saltar cualquier ejercicio."
    },
    confidence: { title: "Confianza interior", pain: "Dudas y autocrítica", description: "Explora el apoyo interior, los límites y tus decisiones.", result: "Apoyo · voz · límites" },
    focus: { title: "Enfoque y energía", pain: "Cuesta concentrarte y empezar", description: "Cultiva una atención amable y pequeñas acciones sostenibles.", result: "Claridad · acción · tu ritmo" },
    personal: "Próximamente otros cursos", personalDesc: "Estamos preparando cursos de confianza y concentración. Ya puedes elegir metas personales dentro de Antiestrés.", personalAction: "Crear mi curso",
    eyebrowHow: "UN CAMINO SENCILLO", howTitle: "Cómo funciona",
    steps: [
      { title: "Elige tu enfoque", description: "Antiestrés ya está seleccionado; tú eliges tus metas personales." },
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

const programmeIds = ["stress"] as const; // Only the reviewed course accepts new public enrollment.
const icons = { stress: Waves, confidence: ShieldCheck, focus: Target } as const;

export function PublicGrowthCourses({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const appLocale = locale === "es" ? "en" : locale;
  const courseUrl = `/${appLocale}/app/course?program=stress`;

  return <main className={styles.root} lang={locale} data-public-my-courses>
    <PublicSiteHeader locale={locale} showAssessmentStrip={false} />
    <nav className={styles.academyTrail} aria-label={t.academy}>
      <Link href={"/" + locale + "/academy"}>{t.academy}</Link><span aria-hidden="true">›</span><span aria-current="page">{t.title}</span>
    </nav>
    <section className={styles.hero} aria-labelledby="courses-title">
      <div className={styles.discoveryTopline}>
        <span className={styles.discoveryKicker}><Sparkles size={16} aria-hidden="true" /> HOLISTIC HOUSE</span>
        <DiscoverySectionTabs locale={locale} active="courses" />
      </div>
      <div className={styles.heroCopy}>
        <p className={styles.kicker}><Sparkles size={16} aria-hidden="true" />{t.eyebrow}</p>
        <h1 id="courses-title">{t.title}</h1>
        <p className={styles.heroLead}>{t.lead}</p>
        <p className={styles.heroIntro}>{t.intro}</p>
        <div className={styles.heroActions}>
          <Link className={styles.primary} href={courseUrl} prefetch={false}>{t.start}<ArrowRight size={18} aria-hidden="true" /></Link>
          <Link className={styles.secondary} href={"/" + locale + "/courses/antistress"}>{t.learn}<ArrowRight size={18} aria-hidden="true" /></Link>
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

    <div id="my-courses"><PublicCourseCabinet locale={appLocale} /></div>

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
            <Link href={courseUrl} prefetch={false}>{t.cardAction}<ArrowRight size={18} aria-hidden="true" /></Link>
            <Link className={styles.programmeMore} href={"/" + locale + "/courses/antistress"}>{t.learn}<ArrowRight size={15} aria-hidden="true" /></Link>
          </article>;
        })}
      </div>
      <section className={styles.stressSkills} aria-labelledby="stress-seven-skills-title" data-opora-stress-seven-skills>
        <div className={styles.stressSkillsHeader}>
          <span className={styles.stressSkillsKicker}><Waves size={18} aria-hidden="true" />{t.stressSkills.kicker}</span>
          <h3 id="stress-seven-skills-title">{t.stressSkills.title}</h3>
          <p>{t.stressSkills.intro}</p>
        </div>
        <ol className={styles.stressSkillsList}>
          {t.stressSkills.skills.map((skill, index) => <li key={skill}>
            <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <strong>{skill}</strong>
            <small>{index + 1} + {index + 8} / 14</small>
          </li>)}
        </ol>
        <div className={styles.stressSkillsFoot}>
          <p>{t.stressSkills.safety}</p>
          <Link href={courseUrl} prefetch={false}>{t.stressSkills.cta}<ArrowRight size={17} aria-hidden="true" /></Link>
        </div>
      </section>

      <div className={styles.dailyPlanPreview} data-opora-14-day-public-plan>
        <Course14DayOverview locale={locale} programId="stress" compact />
      </div>
      <div className={styles.personal}>
        <span className={styles.personalIcon}><SlidersHorizontal size={27} aria-hidden="true" /></span>
        <div><h3>{t.personal}</h3><p>{t.personalDesc}</p></div>
        <span className={styles.programmeMeta} data-course-upcoming>{locale === "ru" ? "Скоро" : locale === "es" ? "Próximamente" : "Coming soon"}</span>
      </div>
    </section>

    <section className={styles.how} aria-labelledby="courses-how-title">
      <p className={styles.sectionKicker}>{t.eyebrowHow}</p>
      <h2 id="courses-how-title">{t.howTitle}</h2>
      <div className={styles.steps}>{t.steps.map((step, index) =>
        <div className={styles.step} key={step.title}>
          <span className={styles.stepNumber}>0{index + 1}</span>
          <div className={styles.stepCopy}><h3>{step.title}</h3><p>{step.description}</p></div>
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
