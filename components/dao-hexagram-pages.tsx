import Link from "next/link";
import { notFound } from "next/navigation";
import { LibraryBackLink } from "@/components/library-hub";
import { PublicSiteHeader } from "@/components/public-site-header";
import { PublicConsultationCta } from "@/components/public-consultation-cta";
import { DaoHexagramDirectory, type DaoHexagramEntry } from "./dao-hexagram-directory";
import { DaoHexagramGlyph } from "./dao-hexagram-glyph";
import { DaoDivinationPanel } from "./dao-divination-panel";
import { archivePhotoFor, daoAuthorHexagramNumbers, getHexagram, hexagramEssence, hexagramTitle, hexagrams, trigramInfo } from "@/data/dao-hexagrams.mjs";
import authorRecords from "@/data/dao-hexagram-author.json";
import { getDaoEditorialHexagramText } from "@/data/dao-hexagrams-editorial.mjs";
import styles from "./dao-hexagrams.module.css";

export type DaoLocale = "ru" | "en" | "es";
const authorByNumber = new Map(authorRecords.map((record) => [record.number, record]));

const copy = {
  ru: {
    kicker: "Даосская традиция · И-Цзин", heading: "64 гексаграммы Книги Перемен",
    lead: "Каждый символ — сочетание двух триграмм. Исследуйте образы, смысл ситуации и шаги для размышления. Оригинальные авторские трактовки сохранены без пересказа.",
    provenance: "12 исходных авторских публикаций сохранены без изменений. Для остальных 52 подготовлены новые полные толкования в том же образном формате; это редакционное продолжение, а не найденные авторские оригиналы.",
    sourceBook: "Открыть исходную главу книги", caution: "И-Цзин здесь представлен как культурная и рефлексивная традиция, не как гарантированный прогноз и не как медицинская диагностика.",
    authorHeading: "Авторское толкование", noteRu: "Оригинальный текст автора на русском языке.", referenceHeading: "Краткое традиционное значение",
    editorialHeading: "Новое толкование в авторском стиле", editorialNote: "Новая редакционная интерпретация, подготовленная по запросу автора на русском языке. Не является ранее опубликованным текстом Андрея.",
    missing: "Развёрнутое авторское толкование для этого символа в проверенных материалах не найдено. Карточка содержит базовые сведения и будет дополнена только после подтверждения источника.",
    photo: "Иллюстрация из авторской публикации", themePhoto: "Тематическое фото из архивной коллекции Дао",
    source: "Читать исходную публикацию", privateArchive: "Исходный текст сохранён в личном архиве автора; публичной ссылки пока нет.",
    back: "← Все 64 гексаграммы", upper: "Верх", lower: "Низ", previous: "← Предыдущая", next: "Следующая →",
    strategyNote: "Исторические цитаты и ассоциации приведены в авторской редакции; они не проверялись как дословные цитаты классиков.",
  },
  en: {
    kicker: "Daoist tradition · I Ching", heading: "64 hexagrams of the Book of Changes",
    lead: "Each symbol joins two trigrams. Explore its traditional meaning and the author's original reflective interpretations where available.",
    provenance: "12 verified original author texts remain unchanged. The other 52 now have full newly written interpretations in the same archetypal format, clearly marked as editorial continuations, not original author publications.",
    sourceBook: "Read the source book chapter", caution: "A cultural and reflective reference, not a guaranteed prediction or medical guidance.",
    authorHeading: "Original interpretation", noteRu: "Original author text in Russian, preserved as written.", referenceHeading: "Traditional reference meaning",
    editorialHeading: "New interpretation in the author’s style", editorialNote: "New editorial text commissioned for this collection (in Russian); not presented as a previously published original by Andrey.",
    missing: "No verified extended author interpretation was found for this symbol. The card contains a short reference note until the original source is confirmed.",
    photo: "Photo from the original author publication", themePhoto: "Thematic archival Dao collection photo",
    source: "Open original publication", privateArchive: "Source text held in the author's archive; no public link available.",
    back: "← All 64 hexagrams", upper: "Above", lower: "Below", previous: "← Previous", next: "Next →",
    strategyNote: "Historical quotations and associations are reproduced as written by the author and have not been verified as literal classical quotations.",
  },
  es: {
    kicker: "Tradición taoísta · I Ching", heading: "64 hexagramas del Libro de los Cambios",
    lead: "Cada símbolo reúne dos trigramas. Explora su significado tradicional y las interpretaciones originales del autor cuando estén disponibles.",
    provenance: "Conservamos 12 textos originales verificados. Los otros 52 símbolos tienen interpretaciones nuevas y completas en el mismo formato, señaladas como continuaciones editoriales, no publicaciones originales.",
    sourceBook: "Leer el capítulo del libro", caution: "Referencia cultural y reflexiva; no es una predicción garantizada ni un diagnóstico médico.",
    authorHeading: "Interpretación original", noteRu: "Texto original del autor en ruso, conservado sin cambios.", referenceHeading: "Significado tradicional",
    editorialHeading: "Nueva interpretación en el estilo del autor", editorialNote: "Texto editorial nuevo, preparado a petición del autor en ruso; no se presenta como publicación original anterior de Andrey.",
    missing: "Aún no se ha confirmado un texto original extenso para este símbolo. La tarjeta contiene una nota de referencia.",
    photo: "Imagen de la publicación original", themePhoto: "Imagen temática del archivo taoísta",
    source: "Ver publicación original", privateArchive: "Texto conservado en el archivo privado del autor; no hay enlace público.",
    back: "← Los 64 hexagramas", upper: "Arriba", lower: "Abajo", previous: "← Anterior", next: "Siguiente →",
    strategyNote: "Las citas y asociaciones históricas siguen la redacción del autor; no se han verificado como citas literales de los clásicos.",
  },
} as const;

