import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, GraduationCap, HeartHandshake, PlusCircle, Sparkles } from "lucide-react";
import { PublicSiteHeader } from "@/components/public-site-header";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./profi-hub.module.css";

const copy = {
  en: {
    kicker: "HOLISTIC HOUSE · PRO",
    title: "Your path into practice",
    intro: "Learn Reiki step by step, or share the experience you already have. Choose where you are today.",
    chooseLearn: "I want to learn Reiki",
    chooseShare: "I'm already a pro",
    learnEyebrow: "01 / START LEARNING · FREE",
    learnTitle: "Become a Reiki Practitioner",
    learnIntro: "A friendly five-lesson introduction with real exercises, guided practice and room to reflect.",
    lessonTitle: "Your five steps",
    lessons: ["Sun Flight · experience the practice", "Tantra Reiki · explore the first tradition", "Kundalini Reiki · deepen your experience", "Yggdrasil Reiki · discover another system", "Personal initiation · choose how to request it"],
    learnAction: "Start the free Reiki course",
    academyAction: "Explore the Reiki Academy",
    learnCaveat: "Free study does not grant a professional credential. Any initiation is arranged separately and requires personal confirmation.",
    learningCardKicker: "A gentle start",
    learningCardTitle: "Learn at your pace",
    learningCardHint: "Five guided lessons, three Reiki traditions, one clear next step.",
    shareEyebrow: "02 / ALREADY PRACTISING",
    shareTitle: "Share what you do",
    shareIntro: "Bring your own practice to Holistic House. You don't have to repeat the beginner programme.",
    serviceTitle: "Offer your services",
    serviceDescription: "Create a practitioner profile and draft a service listing.",
    serviceAction: "Add my service",
    courseTitle: "Teach your method",
    courseDescription: "Create or manage a course for your future students.",
    courseAction: "Create my course",
    publishNote: "A basic practitioner profile and service listing are free. Public listings are subject to review; opening an editor is not publication.",
    signInNote: "The editors open in protected My Practice; sign in with Google if needed.",
    backHome: "Back to Holistic House",
    spanishStudy: "",
  },
  ru: {
    kicker: "HOLISTIC HOUSE · ПРОФИ",
    title: "Твой путь к практике",
    intro: "Начни учиться Рейки или делись опытом, который уже есть. Выбери свой следующий шаг.",
    chooseLearn: "Хочу стать профи",
    chooseShare: "Я уже профи",
    learnEyebrow: "01 / НАЧНИ ОБУЧЕНИЕ · БЕСПЛАТНО",
    learnTitle: "Стань практиком Рейки",
    learnIntro: "Пять понятных уроков: мягкое знакомство, практики, медитации и собственный опыт.",
    lessonTitle: "Пять шагов обучения",
    lessons: ["Полёт Солнца · первая практика", "Тантра Рейки · знакомство с системой", "Кундалини Рейки · углубление", "Рейки Иггдрасиль · новая традиция", "Личное посвящение · выбор формата и запрос"],
    learnAction: "Начать бесплатный курс",
    academyAction: "Другие программы Рейки",
    learnCaveat: "Бесплатное обучение само по себе не подтверждает профессиональную квалификацию. Посвящение согласовывается отдельно и не происходит автоматически.",
    learningCardKicker: "Бережный старт",
    learningCardTitle: "Учись в своём темпе",
    learningCardHint: "5 уроков, 3 традиции Рейки и понятный следующий шаг.",
    shareEyebrow: "02 / УЖЕ ПРАКТИКУЕШЬ",
    shareTitle: "Расскажи о своей практике",
    shareIntro: "Есть опыт? Не нужно проходить базовый курс заново. Предложи свои услуги или обучение.",
    serviceTitle: "Размести свою услугу",
    serviceDescription: "Создай профиль мастера и описание услуги.",
    serviceAction: "Добавить услугу",
    courseTitle: "Опубликуй свой курс",
    courseDescription: "Создай или продолжи редактирование собственной программы.",
    courseAction: "Создать курс",
    publishNote: "Профиль мастера и базовое размещение услуги бесплатны. Публикация проходит проверку; открытие редактора ещё не означает публикацию.",
    signInNote: "Редакторы открываются в защищённой «Моей практике». При необходимости войди через Google.",
    backHome: "На главную",
    spanishStudy: "",
  },
  es: {
    kicker: "HOLISTIC HOUSE · PRO",
    title: "Tu camino hacia la práctica",
    intro: "Aprende Reiki paso a paso o comparte la experiencia que ya tienes. Elige por dónde empezar.",
    chooseLearn: "Quiero aprender Reiki",
    chooseShare: "Ya soy profesional",
    learnEyebrow: "01 / EMPIEZA A APRENDER · GRATIS",
    learnTitle: "Conviértete en practicante de Reiki",
    learnIntro: "Cinco lecciones accesibles con ejercicios, meditaciones y espacio para reflexionar.",
    lessonTitle: "Tus cinco pasos",
    lessons: ["Vuelo del Sol · primera práctica", "Tantra Reiki · primera tradición", "Kundalini Reiki · profundiza", "Yggdrasil Reiki · otra tradición", "Iniciación personal · elige cómo solicitarla"],
    learnAction: "Empezar el curso gratuito",
    academyAction: "Explorar la Academia Reiki",
    learnCaveat: "El curso gratuito no otorga una acreditación profesional. Toda iniciación requiere confirmación personal y se organiza por separado.",
    learningCardKicker: "Un comienzo tranquilo",
    learningCardTitle: "Aprende a tu ritmo",
    learningCardHint: "5 lecciones, 3 tradiciones de Reiki y un siguiente paso claro.",
    shareEyebrow: "02 / YA PRACTICAS",
    shareTitle: "Comparte tu experiencia",
    shareIntro: "¿Ya tienes práctica? No necesitas repetir el curso de iniciación. Ofrece servicios o cursos.",
    serviceTitle: "Ofrece tus servicios",
    serviceDescription: "Crea un perfil profesional y prepara una ficha de servicio.",
    serviceAction: "Añadir mi servicio",
    courseTitle: "Enseña tu método",
    courseDescription: "Crea o gestiona tu propio programa para estudiantes.",
    courseAction: "Crear mi curso",
    publishNote: "El perfil profesional y la ficha básica son gratis. La publicación requiere revisión; abrir el editor no equivale a publicar.",
    signInNote: "Los editores se abren en My Practice (en inglés). Entra con Google si es necesario.",
    backHome: "Volver al inicio",
    spanishStudy: "El curso interactivo completo se presenta actualmente en inglés.",
  },
} as const;

