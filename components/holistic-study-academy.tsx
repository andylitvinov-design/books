import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, ChevronRight, GraduationCap, Leaf, Sparkles } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import type { LearningCatalogItem } from "@/components/holistic-support-learning-catalog";
import { HolisticStudyJourney } from "@/components/holistic-study-journey";
import { REIKI_FREE_COURSE_PATH } from "@/lib/academy/reiki-free-course";
import { findAcademyRecord } from "@/data/academy/catalog";
import styles from "./holistic-study-academy.module.css";

// Source-backed programs only. Their lessons, media and initiation requests
// remain in the existing Academy; this page is a curated entry, not a clone.
type Key = "yggdrasil" | "tantra" | "kundalini" | "greece" | "egypt" | "practitioner" | "magic" | "meditation";
type School = "reiki" | "mysteries" | "free";
const groups: { id: School; keys: Key[] }[] = [
 { id: "reiki", keys: ["yggdrasil", "tantra", "kundalini"] },
 { id: "mysteries", keys: ["greece", "egypt"] },
 { id: "free", keys: ["practitioner", "magic", "meditation"] },
];
const artwork: Record<Key,string> = {
 yggdrasil: "/academy/reiki-yggdrasil/source/basic-program.jpg",
 tantra: "/images/holistic-house/tantra-reiki-yin-yang-cover.svg",
 kundalini: "/academy/kundalini-reiki/kundalini-manual-level-2.jpg",
 greece: "/academy/reiki-yggdrasil/source/western-tradition.png",
 egypt: "/academy/reiki-yggdrasil/source/temple-studies.png",
 practitioner: "/images/holistic-house/reiki-approved-sunrise-v3.webp",
 magic: "/academy/reiki-yggdrasil/source/advanced-runes.png",
 meditation: "/images/holistic-house/course-start-heron.webp",
};
const copy = {
 "ru": {
  "title": "Учебные программы",
  "lead": "Три направления, восемь программ. Только обучение — без смешения с услугами и консультациями.",
  "groups": {
   "reiki": [
    "Школа Рейки",
    "3 программы",
    "Три самостоятельных системы с последовательными ступенями."
   ],
   "mysteries": [
    "Мистерии и инициации",
    "2 школы",
    "Греческая и египетская школы: мифы, архетипы и ритуалы."
   ],
   "free": [
    "Бесплатное обучение",
    "3 раздела",
    "Вводный курс, магия и оригинальные медитации."
   ]
  },
  "items": {
   "yggdrasil": [
    "Рейки Иггдрасиль — базовый курс",
    "I–V ступени",
    "Мировое Древо, пять базовых ступеней и подготовка к дальнейшим практикам."
   ],
   "tantra": [
    "Тантра Рейки",
    "9 ступеней",
    "Базовая, продвинутая и мастерская подготовка."
   ],
   "kundalini": [
    "Кундалини Рейки",
    "3 ступени",
    "Последовательные ступени I–III и оригинальные материалы."
   ],
   "greece": [
    "Греческие мистерии и инициации",
    "Греческая школа",
    "Дионис, Деметра и другие античные архетипы в историческом курсе."
   ],
   "egypt": [
    "Египетские мистерии и инициации",
    "Египетская школа",
    "Мифы, божества и символические практики древнеегипетских мистерий."
   ],
   "practitioner": [
    "Бесплатный курс «Практик Рейки»",
    "5 уроков · бесплатно",
    "Полёт к Солнцу, Тантра, Кундалини, Иггдрасиль и подготовка к инициации."
   ],
   "magic": [
    "Бесплатные курсы по магии",
    "Открытые материалы",
    "Магия стихий, руны и Таро в библиотеке Академии."
   ],
   "meditation": [
    "Бесплатные практики медитации",
    "Видео · RU / EN",
    "Авторские медитации, включая Полёт к Солнцу и практики Рейки."
   ]
  },
  "nav": "Направления",
  "open": "Открыть программу",
  "all": "Все материалы Академии",
  "notice": "Просмотр открытых материалов не означает получение инициации. Личные посвящения, условия набора и стоимость согласовываются отдельно. Часть исторических видео представлена только на русском."
 },
 "en": {
  "title": "Learning programs",
  "lead": "Three pathways, eight real learning options — not a mix of services and consultations.",
  "groups": {
   "reiki": [
    "Reiki School",
    "3 programs",
    "Three complete systems with progressive levels."
   ],
   "mysteries": [
    "Mysteries & Initiations",
    "2 schools",
    "Greek and Egyptian traditions, myths, archetypes and rituals."
   ],
   "free": [
    "Free learning",
    "3 options",
    "Introductory course, magic studies and original meditations."
   ]
  },
  "items": {
   "yggdrasil": [
    "Reiki Yggdrasil — Basic Course",
    "Levels I–V",
    "The World Tree, five foundation levels and preparation for further study."
   ],
   "tantra": [
    "Tantra Reiki",
    "9 levels",
    "Basic, advanced and master-level learning."
   ],
   "kundalini": [
    "Kundalini Reiki",
    "3 levels",
    "Progressive levels I–III and preserved original materials."
   ],
   "greece": [
    "Greek Mysteries & Initiations",
    "Greek school",
    "Dionysus, Demeter and other archetypes from the historical Academy course."
   ],
   "egypt": [
    "Egyptian Mysteries & Initiations",
    "Egyptian school",
    "Ancient Egyptian myth, deities and symbolic mystery practices."
   ],
   "practitioner": [
    "Free Reiki Practitioner Course",
    "5 lessons · free",
    "Sun Flight, Tantra, Kundalini, Yggdrasil and preparation for an initiation request."
   ],
   "magic": [
    "Free Magic Study Courses",
    "Open resources",
    "Elemental Magic, runes and Tarot from the Academy library."
   ],
   "meditation": [
    "Free Meditation Practices",
    "Video · RU / EN",
    "Original meditations including Flight to the Sun and Reiki practices."
   ]
  },
  "nav": "Learning pathways",
  "open": "Explore program",
  "all": "All Academy materials",
  "notice": "Open study material is not an initiation or enrollment. Personal initiations, availability and fees require separate confirmation. Some historical recordings are available only in Russian."
 },
 "es": {
  "title": "Programas de formación",
  "lead": "Tres caminos y ocho opciones reales de aprendizaje, sin mezclar consultas y servicios.",
  "groups": {
   "reiki": [
    "Escuela de Reiki",
    "3 programas",
    "Tres sistemas completos con niveles progresivos."
   ],
   "mysteries": [
    "Misterios e iniciaciones",
    "2 escuelas",
    "Tradiciones griegas y egipcias, mitos, arquetipos y rituales."
   ],
   "free": [
    "Aprendizaje gratuito",
    "3 opciones",
    "Curso introductorio, magia y meditaciones originales."
   ]
  },
  "items": {
   "yggdrasil": [
    "Reiki Yggdrasil — curso básico",
    "Niveles I–V",
    "Árbol del Mundo, cinco niveles básicos y prácticas posteriores."
   ],
   "tantra": [
    "Tantra Reiki",
    "9 niveles",
    "Formación básica, avanzada y maestra."
   ],
   "kundalini": [
    "Kundalini Reiki",
    "3 niveles",
    "Niveles I–III y materiales originales."
   ],
   "greece": [
    "Misterios e iniciaciones griegas",
    "Escuela griega",
    "Dioniso, Deméter y otros arquetipos del curso histórico."
   ],
   "egypt": [
    "Misterios e iniciaciones egipcias",
    "Escuela egipcia",
    "Mitos, deidades y prácticas simbólicas egipcias."
   ],
   "practitioner": [
    "Curso gratuito Practicante de Reiki",
    "5 lecciones · gratis",
    "Vuelo al Sol, Tantra, Kundalini, Yggdrasil y preparación para solicitar una iniciación."
   ],
   "magic": [
    "Cursos gratuitos de magia",
    "Recursos abiertos",
    "Magia elemental, runas y Tarot en la biblioteca de la Academia."
   ],
   "meditation": [
    "Prácticas gratuitas de meditación",
    "Vídeos · RU / EN",
    "Meditaciones originales, Vuelo al Sol y prácticas de Reiki."
   ]
  },
  "nav": "Caminos de formación",
  "open": "Explorar programa",
  "all": "Todos los materiales",
  "notice": "Los materiales abiertos no equivalen a una iniciación. La disponibilidad y las tarifas requieren confirmación personal. Algunos vídeos históricos solo están disponibles en ruso."
 }
} as const;
function courseHref(key: Key, locale: PublicLocale, learningItems: LearningCatalogItem[]) {
 if (key === "practitioner") return REIKI_FREE_COURSE_PATH.replace(/^\/en\//, "/" + locale + "/");
 if (key === "meditation") return "/" + locale + "/holistic-support/mobile?view=meditation";
 if (key === "greece" || key === "egypt") {
   const route = key === "greece" ? "mysteries/greece-rome/beauty-and-power" : "mysteries/egypt/high-wisdom";
   const source = findAcademyRecord(route, "ru");
   return "/" + locale + "/academy/" + (source?.routeKey ?? "mysteries");
 }
 const catalogId: Partial<Record<Key,string>> = {
   yggdrasil: "reiki-yggdrasil-full", tantra: "reiki-tantra-full",
   kundalini: "reiki-kundalini-full", magic: "archive-elements/elemental-magic",
 };
 const published = learningItems.find(item => item.id === catalogId[key]);
 if (published) return published.href;
 return "/" + locale + (key === "magic" ? "/academy/symbolic"
   : key === "tantra" ? "/academy/reiki/tantra-reiki"
   : key === "kundalini" ? "/academy/reiki/kundalini-reiki"
   : "/academy/reiki/yggdrasil");
}

/** The eight source-backed Academy offers are the only extra quiz recommendations.
 * Preserve canonical route ownership; don't manufacture enrollment or prices. */
function academyRecommendationItems(locale: PublicLocale, learningItems: LearningCatalogItem[]): LearningCatalogItem[] {
 const t = copy[locale];
 return groups.flatMap(group => group.keys.map((key): LearningCatalogItem => ({
  id: "academy-" + key,
  direction: group.id === "reiki" || key === "practitioner" ? "reiki"
    : key === "magic" ? "magic" : "temple",
  topic: key,
  title: t.items[key][0],
  description: t.items[key][2],
  href: courseHref(key, locale, learningItems),
  image: artwork[key],
  kind: key === "greece" || key === "egypt" ? "program"
    : key === "meditation" ? "video" : "course",
  cost: group.id === "free" ? "free" : "ask",
 })));
}

export function HolisticStudyAcademy({locale,learningItems}: {locale: PublicLocale;learningItems: LearningCatalogItem[]}) {
 const t = copy[locale];
 return <main className={styles.page} data-holistic-study-academy lang={locale}>
  <div className={styles.shell}>
   <div className={styles.mobileJourney} data-study-mobile-quiz>
    <HolisticStudyJourney locale={locale}
      learningItems={academyRecommendationItems(locale, learningItems)}
      defaultGoal="stress" headingLevel={1}/>
   </div>
   <header className={styles.top}>
    <Link href={"/" + locale} prefetch={false} className={styles.brand}>Holistic House</Link>
    <nav aria-label="Language" className={styles.languages}>
     {(["en","ru","es"] as const).map(language=><Link key={language}
       href={"/" + language + "/holistic-support/mobile"} prefetch={false}
       aria-current={locale === language ? "page" : undefined}>{language.toUpperCase()}</Link>)}
    </nav>
   </header>
   <section className={styles.hero} aria-labelledby="study-hero-title">
    <Image src="/images/holistic-house/reiki-approved-sunrise-v3.webp" alt="" fill priority
      sizes="(max-width:760px) 100vw,860px" className={styles.heroPhoto}/>
    <div className={styles.heroShade} aria-hidden="true"/>
    <div className={styles.heroCopy}>
     <span className={styles.eyebrow}><GraduationCap size={17} aria-hidden="true"/>HOLISTIC HOUSE · ACADEMY</span>
     <h1 id="study-hero-title">{t.title}</h1><p>{t.lead}</p>
    </div>
   </section>
   <nav className={styles.quickNav} aria-label={t.nav}>
    {groups.map((group,index)=><a href={"#study-"+group.id} key={group.id}
      className={styles.quickLink} data-study-school-nav={group.id}>
      <small>0{index+1}</small><strong>{t.groups[group.id][0]}</strong>
      <ChevronRight size={16} aria-hidden="true"/>
    </a>)}
   </nav>
   {groups.map((group,index)=>{
    const Icon = group.id === "reiki" ? Leaf : group.id === "mysteries" ? Sparkles : BookOpen;
    return <section id={"study-"+group.id} key={group.id} className={styles.group}
      data-study-academy-group={group.id} aria-labelledby={"study-title-"+group.id}>
     <header className={styles.groupHeader}>
      <span className={styles.groupIcon} data-tone={group.id}><Icon size={25} aria-hidden="true"/></span>
      <span className={styles.heading}>
       <small>0{index+1} · {t.groups[group.id][1]}</small>
       <h2 id={"study-title-"+group.id}>{t.groups[group.id][0]}</h2>
       <p>{t.groups[group.id][2]}</p>
      </span>
     </header>
     <div className={styles.courseList}>
      {group.keys.map(key=><Link key={key} href={courseHref(key,locale,learningItems)}
        prefetch={false} className={styles.course} data-study-academy-course={key}>
       <span className={styles.photo}><Image src={artwork[key]} alt="" fill
         sizes="(max-width:640px) 30vw,140px"/></span>
       <span className={styles.courseCopy}>
        <span className={styles.tag}>{t.items[key][1]}</span>
        <strong>{t.items[key][0]}</strong>
        <span className={styles.description}>{t.items[key][2]}</span>
        <span className={styles.action}>{t.open}<ArrowRight size={16} aria-hidden="true"/></span>
       </span>
       <ChevronRight size={19} className={styles.chevron} aria-hidden="true"/>
      </Link>)}
     </div>
    </section>;
   })}
   <footer className={styles.footer}>
    <p>{t.notice}</p>
    <Link href={"/"+locale+"/academy"} prefetch={false}>{t.all}<ArrowRight size={18} aria-hidden="true"/></Link>
   </footer>
  </div>
 </main>;
}
