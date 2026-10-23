import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, LockKeyhole, BookOpenText, ChevronRight } from "lucide-react";
import { PublicSiteHeader } from "@/components/public-site-header";
import { traditionBySlug } from "@/lib/personal-coaching/traditions";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./academy-tradition-coaching-landing.module.css";

type TraditionSlug = "egyptian" | "greek";
type Dictionary = Record<PublicLocale, string>;
type StageCopy = Record<PublicLocale, readonly string[]>;

const steps: Record<TraditionSlug, StageCopy> = {
  egyptian: {
    en: ["Ka · What I want", "Ba · My goal image", "Ib · Values", "Sah · Contribution", "Khaibit · Experience and action", "Hu · Unique strengths", "Ren · Who I become", "Sekhem · Resources"],
    ru: ["Ка · Чего я хочу", "Ба · Образ цели", "Иб · Ценности", "Сах · Смысл и вклад", "Хайбит · Опыт и действие", "Ху · Моя уникальность", "Рен · Каким я становлюсь", "Секхем · Ресурсы"],
    es: ["Ka · Lo que deseo", "Ba · Imagen de mi meta", "Ib · Valores", "Sah · Contribución", "Khaibit · Experiencia y acción", "Hu · Fortalezas", "Ren · En quién me convierto", "Sekhem · Recursos"]
  },
  greek: {
    en: ["Epithymia · Desire", "Thymos · Courage", "Logos · Order", "Nous · Meaning", "Eidos · Ideal image", "Idea · Main intention", "Daimon · Identity", "Telos · Fullness"],
    ru: ["Эпитемия · Желание", "Тюмос · Воля", "Логос · Порядок", "Ноос · Смысл", "Эйдос · Идеальный образ", "Идея · Замысел", "Даймон · Идентичность", "Телос · Полнота"],
    es: ["Epithymía · Deseo", "Thymós · Coraje", "Logos · Orden", "Noûs · Sentido", "Eidos · Forma ideal", "Idea · Intención", "Daimon · Identidad", "Telos · Plenitud"]
  }
};
const copy = {
  en: {
    back:"All courses",label:"FREE · SELF-GUIDED COACHING",take:"Start my course",private:"Private in My Courses",
    lead:"One question on each screen. Choose an answer or add your own words, and keep your progress in your private account.",
    title:"Explore your goal, one question at a time", stages:"The eight original levels",
    steps:"How the course works",intro:"Choose one goal",reflect:"Answer one short question at a time",finish:"Save your goal map and next step",
    own:"Optional text or dictation",privacy:"Only you see the saved answers. Nothing is automatically sent to a coach or messenger.",
    note:"The ancient names form an author's symbolic planning framework, not an ancient standardized technique, a clinical assessment, or a guarantee of results.",
    next:"Ready to begin?",nextHelp:"Google sign-in is needed to keep your answers private and resume later.",
    offer:"Work at your own pace",progress:"Saved progress",backTo:"Back to Academy"
  },
  ru: {
    back:"Все курсы",label:"БЕСПЛАТНО · САМОСТОЯТЕЛЬНЫЙ КОУЧИНГ",take:"Начать курс",private:"Личное сохранение в Моих курсах",
    lead:"Один вопрос на каждом экране. Выберите ответ или добавьте свои слова. Прогресс сохранится в личном кабинете.",
    title:"Исследуйте цель, один вопрос за другим",stages:"Восемь авторских уровней",
    steps:"Как проходит курс",intro:"Выберите одну цель",reflect:"Ответьте на один короткий вопрос",finish:"Сохраните карту цели и ближайший шаг",
    own:"Необязательный текст или диктовка",privacy:"Ответы доступны только вам. Мастеру и в мессенджеры они автоматически не отправляются.",
    note:"Античные названия здесь использованы в авторской символической модели планирования. Это не стандартизированная древняя практика, не клинический тест и не гарантия результата.",
    next:"Готовы начать?",nextHelp:"Для приватного сохранения и продолжения потребуется вход через Google.",
    offer:"В своём темпе",progress:"Сохранение прогресса",backTo:"Вернуться в Академию"
  },
  es: {
    back:"Todos los cursos",label:"GRATIS · COACHING AUTOGUIADO",take:"Empezar mi curso",private:"Guardado privado en Mis cursos",
    lead:"Una pregunta por pantalla. Elige una respuesta o escribe en tus palabras; guarda el progreso en tu cuenta privada.",
    title:"Explora tu meta, pregunta a pregunta",stages:"Ocho niveles originales",
    steps:"Cómo funciona",intro:"Elige un objetivo",reflect:"Responde una pregunta breve cada vez",finish:"Guarda tu mapa de metas y el siguiente paso",
    own:"Texto o dictado opcionales",privacy:"Solo tú puedes leer tus respuestas. No se envían automáticamente al coach ni a mensajería.",
    note:"Los nombres antiguos forman parte de un modelo simbólico de autor. No es un método antiguo estandarizado, una prueba clínica ni una garantía.",
    next:"¿Listo para empezar?",nextHelp:"Inicia sesión con Google para guardar y continuar de forma privada.",
    offer:"A tu ritmo",progress:"Progreso guardado",backTo:"Volver a la Academia"
  }
} as const;
const courseHref=(locale:PublicLocale,slug:TraditionSlug)=>
  "/"+(locale==="es"?"en":locale)+"/app/coaching/"+slug+(locale==="es"?"?lang=es":"");