function entryFor(number: number, locale: DaoLocale): DaoHexagramEntry {
  const item = getHexagram(number);
  if (!item) throw new Error("Unknown hexagram " + number);
  const author = authorByNumber.get(number);
  return {
    number, hanzi: item.hanzi, ru: item.ru, en: item.en, es: item.es,
    title: hexagramTitle(item, locale), upper: item.upper, lower: item.lower,
    photo: archivePhotoFor(item, author?.photo), essence: hexagramEssence(item, locale),
    author: Boolean(author),
  };
}

export function DaoHexagramsIndex({ locale }: { locale: DaoLocale }) {
  const labels = copy[locale];
  return (
    <main className={styles.shell} lang={locale}>
      <PublicSiteHeader locale={locale} />
      <LibraryBackLink locale={locale} />
      <section className={styles.hero}>
        <div><p className={styles.kicker}>{labels.kicker}</p><h1>{labels.heading}</h1><p>{labels.lead}</p></div>
        <span className={styles.heroSymbol} aria-hidden="true">☯</span>
      </section>
      <nav className={styles.featuredNav} aria-label={labels.sourceBook}>
        <Link href={"/" + locale + "/books/dao-yijing-predictions"}>{labels.sourceBook} →</Link>
      </nav>
      <DaoDivinationPanel locale={locale} />
      <DaoHexagramDirectory locale={locale} entries={hexagrams.map((item) => entryFor(item.number, locale))} />
      <p className={styles.underNotice}>{labels.provenance} {labels.caution}</p>
      <PublicConsultationCta locale={locale} />
    </main>
  );
}

export function DaoHexagramDetails({ locale, number }: { locale: DaoLocale; number: number }) {
  const item = getHexagram(number);
  if (!item) notFound();
  const labels = copy[locale];
  const author = authorByNumber.get(number);
  const editorialText = author ? null : getDaoEditorialHexagramText(number);
  const title = hexagramTitle(item, locale);
  const photo = archivePhotoFor(item, author?.photo);
  const above = trigramInfo[item.upper][locale];
  const below = trigramInfo[item.lower][locale];
  return (
    <main className={styles.shell} lang={locale}>
      <PublicSiteHeader locale={locale} />
      <LibraryBackLink locale={locale} />
      <nav className={styles.detailTop}><Link className={styles.backLink} href={"/" + locale + "/dao/hexagrams"}>{labels.back}</Link></nav>
      <div className={styles.detail}>
        <figure className={styles.detailFigure}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt={author?.photo ? labels.photo : labels.themePhoto} loading="eager" decoding="async" />
          <figcaption>{author?.photo ? labels.photo : labels.themePhoto}</figcaption>
        </figure>
        <section className={styles.detailIntro}>
          <p className={styles.kicker}>{labels.kicker} · № {number} · {item.hanzi}</p>
          <div className={styles.detailHeader}>
            <DaoHexagramGlyph upper={item.upper} lower={item.lower} label={"Hexagram " + number} />
            <h1>{title}</h1>
          </div>
          <p className={styles.detailTrigrams}>{labels.upper}: {above} · {labels.lower}: {below}</p>
          <p>{hexagramEssence(item, locale)}</p>
          <small className={styles.provenance}>{author ? labels.noteRu : labels.editorialNote}</small>
        </section>
      </div>
      {author ? (
        <article className={styles.originalPanel} aria-label={labels.authorHeading}>
          <p className={styles.kicker}>{labels.authorHeading}</p>
          <h2>{item.hanzi} · {title}</h2>
          <div className={styles.originalText} lang="ru">
            {author.text.split(/\n\n+/).filter(Boolean).map((part, index) => <p key={index}>{part}</p>)}
          </div>
          <p className={styles.provenance}>{labels.strategyNote}</p>
          {author.source ? (
            <a className={styles.sourceLink} href={author.source} target="_blank" rel="noopener noreferrer">{labels.source} ↗</a>
          ) : <p className={styles.provenance}>{labels.privateArchive}</p>}
        </article>
      ) : editorialText ? (
        <article className={styles.originalPanel} aria-label={labels.editorialHeading}>
          <p className={styles.kicker}>{labels.editorialHeading}</p>
          <h2>{item.hanzi} · {title}</h2>
          <p className={styles.provenance}>{labels.editorialNote}</p>
          <div className={styles.originalText} lang="ru">
            {editorialText.split(/\n\n+/).filter(Boolean).map((part, index) => <p key={index}>{part}</p>)}
          </div>
          <p className={styles.provenance}>{labels.caution}</p>
        </article>
      ) : (
        <section className={styles.referencePanel}>
          <h2>{labels.referenceHeading}</h2><p>{hexagramEssence(item, locale)}</p><p>{labels.missing}</p>
        </section>
      )}
      <nav className={styles.related} aria-label={labels.heading}>
        <span>{number > 1 ? <Link href={"/" + locale + "/dao/hexagrams/" + (number - 1)}>{labels.previous}</Link> : null}</span>
        <Link href={"/" + locale + "/dao/hexagrams"}>{labels.back}</Link>
        <span>{number < 64 ? <Link href={"/" + locale + "/dao/hexagrams/" + (number + 1)}>{labels.next}</Link> : null}</span>
      </nav>
      <PublicConsultationCta locale={locale} />
    </main>
  );
}

export function daoHexagramAuthorCount() { return daoAuthorHexagramNumbers.length; }
