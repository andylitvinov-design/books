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

  const current = aboutBiography[locale as Locale];

  return (
    <main className="about-shell" lang={locale}>
      <PublicSiteHeader locale={locale as Locale} />

      <section className="about-introduction" aria-labelledby="about-title">
        <div className="about-portrait">
          <Image
            alt={current.photoAlt}
            fill
            priority
            sizes="(max-width: 767px) 100vw, (max-width: 1127px) 56vw, 660px"
            src="/images/holistic-house/andy-about.png"
          />
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
        <nav aria-label={current.explore.heading}>
          {current.explore.links.map((link) => <Link href={link.href} key={link.href}>{link.label}<span aria-hidden="true">→</span></Link>)}
        </nav>
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
