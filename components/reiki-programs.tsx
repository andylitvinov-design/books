import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, GraduationCap, Sparkles } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import curriculum from "@/data/academy/yggdrasil-curriculum.json";
import { yggdrasilModuleLandings } from "@/data/academy/yggdrasil-module-map";
import styles from "./principles-of-energywork.module.css";
import { ReikiProModuleScreens, reikiProModuleId } from "./reiki-pro-module-screens";

export type ReikiProgram = "free" | "master" | "pro";

export function resolveReikiProgram(raw?: string | string[]): ReikiProgram {
  return raw === "master" || raw === "pro" ? raw : "free";
}

const tabs = [
  { id: "free", label: "Free", Icon: BookOpen },
  { id: "master", label: "Master", Icon: GraduationCap },
  { id: "pro", label: "Pro", Icon: Sparkles },
] as const;

const content = {
  en: {
    nav: "My Reiki programs", master: "Reiki Yggdrasil Master Program", pro: "Reiki Yggdrasil Pro Program",
    masterSubtitle: "Basic course · 5 levels", proSubtitle: "Advanced studies · 6 modules",
    masterLead: "Explore the five stages of the original basic program, from the first practices to Master Level.",
    proLead: "Continue after the basic course with the Instructor Course and the five advanced branches of the original school curriculum.",
    masterCta: "Explore the master course", proCta: "Explore the instructor course",
    masterRoadmap: "Your five levels", proRoadmap: "Your advanced modules", level: "Level", module: "Module",
    details: "View curriculum", complete: "Full Yggdrasil curriculum", foundation: "Explore Master first",
    note: "Training and initiations are arranged with the teacher. Course descriptions are spiritual education, not medical advice or guaranteed outcomes.",
  },
  ru: {
    nav: "Программы My Reiki", master: "Мастерский курс Рейки Иггдрасиль", pro: "Магистерский курс Рейки Иггдрасиль",
    masterSubtitle: "Базовая программа · 5 ступеней", proSubtitle: "Продвинутая программа · 6 модулей",
    masterLead: "Пять ступеней оригинальной базовой программы: от первых практик до уровня Мастера.",
    proLead: "Продолжение после базового курса: инструкторская программа и пять продвинутых направлений школы.",
    masterCta: "Открыть мастерский курс", proCta: "Открыть инструкторский курс",
    masterRoadmap: "Ваши пять ступеней", proRoadmap: "Продвинутые модули", level: "Ступень", module: "Модуль",
    details: "Посмотреть программу", complete: "Полная программа Иггдрасиль", foundation: "Сначала мастерский курс",
    note: "Обучение и инициации согласуются с преподавателем. Это духовные учебные материалы, а не медицинская рекомендация или гарантия результата.",
  },
  es: {
    nav: "Programas My Reiki", master: "Programa de Maestro Reiki Yggdrasil", pro: "Programa Pro Reiki Yggdrasil",
    masterSubtitle: "Curso básico · 5 niveles", proSubtitle: "Estudios avanzados · 6 módulos",
    masterLead: "Explora las cinco etapas del programa básico original, desde las primeras prácticas hasta el nivel de maestro.",
    proLead: "Continúa después del curso básico con el curso de instructor y las cinco ramas avanzadas del programa original.",
    masterCta: "Explorar el curso de maestro", proCta: "Explorar el curso de instructor",
    masterRoadmap: "Tus cinco niveles", proRoadmap: "Módulos avanzados", level: "Nivel", module: "Módulo",
    details: "Ver programa", complete: "Programa completo Yggdrasil", foundation: "Explorar primero Master",
    note: "La formación y las iniciaciones se acuerdan con el profesor. Son materiales de educación espiritual, no consejos médicos ni resultados garantizados.",
  },
} as const;

function programPath(locale: PublicLocale, program: ReikiProgram) {
  return "/" + locale + "/academy/principles-of-energywork" + (program === "free" ? "" : "?program=" + program);
}

