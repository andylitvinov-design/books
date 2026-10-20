import { StaticPortrait } from "@/components/static-portrait";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./services-conversion-hero.module.css";

const copy = {
  ru: {
    eyebrow: "HOLISTIC HOUSE · ЛИЧНАЯ РАБОТА",
    heading: "Личная работа с вашим вопросом: отношения, работа и решения",
    lead: "Начните с бесплатного письменного разбора ситуации, тестов самонаблюдения или символического профиля У-Син. Если нужна личная работа, обсудим индивидуальную сессию с Андреем — от €50 за 30 минут.",
    mobileLead: "Бесплатный письменный разбор или личная сессия с Андреем — выберите удобный первый шаг.",
    benefits: ["Бесплатный письменный старт", "Личные сессии от €50 · время согласуем", "Торонто и онлайн"],
    cta: "Получить бесплатный письменный разбор",
    freeCta: "Начать бесплатно · 3 варианта",
    paidCta: "Запросить личную сессию · от €50",
    secondary: "Все три бесплатных варианта", shop: "Открыть магазин услуг",
    small: "Бесплатный разбор — по анкете и рисунку, не видеозвонок. Личная запись и оплата только после согласования.",
    workWith: "Личная работа с Андреем Литвиновым, в Торонто и онлайн",
    solutions: "Личные форматы работы",
    imageLabel: "Лично с Андреем Литвиновым",
    caption: "Начните со своего вопроса",
  },
  en: {
    eyebrow: "HOLISTIC HOUSE · PERSONAL SUPPORT",
    heading: "Personal guidance for relationships, work and life decisions",
    lead: "Begin with a free written situation review, wellbeing self-checks or a symbolic Wu Xing profile. For personal support, explore a one-to-one session with Andrey — starting at €50 for 30 minutes.",
    mobileLead: "A free written review or a personal session with Andrey — choose your first step.",
    benefits: ["Free written first step", "Personal sessions from €50 · time confirmed", "Toronto & online"],
    cta: "Get a free written review",
    freeCta: "Start free · 3 options",
    paidCta: "Ask about a personal session · from €50",
    secondary: "See all three free options", shop: "Browse the shop",
    small: "Free review means form and drawing → written feedback, not a live call. Session time and payment are agreed separately.",
    workWith: "Personal work with Andrey Litvinov, in Toronto and online",
    solutions: "Explore personal work options",
    imageLabel: "Personal work with Andrey Litvinov",
    caption: "Start with your question",
  },
  es: {
    eyebrow: "HOLISTIC HOUSE · ACOMPAÑAMIENTO PERSONAL",
    heading: "Acompañamiento personal para relaciones, trabajo y decisiones",
    lead: "Empieza con una revisión escrita gratuita, cuestionarios de autoobservación o un perfil simbólico Wu Xing. Si prefieres atención personal, explora sesiones con Andrey desde €50 por 30 minutos.",
    mobileLead: "Revisión escrita gratuita o sesión con Andrey: elige cómo empezar.",
    benefits: ["Primera revisión escrita gratuita", "Sesiones desde €50 · horario a confirmar", "Toronto y en línea"],
    cta: "Recibir revisión escrita gratuita",
    freeCta: "Empezar gratis · 3 opciones",
    paidCta: "Solicitar sesión personal · desde €50",
    secondary: "Opciones gratuitas y cursos", shop: "Ver la tienda",
    small: "La revisión gratuita incluye formulario y dibujo → respuesta escrita, no una llamada. Las sesiones se acuerdan por separado.",
    workWith: "Trabajo individual con Andrey Litvinov, en Toronto y en línea",
    solutions: "Explorar los servicios personales",
    imageLabel: "Personalmente con Andrey Litvinov",
    caption: "Empieza con tu pregunta",
  },
} as const;

export function ServicesConversionHero({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  return (
    <section className={styles.hero} aria-labelledby="services-conversion-title">
      <div className={styles.copy}>
        <p className={styles.eyebrow}><span className={styles.spark} aria-hidden="true">✦</span>{t.eyebrow}</p>
        <h1 id="services-conversion-title">{t.heading}</h1>
        <p className={styles.lead}>{t.lead}</p>
        <p className={styles.mobileLead}>{t.mobileLead}</p>
        <div className={styles.actions}>
          <Link className={styles.cta} href="#free-insights" data-service-hero-cta="free">
            {t.freeCta}<ArrowRight size={20} aria-hidden="true" />
          </Link>
          <Link className={styles.paidLink} href="#consultation" data-service-hero-cta="paid">
            {t.paidCta}<ArrowUpRight size={17} aria-hidden="true" />
          </Link>
          <Link className={styles.secondary} href="#solutions">
            {t.solutions}<ArrowRight size={17} aria-hidden="true" />
          </Link>
          <Link className={styles.secondary} href={"/" + locale + "/shop"} data-service-hero-cta="shop">
            {t.shop}<ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
        <p className={styles.small}>{t.small}</p>
        <p className={styles.small}>{t.workWith}</p>
        <ul className={styles.benefits}>
          {t.benefits.map(benefit => <li key={benefit}><Check size={16} strokeWidth={2.2} aria-hidden="true" />{benefit}</li>)}
        </ul>
      </div>
      <div className={styles.visual}>
        <StaticPortrait
          src="/images/holistic-house/andy-about.png"
          alt={locale === "ru" ? "Андрей Литвинов" : "Andrey Litvinov"}
          fill priority sizes="(max-width: 760px) 100vw, 42vw" className={styles.image}
        />
        <div className={styles.visualText}>
          <span className={styles.visualLabel}>{t.imageLabel}</span>
          <p>{t.caption}</p>
        </div>
      </div>
    </section>
  );
}
