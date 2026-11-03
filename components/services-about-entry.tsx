import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./services-about-entry.module.css";

const copy = {
  ru: { eyebrow: "С КЕМ ВЫ БУДЕТЕ РАБОТАТЬ", title: "Познакомьтесь со мной", description: "Я — Андрей Литвинов. Помогаю исследовать жизненные ситуации, внутренние ресурсы и новые возможности через личные консультации и практики.", action: "Обо мне и моём подходе" },
  en: { eyebrow: "YOUR PRACTITIONER", title: "Get to know me", description: "I'm Andrey Litvinov. I help people explore personal challenges, inner resources and new possibilities through conversation and guided practices.", action: "About me and my approach" },
  es: { eyebrow: "CONOCE A TU ACOMPAÑANTE", title: "Conóceme", description: "Soy Andrey Litvinov. Acompaño a las personas a explorar sus retos, recursos interiores y nuevas posibilidades mediante sesiones personales y prácticas guiadas.", action: "Sobre mí y mi enfoque" },
} as const;

export function ServicesAboutEntry({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  return <section className={styles.root} aria-label={t.title} data-services-about-entry>
    <div className={styles.portrait} role="img" aria-label={locale === "ru" ? "Андрей Литвинов" : "Andrey Litvinov"} />
    <div className={styles.copy}>
      <p className={styles.eyebrow}>{t.eyebrow}</p>
      <h2>{t.title}</h2>
      <p>{t.description}</p>
      <Link href={`/${locale}/about`} prefetch={false}>{t.action}<ArrowRight size={18} aria-hidden="true" /></Link>
    </div>
  </section>;
}