export function ReikiProgramNavigation({ locale, active }: { locale: PublicLocale; active: ReikiProgram }) {
  return <nav className={styles.reikiProgramTabs} aria-label={content[locale].nav} data-my-reiki-program-tabs>
    {tabs.map(({ id, label, Icon }) => <Link key={id} href={programPath(locale, id)} prefetch={false} aria-current={id === active ? "page" : undefined} data-reiki-program-tab={id}>
      <Icon aria-hidden="true" /><strong>{label}</strong>
    </Link>)}
  </nav>;
}

export function ReikiAdvancedProgram({ locale, program }: { locale: PublicLocale; program: Exclude<ReikiProgram, "free"> }) {
  const t = content[locale];
  const master = program === "master";
  const base = "/" + locale + "/academy/reiki/yggdrasil";
  const basic = curriculum.levels.find(item => item.id === 1);
  const modules = yggdrasilModuleLandings.filter(item => item.levelId > 1);
  const masterPhotos = ["/images/holistic-house/messenger-zen-stones.svg", "/images/holistic-house/magic-mirror-lotus.webp", "/images/holistic-house/course-focus-mountain-boy.webp", "/images/holistic-house/ideas-pine-reference.webp", "/academy/reiki-yggdrasil/source/basic-program.jpg"];
  const rows = master
    ? (basic?.steps ?? []).map(step => ({ id: step.id, number: step.number, title: step.title[locale], href: base + "/basic-course#" + step.id.toLowerCase(), photo: masterPhotos[step.number - 1] || masterPhotos[4] }))
    : modules.map((module, index) => ({ id: module.slug, number: index + 1, title: module.title[locale], href: base + "/" + module.slug, photo: module.image }));
  return <>
    <section className={styles.reikiAdvancedHero} data-reiki-advanced-hero={program} aria-labelledby="reiki-program-title">
      <div className={styles.reikiAdvancedHeroCopy}>
        <p>HOLISTIC HOUSE ACADEMY · {master ? "MASTER" : "PRO"}</p>
        <h1 id="reiki-program-title">{master ? t.master : t.pro}</h1>
        <strong>{master ? t.masterSubtitle : t.proSubtitle}</strong>
        <p>{master ? t.masterLead : t.proLead}</p>
      </div>
      <Link className={styles.reikiAdvancedCta} href={master ? base + "/basic-course" : "#" + reikiProModuleId("instructor-course")} prefetch={false}>{master ? t.masterCta : t.proCta}<ArrowRight size={20} aria-hidden="true" /></Link>
    </section>
    <section className={styles.reikiSyllabus} aria-labelledby="reiki-advanced-roadmap">
      <p className={styles.sectionEyebrow}>REIKI YGGDRASIL</p>
      <h2 id="reiki-advanced-roadmap">{master ? t.masterRoadmap : t.proRoadmap}</h2>
      <nav className={styles.stepRail} aria-label={master ? t.masterRoadmap : t.proRoadmap}>
        {rows.map(row => <Link key={row.id} href={master ? row.href : "#" + reikiProModuleId(row.id)} prefetch={false} data-reiki-advanced-row={row.id}>
          <span className={styles.reikiAdvancedPhoto} aria-hidden="true">{row.photo ? <Image src={row.photo} alt="" fill sizes="(max-width: 700px) 35vw, 260px" unoptimized /> : null}<b>{String(row.number).padStart(2,"0")}</b></span>
          <div className={styles.reikiWeekCopy}><small>{master ? t.level : t.module} {row.number}</small><strong>{row.title}</strong><p>{t.details}</p></div>
          <ArrowRight size={19} aria-hidden="true" />
        </Link>)}
      </nav>
    </section>
    {!master && <ReikiProModuleScreens locale={locale} modules={modules} base={base} />}
    <div className={styles.reikiSecondary}><div className={styles.heroQuickLinks}>
      <Link className={styles.ghostButton} href={base} prefetch={false}>{t.complete}<ArrowRight size={16} aria-hidden="true" /></Link>
      {!master && <Link className={styles.ghostButton} href={programPath(locale, "master")} prefetch={false}>{t.foundation}<ArrowRight size={16} aria-hidden="true" /></Link>}
    </div></div>
    <p className={styles.reikiAdvancedNotice}>{t.note}</p>
  </>;
}
