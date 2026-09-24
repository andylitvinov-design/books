import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicSiteHeader } from "@/components/public-site-header";
import { getHomeopathyLocaleParams, isSupportedLocale } from "@/data/remedies";
import type { Locale } from "@/data/remedies";
import { metadataBaseFor } from "@/data/site-metadata";

type PageProps = { params: Promise<{ locale: string }> };

const copy = {
  ru: {
    title: "Обо мне — Holistic House",
    description: "Andrii Litvinov — консультант, фасилитатор и преподаватель Holistic House.",
    kicker: "Обо мне",
    heading: "Andrii Litvinov",
    lead: "Консультант, фасилитатор и преподаватель, работающий на пересечении системных расстановок, образной работы, телесных практик и архетипического исследования.",
    intro: "Более 20 лет я веду группы и обучающие форматы, исследуя, как человек принимает решения, строит отношения, проходит внутренние переходы и раскрывает собственный потенциал.",
    sections: [
      { title: "Системная работа", text: "Расстановки, работа с динамиками систем, бизнес-проектами, отношениями и повторяющимися жизненными сценариями." },
      { title: "Образы и тело", text: "Подготовка в практической психологии и символдраме, работа с образами, субличностями, телесным опытом и внутренними состояниями." },
      { title: "Архетипы и традиции", text: "Исследование мистерий, архетипов, ритуальных структур и символических систем как пространства личного опыта и развития." },
    ],
    practice: "Сейчас работаю в Торонто и онлайн. В Holistic House я объединяю эти направления в три основных формата: бизнес-расстановки, Алхимия души / психогомеопатия и архетипические расстановки.",
    action: "Смотреть услуги",
  },
  en: {
    title: "About — Holistic House",
    description: "Andrii Litvinov — consultant, facilitator, and teacher at Holistic House.",
    kicker: "About",
    heading: "Andrii Litvinov",
    lead: "Consultant, facilitator, and teacher working at the intersection of systemic constellations, imagery, embodied practices, and archetypal exploration.",
    intro: "For more than 20 years I have facilitated groups and learning spaces, exploring how people make decisions, build relationships, move through inner transitions, and develop their potential.",
    sections: [
      { title: "Systemic work", text: "Constellations and work with system dynamics, business projects, relationships, and recurring life patterns." },
      { title: "Imagery & embodiment", text: "Background in practical psychology and Symbol Drama, with work involving imagery, subpersonalities, embodied experience, and inner states." },
      { title: "Archetypes & traditions", text: "Exploration of mysteries, archetypes, ritual structures, and symbolic systems as spaces for personal experience and development." },
    ],
    practice: "I currently work in Toronto and online. At Holistic House I bring these strands together in three main formats: Business Constellations, Alchemy of the Soul / Psychohomeopathy, and Archetypal Constellations.",
    action: "Explore services",
  },
} as const;

export function generateStaticParams() { return getHomeopathyLocaleParams(); }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return { title: "Not found" };
  const current = copy[locale];
  return {
    metadataBase: metadataBaseFor(),
    title: current.title,
    description: current.description,
    alternates: {
      canonical: "/" + locale + "/about",
      languages: { ru: "/ru/about", en: "/en/about" },
    },
  };
}

export default async function AboutPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const current = copy[locale as Locale];

  return (
    <main className="about-shell" lang={locale}>
      <PublicSiteHeader locale={locale} />

      <section className="about-hero">
        <div className="about-hero-copy">
          <p className="homeopathy-kicker">{current.kicker}</p>
          <h1>{current.heading}</h1>
          <p className="about-lead">{current.lead}</p>
          <p>{current.intro}</p>
        </div>
        <div className="about-hero-photo" aria-hidden="true">
          <Image src="/images/holistic-house/hero-olive-incense.webp" alt="" fill sizes="(max-width: 767px) 100vw, 42vw" />
        </div>
      </section>

      <section className="about-grid">
        {current.sections.map((section) => (
          <article key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.text}</p>
          </article>
        ))}
      </section>

      <section className="about-practice">
        <p>{current.practice}</p>
        <Link href={"/" + locale + "/services"}>{current.action}<span aria-hidden="true">→</span></Link>
      </section>
    </main>
  );
}
