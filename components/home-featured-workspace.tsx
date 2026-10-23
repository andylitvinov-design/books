"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Target } from "lucide-react";

import { useHomePersonalSpace } from "@/components/home-personal-space";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./home-featured-workspace.module.css";

const photos = {
  stress: "/images/holistic-house/report-lighthouse-coast.webp",
  resources: "/images/holistic-house/course-focus-mountain-boy.webp",
  allTests: "/images/holistic-house/ideas-pine-reference.webp",
  opora: "/images/holistic-house/course-start-heron.webp",
  business: "/images/holistic-house/course-focus-mountain-boy.webp",
  review: "/images/holistic-house/andy-about.png",
  consultation: "/images/holistic-house/video-posters/services-en-v2.webp",
  constellations: "/images/holistic-house/video-posters/constellations-en-v1.webp",
  reiki: "/images/holistic-house/reiki-practitioner-sunrise.webp",
  egypt: "/images/holistic-house/hero-olive-incense.webp",
  academy: "/images/holistic-house/books-library.webp",
  pro: "/images/holistic-house/reiki-approved-sunrise-v3.webp",
  service: "/images/holistic-house/portrait-static/andy-828-3dcbabded1e9.webp",
  course: "/images/holistic-house/andy-about.png",
} as const;

type OfferId = keyof typeof photos;
type ModuleKey = "tests" | "courses" | "services" | "learning" | "master";
const moduleIds: ModuleKey[] = ["tests", "courses", "services", "learning", "master"];

