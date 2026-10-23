"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, BriefcaseBusiness, ClipboardList, FileText, ShieldCheck, Sparkles, Target } from "lucide-react";
import { useHomePersonalSpace } from "@/components/home-personal-space";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./home-featured-workspace.module.css";

// Only editorial/allowlisted test topics and existing published route families.
// No questionnaire answers, private scores, course notes or URLs with personal input.
const focuses = [
  { key: "stress", en: "Stress", ru: "Стресс", es: "Estrés" },
  { key: "resources", en: "Energy", ru: "Ресурсы", es: "Energía" },
  { key: "relationships", en: "Relationships", ru: "Отношения", es: "Relaciones" },
  { key: "attention", en: "Focus", ru: "Внимание", es: "Atención" },
] as const;

const copy = {
  en: {
    eyebrow: "EXPLORE YOUR HOLISTIC HOUSE",
    title: "Discover. Learn. Grow.",
    intro: "Everything in one place: free self-checks, practical courses and your personal development space.",
    testEyebrow: "MY TESTS · START FREE",
    testTitle: "Discover more about yourself",
    testBody: "Choose a short self-check for what matters to you. Review the result and decide whether to save it privately.",
    chooseFocus: "Choose a test topic",
    allTests: "Explore free tests", myTests: "My tests",
    courseEyebrow: "MY COURSES · LEARN AT YOUR PACE",
    courseTitle: "Turn ideas into daily practice",
    courseBody: "Guided lessons and real exercises. Begin with a course, or return to your own learning.",
    opora: "OPORA · Stress Relief", oporaNote: "14-day guided practice",
    reiki: "Reiki Practitioner", reikiNote: "Interactive course · free introduction",
    business: "Business & Career", businessNote: "90-day programme · sign-in",
    academy: "Explore Academy", myCourses: "My courses", continueCourse: "Continue my course",
    reportsEyebrow: "MY REPORTS", reportsTitle: "See your insights",
    reportsBody: "Your saved reports belong in your private Cabinet.",
    reportsAction: "Open my reports",
    pathEyebrow: "MY DEVELOPMENT PATH", pathTitle: "Choose where to grow",
    pathBody: "Set your own goals and find suitable learning steps.",
    pathAction: "My development path",
    privateNotice: "Personal results are shown only inside your protected Cabinet.",
    professionalTitle: "Share your expertise",
    professionalBody: "Practitioners can manage their courses and services in My Practice.",
    professionalAction: "My Practice",
  },
  ru: {
    eyebrow: "ВОЗМОЖНОСТИ HOLISTIC HOUSE",
    title: "Узнавайте себя. Учитесь. Развивайтесь.",
    intro: "Всё рядом: бесплатные тесты, практические курсы и личная программа развития.",
    testEyebrow: "МОИ ТЕСТЫ · БЕСПЛАТНО",
    testTitle: "Узнайте себя лучше",
    testBody: "Выберите короткий тест по интересующей теме. Посмотрите результат и сами решите, сохранять ли его.",
    chooseFocus: "Выберите тему теста",
    allTests: "Пройти бесплатный тест", myTests: "Мои тесты",
    courseEyebrow: "МОИ КУРСЫ · В СВОЁМ ТЕМПЕ",
    courseTitle: "Осваивайте новые навыки",
    courseBody: "Уроки и практики, которые можно проходить шаг за шагом и продолжать позже.",
    opora: "ОПОРА · Антистресс", oporaNote: "14 дней бережных практик",
    reiki: "Практик Рейки", reikiNote: "Интерактивный курс · бесплатное знакомство",
    business: "Бизнес и карьера", businessNote: "90-дневная программа · после входа",
    academy: "Все курсы Академии", myCourses: "Мои курсы", continueCourse: "Продолжить мой курс",
    reportsEyebrow: "МОИ ОТЧЁТЫ", reportsTitle: "Смотрите свои результаты",
    reportsBody: "Сохранённые отчёты находятся в личном защищённом кабинете.",
    reportsAction: "Открыть мои отчёты",
    pathEyebrow: "МОЙ ПУТЬ РАЗВИТИЯ", pathTitle: "Выберите, куда расти",
    pathBody: "Поставьте личные цели и найдите подходящие шаги обучения.",
    pathAction: "Моя программа развития",
    privateNotice: "Личные результаты доступны только в защищённом кабинете.",
    professionalTitle: "Делитесь опытом",
    professionalBody: "Мастера могут управлять своими курсами и услугами в разделе «Моя практика».",
    professionalAction: "Моя практика",
  },
  es: {
    eyebrow: "DESCUBRE HOLISTIC HOUSE",
    title: "Descubre. Aprende. Crece.",
    intro: "Pruebas gratuitas, cursos prácticos y un espacio personal para tu desarrollo.",
    testEyebrow: "MIS PRUEBAS · GRATIS",
    testTitle: "Conócete mejor",
    testBody: "Elige una prueba breve. Consulta el resultado y decide si quieres guardarlo de forma privada.",
    chooseFocus: "Elige el tema de tu prueba",
    allTests: "Explorar pruebas gratis", myTests: "Mis pruebas",
    courseEyebrow: "MIS CURSOS · A TU RITMO",
    courseTitle: "Aprende paso a paso",
    courseBody: "Lecciones y prácticas que puedes empezar hoy y continuar más adelante.",
    opora: "OPORA · Antiestrés", oporaNote: "14 días de prácticas guiadas",
    reiki: "Reiki Practitioner", reikiNote: "Curso interactivo · introducción en inglés",
    business: "Negocios y carrera", businessNote: "Programa de 90 días · en inglés",
    academy: "Explorar Academia", myCourses: "Mis cursos", continueCourse: "Continuar mi curso",
    reportsEyebrow: "MIS INFORMES", reportsTitle: "Explora tus resultados",
    reportsBody: "Los informes guardados permanecen en tu gabinete privado.",
    reportsAction: "Abrir mis informes",
    pathEyebrow: "MI DESARROLLO", pathTitle: "Elige cómo crecer",
    pathBody: "Define tus metas y encuentra nuevos pasos de aprendizaje.",
    pathAction: "Mi plan de desarrollo",
    privateNotice: "Tus resultados personales solo aparecen dentro del gabinete protegido.",
    professionalTitle: "Comparte tu experiencia",
    professionalBody: "Los profesionales gestionan cursos y servicios en Mi práctica (en inglés).",
    professionalAction: "Mi práctica",
  },
} as const;