export function ProfiHub({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const appLocale = locale === "es" ? "en" : locale;
  const studyHref = `/${locale}/academy/principles-of-energywork/learn`;
  const academyHref = `/${locale}/academy/reiki`;
  const serviceHref = `/${appLocale}/app/practice?panel=services`;
  const courseHref = `/${appLocale}/app/practice?panel=materials&materialTab=courses`;
  return (
    <main className={`house-home house-home--services ${styles.page}`} lang={locale} data-profi-page={locale}>
      <PublicSiteHeader locale={locale} />
      <div className={styles.wrap}>
        <section className={styles.hero} aria-labelledby="profi-title">
          <Image
            src="/images/holistic-house/reiki-approved-sunrise-v3.webp"
            alt="" fill unoptimized priority
            className={styles.heroPhoto}
            sizes="(max-width: 720px) 100vw, 1200px"
          />
          <div className={styles.heroShade} aria-hidden="true" />
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><Sparkles size={14} aria-hidden="true" />{t.kicker}</p>
            <h1 id="profi-title">{t.title}</h1>
            <p className={styles.heroIntro}>{t.intro}</p>
            <nav className={styles.choices} aria-label={locale === "ru" ? "Выбрать свой путь" : locale === "es" ? "Elige tu camino" : "Choose your path"}>
              <Link className={styles.firstChoice} href="#learn" data-profi-path="learn">
                <GraduationCap size={20} aria-hidden="true" />{t.chooseLearn}<ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link className={styles.secondChoice} href="#share" data-profi-path="share">
                <HeartHandshake size={19} aria-hidden="true" />{t.chooseShare}<ArrowRight size={17} aria-hidden="true" />
              </Link>
            </nav>
          </div>
        </section>

        <section className={styles.learning} id="learn" aria-labelledby="profi-learning-title">
          <div className={styles.sectionHeading}>
            <p className={styles.sectionEyebrow}><BookOpen size={16} aria-hidden="true" />{t.learnEyebrow}</p>
            <h2 id="profi-learning-title">{t.learnTitle}</h2>
            <p>{t.learnIntro}</p>
          </div>
          <div className={styles.learningGrid}>
            <div className={styles.lessonPanel}>
              <h3>{t.lessonTitle}</h3>
              <ol className={styles.lessons}>
                {t.lessons.map((lesson, index) => (
                  <li key={lesson}><span className={styles.lessonNumber}>{index + 1}</span><span>{lesson}</span><CheckCircle2 size={16} aria-hidden="true" /></li>
                ))}
              </ol>
              <Link href={studyHref} className={styles.primaryAction} prefetch={false} data-profi-action="start-course">
                {t.learnAction}<ArrowRight size={18} aria-hidden="true" />
              </Link>
              {t.spanishStudy && <p className={styles.languageNote}>{t.spanishStudy}</p>}
              <p className={styles.caveat}>{t.learnCaveat}</p>
            </div>
            <aside className={styles.learnAside}>
              <span className={styles.asideIcon}><Sparkles size={24} aria-hidden="true" /></span>
              <p className={styles.asideKicker}>{t.learningCardKicker}</p>
              <h3>{t.learningCardTitle}</h3>
              <p>{t.learningCardHint}</p>
              <div className={styles.figures} aria-label={t.learningCardHint}>
                <span><strong>5</strong><small>{locale === "ru" ? "уроков" : locale === "es" ? "lecciones" : "lessons"}</small></span>
                <span><strong>3</strong><small>{locale === "ru" ? "традиции" : locale === "es" ? "tradiciones" : "traditions"}</small></span>
              </div>
              <Link href={academyHref} className={styles.textLink} prefetch={false}>{t.academyAction}<ArrowRight size={16} aria-hidden="true" /></Link>
            </aside>
          </div>
        </section>

        <section className={styles.share} id="share" aria-labelledby="profi-share-title">
          <div className={styles.sectionHeading}>
            <p className={styles.sectionEyebrow}><HeartHandshake size={17} aria-hidden="true" />{t.shareEyebrow}</p>
            <h2 id="profi-share-title">{t.shareTitle}</h2>
            <p>{t.shareIntro}</p>
          </div>
          <div className={styles.publishGrid}>
            <article className={styles.publishCard}>
              <span className={styles.cardIcon}><PlusCircle aria-hidden="true" size={25} /></span>
              <h3>{t.serviceTitle}</h3>
              <p>{t.serviceDescription}</p>
              <Link href={serviceHref} className={styles.publishAction} prefetch={false} data-profi-action="create-service">
                {t.serviceAction}<ArrowRight size={16} aria-hidden="true" />
              </Link>
            </article>
            <article className={styles.publishCard}>
              <span className={styles.cardIcon}><GraduationCap aria-hidden="true" size={26} /></span>
              <h3>{t.courseTitle}</h3>
              <p>{t.courseDescription}</p>
              <Link href={courseHref} className={styles.publishAction} prefetch={false} data-profi-action="create-course">
                {t.courseAction}<ArrowRight size={16} aria-hidden="true" />
              </Link>
            </article>
          </div>
          <p className={styles.publishNote}><CheckCircle2 size={17} aria-hidden="true" />{t.publishNote}</p>
          <p className={styles.signInNote}>{t.signInNote}</p>
        </section>
        <footer className={styles.footer}>
          <Link href={locale === "en" ? "/" : `/${locale}`} prefetch={false}>{t.backHome}<ArrowRight size={16} aria-hidden="true" /></Link>
          <span>Holistic House · Pro</span>
        </footer>
      </div>
    </main>
  );
}