const copy = {
  en: {
    heading: "Explore Holistic House",
    eyebrow: "YOUR NEXT STEP",
    sectionCounter: "SPACE",
    modules: {
      tests: {
        title: "Tests", lead: "Get to know yourself with a free self-check.",
        offers: [
          { id: "stress", title: "Stress & balance", body: "Reflect on stress and what helps you recover.", cta: "Explore free tests" },
          { id: "resources", title: "Energy & resources", body: "Explore your strengths and everyday resources.", cta: "Explore free tests" },
          { id: "allTests", title: "Find your test", body: "Browse topics and choose a self-check that fits.", cta: "All free tests" },
        ],
      },
      courses: {
        title: "Courses", lead: "Follow a programme, one practical step at a time.",
        offers: [
          { id: "opora", title: "OPORA · 14 days", body: "Small, repeatable practices for everyday self-support.", cta: "Explore the course" },
          { id: "business", title: "Business & Career · 90 days", body: "Set goals, take action and review your progress.", cta: "Explore the programme" },
        ],
      },
      services: {
        title: "Services", lead: "Choose the kind of personal guidance you need.",
        offers: [
          { id: "review", title: "Free written situation review", body: "Share one question and request a personal written response.", cta: "Request a free review" },
          { id: "consultation", title: "Personal session · from €50", body: "30 minutes of one-to-one guidance, online or in Toronto.", cta: "Request a consultation" },
          { id: "constellations", title: "Systemic constellations", body: "Explore patterns in relationships and important choices.", cta: "Explore this service" },
        ],
      },
      learning: {
        title: "Learning", lead: "Study Reiki and other traditions at your own pace.",
        offers: [
          { id: "reiki", title: "Reiki Practitioner · free", body: "Five introductory lessons, exercises and reflection.", cta: "Start free learning" },
          { id: "egypt", title: "Egyptian Priesthood", body: "Seven original Russian-language video lessons.", cta: "Explore the video course" },
          { id: "academy", title: "Explore the Academy", body: "Find more courses and guided learning resources.", cta: "See programmes" },
        ],
      },
      master: {
        title: "Become a Master", lead: "Learn to practise — or share the work you already do.",
        offers: [
          { id: "pro", title: "Your Pro learning journey", body: "Learn the steps from free study to your own practice.", cta: "Explore Pro" },
          { id: "service", title: "List your services", body: "Create a basic listing for review in My Practice.", cta: "Open service editor" },
          { id: "course", title: "Create your own course", body: "Organise your lessons inside your practitioner space.", cta: "Open course editor" },
        ],
      },
    },
    myTests: "My tests", myCourses: "My courses", reports: "My reports",
    growth: "My development path",
    serviceNote: "A consultation request is not a confirmed booking.",
    masterNote: "Public listings require review. Free training does not grant professional qualification.",
    privacy: "Your reports and progress remain private inside My Space.",
  },
  ru: {
    heading: "Возможности Holistic House",
    eyebrow: "ВАШ СЛЕДУЮЩИЙ ШАГ",
    sectionCounter: "РАЗДЕЛ",
    modules: {
      tests: {
        title: "Тесты", lead: "Узнайте себя с помощью бесплатных тестов.",
        offers: [
          { id: "stress", title: "Стресс и равновесие", body: "Исследуйте напряжение и способы восстановления.", cta: "Выбрать бесплатный тест" },
          { id: "resources", title: "Энергия и ресурсы", body: "Узнайте о своих сильных сторонах и ресурсах.", cta: "Выбрать бесплатный тест" },
          { id: "allTests", title: "Найти свой тест", body: "Выберите тему и подходящий вариант самопроверки.", cta: "Все бесплатные тесты" },
        ],
      },
      courses: {
        title: "Курсы", lead: "Развивайтесь шаг за шагом по понятной программе.",
        offers: [
          { id: "opora", title: "ОПОРА · 14 дней", body: "Короткие повторяемые практики поддержки себя.", cta: "Открыть курс" },
          { id: "business", title: "Бизнес и карьера · 90 дней", body: "Поставьте цели, действуйте и отслеживайте прогресс.", cta: "Посмотреть программу" },
        ],
      },
      services: {
        title: "Услуги", lead: "Выберите подходящий формат личной поддержки.",
        offers: [
          { id: "review", title: "Бесплатный письменный разбор", body: "Опишите один вопрос и запросите личный ответ.", cta: "Подать заявку" },
          { id: "consultation", title: "Личная сессия · от €50", body: "30 минут индивидуальной работы онлайн или в Торонто.", cta: "Запросить консультацию" },
          { id: "constellations", title: "Системные расстановки", body: "Исследуйте повторяющиеся ситуации и отношения.", cta: "Подробнее об услуге" },
        ],
      },
      learning: {
        title: "Обучение", lead: "Изучайте Рейки и другие традиции в своём темпе.",
        offers: [
          { id: "reiki", title: "Практик Рейки · бесплатно", body: "Пять вводных уроков, упражнения и рефлексия.", cta: "Начать бесплатно" },
          { id: "egypt", title: "Египетское жречество", body: "Семь авторских русскоязычных видеоуроков.", cta: "Открыть видеокурс" },
          { id: "academy", title: "Академия", body: "Другие курсы и учебные материалы по темам.", cta: "Все программы" },
        ],
      },
      master: {
        title: "Стать мастером", lead: "Обучайтесь сами или делитесь своей практикой.",
        offers: [
          { id: "pro", title: "Ваш путь Профи", body: "От бесплатных уроков до собственной практики.", cta: "Открыть Профи" },
          { id: "service", title: "Разместить свою услугу", body: "Создайте карточку услуги для модерации.", cta: "Редактор услуг" },
          { id: "course", title: "Создать свой курс", body: "Соберите уроки в пространстве мастера.", cta: "Редактор курсов" },
        ],
      },
    },
    myTests: "Мои тесты", myCourses: "Мои курсы", reports: "Мои отчёты",
    growth: "Мой путь развития",
    serviceNote: "Заявка на консультацию ещё не означает подтверждённую запись.",
    masterNote: "Публикация проходит модерацию. Бесплатное обучение не даёт профессиональной квалификации.",
    privacy: "Ваши отчёты и прогресс остаются приватными в My Space.",
  },
  es: {
    heading: "Explora Holistic House",
    eyebrow: "TU PRÓXIMO PASO",
    sectionCounter: "ESPACIO",
    modules: {
      tests: {
        title: "Pruebas", lead: "Conócete mejor con una prueba gratuita.",
        offers: [
          { id: "stress", title: "Estrés y equilibrio", body: "Explora el estrés y tus recursos de recuperación.", cta: "Explorar pruebas" },
          { id: "resources", title: "Energía y recursos", body: "Descubre tus fortalezas y apoyos cotidianos.", cta: "Explorar pruebas" },
          { id: "allTests", title: "Encuentra tu prueba", body: "Elige un tema y una prueba que te interese.", cta: "Todas las pruebas" },
        ],
      },
      courses: {
        title: "Cursos", lead: "Sigue un programa paso a paso.",
        offers: [
          { id: "opora", title: "OPORA · 14 días", body: "Prácticas breves de apoyo personal para cada día.", cta: "Explorar el curso" },
          { id: "business", title: "Negocios y carrera · 90 días", body: "Fija objetivos y revisa tus próximos pasos.", cta: "Explorar el programa" },
        ],
      },
      services: {
        title: "Servicios", lead: "Elige cómo recibir orientación personal.",
        offers: [
          { id: "review", title: "Revisión escrita gratuita", body: "Comparte una pregunta y solicita una respuesta personal.", cta: "Solicitar revisión" },
          { id: "consultation", title: "Sesión personal · desde €50", body: "30 minutos en línea o en Toronto.", cta: "Solicitar una consulta" },
          { id: "constellations", title: "Constelaciones sistémicas", body: "Explora patrones y relaciones importantes.", cta: "Ver este servicio" },
        ],
      },
      learning: {
        title: "Aprender", lead: "Estudia Reiki y otras tradiciones a tu ritmo.",
        offers: [
          { id: "reiki", title: "Reiki Practitioner · gratis", body: "Cinco lecciones introductorias y ejercicios.", cta: "Empezar gratis" },
          { id: "egypt", title: "Sacerdocio egipcio", body: "Siete lecciones en vídeo en ruso.", cta: "Explorar vídeos" },
          { id: "academy", title: "Explorar Academia", body: "Más cursos y recursos de aprendizaje.", cta: "Ver programas" },
        ],
      },
      master: {
        title: "Ser profesional", lead: "Aprende a practicar o comparte tu experiencia.",
        offers: [
          { id: "pro", title: "Tu camino Pro", body: "Del estudio gratuito a tu propia práctica.", cta: "Explorar Pro" },
          { id: "service", title: "Publicar tus servicios", body: "Prepara una ficha para su revisión.", cta: "Abrir editor" },
          { id: "course", title: "Crear tu curso", body: "Organiza las lecciones en tu espacio profesional.", cta: "Crear curso" },
        ],
      },
    },
    myTests: "Mis pruebas", myCourses: "Mis cursos", reports: "Mis informes",
    growth: "Mi desarrollo",
    serviceNote: "Solicitar una consulta no confirma una cita.",
    masterNote: "Los anuncios requieren revisión. La formación gratuita no otorga una cualificación profesional.",
    privacy: "Tus informes y progreso siguen privados en My Space.",
  },
} as const;

