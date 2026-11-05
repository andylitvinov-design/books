"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import type { PublicLocale } from "@/lib/public-locales";
import type { SiteSearchResult, SiteSearchKind } from "@/lib/site-search-index";
import styles from "./site-search.module.css";

const words = {
  en: {
    open: "Search Holistic House", heading: "Search the site", close: "Close search",
    label: "Search services, courses, tests and materials", placeholder: "What are you looking for?",
    prompt: "Search by a word or topic, or explore a section.",
    searching: "Finding matches…", empty: "No matches. Try another word.",
    error: "Search is temporarily unavailable. Try a section below.",
    count: "results", quick: ["Services", "Tests", "Academy", "Materials"],
    types: { service: "Service", course: "Course", test: "Test", material: "Material", article: "Article", video: "Video" },
  },
  ru: {
    open: "Поиск по Holistic House", heading: "Поиск по сайту", close: "Закрыть поиск",
    label: "Поиск услуг, курсов, тестов и материалов", placeholder: "Что вы хотите найти?",
    prompt: "Введите слово или тему либо откройте раздел.",
    searching: "Ищем совпадения…", empty: "Ничего не найдено. Попробуйте другое слово.",
    error: "Поиск временно недоступен. Выберите раздел ниже.",
    count: "результатов", quick: ["Услуги", "Тесты", "Академия", "Материалы"],
    types: { service: "Услуга", course: "Курс", test: "Тест", material: "Материал", article: "Статья", video: "Видео" },
  },
  es: {
    open: "Buscar en Holistic House", heading: "Buscar en el sitio", close: "Cerrar búsqueda",
    label: "Buscar servicios, cursos, tests y materiales", placeholder: "¿Qué estás buscando?",
    prompt: "Escribe una palabra o tema, o elige una sección.",
    searching: "Buscando…", empty: "Sin resultados. Prueba otra palabra.",
    error: "Búsqueda temporalmente no disponible. Explora las secciones.",
    count: "resultados", quick: ["Servicios", "Tests", "Academia", "Materiales"],
    types: { service: "Servicio", course: "Curso", test: "Test", material: "Material", article: "Artículo", video: "Vídeo" },
  },
} as const;

export function SiteSearch({ locale, pathname }: { locale: PublicLocale; pathname: string }) {
  const router = useRouter();
  const copy = words[locale];
  const searchId = useId();
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SiteSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus();
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  useEffect(() => {
    // Navigation or a language change always closes an old search panel.
    setOpen(false);
    setQuery("");
    setResults([]);
  }, [pathname, locale]);

  useEffect(() => {
    const value = query.trim();
    if (!open || value.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setFailed(false);
      try {
        const response = await fetch("/api/public-search", {
          method: "POST", cache: "no-store", signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: value, locale }),
        });
        if (!response.ok) throw new Error("Search unavailable");
        const data: { results?: SiteSearchResult[] } = await response.json();
        if (!controller.signal.aborted) setResults(Array.isArray(data.results) ? data.results : []);
      } catch {
        if (!controller.signal.aborted) {
          setFailed(true);
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [open, query, locale]);

  const quick = [
    "/" + locale + "/services",
    "/" + locale + "/tests",
    "/" + locale + "/academy",
    "/" + locale + "/library",
  ];
  const term = query.trim();
  function firstResult() {
    if (results[0]?.href.startsWith("/") && !results[0].href.startsWith("//")) {
      setOpen(false);
      router.push(results[0].href);
    }
  }
  function onChange(value: string) {
    setQuery(value);
    setResults([]);
    setLoading(value.trim().length >= 2);
    setFailed(false);
  }
  return <div className={styles.root} ref={root} data-site-search>
    <button className={styles.trigger} ref={trigger} type="button" aria-label={copy.open}
      aria-expanded={open} aria-controls={searchId}
      data-site-search-trigger onClick={() => setOpen(value => !value)}>
      <Search aria-hidden="true" />
    </button>
    {open && <section className={styles.panel} id={searchId} aria-label={copy.heading} data-site-search-panel>
      <div className={styles.header}>
        <h2 className={styles.heading}>{copy.heading}</h2>
        <button className={styles.close} type="button" aria-label={copy.close} onClick={() => {
          setOpen(false);
          trigger.current?.focus();
        }}><X aria-hidden="true" /></button>
      </div>
      <label className={styles.label} htmlFor={listId}>{copy.label}</label>
      <form role="search" onSubmit={event => { event.preventDefault(); firstResult(); }}>
        <div className={styles.field}>
          <Search aria-hidden="true" />
          <input className={styles.input} id={listId} ref={input}
            type="search" autoComplete="off" maxLength={80} value={query} onChange={event => onChange(event.target.value)}
            placeholder={copy.placeholder} aria-label={copy.label} />
        </div>
      </form>
      <p className={styles.status} role="status" aria-live="polite">
        {term.length < 2 ? copy.prompt : failed ? copy.error : loading ? copy.searching :
          results.length ? results.length + " " + copy.count : copy.empty}
      </p>
      {term.length >= 2 && !loading && !failed && <div className={styles.results}>
        {results.map((item, index) => {
          const description = <><span className={styles.kind}>{copy.types[item.kind as SiteSearchKind] || item.kind}</span>
            <span className={styles.name}>{item.title}</span>
            {item.description && <span className={styles.description}>{item.description}</span>}</>;
          const key = item.kind + ":" + item.href + ":" + index;
          return item.href.startsWith("https://")
            ? <a className={styles.result} key={key} href={item.href} target="_blank" rel="noopener noreferrer">{description}</a>
            : <Link className={styles.result} key={key} href={item.href} prefetch={false} onClick={() => setOpen(false)}>{description}</Link>;
        })}
      </div>}
      {(term.length < 2 || failed || (!loading && !results.length)) && <div className={styles.quickLinks}>
        {quick.map((href, index) => <Link href={href} key={href} prefetch={false} onClick={() => setOpen(false)}>{copy.quick[index]}</Link>)}
      </div>}
    </section>}
  </div>;
}
