import { REIKI_FREE_COURSE_PATH } from "@/lib/academy/reiki-free-course";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, PlayCircle, BookOpen, Heart, Check, Sparkles } from "lucide-react";
import { PublicSiteHeader } from "@/components/public-site-header";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./page.module.css";

type Props = { params: Promise<{ locale: string }> };
export function generateStaticParams() { return [{locale:"en"},{locale:"ru"},{locale:"es"}]; }

const messages = {
  en: {
    back:"Tantra Reiki course", badge:"FREE INTRODUCTORY PRACTICE",
    eyebrow:"HOLISTIC HOUSE · REIKI LEARNING", title:"Discover", accent:"Tantra Reiki",
    lead:"A gentle journey into presence, warmth and inner awareness. Begin with Andrey's original guided meditation, at your own pace.",
    primary:"Start free practice", secondary:"How it works", note:"No payment or account is needed to watch the introductory practice.",
    art:"LIGHT · PRESENCE · CONNECTION",
    overline:"A SIMPLE WAY TO BEGIN", subtitle:"Experience the practice before choosing your next step.",
    intro:"Watch a real meditation, learn the basics and continue only if it feels right for you.",
    steps:[
      ["Explore the meditation","Enjoy Andrey's original guided practice available on the Level 1 page."],
      ["Learn with the free course","Discover the original Reiki Practitioner materials and interactive lessons."],
      ["Request personal guidance","A teacher-guided Level 1 introduction can be requested after study, subject to confirmation."]
    ],
    options:"CHOOSE YOUR NEXT STEP", optionsTitle:"Begin freely. Continue at your pace.",
    cards:[
      ["FIRST EXPERIENCE · FREE","Try Tantra Reiki","Watch the original meditation and explore the first-level study materials.","Watch free meditation"],
      ["FREE INTERACTIVE COURSE","Explore Reiki Practitioner","Follow the actual Reiki Yggdrasil, Tantra Reiki and Kundalini Reiki lessons.","Start free course"],
      ["BY REQUEST · PERSONAL GUIDANCE","Ask about initiation","Learn about the free request and optional private sessions; studying alone does not confer an initiation.","See initiation options"]
    ],
    caution:"Tantra Reiki is spiritual education and self-exploration, not medical treatment or a guaranteed result.",
    more:"More about Tantra Reiki",privacy:"Privacy"
  },
  ru: {
    back:"Курс Тантра Рейки",badge:"ПЕРВАЯ ПРАКТИКА БЕСПЛАТНО",
    eyebrow:"HOLISTIC HOUSE · ОБУЧЕНИЕ РЕЙКИ",title:"Открой для себя",accent:"Тантра Рейки",
    lead:"Бережный путь к присутствию, внутреннему теплу и осознанности. Начни с оригинальной медитации Андрея — в своём ритме.",
    primary:"Начать бесплатную практику",secondary:"Как это работает",note:"Вводную медитацию можно посмотреть без оплаты и регистрации.",
    art:"СВЕТ · ПРИСУТСТВИЕ · КОНТАКТ",
    overline:"ПРОСТОЙ ПЕРВЫЙ ШАГ",subtitle:"Сначала почувствуй практику, потом выбирай продолжение.",
    intro:"Попробуй медитацию, познакомься с системой и продолжай, если захочешь.",
    steps:[
      ["Попробуй медитацию","Оригинальная запись практики Андрея бесплатно доступна на странице первой ступени."],
      ["Пройди бесплатный курс","Познакомься с программой Reiki Practitioner и настоящими учебными материалами."],
      ["Запроси личную поддержку","После обучения можно обратиться за вводной инициацией первой ступени; возможность подтверждает Андрей."]
    ],
    options:"ВЫБЕРИ СЛЕДУЮЩИЙ ШАГ",optionsTitle:"Начни бесплатно. Продолжай в своём темпе.",
    cards:[
      ["ПЕРВОЕ ЗНАКОМСТВО · БЕСПЛАТНО","Попробовать Тантра Рейки","Сразу перейти к медитации и материалам первой ступени.","Смотреть медитацию"],
      ["БЕСПЛАТНЫЙ ИНТЕРАКТИВНЫЙ КУРС","Программа Reiki Practitioner","Уроки Рейки Иггдрасиль, Тантра Рейки и Кундалини Рейки.","Открыть бесплатный курс"],
      ["ЛИЧНАЯ ПОДДЕРЖКА · ПО ЗАПРОСУ","Инициация с Андреем","Узнай условия бесплатного запроса и личных занятий. Одна заявка ещё не означает инициацию.","Варианты инициации"]
    ],
    caution:"Тантра Рейки здесь — образовательная духовная практика, не медицинское лечение и не гарантия результата.",
    more:"Подробнее о Тантра Рейки",privacy:"Конфиденциальность"
  },
  es: {
    back:"Curso de Tantra Reiki",badge:"PRIMERA PRÁCTICA GRATIS",
    eyebrow:"HOLISTIC HOUSE · APRENDIZAJE REIKI",title:"Descubre",accent:"Tantra Reiki",
    lead:"Un camino amable hacia la presencia, la calidez y la atención interior. Empieza con la meditación original de Andrey, a tu ritmo.",
    primary:"Empezar práctica gratis",secondary:"Cómo funciona",note:"Puedes ver la meditación introductoria sin pagar ni crear una cuenta.",
    art:"LUZ · PRESENCIA · CONEXIÓN",
    overline:"UN PRIMER PASO SENCILLO",subtitle:"Prueba la práctica antes de decidir cómo continuar.",
    intro:"Descubre la meditación, aprende lo esencial y continúa solo si lo deseas.",
    steps:[
      ["Prueba la meditación","La práctica original guiada por Andrey está disponible gratis en la página de Nivel 1."],
      ["Explora el curso gratuito","Descubre las lecciones de Reiki Practitioner y sus materiales originales."],
      ["Solicita orientación personal","Después de estudiar puedes solicitar una introducción guiada de Nivel 1, según disponibilidad."]
    ],
    options:"ELIGE TU SIGUIENTE PASO",optionsTitle:"Empieza gratis. Continúa a tu ritmo.",
    cards:[
      ["PRIMERA EXPERIENCIA · GRATIS","Probar Tantra Reiki","Accede a la meditación original y los materiales de Nivel 1.","Ver meditación gratis"],
      ["CURSO INTERACTIVO GRATIS","Explorar Reiki Practitioner","Lecciones de Reiki Yggdrasil, Tantra Reiki y Kundalini Reiki.","Empezar curso gratis"],
      ["GUÍA PERSONAL · PREVIA SOLICITUD","Iniciación con Andrey","Consulta la solicitud gratuita y las sesiones privadas opcionales. Enviar la solicitud no concede una iniciación.","Ver opciones"]
    ],
    caution:"Tantra Reiki es educación espiritual y exploración personal, no tratamiento médico ni garantía de resultados.",
    more:"Más sobre Tantra Reiki",privacy:"Privacidad"
  }
} as const;