export function HomeFeaturedWorkspace({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const space = useHomePersonalSpace();
  const accountLocale = locale === "es" ? "en" : locale;
  const accountRoot = "/" + accountLocale + "/app";
  const signedIn = space?.status === "ready" && Boolean(space.summary);
  const courseId = signedIn && space?.summary?.next === "course"
    ? space.summary.courseId : null;
  const ownedCoursesHref = courseId
    ? accountRoot + "/course?courseId=" + encodeURIComponent(courseId)
    : accountRoot + "/course?view=courses";

  const courses = [
    { id: "opora", title: t.opora, note: t.oporaNote, href: "/" + locale + "/courses/antistress" },
    { id: "reiki", title: t.reiki, note: t.reikiNote, href: "/" + accountLocale + "/academy/principles-of-energywork/learn" },
    { id: "business", title: t.business, note: t.businessNote, href: accountRoot + "/business" },
  ];

  return <section className={styles.root} id="home-my-space-features"
    data-home-featured-workspace aria-labelledby="hh-home-features-title">
    <header className={styles.heading}>
      <p className={styles.eyebrow}><Sparkles size={15} aria-hidden="true" />{t.eyebrow}</p>
      <h2 id="hh-home-features-title">{t.title}</h2>
      <p>{t.intro}</p>
    </header>

    <div className={styles.stack}>
      <article className={styles.feature} data-home-feature="tests">
        <div className={styles.photo}>
          <Image src="/images/holistic-house/report-lighthouse-coast.webp"
            alt="" fill unoptimized loading="lazy"
            sizes="(max-width: 430px) 105px, (max-width: 800px) 145px, 235px" />
        </div>
        <div className={styles.body}>
          <p className={styles.eyebrow}><ClipboardList size={16} aria-hidden="true" />{t.testEyebrow}</p>
          <h3>{t.testTitle}</h3>
          <p className={styles.intro}>{t.testBody}</p>
          <nav className={styles.focus} aria-label={t.chooseFocus}>
            {focuses.map(focus => <Link key={focus.key}
              data-home-test-topic={focus.key} prefetch={false}
              href={"/" + locale + "/client/tests?focus=" + focus.key}>
              {focus[locale]}
            </Link>)}
          </nav>
          <div className={styles.actions}>
            <Link className={styles.primary} data-home-tests-cta
              prefetch={false} href={"/" + locale + "/client/tests"}>
              {t.allTests}<ArrowRight size={16} aria-hidden="true" />
            </Link>
            {signedIn && <Link className={styles.secondary} prefetch={false}
              href={accountRoot + "/tests"} data-home-my-tests>
              {t.myTests}<ArrowRight size={15} aria-hidden="true" />
            </Link>}
          </div>
        </div>
      </article>

      <article className={styles.feature} data-home-feature="courses">
        <div className={styles.photo}>
          <Image src="/images/holistic-house/course-focus-mountain-boy.webp"
            alt="" fill unoptimized loading="lazy"
            sizes="(max-width: 430px) 105px, (max-width: 800px) 145px, 235px" />
        </div>
        <div className={styles.body}>
          <p className={styles.eyebrow}><BookOpen size={16} aria-hidden="true" />{t.courseEyebrow}</p>
          <h3>{t.courseTitle}</h3>
          <p className={styles.intro}>{t.courseBody}</p>
          <nav className={styles.courses} aria-label={t.courseEyebrow}>
            {courses.map(course => <Link key={course.id} href={course.href} prefetch={false}
              data-home-course={course.id}>
              <span><strong>{course.title}</strong><small>{course.note}</small></span>
              <ArrowRight size={17} aria-hidden="true" />
            </Link>)}
          </nav>
          <div className={styles.actions}>
            <Link className={styles.primary} data-home-academy-cta
              prefetch={false} href={"/" + locale + "/academy"}>
              {t.academy}<ArrowRight size={16} aria-hidden="true" />
            </Link>
            {signedIn && <Link className={styles.secondary} prefetch={false}
              href={ownedCoursesHref} data-home-my-courses>
              {courseId ? t.continueCourse : t.myCourses}
              <ArrowRight size={15} aria-hidden="true" />
            </Link>}
          </div>
        </div>
      </article>

      <div className={styles.smallGrid}>
        <article className={styles.smallCard} data-home-feature="reports">
          <span className={styles.smallIcon}><FileText size={22} aria-hidden="true" /></span>
          <div>
            <p className={styles.eyebrow}>{t.reportsEyebrow}</p>
            <h3>{t.reportsTitle}</h3>
            <p>{t.reportsBody}</p>
            <Link href={accountRoot + "/portrait#personal-reports"}
              prefetch={false} data-home-reports-cta>
              {t.reportsAction}<ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </article>
        <article className={styles.smallCard} data-home-feature="development">
          <span className={styles.smallIcon}><Target size={22} aria-hidden="true" /></span>
          <div>
            <p className={styles.eyebrow}>{t.pathEyebrow}</p>
            <h3>{t.pathTitle}</h3>
            <p>{t.pathBody}</p>
            <Link href={accountRoot + "/portfolio#hh-development-program"}
              prefetch={false} data-home-development-cta>
              {t.pathAction}<ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </article>
      </div>

      {signedIn && space?.summary?.professional && <aside className={styles.professional}
        data-home-professional>
        <BriefcaseBusiness size={20} aria-hidden="true" />
        <div><strong>{t.professionalTitle}</strong><p>{t.professionalBody}</p></div>
        <Link href={accountRoot + "/practice"} prefetch={false}>
          {t.professionalAction}<ArrowRight size={15} aria-hidden="true" />
        </Link>
      </aside>}
      <p className={styles.privacy}><ShieldCheck size={14} aria-hidden="true" />{t.privateNotice}</p>
    </div>
  </section>;
}
