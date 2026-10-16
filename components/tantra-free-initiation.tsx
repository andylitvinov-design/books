import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, BookOpen, Heart, PlayCircle, Sparkles, Sun, Check, Feather, ShieldCheck } from "lucide-react";
import { AcademyVideoPlayer } from "@/components/academy-video-player";
import { PublicSiteHeader } from "@/components/public-site-header";
import { TantraInitiationForm } from "@/components/tantra-initiation-form";
import { englishGuidedMeditations } from "@/data/academy/english-guided-meditations";
import { formatReikiLevelPrice } from "@/lib/academy/reiki-level-pricing";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./tantra-free-initiation.module.css";

/**
 * Dedicated entry to the original Tantra Reiki programme.
 * This page uses the owner's seven approved study questions, preserves the
 * existing teacher-led enquiry flow and embeds the already verified recording.
 * It does NOT automatically award attunements or publish a new video.
 */
const copy = {
  en: {
    back: "Back to Tantra Reiki", nav: ["Discover", "Choose", "Questions", "Video", "Materials", "Apply"],
    eyebrow: "HOLISTIC HOUSE ACADEMY · TANTRA REIKI · LEVEL ONE",
    heroTitle: "Feel the flow. Awaken connection.",
    heroLead: "An invitation to explore Tantra Reiki through presence, sensitivity and the symbolic language of love and creativity. Begin with the Spring of Life — the first step of a nine-level path.",
    heroTag: "Your first initiation begins here",
    freeCta: "Explore the free initiation", watchCta: "Watch Andrey's practice",
    heroMeta: ["Level 1 · Spring of Life", "Seven simple study questions", "Teacher-guided initiation"],
    visualCaption: "The art of connection", visualLabel: "TANTRA REIKI · HOLISTIC HOUSE",
    introEyebrow: "01 / THE SYSTEM", introTitle: "More than an energy technique",
    introLead: "In the course's spiritual language, the Tantra Reiki flow brings together aliveness, creativity and a more attentive relationship with yourself and others. It is a practice of exploration, not a promise of outcomes.",
    pillars: [
      { title: "Feel", text: "Explore your own sensations, attention and vitality through guided practice." },
      { title: "Connect", text: "Approach relationships and shared practice with openness, choice and consent." },
      { title: "Grow", text: "Follow nine levels that deepen the original stream through different forms of study." },
    ],
    choiceEyebrow: "02 / START YOUR JOURNEY", choiceTitle: "Two ways to receive Level 1",
    choiceLead: "Choose the introductory gift or a personal session with Andrey. Both begin with the same first level; the difference is the format and the amount of individual guidance.",
    freeFlag: "FREE INTRODUCTORY OFFER", freeTitle: "Your first step, free",
    freeText: "Read the materials, prepare short answers to the seven questions and ask about a teacher-guided introductory Level 1 initiation.",
    freePrice: "€0", freeButton: "Request free Level 1",
    personalFlag: "ONE-TO-ONE WITH ANDREY", personalTitle: "Personal initiation",
    personalText: "A dedicated individual session to learn the first-level themes, discuss your questions and arrange the initiation directly with Andrey.",
    personalButton: "Request a personal session",
    availability: "Sessions and free introductory availability are confirmed personally. Reading or submitting answers does not itself grant an initiation.",
    questionsEyebrow: "03 / PREPARE", questionsTitle: "Seven questions before your initiation",
    questionsLead: "Read Andrey's original Tantra Reiki materials and answer in your own words. One to three sentences per question is enough.",
    questions: [
      "Who created the Tantra Reiki system, and what is the source of its energy?",
      "What is the main purpose of the Tantra Reiki flow? Why is it needed, and what does it offer a person?",
      "For what purposes can Tantra Reiki be used?",
      "Which culture and tradition form the foundation of Tantra Reiki?",
      "How are Levels 1–3, 4–6 and 7–9 connected?",
      "At which levels do students learn to create mandalas and work with artifacts?",
      "After which level can someone become a Tantra Reiki Master and teach and initiate others?",
    ],
    questionAction: "Share your seven answers", questionNote: "These are study questions, not a medical or psychological assessment.",
    videoEyebrow: "04 / SEE THE PRACTICE", videoTitle: "Tantra Reiki, guided by Andrey",
    videoLead: "Watch Andrey's original Tantra Reiki Practice recording. This is the same recording already linked to the course, not an AI-generated or substitute video.",
    videoCaption: "Original recording · English · click to play", videoNote: "The video is an introduction to practice, not an automatic initiation.",
    resourcesEyebrow: "05 / EXPLORE", resourcesTitle: "Everything for your first step",
    resourcesLead: "The original texts, the nine-level course and the mobile PDF guide are all available here.",
    resources: [
      { title: "Read the 9-level programme", subtitle: "Explore the first level and the complete structure" },
      { title: "Original author research", subtitle: "The deeper meaning of the nine stages" },
      { title: "Full teaching programme", subtitle: "Attunements, mandalas, artifacts and practice" },
      { title: "Download the Tantra Reiki PDF", subtitle: "Course overview and first-level study guide" },
    ],
    formEyebrow: "06 / YOUR NEXT STEP", formTitle: "Ready to begin?",
    formLead: "Choose a free introduction, a personal Level 1 session, a PDF download, or send your seven answers. Just one simple form.",
    disclaimer: "Tantra Reiki is presented here as a spiritual and reflective tradition. Its descriptions of energies or effects are not established medical facts. It does not replace healthcare or guarantee results.",
    footer: "Return to the full Tantra Reiki course",
  },
  ru: {
    back: "К курсу Тантра Рейки", nav: ["Система", "Выбор", "Вопросы", "Видео", "Материалы", "Заявка"],
    eyebrow: "HOLISTIC HOUSE ACADEMY · ТАНТРА РЕЙКИ · 1-Я СТУПЕНЬ",
    heroTitle: "Почувствуйте поток. Откройте близость.",
    heroLead: "Знакомство с Тантра Рейки через присутствие, чувствительность, любовь и творчество. Начните с «Родника Жизни» — первой ступени девятиступенчатой системы.",
    heroTag: "Ваша первая инициация начинается здесь",
    freeCta: "Получить первую ступень бесплатно", watchCta: "Смотреть практику Андрея",
    heroMeta: ["1-я ступень · Родник Жизни", "7 простых вопросов", "Инициация с преподавателем"],
    visualCaption: "Искусство соединения", visualLabel: "ТАНТРА РЕЙКИ · HOLISTIC HOUSE",
    introEyebrow: "01 / О СИСТЕМЕ", introTitle: "Больше, чем энергетическая практика",
    introLead: "В авторском описании поток Тантра Рейки объединяет жизненную силу, любовь и творчество. Практика помогает исследовать контакт с собой и другими людьми — без обещаний гарантированного результата.",
    pillars: [
      { title: "Чувствовать", text: "Исследовать ощущения, внимание и жизненную энергию в практике." },
      { title: "Соединяться", text: "Учиться контакту с собой и другими с уважением к выбору и границам." },
      { title: "Развиваться", text: "Последовательно изучать один поток через девять ступеней системы." },
    ],
    choiceEyebrow: "02 / НАЧАЛО ПУТИ", choiceTitle: "Два варианта первой ступени",
    choiceLead: "Выберите бесплатную вводную инициацию или индивидуальное занятие с Андреем. Оба варианта знакомят с первой ступенью, но различаются форматом сопровождения.",
    freeFlag: "БЕСПЛАТНОЕ ЗНАКОМСТВО", freeTitle: "Первая ступень в подарок",
    freeText: "Изучите материалы, подготовьте ответы на семь вопросов и запросите бесплатную вводную инициацию с преподавателем.",
    freePrice: "0 €", freeButton: "Запросить бесплатную инициацию",
    personalFlag: "ЛИЧНО С АНДРЕЕМ", personalTitle: "Личная инициация",
    personalText: "Индивидуальное занятие, чтобы познакомиться с темами первой ступени, задать вопросы и пройти инициацию с Андреем.",
    personalButton: "Записаться на личную инициацию",
    availability: "Возможность бесплатной встречи, даты и формат подтверждает Андрей. Чтение материалов и ответы на вопросы сами по себе не являются инициацией.",
    questionsEyebrow: "03 / ПОДГОТОВКА", questionsTitle: "7 вопросов перед инициацией",
    questionsLead: "Прочитайте авторские материалы о Тантра Рейки и ответьте своими словами. Достаточно 1–3 предложений на каждый вопрос.",
    questions: [
      "Кто является создателем системы Тантра Рейки и каков источник её энергии?",
      "Какова главная цель потока Тантра Рейки? Для чего он нужен и что даёт человеку?",
      "Для каких целей можно использовать систему Тантра Рейки?",
      "Какая культура и традиция лежат в основе системы Тантра Рейки?",
      "Как связаны между собой ступени 1–3, 4–6 и 7–9?",
      "На каких ступенях Тантра Рейки мы учимся создавать мандалы и работать с артефактами?",
      "После какой ступени человек становится Мастером Тантра Рейки и получает право обучать и инициировать других?",
    ],
    questionAction: "Отправить семь ответов", questionNote: "Это вопросы по учебному материалу, а не медицинский или психологический тест.",
    videoEyebrow: "04 / ВИДЕО", videoTitle: "Практика Тантра Рейки с Андреем",
    videoLead: "Посмотрите оригинальную запись «Tantra Reiki Practice», которую Андрей разместил в материалах основного курса. Это его собственное видео, не новый ИИ-ролик.",
    videoCaption: "Оригинальное видео · на английском · запуск по нажатию", videoNote: "Видео знакомит с практикой, но не заменяет личную инициацию.",
    resourcesEyebrow: "05 / МАТЕРИАЛЫ", resourcesTitle: "Всё для знакомства с системой",
    resourcesLead: "Авторские тексты, описание девяти ступеней и PDF-методичка доступны на сайте.",
    resources: [
      { title: "Все 9 ступеней Тантра Рейки", subtitle: "Первая ступень и структура всей системы" },
      { title: "Полное авторское исследование", subtitle: "Смысл и связь девяти ступеней" },
      { title: "Полная программа обучения", subtitle: "Настройки, мандалы, артефакты и практика" },
      { title: "Скачать PDF по Тантра Рейки", subtitle: "Описание системы и материалы первой ступени" },
    ],
    formEyebrow: "06 / ЗАЯВКА", formTitle: "Готовы начать?",
    formLead: "Выберите бесплатную инициацию, личное занятие, скачайте PDF или отправьте семь ответов. Всё в одной форме.",
    disclaimer: "Тантра Рейки здесь представлена как духовная и созерцательная традиция. Описания потоков и эффектов относятся к учению, не являются доказанными медицинскими фактами и не заменяют медицинскую помощь.",
    footer: "Вернуться к полной программе Тантра Рейки",
  },
  es: {
    back: "Volver a Tantra Reiki", nav: ["Sistema", "Opciones", "Preguntas", "Vídeo", "Materiales", "Solicitud"],
    eyebrow: "HOLISTIC HOUSE ACADEMY · TANTRA REIKI · NIVEL UNO",
    heroTitle: "Siente el flujo. Descubre la conexión.",
    heroLead: "Conoce Tantra Reiki a través de la presencia, la sensibilidad, el amor y la creatividad. Comienza con Manantial de Vida, el primero de nueve niveles.",
    heroTag: "Tu primera iniciación comienza aquí",
    freeCta: "Solicitar la iniciación gratis", watchCta: "Ver la práctica de Andrey",
    heroMeta: ["Nivel 1 · Manantial de vida", "7 preguntas sencillas", "Iniciación con profesor"],
    visualCaption: "El arte de conectar", visualLabel: "TANTRA REIKI · HOLISTIC HOUSE",
    introEyebrow: "01 / EL SISTEMA", introTitle: "Más que una práctica energética",
    introLead: "En el lenguaje espiritual del curso, Tantra Reiki reúne vitalidad, amor y creatividad. Es una invitación a explorar la conexión contigo y con los demás, sin promesas de resultados.",
    pillars: [
      { title: "Sentir", text: "Explorar las sensaciones, la atención y la vitalidad." },
      { title: "Conectar", text: "Cultivar una relación consciente basada en la elección y el consentimiento." },
      { title: "Crecer", text: "Conocer los nueve niveles que profundizan el mismo flujo." },
    ],
    choiceEyebrow: "02 / TU COMIENZO", choiceTitle: "Dos maneras de empezar",
    choiceLead: "Elige la introducción gratuita o una sesión personal con Andrey. Las dos comienzan con el primer nivel.",
    freeFlag: "INTRODUCCIÓN GRATUITA", freeTitle: "Tu primer nivel, gratis",
    freeText: "Lee los materiales, prepara respuestas breves a siete preguntas y solicita una iniciación introductoria guiada.",
    freePrice: "0 €", freeButton: "Solicitar el Nivel 1 gratis",
    personalFlag: "EN PERSONA CON ANDREY", personalTitle: "Iniciación personal",
    personalText: "Una sesión individual para conocer los temas del primer nivel, resolver dudas y acordar la iniciación con Andrey.",
    personalButton: "Solicitar sesión personal",
    availability: "La disponibilidad y la fecha se confirman personalmente. Leer o enviar respuestas no constituye una iniciación.",
    questionsEyebrow: "03 / PREPARACIÓN", questionsTitle: "7 preguntas antes de tu iniciación",
    questionsLead: "Lee los materiales originales de Andrey. Responde con tus palabras; bastan de 1 a 3 frases por pregunta.",
    questions: [
      "¿Quién creó el sistema Tantra Reiki y cuál es el origen de su energía?",
      "¿Cuál es el objetivo principal del flujo Tantra Reiki? ¿Para qué sirve y qué aporta?",
      "¿Para qué fines puede utilizarse Tantra Reiki?",
      "¿Qué cultura y tradición sustentan el sistema Tantra Reiki?",
      "¿Cómo se relacionan los niveles 1–3, 4–6 y 7–9?",
      "¿En qué niveles se aprende a crear mandalas y trabajar con artefactos?",
      "¿Después de qué nivel se puede ser Maestro de Tantra Reiki e iniciar y enseñar a otros?",
    ],
    questionAction: "Enviar mis siete respuestas", questionNote: "Preguntas de estudio, no una evaluación médica.",
    videoEyebrow: "04 / VÍDEO", videoTitle: "Tantra Reiki con Andrey",
    videoLead: "Mira la grabación original Tantra Reiki Practice incluida en los materiales del curso.",
    videoCaption: "Grabación original · inglés · pulsa para reproducir", videoNote: "El vídeo es una introducción, no una iniciación automática.",
    resourcesEyebrow: "05 / MATERIALES", resourcesTitle: "Materiales para comenzar",
    resourcesLead: "Lee los textos originales, explora los nueve niveles y descarga la guía PDF.",
    resources: [
      { title: "Programa de nueve niveles", subtitle: "Primer nivel y estructura completa" },
      { title: "Investigación original de Andrey", subtitle: "El significado de las nueve etapas" },
      { title: "Programa de formación completo", subtitle: "Sintonizaciones, mandalas, artefactos y prácticas" },
      { title: "Descarga la guía PDF", subtitle: "Descripción del sistema y primer nivel" },
    ],
    formEyebrow: "06 / SOLICITUD", formTitle: "¿Listo para comenzar?",
    formLead: "Solicita la introducción gratuita, una sesión personal, descarga el PDF o envía tus siete respuestas.",
    disclaimer: "Tantra Reiki se presenta como tradición espiritual y reflexiva. Las afirmaciones sobre energía no son hechos médicos demostrados ni sustituyen la atención sanitaria.",
    footer: "Volver al curso completo Tantra Reiki",
  },
} as const;