export function HomeFeaturedWorkspace({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const space = useHomePersonalSpace();
  const signedIn = space?.status === "ready" && Boolean(space.summary);
  // Private account routes currently support EN and RU. Public ES remains ES.
  const accountLocale = locale === "es" ? "en" : locale;
  const accountRoot = "/" + accountLocale + "/app";
  const nextCourseId = signedIn && space?.summary?.next === "course" ? space.summary.courseId : null;
  const myCoursesHref = nextCourseId
    ? accountRoot + "/course?courseId=" + encodeURIComponent(nextCourseId)
    : accountRoot + "/course?view=courses";

  const hrefs: Record<OfferId, string> = {
    stress: "/" + locale + "/client/tests?focus=stress",
    resources: "/" + locale + "/client/tests?focus=resources",
    allTests: "/" + locale + "/client/tests",
    opora: "/" + locale + "/courses/antistress",
    business: accountRoot + "/business",
    review: "/" + locale + "/services/free-situation-review",
    consultation: "/" + locale + "/services#consultation",
    constellations: "/" + locale + "/services/systemic-constellations",
    reiki: "/" + locale + "/academy/principles-of-energywork/learn",
    egypt: "/" + locale + "/academy/egyptian-priesthood",
    academy: "/" + locale + "/academy",
    pro: "/" + locale + "/pro",
    service: accountRoot + "/practice?panel=services",
    course: accountRoot + "/practice?panel=materials&materialTab=courses",
  };

  return (
    <section id="home-my-space-features" className={styles.root}
      data-home-featured-workspace aria-labelledby="hh-home-features-title">
      <h2 className={styles.srOnly} id="hh-home-features-title">{t.heading}</h2>
      <div className={styles.sections}>
        {moduleIds.map((id, index) => {
          const section = t.modules[id];
          const footer = id === "tests" && signedIn
            ? { href: accountRoot + "/tests", label: t.myTests }
            : id === "courses" && signedIn
              ? { href: myCoursesHref, label: t.myCourses }
              : null;
          return (
            <section className={styles.section} data-home-module={id}
              aria-labelledby={"hh-home-" + id + "-title"} key={id}>
              <header className={styles.sectionHeading}>
                <p className={styles.eyebrow}>{t.eyebrow} <span aria-hidden="true">·</span> {t.sectionCounter} {index + 1}/5</p>
                <h3 id={"hh-home-" + id + "-title"}>{section.title}</h3>
                <p className={styles.lead}>{section.lead}</p>
              </header>
              <div className={styles.offers} data-home-module-offers={id}>
                {section.offers.map(offer => (
                  <Link key={offer.id} href={hrefs[offer.id]} prefetch={false}
                    className={styles.offer} data-home-module-action={offer.id}>
                    <span className={styles.photo} aria-hidden="true">
                      <Image src={photos[offer.id]} alt="" fill unoptimized loading="lazy"
                        sizes="(max-width: 640px) 120px, (max-width: 920px) 160px, 190px" />
                    </span>
                    <span className={styles.offerBody}>
                      <strong className={styles.offerTitle}>{offer.title}</strong>
                      <span className={styles.offerDetail}>{offer.body}</span>
                      <span className={styles.offerAction}>{offer.cta}<ArrowRight size={16} aria-hidden="true" /></span>
                    </span>
                  </Link>
                ))}
              </div>
              {(footer || id === "master" || id === "services") && (
                <footer className={styles.sectionFooter}>
                  {footer && <Link href={footer.href} prefetch={false} className={styles.extraLink}>
                    {footer.label}<ArrowRight size={15} aria-hidden="true" />
                  </Link>}
                  {id === "services" && <p>{t.serviceNote}</p>}
                  {id === "master" && <p>{t.masterNote}</p>}
                </footer>
              )}
            </section>
          );
        })}
      </div>
      {signedIn && (
        <nav className={styles.privateLinks} aria-label={t.reports + " · " + t.growth}>
          <Link prefetch={false} href={accountRoot + "/portrait#personal-reports"}
            data-home-reports-cta><ShieldCheck size={15} aria-hidden="true" />{t.reports}</Link>
          <Link prefetch={false} href={accountRoot + "/portfolio#hh-development-program"}
            data-home-development-cta><Target size={15} aria-hidden="true" />{t.growth}</Link>
        </nav>
      )}
      <p className={styles.privacy}>{t.privacy}</p>
    </section>
  );
}
