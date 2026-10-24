"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "./practitioner-articles-public.module.css";
import { ArticleSocialBar } from "@/components/practitioner-article-social";
import type { PublicLocale } from "@/lib/public-locales";

type ArticleCard = {
  id: string;
  slug: string;
  practitionerName: string;
  practitionerSlug: string;
  publishedAt: string;
  title: string;
  excerpt: string;
  coverPath: string;
  tags: string[];
  kind?: "article" | "note";
};
type SocialCounts = Record<string, { likes: number; comments: number }>;

export function ArticleDirectory({
  locale, articles, preview = false, social = {}, socialAvailable = false,
}: { locale: PublicLocale; articles: ArticleCard[]; preview?: boolean; social?: SocialCounts; socialAvailable?: boolean }) {
  const ru = locale === "ru", es = locale === "es";
  const [query, setQuery] = useState("");
  const [author, setAuthor] = useState("");
  const [topic, setTopic] = useState("");
  const [sort, setSort] = useState("new");

  const authors = useMemo(
    () => [...new Set(articles.map((a) => a.practitionerName).filter(Boolean))].sort(),
    [articles]
  );
  // Tags are from reviewed public article snapshots. Never fabricate subject counts.
  const topics = useMemo(() => {
    const totals = new Map<string, number>();
    for (const article of articles) {
      for (const tag of article.tags || []) {
        const value = String(tag).trim();
        if (value) totals.set(value, (totals.get(value) || 0) + 1);
      }
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], locale))
      .slice(0, 8).map(([name]) => name);
  }, [articles, locale]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return articles.filter((article) => (!author || article.practitionerName === author)
      && (!topic || (article.tags || []).includes(topic))
      && (!normalized || [
        article.title, article.excerpt, article.practitionerName,
        ...(article.tags || []),
      ].join(" ").toLocaleLowerCase().includes(normalized)))
      .sort((a, b) => sort === "az" ? a.title.localeCompare(b.title, locale)
        : (new Date(b.publishedAt).getTime() || 0) - (new Date(a.publishedAt).getTime() || 0));
  }, [articles, query, author, topic, sort, locale]);

  const visible = preview ? filtered.slice(0, 6) : filtered;
  const clear = () => { setQuery(""); setAuthor(""); setTopic(""); setSort("new"); };

  return (
    <section className={styles.directory + (preview ? " " + styles.feed : "")}
      aria-label={ru ? "Лента новостей мастеров" : es ? "Novedades de los mentores" : "Practitioner news feed"}
      data-practitioner-news-feed>
      <div className={styles.feedHeading}>
        <div>
          <h2>{ru ? "Новости и заметки мастеров" : es ? "Noticias y notas de los mentores" : "News & notes from practitioners"}</h2>
          <p>{ru ? "Идеи, наблюдения и новые материалы авторов. Выбирайте тему, читайте и обсуждайте." : es
            ? "Ideas, notas y nuevas publicaciones de los profesionales. Lee y participa." :
            "Short reflections and new articles, shared by practitioners. Read, like and discuss."}</p>
        </div>
        <Link prefetch={false} href={"/"+(locale==="es"?"en":locale)+"/app/practice?panel=materials&materialTab=articles"} className={styles.writeNote} data-community-write-note>
          {ru ? "Написать заметку" : es ? "Escribir nota" : "Write a note"} →
        </Link>
      </div>
      <div className={styles.articleFilters}>
        <label>{ru ? "Поиск" : es ? "Buscar" : "Search"}
          <input type="search" autoComplete="off" maxLength={100}
            value={query} onChange={(event) => setQuery(event.target.value)}
            placeholder={ru ? "Тема, статья, автор…" : es ? "Tema, título, autor…" : "Topic, article, author…"} />
        </label>
        <label>{ru ? "Автор" : es ? "Autor" : "Author"}
          <select value={author} onChange={(event) => setAuthor(event.target.value)}>
            <option value="">{ru ? "Все наставники" : es ? "Todos" : "All mentors"}</option>
            {authors.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <label>{ru ? "Порядок" : es ? "Orden" : "Sort"}
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="new">{ru ? "Сначала новые" : es ? "Recientes" : "Newest"}</option>
            <option value="az">A–Z</option>
          </select>
        </label>
        {(query || author || topic || sort !== "new") && (
          <button type="button" className={styles.reset} onClick={clear}>
            {ru ? "Сбросить" : es ? "Limpiar" : "Clear"}
          </button>
        )}
      </div>
      {topics.length > 0 && (
        <div className={styles.topicChips} role="group"
          aria-label={ru ? "Темы статей" : es ? "Temas de los artículos" : "Article topics"}>
          <button type="button" aria-pressed={!topic} className={!topic ? styles.selected : ""}
            onClick={() => setTopic("")}>{ru ? "Все темы" : es ? "Todos" : "All topics"}</button>
          {topics.map((name) => (
            <button key={name} type="button" aria-pressed={topic === name}
              className={topic === name ? styles.selected : ""}
              onClick={() => setTopic(name)}>{name}</button>
          ))}
        </div>
      )}
      <p className={styles.meta} role="status" aria-live="polite">
        {filtered.length} {ru ? "статей" : es ? "artículos" : filtered.length === 1 ? "article" : "articles"}
      </p>
      <div className={styles.grid}>
        {visible.map((article) => {
          const authorHref = article.practitionerSlug
            ? "/" + locale + "/masters/" + encodeURIComponent(article.practitionerSlug) : null;
          const date = new Date(article.publishedAt);
          const hasDate = article.publishedAt && !Number.isNaN(date.getTime());
          return (
            <article className={styles.card} key={article.id}>
              <Link className={styles.articleThumb} href={"/" + locale + "/articles/" + article.slug}
                aria-label={article.title}>
                {article.coverPath
                  ? <img src={article.coverPath} alt="" loading="lazy" />
                  : <span aria-hidden="true">✦</span>}
              </Link>
              <div className={styles.articleContent}>
                <p className={styles.byline}>
                  <span className={styles.kind}>{article.kind === "note"
                    ? (ru ? "Заметка" : es ? "Nota" : "Note")
                    : (ru ? "Статья" : es ? "Artículo" : "Article")}</span>
                  {authorHref ? <Link href={authorHref}>{article.practitionerName}</Link>
                    : article.practitionerName}
                  {hasDate ? <> · <time dateTime={article.publishedAt}>{date.toLocaleDateString(locale)}</time></> : null}
                </p>
                <h2><Link href={"/" + locale + "/articles/" + article.slug}>{article.title}</Link></h2>
                <p className={styles.excerpt}>{article.excerpt}</p>
                {socialAvailable && <ArticleSocialBar locale={locale} articleId={article.id}
                  commentHref={"/" + locale + "/articles/" + article.slug + "#discussion"}
                  initialLikes={social[article.id]?.likes || 0}
                  commentCount={social[article.id]?.comments || 0}/>}
                <div className={styles.articleActions}>
                  <Link href={"/" + locale + "/articles/" + article.slug} className={styles.primary}>
                    {ru ? "Читать статью" : es ? "Leer artículo" : "Read article"} →
                  </Link>
                  {authorHref ? <Link href={authorHref} className={styles.authorLink}>
                    {ru ? "Профиль мастера" : es ? "Ver mentor" : "Meet the mentor"} →
                  </Link> : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {!filtered.length && <div className={styles.empty}>
        <p>{ru ? "Здесь появятся первые заметки и статьи мастеров после проверки. Пока можно изучить профили и предложить свою публикацию." :
          es ? "Aquí aparecerán las primeras notas después de la revisión. Explora los perfiles o escribe tu nota." :
          "First practitioner notes will appear here after review. Explore mentors or write the first post."}</p>
        <div className={styles.emptyActions}>
          <Link href={"/"+locale+"/masters"}>{ru ? "Найти мастера" : es ? "Encontrar mentor" : "Find a practitioner"}</Link>
          <Link prefetch={false} href={"/"+(locale==="es"?"en":locale)+"/app/practice?panel=materials&materialTab=articles"}>
            {ru ? "Создать заметку" : es ? "Crear nota" : "Create a note"} →
          </Link>
        </div>
      </div>}
      {preview && <div className={styles.seeAll}>
        <Link href={"/" + locale + "/articles"}>
          {ru ? "Все статьи сообщества" : es ? "Todos los artículos" : "Explore all articles"} →
        </Link>
      </div>}
    </section>
  );
}
