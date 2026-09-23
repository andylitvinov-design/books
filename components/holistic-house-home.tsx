"use client";

import Link from "next/link";
import { useState } from "react";
import { SiteNavigation } from "@/components/site-navigation";

import type { Locale } from "@/data/remedies";

const copy = {
  ru: {
    wordmark: "Библиотеки · практики · исследование", homeLabel: "Holistic House — главная", eyebrow: "Пространство для внимательного изучения", intro: "Книги, справочные материалы и цифровые инструменты — в одном доме.", explore: "Выбрать библиотеку", note: "Читать. Изучать. Возвращаться.", available: "01 / Уже доступно", sources: "Начните с источников", books: "Библиотека книг", booksText: "Опубликованные тексты об алхимических и даосских практиках, традиции Майя. Поиск по книгам и главам.", openCollection: "Открыть собрание", homeopathy: "Гомеопатия", homeopathyText: "Справочная библиотека препаратов с материалами из источников, поиском и сохранёнными записями.", visitLibrary: "Перейти к библиотеке", product: "02 / Цифровой продукт", productLead: "Ваша библиотека под рукой.", productText: "Продукт внутри Holistic House для чтения и работы со справочными материалами. Книги, библиотека препаратов и сохранённые записи доступны через существующие разделы.", openRemedies: "Открыть препараты", planned: "03 / В планах", directions: "Будущие направления", directionsText: "Темы, которые мы планируем развивать. Материалы и услуги по этим направлениям пока не представлены.", psychology: "Психология", hypnotherapy: "Гипнотерапия", constellations: "Системные и семейные расстановки", disclaimer: "Справочные материалы предназначены для изучения и не заменяют медицинскую консультацию.", booksLink: "К книгам",
  },
  en: {
    wordmark: "Libraries · practice · research", homeLabel: "Holistic House — home", eyebrow: "A space for attentive study", intro: "Books, reference materials, and digital tools — under one roof.", explore: "Explore the libraries", note: "Read. Study. Return.", available: "01 / Available now", sources: "Begin with the sources", books: "Book library", booksText: "Published texts on alchemical and Daoist practices and the Maya tradition. Search across books and chapters.", openCollection: "Open the collection", homeopathy: "Homeopathy", homeopathyText: "A reference library of remedies with source materials, search, and saved entries.", visitLibrary: "Visit the library", product: "02 / Digital product", productLead: "Your library, close at hand.", productText: "A Holistic House product for reading and working with reference materials. Books, the remedy library, and saved entries are available through the existing sections.", openRemedies: "Open remedies", planned: "03 / In development", directions: "Future directions", directionsText: "Topics we plan to develop. Materials and services in these areas are not available yet.", psychology: "Psychology", hypnotherapy: "Hypnotherapy", constellations: "Systemic and family constellations", disclaimer: "Reference materials are for study and do not replace medical advice or a consultation with a qualified professional.", booksLink: "To books",
  },
} as const;

type HolisticHouseHomeProps = { locale?: Locale };

export function HolisticHouseHome({ locale: initialLocale = "ru" }: HolisticHouseHomeProps) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const text = copy[locale];
  return (
    <main className="house-home">
      <header className="house-header">
        <Link className="house-wordmark" href="/" aria-label={text.homeLabel}>Holistic House<span>{text.wordmark}</span></Link>
        <SiteNavigation locale={locale} onLocaleChange={setLocale} />
      </header>

      <section className="house-hero" aria-labelledby="house-title">
        <div className="house-hero-inner">
          <p className="house-eyebrow">{text.eyebrow}</p>
          <h1 id="house-title">Holistic<br /><em>House</em><span aria-hidden="true">.</span></h1>
          <div className="house-hero-bottom">
            <p>{text.intro}</p>
            <Link className="house-link" href="#libraries">{text.explore} <span aria-hidden="true">↓</span></Link>
          </div>
        </div>
        <span className="house-hero-note" aria-hidden="true">{text.note}</span>
      </section>

      <section className="house-section" id="libraries" aria-labelledby="house-libraries-title">
        <div className="house-section-heading"><p className="house-eyebrow">{text.available}</p><h2 id="house-libraries-title">{text.sources}</h2></div>
        <div className="house-library-list">
          <Link href="/books" className="house-library-row"><span className="house-row-number">I</span><div><h3>{text.books}</h3><p>{text.booksText}</p><span className="house-row-action">{text.openCollection} <span aria-hidden="true">↗</span></span></div></Link>
          <Link href={`/${locale}/homeopathy`} className="house-library-row"><span className="house-row-number">II</span><div><h3>{text.homeopathy}</h3><p>{text.homeopathyText}</p><span className="house-row-action">{text.visitLibrary} <span aria-hidden="true">↗</span></span></div></Link>
        </div>
      </section>

      <section className="house-product" id="psialchemy" aria-labelledby="house-product-title">
        <div className="house-product-inner"><p className="house-eyebrow">{text.product}</p><h2 id="house-product-title">PsiAlchemy</h2><p className="house-product-lead">{text.productLead}</p><p>{text.productText}</p><Link className="house-link" href={`/${locale}/homeopathy/remedies`}>{text.openRemedies} <span aria-hidden="true">↗</span></Link></div>
      </section>

      <section className="house-section house-directions" aria-labelledby="house-directions-title">
        <div className="house-section-heading"><p className="house-eyebrow">{text.planned}</p><h2 id="house-directions-title">{text.directions}</h2><p>{text.directionsText}</p></div>
        <ul><li>{text.psychology}</li><li>{text.hypnotherapy}</li><li>{text.constellations}</li></ul>
      </section>
      <footer className="house-footer"><Link className="house-wordmark" href="/">Holistic House</Link><p>{text.disclaimer}</p><Link className="house-link" href="/books">{text.booksLink} <span aria-hidden="true">↗</span></Link></footer>
    </main>
  );
}
