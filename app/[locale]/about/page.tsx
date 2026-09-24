import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicSiteHeader } from "@/components/public-site-header";
import { aboutBiography } from "@/data/about-biography";
import { getHomeopathyLocaleParams, isSupportedLocale } from "@/data/remedies";
import type { Locale } from "@/data/remedies";
import { metadataBaseFor } from "@/data/site-metadata";

type PageProps = { params: Promise<{ locale: string }> };

const videoTestimonials = [
  { id: "m9RfDgK76PU", ru: "Антон Корчинский — отзыв о работе", en: "Anton Korchinsky — testimonial" },
  { id: "5oj0BIbLT4w", ru: "Елена Бахтина — отзыв клиента", en: "Elena Bakhtina — client testimonial" },
  { id: "MIVLm1GUTtM", ru: "Юрий Гончаренко — отзыв клиента", en: "Yuri Goncharenko — client testimonial" },
] as const;

const testimonialCopy = {
  ru: {
    kicker: "Отзывы",
    title: "Видео-отзывы",
    text: "Несколько видео-отзывов, ранее опубликованных на моём сайте PsiMaster.",
    archiveTitle: "Фото и письменные отзывы",
    archiveText: "Часть старых отзывов и учебных эссе сохранилась в архиве PsiMaster. Эти ссылки ведут к оригинальным публикациям.",
    archiveAction: "Открыть архив PsiMaster",
    archiveCards: [
      { title: "Отзывы: сеанс образной терапии", text: "Архив отзывов о личных консультациях и образной работе.", href: "https://psimaster.net/node/786", image: "https://psimaster.net/sites/default/files/styles/medium/public/article/%D0%B0%D0%BD%D0%B4%D1%80%D0%B5%D0%B9-%D0%BB%D0%B8%D1%82%D0%B2%D0%B8%D0%BD%D0%BE%D0%B2-%D1%80%D0%B5%D0%B9%D0%BA%D0%B8-%D0%B8%D0%B3%D0%B3%D0%B4%D1%80%D0%B0%D1%81%D0%B8%D0%BB%D1%8C-%D0%B0%D1%81%D1%81%D0%B3%D0%B0%D1%80%D0%B4-%D0%BD%D0%B8%D0%BA%D0%BE%D0%BB%D0%B0%D0%B9-%D0%B6%D1%83%D1%80%D0%B0%D0%B2%D0%BB%D0%B5%D0%B2.jpg?itok=8hSPbZ15" },
      { title: "Отзывы и материалы школы", text: "Архив отзывов, эссе участников и материалов старого центра PsiMaster.", href: "https://psimaster.net/node/789", image: "https://psimaster.net/sites/default/files/styles/medium/public/article/%D0%B0%D0%BD%D0%B4%D1%80%D0%B5%D0%B9-%D0%BB%D0%B8%D1%82%D0%B2%D0%B8%D0%BD%D0%BE%D0%B2-%D1%80%D0%B5%D0%B9%D0%BA%D0%B8-%D0%B8%D0%B3%D0%B3%D0%B4%D1%80%D0%B0%D1%81%D0%B8%D0%BB%D1%8C-%D0%B0%D1%81%D1%81%D0%B3%D0%B0%D1%80%D0%B4-%D0%BD%D0%B8%D0%BA%D0%BE%D0%BB%D0%B0%D0%B9-%D0%B6%D1%83%D1%80%D0%B0%D0%B2%D0%BB%D0%B5%D0%B2_0.jpg?itok=chWp4-7g" },
    ],
  },
  en: {
    kicker: "Testimonials",
    title: "Video testimonials",
    text: "A few video testimonials that were previously published on my PsiMaster website.",
    archiveTitle: "Photo & written reviews",
    archiveText: "Some older reviews and participant essays remain in the PsiMaster archive. These links open the original publications.",
    archiveAction: "Open PsiMaster archive",
    archiveCards: [
      { title: "Imagery therapy & personal sessions", text: "Archived reviews related to personal consultations and imagery-based work.", href: "https://psimaster.net/node/786", image: "https://psimaster.net/sites/default/files/styles/medium/public/article/%D0%B0%D0%BD%D0%B4%D1%80%D0%B5%D0%B9-%D0%BB%D0%B8%D1%82%D0%B2%D0%B8%D0%BD%D0%BE%D0%B2-%D1%80%D0%B5%D0%B9%D0%BA%D0%B8-%D0%B8%D0%B3%D0%B3%D0%B4%D1%80%D0%B0%D1%81%D0%B8%D0%BB%D1%8C-%D0%B0%D1%81%D1%81%D0%B3%D0%B0%D1%80%D0%B4-%D0%BD%D0%B8%D0%BA%D0%BE%D0%BB%D0%B0%D0%B9-%D0%B6%D1%83%D1%80%D0%B0%D0%B2%D0%BB%D0%B5%D0%B2.jpg?itok=8hSPbZ15" },
      { title: "School reviews & participant materials", text: "Archived reviews, participant essays, and materials from the earlier PsiMaster center.", href: "https://psimaster.net/node/789", image: "https://psimaster.net/sites/default/files/styles/medium/public/article/%D0%B0%D0%BD%D0%B4%D1%80%D0%B5%D0%B9-%D0%BB%D0%B8%D1%82%D0%B2%D0%B8%D0%BD%D0%BE%D0%B2-%D1%80%D0%B5%D0%B9%D0%BA%D0%B8-%D0%B8%D0%B3%D0%B3%D0%B4%D1%80%D0%B0%D1%81%D0%B8%D0%BB%D1%8C-%D0%B0%D1%81%D1%81%D0%B3%D0%B0%D1%80%D0%B4-%D0%BD%D0%B8%D0%BA%D0%BE%D0%BB%D0%B0%D0%B9-%D0%B6%D1%83%D1%80%D0%B0%D0%B2%D0%BB%D0%B5%D0%B2_0.jpg?itok=chWp4-7g" },
    ],
  },
} as const;

