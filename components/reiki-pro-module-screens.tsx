import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import curriculum from "@/data/academy/yggdrasil-curriculum.json";
import type { YggdrasilModuleLanding } from "@/data/academy/yggdrasil-module-map";
import styles from "./reiki-pro-module-screens.module.css";

const copy = {
  en: { module: "Module", steps: "steps", heading: "What you will study", details: "Explore full module", label: "Advanced modules" },
  ru: { module: "Модуль", steps: "ступеней", heading: "Что вы изучите", details: "Подробнее о модуле", label: "Продвинутые модули" },
  es: { module: "Módulo", steps: "etapas", heading: "Qué estudiarás", details: "Explorar módulo completo", label: "Módulos avanzados" },
} as const;

export function reikiProModuleId(slug: string) {
  return "reiki-pro-" + slug;
}

/** A continuation of the existing Pro landing, not a separate course or route. */
export function ReikiProModuleScreens({ locale, modules, base }: {
  locale: PublicLocale;
  modules: YggdrasilModuleLanding[];
  base: string;
}) {
  const t = copy[locale];
  return <div className={styles.screens} data-reiki-pro-screens aria-label={t.label}>
    {modules.map((module, index) => {
      const level = curriculum.levels.find(item => item.id === module.levelId);
      if (!level) return null;
      const id = reikiProModuleId(module.slug);
      return <section key={module.slug} id={id} className={styles.screen} data-reiki-pro-module={module.slug} aria-labelledby={id + "-title"}>
        <div className={styles.hero}>
          <Image src={module.image} alt="" fill sizes="(max-width: 700px) 94vw, 790px" unoptimized />
          <div className={styles.shade} />
          <div className={styles.heroCopy}>
            <p className={styles.kicker}><span>{String(index + 1).padStart(2, "0")}</span>{t.module} {index + 1} · {level.steps.length} {t.steps}</p>
            <h2 id={id + "-title"}>{module.title[locale]}</h2>
          </div>
        </div>
        <div className={styles.body}>
          <p className={styles.lead}>{level.theme[locale]}</p>
          <h3>{t.heading}</h3>
          <ol className={styles.steps}>
            {level.steps.map(step => <li key={step.id} data-reiki-pro-step={step.id}>
              <span aria-hidden="true">{String(step.number).padStart(2, "0")}</span>
              <strong>{step.title[locale]}</strong>
            </li>)}
          </ol>
          <Link className={styles.cta} href={base + "/" + module.slug} prefetch={false}>{t.details}<ArrowRight size={20} aria-hidden="true" /></Link>
        </div>
      </section>;
    })}
  </div>;
}