const metadataCopy: Record<PublicLocale,{title:string;description:string}> = {
  en:{title:"Discover Tantra Reiki — Free Guided Practice",description:"Discover Tantra Reiki with Andrey's free original guided meditation and an introduction to the Reiki learning path."},
  ru:{title:"Открой Тантра Рейки — бесплатная медитация",description:"Начни знакомство с Тантра Рейки: бесплатная практика Андрея, уроки Reiki Practitioner и возможности продолжения."},
  es:{title:"Descubre Tantra Reiki — Meditación gratuita",description:"Una práctica original gratuita con Andrey y una introducción al programa Reiki Practitioner."}
};
export async function generateMetadata({params}:Props):Promise<Metadata> {
  const {locale:raw}=await params;
  if(!isPublicLocale(raw))return {title:"Not found",robots:{index:false}};
  const path="/"+raw+"/academy/reiki/tantra-reiki/discover";
  const item=metadataCopy[raw];
  return {
    metadataBase:metadataBaseFor(),title:item.title+" — Holistic House",description:item.description,
    alternates:{canonical:path,languages:{en:"/en/academy/reiki/tantra-reiki/discover",ru:"/ru/academy/reiki/tantra-reiki/discover",es:"/es/academy/reiki/tantra-reiki/discover","x-default":"/en/academy/reiki/tantra-reiki/discover"}},
    openGraph:{type:"website",url:path,siteName:"Holistic House",title:item.title,description:item.description,images:[{url:"/images/holistic-house/reiki-approved-sunrise-v3.webp",alt:"Sunrise Reiki meditation"}]},
    twitter:{card:"summary_large_image",title:item.title,description:item.description,images:["/images/holistic-house/reiki-approved-sunrise-v3.webp"]}
  };
}
export default async function TantraReikiPromo({params}:Props){
  const {locale:raw}=await params;
  if(!isPublicLocale(raw))notFound();
  const locale=raw;
  const t=messages[locale];
  const course="/"+locale+"/academy/reiki/tantra-reiki";
  const video=course+"/free-initiation#tantra-practice-video";
  const freeCourse=REIKI_FREE_COURSE_PATH;
  const initiation=course+"/free-initiation#initiation-choices";
  const icons=[PlayCircle,BookOpen,Heart] as const;
  const links=[video,freeCourse,initiation];
  return (
    <main lang={locale} className={styles.page}>
      <PublicSiteHeader locale={locale} showAssessmentStrip={false}/>
      <div className={styles.shell}>
        <nav className={styles.breadcrumb} aria-label={t.back}><Link href={course}><ArrowRight className={styles.back} size={16} aria-hidden="true"/>{t.back}</Link><span aria-hidden="true">/</span>Holistic House</nav>
        <section className={styles.hero} aria-labelledby="tantra-promo-title">
          <div className={styles.imageWrap} aria-hidden="true">
            <Image src="/images/holistic-house/reiki-approved-sunrise-v3.webp" alt="" fill priority unoptimized sizes="(max-width:760px) 100vw, 46vw" className={styles.image}/>
            <span className={styles.halo}/>
            <span className={styles.yinYangMark}><Image src="/images/holistic-house/tantra-reiki-yin-yang-mark.svg" width={96} height={96} alt="" unoptimized/></span>
            <span className={styles.artCaption}>{t.art}</span>
          </div>
          <div className={styles.heroCopy}>
            <span className={styles.badge}><Sparkles size={15} aria-hidden="true"/>{t.badge}</span>
            <p className={styles.eyebrow}>{t.eyebrow}</p>
            <h1 id="tantra-promo-title">{t.title} <em>{t.accent}</em></h1>
            <p className={styles.lead}>{t.lead}</p>
            <div className={styles.actions}>
              <Link href={video} className={styles.primary}><PlayCircle size={20} aria-hidden="true"/>{t.primary}<ArrowRight size={17} aria-hidden="true"/></Link>
              <a href="#how-it-works" className={styles.secondary}>{t.secondary}<ArrowRight size={17} aria-hidden="true"/></a>
            </div>
            <p className={styles.note}><Check size={16} aria-hidden="true"/>{t.note}</p>
          </div>
        </section>
        <section className={styles.section} id="how-it-works" aria-labelledby="how-heading">
          <div className={styles.intro}><p className={styles.sectionLabel}>{t.overline}</p><h2 id="how-heading">{t.subtitle}</h2><p>{t.intro}</p></div>
          <ol className={styles.steps}>{t.steps.map(([title,description],i)=><li key={i}><span className={styles.stepNumber}>0{i+1}</span><div><h3>{title}</h3><p>{description}</p></div></li>)}</ol>
        </section>
        <section className={styles.section} aria-labelledby="next-heading">
          <div className={styles.intro}><p className={styles.sectionLabel}>{t.options}</p><h2 id="next-heading">{t.optionsTitle}</h2></div>
          <div className={styles.cards}>{t.cards.map(([label,title,description,button],i)=>{
            const Icon=icons[i];return <article className={styles.card} key={title}><span className={styles.cardIcon}><Icon size={25} aria-hidden="true"/></span><p className={styles.cardLabel}>{label}</p><h3>{title}</h3><p>{description}</p><Link href={links[i]}>{button}<ArrowRight size={16} aria-hidden="true"/></Link></article>;
          })}</div>
          <p className={styles.disclaimer}>{t.caution}</p>
        </section>
        <footer className={styles.footer}><Link href={course}>{t.more}<ArrowRight size={16} aria-hidden="true"/></Link><Link href="/privacy">{t.privacy}</Link></footer>
      </div>
    </main>
  );
}