export function AcademyTraditionCoachingLanding({locale,slug}:{locale:PublicLocale;slug:TraditionSlug}){
  const course=traditionBySlug(slug);
  const t=copy[locale];
  if(!course)return null;
  return <>
    <PublicSiteHeader locale={locale} showAssessmentStrip={false}/>
    <main className={styles.root} data-coaching-course-landing={slug} lang={locale}>
      <nav className={styles.breadcrumb} aria-label={t.back}>
        <Link href={"/"+locale+"/academy"}><ArrowLeft size={16}/>{t.back}</Link>
      </nav>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <span className={styles.overline}>{t.label}</span>
          <h1>{course.name[locale]}</h1>
          <p className={styles.lead}>{course.description[locale]}</p>
          <p className={styles.explainer}>{t.lead}</p>
          <div className={styles.features}>
            <span><BookOpenText size={17}/>{course.totalScreens} {locale==="ru"?"экранов":locale==="es"?"pantallas":"screens"}</span>
            <span><Check size={17}/>{t.offer}</span>
            <span><LockKeyhole size={16}/>{t.private}</span>
          </div>
          <Link href={courseHref(locale,slug)} className={styles.primary} prefetch={false}>{t.take}<ArrowRight size={19}/></Link>
        </div>
        <div className={styles.visual}>
          <img src={course.art} alt="" width={850} height={620} loading="eager" decoding="async"/>
        </div>
      </section>
      <section className={styles.stages} aria-labelledby="coaching-stages">
        <div className={styles.sectionIntro}><span className={styles.overline}>HOLISTIC HOUSE · COACHING</span><h2 id="coaching-stages">{t.stages}</h2></div>
        <div className={styles.stageGrid}>
          {steps[slug][locale].map((text,index)=><div key={index} className={styles.stage}>
            <span className={styles.number}>{String(index+1).padStart(2,"0")}</span>
            <span>{text}</span>
          </div>)}
        </div>
      </section>
      <section className={styles.how} aria-labelledby="coaching-how">
        <div className={styles.sectionIntro}><h2 id="coaching-how">{t.steps}</h2></div>
        <div className={styles.howGrid}>
          {[t.intro,t.reflect,t.finish].map((title,index)=><div key={title} className={styles.howCard}>
            <span className={styles.number}>{index+1}</span><strong>{title}</strong>{index===1&&<small>{t.own}</small>}
          </div>)}
        </div>
        <p className={styles.privacy}><LockKeyhole size={17}/>{t.privacy}</p>
        <p className={styles.disclaimer}>{t.note}</p>
      </section>
      <section className={styles.end}>
        <div><h2>{t.next}</h2><p>{t.nextHelp}</p></div>
        <Link href={courseHref(locale,slug)} prefetch={false} className={styles.primary}>{t.take}<ArrowRight size={19}/></Link>
      </section>
      <Link href={"/"+locale+"/academy"} className={styles.back}><ChevronRight size={15}/>{t.backTo}</Link>
    </main>
  </>;
}