export function generateStaticParams() {
  return getHomeopathyLocaleParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return { title: "Not found" };

  const current = aboutBiography[locale as Locale];
  return {
    metadataBase: metadataBaseFor(),
    title: current.meta.title,
    description: current.meta.description,
    alternates: {
      canonical: "/" + locale + "/about",
      languages: { ru: "/ru/about", en: "/en/about" },
    },
  };
}

export default async function AboutPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();

  const typedLocale = locale as Locale;
  const current = aboutBiography[typedLocale];
  const testimonials = testimonialCopy[typedLocale];

  return (
    <main className="about-shell" lang={typedLocale}>
      <PublicSiteHeader locale={typedLocale} />

      <section className="about-introduction" aria-labelledby="about-title">
        <div className="about-portrait">
          <Image alt={current.photoAlt} fill priority sizes="(max-width: 767px) 100vw, (max-width: 1127px) 56vw, 660px" src="/images/holistic-house/andy-about.png" />
        </div>
        <div className="about-introduction-copy">
          <p className="about-kicker">{current.eyebrow}</p>
          <h1 id="about-title">Andy</h1>
          {current.intro.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
      </section>

      <article className="about-biography">
        {current.sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.items && <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul>}
            {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </section>
        ))}
      </article>

      <section className="about-explore" aria-labelledby="about-explore-title">
        <p className="about-kicker">Holistic House</p>
        <h2 id="about-explore-title">{current.explore.heading}</h2>
        <nav aria-label={current.explore.heading}>{current.explore.links.map((link) => <Link href={link.href} key={link.href}>{link.label}<span aria-hidden="true">→</span></Link>)}</nav>
      </section>

      <section className="about-testimonials" aria-labelledby="testimonials-title">
        <div className="about-section-heading">
          <p className="homeopathy-kicker">{testimonials.kicker}</p>
          <h2 id="testimonials-title">{testimonials.title}</h2>
          <p>{testimonials.text}</p>
        </div>
        <div className="about-video-grid">
          {videoTestimonials.map((video) => <article key={video.id}><div className="about-video-frame"><iframe allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen loading="lazy" src={"https://www.youtube-nocookie.com/embed/" + video.id} title={video[typedLocale]} /></div><p>{video[typedLocale]}</p></article>)}
        </div>
      </section>

      <section className="about-review-archive" aria-labelledby="archive-title">
        <div className="about-section-heading"><p className="homeopathy-kicker">{testimonials.archiveTitle}</p><h2 id="archive-title">{testimonials.archiveTitle}</h2><p>{testimonials.archiveText}</p></div>
        <div className="about-review-grid">
          {testimonials.archiveCards.map((card) => (
            <a href={card.href} key={card.href} rel="noreferrer" target="_blank">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" loading="lazy" src={card.image} />
              <div><h3>{card.title}</h3><p>{card.text}</p><span>{testimonials.archiveAction} →</span></div>
            </a>
          ))}
        </div>
      </section>

      <section className="about-client-cabinet" aria-labelledby="client-cabinet-title">
        <h2 id="client-cabinet-title">{current.cabinet.heading}</h2>
        <p>{current.cabinet.body}</p>
        <p className="about-client-cabinet-prompt">{current.cabinet.prompt}</p>
        <a href={current.cabinet.href} rel="noreferrer" target="_blank">{current.cabinet.action}<span aria-hidden="true">→</span></a>
      </section>
    </main>
  );
}
