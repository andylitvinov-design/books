import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BookOpen, LockKeyhole } from "lucide-react";

import { AcquisitionEventLink } from "@/components/acquisition-event-link";
import { StaticPortrait } from "@/components/static-portrait";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./home-explore-sections.module.css";

// A compact map of the site's actual public destinations. Reuse approved local
// photographic media; never fetch stock assets or private client imagery.
const topics = [
  { id: "diagnostics", image: "/images/holistic-house/hero-olive-incense.webp", path: "/services/free-situation-review" },
  { id: "tests", image: "/images/holistic-house/report-lighthouse-coast.webp", path: "/client/tests" },
  { id: "services", image: "/images/holistic-house/video-posters/constellations-en-v1.webp", path: "/services" },
  { id: "academy", image: "/images/holistic-house/reiki-approved-sunrise-v3.webp", path: "/academy" },
  { id: "business", image: "/images/holistic-house/andy-about.png", path: "/explore/business" },
  { id: "ideas", image: "/images/holistic-house/books-library.webp", path: "/books" },
] as const;

type TopicId = (typeof topics)[number]["id"];
type TopicCopy = { eyebrow: string; title: string; benefit: string; action: string };
type ExploreCopy = {
  kicker: string;
  title: string;
  intro: string;
  topics: Record<TopicId, TopicCopy>;
  returnLabel: string;
  cabinetAction: string;
  libraryAction: string;
  testGuideAction: string;
};

const copy: Record<PublicLocale, ExploreCopy> = {
  en: {
    kicker: "EXPLORE HOLISTIC HOUSE",
    title: "Find your next step",
    intro: "A quick guide to the site's main sections: what each offers and where to begin.",
    topics: {
      diagnostics: { eyebrow: "01 · FREE START", title: "Free situation review", benefit: "Share a question and, if you wish, a drawing. Get a personal written review, without a live call.", action: "Request a free review" },
      tests: { eyebrow: "02 · SELF-CHECKS", title: "Tests & wellbeing", benefit: "Reflect on stress, mood and personal resources. Save results to compare your progress over time.", action: "Explore free tests" },
      services: { eyebrow: "03 · PERSONAL WORK", title: "Sessions & guidance", benefit: "Explore constellations, guided imagery and individual support in Toronto or online.", action: "View all services" },
      academy: { eyebrow: "04 · LEARNING", title: "Academy & courses", benefit: "Follow guided lessons, Reiki practices and meditations at your own pace.", action: "Browse courses" },
      business: { eyebrow: "05 · WORK & GROWTH", title: "Business & career", benefit: "Explore decisions, career transitions and practical steps for your work or business.", action: "Explore business support" },
      ideas: { eyebrow: "06 · INSPIRATION", title: "Ideas, books & videos", benefit: "Ask a question and discover aphorisms, Dao prompts, books and the latest publications.", action: "Open Ideas" },
    },
    returnLabel: "Already exploring? Your saved materials are in your private space.",
    cabinetAction: "Open my Cabinet",
    libraryAction: "Browse the Library",
    testGuideAction: "How free self-checks work",
  },
  ru: {
    kicker: "ВОЗМОЖНОСТИ HOLISTIC HOUSE",
    title: "Выберите свой следующий шаг",
    intro: "Короткий путеводитель по главным разделам: чем они полезны и с чего начать.",
    topics: {
      diagnostics: { eyebrow: "01 · БЕСПЛАТНО", title: "Разбор вашей ситуации", benefit: "Опишите вопрос и при желании приложите рисунок. Получите личный письменный разбор без созвона.", action: "Получить бесплатный разбор" },
      tests: { eyebrow: "02 · САМОИССЛЕДОВАНИЕ", title: "Тесты и самочувствие", benefit: "Исследуйте стресс, настроение и ресурсы. Сохраняйте результаты и сравнивайте динамику.", action: "Открыть бесплатные тесты" },
      services: { eyebrow: "03 · ЛИЧНАЯ РАБОТА", title: "Услуги и консультации", benefit: "Расстановки, образная работа и индивидуальная поддержка онлайн или в Торонто.", action: "Посмотреть услуги" },
      academy: { eyebrow: "04 · ОБУЧЕНИЕ", title: "Академия и курсы", benefit: "Пошаговые уроки, медитации и практики Рейки в удобном для вас темпе.", action: "Выбрать курс" },
      business: { eyebrow: "05 · РАБОТА И РОСТ", title: "Бизнес и карьера", benefit: "Поддержка в решениях, карьерных переменах и развитии своих проектов.", action: "Перейти к бизнес-разделу" },
      ideas: { eyebrow: "06 · ВДОХНОВЕНИЕ", title: "Идеи, книги и видео", benefit: "Задайте вопрос и найдите афоризмы, даосские подсказки, книги и новые публикации.", action: "Открыть Идеи" },
    },
    returnLabel: "Уже начали? Сохранённые материалы находятся в вашем кабинете.",
    cabinetAction: "Открыть мой кабинет",
    libraryAction: "Посмотреть библиотеку",
    testGuideAction: "Как работают бесплатные тесты",
  },
  es: {
    kicker: "DESCUBRE HOLISTIC HOUSE",
    title: "Elige tu próximo paso",
    intro: "Una guía breve de las secciones principales y de cómo te puede servir cada una.",
    topics: {
      diagnostics: { eyebrow: "01 · GRATIS", title: "Revisión de tu situación", benefit: "Explica tu pregunta y, si deseas, añade un dibujo. Recibe una revisión personal por escrito, sin llamada.", action: "Solicitar revisión gratuita" },
      tests: { eyebrow: "02 · AUTOEXPLORACIÓN", title: "Pruebas y bienestar", benefit: "Explora estrés, ánimo y recursos. Guarda resultados para observar cambios; algunas pruebas están en EN/RU.", action: "Explorar pruebas gratuitas" },
      services: { eyebrow: "03 · TRABAJO PERSONAL", title: "Sesiones y orientación", benefit: "Constelaciones, imágenes guiadas y apoyo individual en Toronto o en línea.", action: "Ver servicios" },
      academy: { eyebrow: "04 · APRENDIZAJE", title: "Academia y cursos", benefit: "Lecciones, meditaciones y prácticas Reiki para avanzar a tu ritmo.", action: "Explorar cursos" },
      business: { eyebrow: "05 · TRABAJO Y CRECIMIENTO", title: "Negocios y carrera", benefit: "Apoyo para explorar decisiones, cambios profesionales y proyectos.", action: "Explorar negocios" },
      ideas: { eyebrow: "06 · INSPIRACIÓN", title: "Ideas, libros y vídeos", benefit: "Haz una pregunta y descubre aforismos, pistas taoístas, libros y novedades.", action: "Abrir Ideas" },
    },
    returnLabel: "¿Ya has empezado? Tus materiales guardados están en tu espacio privado.",
    cabinetAction: "Abrir mi espacio (EN)",
    libraryAction: "Explorar la biblioteca",
    testGuideAction: "Cómo funcionan las pruebas",
  },
};

