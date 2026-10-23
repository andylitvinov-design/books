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
    eyebrow: "EXPLORE HOLISTIC HOUSE",
    title: "What would you like to do?",
    hint: "Choose a space to see where to begin.",
    open: "Choose", selected: "Selected", options: "Ways to begin",
    modules: {
      tests: { title: "Tests", detail: "Explore yourself", inside: "Stress · energy · focus", panel: "Choose a free self-check" },
      courses: { title: "Courses", detail: "Follow your own plan", inside: "OPORA · 90 days", panel: "Start or continue a programme" },
      services: { title: "Services", detail: "Personal guidance", inside: "Review · sessions", panel: "Choose how to get personal support" },
      learning: { title: "Learning", detail: "Learn at your pace", inside: "Reiki · Academy", panel: "Explore free lessons and training" },
      master: { title: "Become a Master", detail: "Share your expertise", inside: "Create courses · list services", panel: "Publish your work through My Practice" },
    },
    stress: "Stress test", energy: "Energy & resources", allTests: "All free tests", myTests: "My tests",
    opora: "OPORA · 14 days", businessCourse: "Business & Career · 90 days", myCourses: "My courses",
    reiki: "Reiki Practitioner · free", academy: "Explore Academy",
    review: "Free written review", consultation: "Consultation · from €50", allServices: "All services",
    publish: "Publish a service", createCourse: "Create a course",
    reports: "My reports", growth: "My development path",
    privacy: "Private reports and progress open only inside your protected Cabinet.",
    bookingNote: "A request is not a confirmed appointment.",
    masterNote: "Free listing requires profile review. Training is not a qualification.",
  },
  ru: {
    eyebrow: "ВОЗМОЖНОСТИ HOLISTIC HOUSE",
    title: "Что вы хотите сделать?",
    hint: "Выберите раздел — покажем, с чего начать.",
    open: "Выбрать", selected: "Выбрано", options: "С чего начать",
    modules: {
      tests: { title: "Тесты", detail: "Лучше понять себя", inside: "Стресс · ресурс · фокус", panel: "Выберите бесплатный тест" },
      courses: { title: "Курсы", detail: "Личный план развития", inside: "ОПОРА · 90 дней", panel: "Начните или продолжите программу" },
      services: { title: "Услуги", detail: "Личная поддержка", inside: "Разбор · консультации", panel: "Выберите формат личной работы" },
      learning: { title: "Обучение", detail: "Учиться в своём темпе", inside: "Рейки · Академия", panel: "Бесплатные уроки и обучение" },
      master: { title: "Стать мастером", detail: "Делиться своим опытом", inside: "Свой курс · своя услуга", panel: "Публикуйте свои материалы в My Practice" },
    },
    stress: "Стресс", energy: "Энергия и ресурсы", allTests: "Все бесплатные тесты", myTests: "Мои тесты",
    opora: "ОПОРА · 14 дней", businessCourse: "Бизнес и карьера · 90 дней", myCourses: "Мои курсы",
    reiki: "Практик Рейки · бесплатно", academy: "Открыть Академию",
    review: "Бесплатный письменный разбор", consultation: "Консультация · от €50", allServices: "Все услуги",
    publish: "Опубликовать услугу", createCourse: "Создать курс",
    reports: "Мои отчёты", growth: "Мой путь развития",
    privacy: "Личные отчёты и прогресс доступны только в защищённом кабинете.",
    bookingNote: "Заявка не является подтверждённой записью.",
    masterNote: "Бесплатная публикация требует проверки профиля. Обучение не подтверждает квалификацию.",
  },
  es: {
    eyebrow: "EXPLORA HOLISTIC HOUSE",
    title: "¿Qué te gustaría hacer?",
    hint: "Elige un espacio y descubre cómo empezar.",
    open: "Elegir", selected: "Elegido", options: "Cómo empezar",
    modules: {
      tests: { title: "Pruebas", detail: "Conocerte mejor", inside: "Estrés · energía · foco", panel: "Elige una prueba gratuita" },
      courses: { title: "Cursos", detail: "Tu plan personal", inside: "OPORA · 90 días", panel: "Empieza o continúa un programa" },
      services: { title: "Servicios", detail: "Atención personal", inside: "Revisión · sesiones", panel: "Elige cómo recibir apoyo personal" },
      learning: { title: "Aprender", detail: "A tu propio ritmo", inside: "Reiki · Academia", panel: "Lecciones y formación gratuitas" },
      master: { title: "Ser profesional", detail: "Comparte tu práctica", inside: "Crear cursos · servicios", panel: "Publica tu trabajo en My Practice" },
    },
    stress: "Estrés", energy: "Energía y recursos", allTests: "Todas las pruebas", myTests: "Mis pruebas",
    opora: "OPORA · 14 días", businessCourse: "Negocios y carrera · 90 días", myCourses: "Mis cursos",
    reiki: "Reiki Practitioner · gratis", academy: "Ver Academia",
    review: "Revisión escrita gratis", consultation: "Consulta · desde €50", allServices: "Todos los servicios",
    publish: "Publicar un servicio", createCourse: "Crear curso",
    reports: "Mis informes", growth: "Mi desarrollo",
    privacy: "Tus informes y progreso permanecen en tu gabinete protegido.",
    bookingNote: "Una solicitud no confirma una reserva.",
    masterNote: "La publicación requiere revisión del perfil; estudiar no equivale a una cualificación.",
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
      { id: "stress", label: t.stress, href: "/" + locale + "/client/tests?focus=stress" },
      { id: "resources", label: t.energy, href: "/" + locale + "/client/tests?focus=resources" },
      { id: "all", label: t.allTests, href: "/" + locale + "/client/tests" },
      ...(signedIn ? [{ id: "mine", label: t.myTests, href: accountRoot + "/tests" }] : []),
    ] : selected === "courses" ? [
      { id: "opora", label: t.opora, href: "/" + locale + "/courses/antistress" },
      { id: "business", label: t.businessCourse, href: accountRoot + "/business" },
      ...(signedIn ? [{ id: "mine", label: t.myCourses, href: ownedCoursesHref }] : []),
    ] : selected === "services" ? [
      { id: "review", label: t.review, href: "/" + locale + "/services/free-situation-review" },
      { id: "session", label: t.consultation, href: "/" + locale + "/services#consultation" },
      { id: "all", label: t.allServices, href: "/" + locale + "/services" },
    ] : selected === "learning" ? [
      { id: "reiki", label: t.reiki, href: "/" + accountLocale + "/academy/principles-of-energywork/learn" },
      { id: "academy", label: t.academy, href: "/" + locale + "/academy" },
    ] : [
      { id: "service", label: t.publish, href: accountRoot + "/practice?panel=services" },
      { id: "course", label: t.createCourse, href: accountRoot + "/practice?panel=materials&materialTab=courses" },
    ];

  return <section id="home-my-space-features" className={styles.root}
    data-home-featured-workspace aria-labelledby="hh-home-features-title">
    <div className={styles.heading}>
      <div>
        <p className={styles.eyebrow}>{t.eyebrow}</p>
        <h2 id="hh-home-features-title">{t.title}</h2>
      </div>
      <p className={styles.hint}>{t.hint}</p>
    </div>
    <div className={styles.grid} role="group" aria-label={t.title} data-home-module-grid>
      {moduleIds.map(id => {
        const item = t.modules[id];
        const visual = moduleVisuals[id];
        const Icon = visual.Icon;
        return <button type="button" key={id} className={styles.tile}
          data-home-module={id} data-home-module-selected={selected === id ? "true" : "false"}
          aria-pressed={selected === id} aria-controls="hh-home-module-detail"
          aria-label={item.title + ". " + item.detail}
          onClick={() => setSelected(id)}>
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
        <p className={styles.eyebrow}>{t.options}</p>
        <h3>{t.modules[selected].panel}</h3>
      </div>
      <nav className={styles.detailLinks} aria-label={t.modules[selected].panel}>
        {choices.map((action, index) => <Link key={action.id} href={action.href}
          prefetch={false} className={index === 0 ? styles.primary : styles.link}
          data-home-module-action={action.id}>
          {action.label}<ArrowRight size={15} aria-hidden="true" />
        </Link>)}
      </nav>
      {(selected === "master" || selected === "services") && <p className={styles.note}>
        {selected === "master" ? t.masterNote : t.bookingNote}
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