const steps = ["intro", "initiation-choices", "study-questions", "tantra-practice-video", "course-materials", "tantra-apply"] as const;

export function TantraFreeInitiation({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const root = "/" + locale + "/academy/reiki/tantra-reiki";
  const video = englishGuidedMeditations.find((item) => item.key === "tantra-reiki");
  const links = [
    root + "#tantra-levels",
    root + "#tantra-original-author-research",
    root + "#tantra-original-master-programme",
    "/api/academy/reiki-guide?course=tantra&locale=" + locale,
  ];
  return (
    <main className={"academy-reading-shell academy-reading-shell--wide " + styles.shell} lang={locale}>
      <PublicSiteHeader locale={locale} showAssessmentStrip={false} />
      <article className={styles.page}>
        <nav className={styles.subnav} aria-label={t.heroTag}>
          <Link className={styles.back} href={root}><ArrowRight className={styles.backArrow} size={15} aria-hidden="true" />{t.back}</Link>
          <div className={styles.progress}>
            {steps.map((id, index) => <a href={"#" + id} key={id} title={t.nav[index]} aria-label={t.nav[index]}>{String(index + 1).padStart(2, "0")}</a>)}
          </div>
        </nav>

        <section id="intro" className={styles.hero} aria-labelledby="tantra-landing-title">
          <div className={styles.heroCopy}>
            <div className={styles.heroChip}><Sparkles size={15} aria-hidden="true" />{t.heroTag}</div>
            <p className={styles.eyebrow}>{t.eyebrow}</p>
            <h1 id="tantra-landing-title">{t.heroTitle}</h1>
            <p className={styles.heroLead}>{t.heroLead}</p>
            <div className={styles.heroActions}>
              <a href="#initiation-choices" className={styles.buttonLight}>{t.freeCta}<ArrowRight aria-hidden="true" size={18}/></a>
              <a href="#tantra-practice-video" className={styles.buttonGhost}><PlayCircle size={18} aria-hidden="true"/>{t.watchCta}</a>
            </div>
            <div className={styles.heroStats}>{t.heroMeta.map((item) => <span key={item}><Check size={14} aria-hidden="true"/>{item}</span>)}</div>
          </div>
          <div className={styles.heroArt}>
            <div className={styles.orbitOuter} aria-hidden="true" />
            <div className={styles.orbitInner} aria-hidden="true" />
            <div className={styles.portraitFrame}>
              <Image src="/images/holistic-house/andy-about.png" alt={locale === "ru" ? "Андрей, преподаватель Тантра Рейки" : locale === "es" ? "Andrey, profesor de Tantra Reiki" : "Andrey, Tantra Reiki teacher"} fill sizes="(max-width: 760px) 74vw, 36vw" priority className={styles.portrait} />
            </div>
            <div className={styles.artStamp}><Sun size={20} aria-hidden="true"/><span>{t.visualLabel}</span></div>
            <div className={styles.artLabel}>{t.visualCaption}<span aria-hidden="true">✦</span></div>
          </div>
        </section>

        <section className={styles.introduction} aria-labelledby="tantra-about-intro">
          <div className={styles.introHeading}><p className={styles.eyebrow}>{t.introEyebrow}</p><h2 id="tantra-about-intro">{t.introTitle}</h2><p>{t.introLead}</p></div>
          <div className={styles.pillars}>
            {t.pillars.map((item, index) => {
              const Icon = [Feather, Heart, Sparkles][index];
              return <div className={styles.pillar} key={item.title}><span className={styles.pillarIcon}><Icon size={22} aria-hidden="true"/></span><h3>{item.title}</h3><p>{item.text}</p></div>;
            })}
          </div>
        </section>

        <section id="initiation-choices" className={styles.section} aria-labelledby="tantra-choices-title">
          <header className={styles.sectionHeading}><p className={styles.eyebrow}>{t.choiceEyebrow}</p><h2 id="tantra-choices-title">{t.choiceTitle}</h2><p>{t.choiceLead}</p></header>
          <div className={styles.choiceGrid}>
            <div className={styles.choiceFree}>
              <span className={styles.offerFlag}><Sparkles size={14} aria-hidden="true"/>{t.freeFlag}</span>
              <h3>{t.freeTitle}</h3><p>{t.freeText}</p>
              <div className={styles.offerBottom}><strong>{t.freePrice}</strong><a className={styles.buttonWine} href="#apply-free">{t.freeButton}<ArrowRight size={17} aria-hidden="true"/></a></div>
            </div>
            <div className={styles.choicePersonal}>
              <span className={styles.offerFlag}><Heart size={14} aria-hidden="true"/>{t.personalFlag}</span>
              <h3>{t.personalTitle}</h3><p>{t.personalText}</p>
              <div className={styles.offerBottom}><strong>{formatReikiLevelPrice("tantra", locale)}</strong><a className={styles.buttonNavy} href="#apply-personal">{t.personalButton}<ArrowRight size={17} aria-hidden="true"/></a></div>
            </div>
          </div>
          <p className={styles.availability}><ShieldCheck size={17} aria-hidden="true"/>{t.availability}</p>
        </section>

        <section id="study-questions" className={styles.questionsSection} aria-labelledby="tantra-questions-title">
          <header className={styles.sectionHeading}><p className={styles.eyebrow}>{t.questionsEyebrow}</p><h2 id="tantra-questions-title">{t.questionsTitle}</h2><p>{t.questionsLead}</p></header>
          <ol className={styles.questionGrid}>
            {t.questions.map((q, index) => <li key={index}><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><p>{q}</p></li>)}
          </ol>
          <div className={styles.questionFooter}><span>{t.questionNote}</span><a href="#apply-answers" className={styles.buttonWine}>{t.questionAction}<ArrowRight size={17} aria-hidden="true"/></a></div>
        </section>

        <section id="tantra-practice-video" className={styles.section} aria-labelledby="tantra-video-title">
          <header className={styles.sectionHeading}><p className={styles.eyebrow}>{t.videoEyebrow}</p><h2 id="tantra-video-title">{t.videoTitle}</h2><p>{t.videoLead}</p></header>
          <div className={styles.videoLayout}>
            <div className={styles.videoCanvas}>{video?.youtubeId ? <AcademyVideoPlayer youtubeId={video.youtubeId} title={video.title} /> : null}</div>
            <div className={styles.videoAside}><div className={styles.videoAsideIcon}><PlayCircle size={28} aria-hidden="true"/></div><p>{t.videoCaption}</p><strong>{video?.title ?? "Tantra Reiki Practice"}</strong><small>{t.videoNote}</small></div>
          </div>
        </section>

        <section id="course-materials" className={styles.resourcesSection} aria-labelledby="tantra-materials-title">
          <header className={styles.sectionHeading}><p className={styles.eyebrow}>{t.resourcesEyebrow}</p><h2 id="tantra-materials-title">{t.resourcesTitle}</h2><p>{t.resourcesLead}</p></header>
          <div className={styles.resourceGrid}>
            {t.resources.map((item, index) => {
              const href = links[index];
              const Icon = index === 3 ? ArrowDown : BookOpen;
              return <Link key={item.title} href={href} className={styles.resourceLink}>
                <span className={styles.resourceNumber}>{String(index + 1).padStart(2, "0")}</span>
                <span className={styles.resourceText}><strong>{item.title}</strong><small>{item.subtitle}</small></span>
                <span className={styles.resourceIcon}><Icon size={19} aria-hidden="true"/></span>
              </Link>;
            })}
          </div>
        </section>

        <section id="tantra-apply" className={styles.application} aria-labelledby="tantra-apply-title">
          <div className={styles.applicationHeading}><p className={styles.eyebrow}>{t.formEyebrow}</p><h2 id="tantra-apply-title">{t.formTitle}</h2><p>{t.formLead}</p></div>
          <TantraInitiationForm locale={locale} />
          <p className={styles.disclaimer}>{t.disclaimer}</p>
        </section>
        <footer className={styles.pageFooter}><Link href={root}>← {t.footer}</Link></footer>
      </article>
    </main>
  );
}