export function HomeExploreSections({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const cabinetLocale = locale === "es" ? "en" : locale;

  return (
    <section className={styles.section} id="start-here" aria-labelledby="home-explore-title" data-home-start data-home-sections="photo-left">
      <header className={styles.header}>
        <p className={styles.kicker}>{t.kicker}</p>
        <h2 id="home-explore-title">{t.title}</h2>
        <p className={styles.intro}>{t.intro}</p>
      </header>
      <div className={styles.grid}>
        {topics.map((topic) => {
          const item = t.topics[topic.id];
          const href = "/" + locale + topic.path;
          const content = (
            <>
              <span className={styles.photo} aria-hidden="true">
                {topic.id === "business"
                  ? <StaticPortrait src="/images/holistic-house/andy-about.png" alt="" fill sizes="(max-width: 359px) 78px, (max-width: 760px) 110px, 175px" loading="lazy" />
                  : <Image src={topic.image} alt="" fill unoptimized loading="lazy" sizes="(max-width: 359px) 78px, (max-width: 760px) 110px, 175px" />}
              </span>
              <div className={styles.content}>
                <span className={styles.eyebrow}>{item.eyebrow}</span>
                <h3 className={styles.title}>{item.title}</h3>
                <span className={styles.benefit}>{item.benefit}</span>
                <span className={styles.action}>{item.action}<ArrowUpRight size={16} aria-hidden="true" /></span>
              </div>
            </>
          );
          if (topic.id === "diagnostics" || topic.id === "tests") {
            return (
              <AcquisitionEventLink
                key={topic.id}
                className={styles.card}
                href={href}
                event={topic.id === "tests" ? "self_check_start" : "service_request_start"}
                attributes={{ "data-home-explore-id": topic.id }}
                prefetch={false}
              >
                {content}
              </AcquisitionEventLink>
            );
          }
          return <Link key={topic.id} className={styles.card} href={href} data-home-explore-id={topic.id} prefetch={false}>{content}</Link>;
        })}
      </div>
      <nav className={styles.quicklinks} aria-label={locale === "ru" ? "Кабинет и библиотека" : locale === "es" ? "Espacio y biblioteca" : "Cabinet and Library"}>
        <span className={styles.returnLabel}>{t.returnLabel}</span>
        <Link href={"/" + locale + "/tests"} prefetch={false}>
          <BookOpen size={16} aria-hidden="true" />{t.testGuideAction}<ArrowUpRight size={15} aria-hidden="true" />
        </Link>
        <Link href={"/" + cabinetLocale + "/app"} prefetch={false}>
          <LockKeyhole size={16} aria-hidden="true" />{t.cabinetAction}<ArrowUpRight size={15} aria-hidden="true" />
        </Link>
        <Link href={"/" + locale + "/library"} prefetch={false}>
          <BookOpen size={16} aria-hidden="true" />{t.libraryAction}<ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </nav>
    </section>
  );
}
