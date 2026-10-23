"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, BookOpen, BriefcaseBusiness, ClipboardList, GraduationCap, HeartHandshake, ShieldCheck, Target } from "lucide-react";
import { useHomePersonalSpace } from "@/components/home-personal-space";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./home-featured-workspace.module.css";

type ModuleKey = "tests" | "courses" | "services" | "learning" | "master";
const moduleIds: ModuleKey[] = ["tests", "courses", "services", "learning", "master"];

// The thumbnails are approved local photos; there are no external image calls.
// A selected module reveals options, rather than expanding five large cards.
const moduleVisuals = {
  tests: { photo: "/images/holistic-house/report-lighthouse-coast.webp", Icon: ClipboardList },
  courses: { photo: "/images/holistic-house/course-focus-mountain-boy.webp", Icon: BookOpen },
  services: { photo: "/images/holistic-house/andy-about.png", Icon: HeartHandshake },
  learning: { photo: "/images/holistic-house/reiki-approved-sunrise-v3.webp", Icon: GraduationCap },
  master: { photo: "/images/holistic-house/portrait-static/andy-828-3dcbabded1e9.webp", Icon: BriefcaseBusiness },
} as const;

const copy = {
  en: {
    eyebrow: "MY SPACE · YOUR 5-STEP PATH",
    title: "From discovering yourself to sharing your practice",
    hint: "Five steps, one clear next action. Start at any stage.",
    options: "CHOOSE YOUR ACTION", step: "Step",
    modules: {
      tests: { title: "Discover yourself", detail: "Free tests & your profile", inside: "Tests · personal profile", panel: "Get to know yourself" },
      courses: { title: "Take a free course", detail: "Learn a skill at your pace", inside: "Reiki · OPORA", panel: "Begin a free course" },
      services: { title: "Try a free service", detail: "Written review or initiation", inside: "Free review · Reiki", panel: "Choose your free introduction" },
      learning: { title: "Professional training", detail: "Explore advanced courses", inside: "Academy · paid options", panel: "Develop your professional skills" },
      master: { title: "Become a Master", detail: "Offer your own work", inside: "Profile · services · courses", panel: "Share your experience" },
    },
    allTests: "Take free tests", profile: "Create my personal profile", stress: "Stress self-check", myTests: "My tests",
    reiki: "Reiki Practitioner · free course", opora: "OPORA · 14-day free course", myCourses: "My courses",
    review: "Request a free written review", initiation: "Free Tantra Reiki initiation", freeEnergy: "Explore Wu Xing resources",
    advanced: "Explore Reiki training", proTrack: "Professional learning path", academy: "All Academy courses",
    publish: "Create a service", createCourse: "Create my course", practitionerProfile: "Create professional profile",
    reports: "My reports", growth: "My development path",
    privacy: "Private tests, reports and progress stay in your protected My Space.",
    servicesNote: "A written review is not a live consultation. Reiki initiation is arranged personally after a request; it is not automatic.",
    learningNote: "Some advanced programmes are paid. Review the current terms with the teacher: website checkout and automatic paid access are not live.",
    masterNote: "A profile and draft are free. Public offers require approval; enquiries are not bookings or payments.",
  },
  ru: {
    eyebrow: "МОЁ ПРОСТРАНСТВО · 5 ШАГОВ",
    title: "От знакомства с собой — к собственной практике",
    hint: "Пять последовательных шагов. Можно начать с любого.",
    options: "ВАШЕ ДЕЙСТВИЕ", step: "Шаг",
    modules: {
      tests: { title: "Узнай себя", detail: "Бесплатные тесты и профиль", inside: "Тесты · личный профиль", panel: "Начни знакомство с собой" },
      courses: { title: "Пройди бесплатный курс", detail: "Освой первый навык", inside: "Рейки · ОПОРА", panel: "Выбери бесплатный курс" },
      services: { title: "Получи бесплатную услугу", detail: "Разбор или инициация", inside: "Разбор · Рейки", panel: "Попробуй бесплатный формат" },
      learning: { title: "Профессиональное обучение", detail: "Курсы для углубления практики", inside: "Академия · платные программы", panel: "Продолжи обучение" },
      master: { title: "Стань мастером", detail: "Размести услуги и свои курсы", inside: "Профиль · услуги · курсы", panel: "Представь свою практику" },
    },
    allTests: "Пройти бесплатные тесты", profile: "Создать личный профиль", stress: "Тест на стресс", myTests: "Мои тесты",
    reiki: "Практик Рейки · бесплатный курс", opora: "ОПОРА · 14 дней бесплатно", myCourses: "Мои курсы",
    review: "Получить бесплатный письменный разбор", initiation: "Бесплатная инициация Тантра Рейки", freeEnergy: "Исследовать ресурсы У-Син",
    advanced: "Курсы Рейки", proTrack: "Путь профессионального обучения", academy: "Все курсы Академии",
    publish: "Создать свою услугу", createCourse: "Создать свой курс", practitionerProfile: "Создать профиль мастера",
    reports: "Мои отчёты", growth: "Мой путь развития",
    privacy: "Результаты тестов, отчёты и прогресс доступны только в защищённом кабинете.",
    servicesNote: "Бесплатный разбор — письменный, без звонка. Инициация проводится по отдельному согласованию с мастером.",
    learningNote: "Часть углублённых программ — платные. Условия уточняются у преподавателя: оплата и автоматический доступ на сайте пока не работают.",
    masterNote: "Профиль и черновик бесплатны. Публичные предложения проходят проверку; заявка не означает бронь или оплату.",
  },
  es: {
    eyebrow: "MI ESPACIO · 5 PASOS",
    title: "De conocerte mejor a compartir tu práctica",
    hint: "Cinco pasos claros. Puedes empezar donde quieras.",
    options: "ELIGE QUÉ HACER", step: "Paso",
    modules: {
      tests: { title: "Conócete mejor", detail: "Pruebas gratis y perfil", inside: "Pruebas · perfil", panel: "Empieza por conocerte" },
      courses: { title: "Haz un curso gratis", detail: "Aprende una habilidad", inside: "Reiki · OPORA", panel: "Empieza un curso gratis" },
      services: { title: "Recibe ayuda gratis", detail: "Revisión o iniciación", inside: "Revisión · Reiki", panel: "Elige una introducción gratuita" },
      learning: { title: "Formación profesional", detail: "Explora cursos avanzados", inside: "Academia · opciones de pago", panel: "Profundiza tu formación" },
      master: { title: "Sé profesional", detail: "Publica servicios y cursos", inside: "Perfil · servicios · cursos", panel: "Comparte tu práctica" },
    },
    allTests: "Hacer pruebas gratis", profile: "Crear mi perfil personal", stress: "Prueba de estrés", myTests: "Mis pruebas",
    reiki: "Reiki Practitioner · curso gratis", opora: "OPORA · 14 días gratis", myCourses: "Mis cursos",
    review: "Solicitar revisión escrita gratis", initiation: "Iniciación gratis de Tantra Reiki", freeEnergy: "Explorar recursos Wu Xing",
    advanced: "Explorar formación Reiki", proTrack: "Mi camino profesional", academy: "Todos los cursos de la Academia",
    publish: "Crear un servicio", createCourse: "Crear mi curso", practitionerProfile: "Crear perfil profesional",
    reports: "Mis informes", growth: "Mi desarrollo",
    privacy: "Las pruebas, los informes y el progreso personales quedan en tu espacio protegido.",
    servicesNote: "La revisión es escrita, no una llamada. La iniciación Reiki necesita confirmación personal del maestro.",
    learningNote: "Algunos programas avanzados son de pago. Consulta las condiciones: el pago en la web y el acceso automático aún no están activos.",
    masterNote: "Crear un perfil y un borrador es gratis. Las publicaciones requieren revisión; una solicitud no es una reserva ni un pago.",
  },
} as const;

