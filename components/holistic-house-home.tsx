import Link from "next/link";
import { HomeDialogFirst } from "@/components/home-dialog-first";
import type { PublicLocale } from "@/lib/public-locales";

// Priority render: server HTML + one compact dialog. No ProfileHubTabs,
// carousel, video embed, large workspace or automatic private bootstrap here.
// The existing seven-item dock remains owned by the shared site layout.
const COPY = {
  en:{more:"Explore Holistic House",tests:"Free tests",academy:"Courses and practices",
    services:"Personal support",review:"Free written review",
    about:"Holistic House offers thoughtful practices, education and optional personal sessions online and in Toronto.",
    footer:"Healing · Practice · Guidance"},
  ru:{more:"Другие возможности",tests:"Бесплатные тесты",academy:"Курсы и практики",
    services:"Личная поддержка",review:"Бесплатный письменный разбор",
    about:"Holistic House — практики, обучение и личные консультации онлайн и в Торонто.",
    footer:"Восстановление · Практика · Поддержка"},
  es:{more:"Explora Holistic House",tests:"Tests gratuitos",academy:"Cursos y prácticas",
    services:"Apoyo personal",review:"Revisión escrita gratuita",
    about:"Holistic House ofrece prácticas, formación y sesiones personales en línea y en Toronto.",
    footer:"Bienestar · Práctica · Acompañamiento"}
} as const;
export function HolisticHouseHome({locale="en"}:{locale?:PublicLocale}){
  const t=COPY[locale];
  return <main className="house-home house-home--services hh-home-dialog-first" lang={locale}
    data-home-design="dialog-first" data-hh-priority-home>
    <HomeDialogFirst locale={locale}/>
    <section className="hh-home-dialog-more" aria-labelledby="hh-home-more-title">
      <h2 id="hh-home-more-title">{t.more}</h2>
      <nav aria-label={t.more} className="hh-home-dialog-links">
        <Link href={"/"+locale+"/client/tests"} prefetch={false}>{t.tests}</Link>
        <Link href={"/"+locale+"/academy"} prefetch={false}>{t.academy}</Link>
        <Link href={"/"+locale+"/services"} prefetch={false}>{t.services}</Link>
        <Link href={"/"+locale+"/services/free-situation-review"} prefetch={false}>{t.review}</Link>
      </nav>
      <p>{t.about}</p>
    </section>
    <footer className="service-home-footer">
      <p>Holistic House · {t.footer}</p>
      <Link href={"/"+locale+"/about"} prefetch={false}>{t.more}</Link>
      <Link href="/privacy" prefetch={false}>Privacy</Link>
    </footer>
  </main>;
}