export function HomeFeaturedWorkspace({ locale }: { locale: PublicLocale }) {
  const [selected, setSelected] = useState<ModuleKey>("tests");
  const t = copy[locale];
  const space = useHomePersonalSpace();
  const accountLocale = locale === "es" ? "en" : locale;
  const accountRoot = "/" + accountLocale + "/app";
  const signedIn = space?.status === "ready" && Boolean(space.summary);
  const courseId = signedIn && space?.summary?.next === "course" ? space.summary.courseId : null;
  const ownedCoursesHref = courseId
    ? accountRoot + "/course?courseId=" + encodeURIComponent(courseId)
    : accountRoot + "/course?view=courses";

  const choices: { label: string; href: string; id: string }[] =
    selected === "tests" ? [
      { id: "all", label: t.allTests, href: "/" + locale + "/client/tests" },
      { id: "profile", label: t.profile, href: accountRoot + "/portrait" },
      { id: "stress", label: t.stress, href: "/" + locale + "/client/tests?focus=stress" },
      ...(signedIn ? [{ id: "mine", label: t.myTests, href: accountRoot + "/tests" }] : []),
    ] : selected === "courses" ? [
      { id: "reiki", label: t.reiki, href: "/" + accountLocale + "/academy/principles-of-energywork/learn" },
      { id: "opora", label: t.opora, href: "/" + locale + "/courses/antistress" },
      ...(signedIn ? [{ id: "mine", label: t.myCourses, href: ownedCoursesHref }] : []),
    ] : selected === "services" ? [
      { id: "review", label: t.review, href: "/" + locale + "/services/free-situation-review" },
      { id: "initiation", label: t.initiation, href: "/" + locale + "/academy/reiki/tantra-reiki/free-initiation" },
      { id: "wu-xing", label: t.freeEnergy, href: "/" + locale + "/wu-xing" },
    ] : selected === "learning" ? [
      { id: "reiki-advanced", label: t.advanced, href: "/" + locale + "/academy/reiki" },
      { id: "professional", label: t.proTrack, href: "/" + locale + "/pro" },
      { id: "academy", label: t.academy, href: "/" + locale + "/academy" },
    ] : [
      { id: "pro-profile", label: t.practitionerProfile, href: accountRoot + "/practice?panel=profile" },
      { id: "service", label: t.publish, href: accountRoot + "/practice?panel=services&create=1" },
      { id: "course", label: t.createCourse, href: accountRoot + "/practice?panel=materials&materialTab=courses&create=1" },
    ];

  return <section id="home-my-space-features" className={styles.root}
    data-home-featured-workspace data-home-path-stages="5" aria-labelledby="hh-home-features-title">
    <div className={styles.heading}>
      <div>
        <p className={styles.eyebrow}>{t.eyebrow}</p>
        <h2 id="hh-home-features-title">{t.title}</h2>
      </div>
      <p className={styles.hint}>{t.hint}</p>
    </div>
    <div className={styles.grid} role="group" aria-label={t.title} data-home-module-grid>
      {moduleIds.map((id, index) => {
        const item = t.modules[id];
        const visual = moduleVisuals[id];
        const Icon = visual.Icon;
        return <button type="button" key={id} className={styles.tile}
          data-home-module={id} data-home-module-selected={selected === id ? "true" : "false"}
          aria-pressed={selected === id} aria-controls="hh-home-module-detail"
          aria-label={(index + 1) + "/5. " + item.title + ". " + item.detail}
          onClick={() => setSelected(id)}>
          <span className={styles.stepNum} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          <span className={styles.thumb} aria-hidden="true">
            <Image src={visual.photo} alt="" fill unoptimized loading="lazy"
              sizes="(max-width: 640px) 48px, 56px" />
          </span>
          <span className={styles.titleRow}><Icon size={15} aria-hidden="true" /><strong>{item.title}</strong></span>
          <span className={styles.desc}>{item.detail}</span>
          <span className={styles.inside}>{item.inside}<ArrowRight size={13} aria-hidden="true" /></span>
        </button>;
      })}
    </div>
    <div className={styles.detail} id="hh-home-module-detail" data-home-module-detail={selected}
      aria-live="polite" aria-atomic="true">
      <div className={styles.detailHeading}>
        <p className={styles.eyebrow}>{t.options} · {t.step} {moduleIds.indexOf(selected) + 1} / 5</p>
        <h3>{t.modules[selected].panel}</h3>
      </div>
      <nav className={styles.detailLinks} aria-label={t.modules[selected].panel}>
        {choices.map((action, index) => <Link key={action.id} href={action.href}
          prefetch={false} className={index === 0 ? styles.primary : styles.link}
          data-home-module-action={action.id}>
          {action.label}<ArrowRight size={15} aria-hidden="true" />
        </Link>)}
      </nav>
      {(selected === "master" || selected === "services" || selected === "learning") && <p className={styles.note}>
        {selected === "master" ? t.masterNote : selected === "learning" ? t.learningNote : t.servicesNote}
      </p>}
    </div>
    {signedIn && <nav className={styles.privateLinks} aria-label={t.reports + " · " + t.growth}>
      <Link prefetch={false} href={accountRoot + "/portrait#personal-reports"}
        data-home-reports-cta><ShieldCheck size={14} aria-hidden="true" />{t.reports}</Link>
      <Link prefetch={false} href={accountRoot + "/portfolio#hh-development-program"}
        data-home-development-cta><Target size={14} aria-hidden="true" />{t.growth}</Link>
    </nav>}
    <p className={styles.privacy}>{t.privacy}</p>
  </section>;
}
