"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import styles from "./catalog-star-rating.module.css";

export type CatalogRatingKind = "video" | "talisman" | "service";
export type StarSummary = { count: number; average: number; mine: number | null };
type Stars = Record<string, StarSummary>;
const EMPTY: StarSummary = { count: 0, average: 0, mine: null };
const WORDS = {
  en: { rating: "Rating", all: "All ratings", min: "stars and up", unrated: "No ratings yet", voters: "ratings",
    choose: "Rate this item", saved: "Rating saved", error: "Could not save your rating. Please retry.",
    login: "Sign in with Google to rate", unavailable: "Rating temporarily unavailable", own: "You cannot rate your own service" },
  ru: { rating: "Оценки", all: "Все оценки", min: "звёзд и выше", unrated: "Пока нет оценок", voters: "оценок",
    choose: "Поставить оценку", saved: "Оценка сохранена", error: "Не удалось сохранить оценку. Повторите.",
    login: "Войдите через Google, чтобы оценить", unavailable: "Оценки временно недоступны", own: "Нельзя оценивать свою услугу" },
  es: { rating: "Valoración", all: "Todas las valoraciones", min: "estrellas o más", unrated: "Sin valoraciones", voters: "valoraciones",
    choose: "Valorar este elemento", saved: "Valoración guardada", error: "No se pudo guardar la valoración.",
    login: "Inicia sesión con Google para valorar", unavailable: "Valoraciones no disponibles", own: "No puedes valorar tu propio servicio" },
} as const;

function language(locale: string): "en" | "ru" | "es" {
  return locale === "ru" || locale === "es" ? locale : "en";
}
export function matchesStarFilter(rating: StarSummary | undefined, minimum: number) {
  return !minimum || Boolean(rating && rating.count > 0 && rating.average >= minimum);
}
export function sortByStars<T>(items: T[], key: (item: T) => string, ratings: Stars) {
  return [...items].sort((a, b) => {
    const left = ratings[key(a)] || EMPTY;
    const right = ratings[key(b)] || EMPTY;
    return right.average - left.average || right.count - left.count;
  });
}
export function useCatalogRatings(kind: CatalogRatingKind, ids: readonly string[]) {
  const keyList = ids.join(",");
  const [ratings, setRatings] = useState<Stars>({});
  const [unavailable, setUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    if (!keyList) { setRatings({}); setLoading(false); return; }
    setLoading(true); setUnavailable(false);
    // The endpoint bounds batches to 40 items. Fetch sequentially to avoid
    // a fan-out of Postgres connections on larger Academy archives.
    const load = async () => {
      const ids = [...new Set(keyList.split(",").filter(Boolean))];
      const collected: Stars = {};
      for (let offset=0; offset<ids.length; offset+=40) {
        const url = "/api/catalog/ratings?kind=" + encodeURIComponent(kind)
          + "&keys=" + encodeURIComponent(ids.slice(offset,offset+40).join(","));
        const response = await fetch(url, { credentials: "same-origin", cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (!response.ok || !data?.ratings || typeof data.ratings !== "object") throw new Error(data?.error || "RATINGS_UNAVAILABLE");
        Object.assign(collected,data.ratings);
      }
      if (!controller.signal.aborted) setRatings(collected);
    };
    void load()
      .catch(() => { if (!controller.signal.aborted) setUnavailable(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [kind, keyList]);
  // Several catalog sections can show the same service on one page. Keep their
  // counters consistent after a single authenticated vote, without refetch loops.
  useEffect(() => {
    const update = (event: Event) => {
      const { kind: eventKind, key, rating } =
        (event as CustomEvent<{kind:CatalogRatingKind;key:string;rating:StarSummary}>).detail;
      if (eventKind === kind) setRatings(current => ({ ...current, [key]: rating }));
    };
    window.addEventListener("hh-catalog-rating-updated", update);
    return () => window.removeEventListener("hh-catalog-rating-updated", update);
  }, [kind]);
  const rate = useCallback(async (key: string, stars: number) => {
    const response = await fetch("/api/catalog/ratings", {
      method: "POST", credentials: "same-origin", cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, key, stars }),
    });
    const result = await response.json();
    if (!response.ok || !result?.rating) throw new Error(result?.error || "RATINGS_UNAVAILABLE");
    setRatings(current => ({ ...current, [key]: result.rating as StarSummary }));
    window.dispatchEvent(new CustomEvent("hh-catalog-rating-updated", { detail: {kind,key,rating:result.rating} }));
    return result.rating as StarSummary;
  }, [kind]);
  return { ratings, unavailable, loading, rate };
}

export function StarFilter({ locale, minimum, onChange }: {
  locale: string; minimum: number; onChange: (value: number) => void;
}) {
  const t = WORDS[language(locale)];
  return <label className={styles.filter} data-star-filter>
    <span>★ {t.rating}</span>
    <select value={minimum} onChange={event => onChange(Number(event.target.value))} aria-label={t.rating}>
      <option value={0}>{t.all}</option>
      {[5, 4, 3, 2, 1].map(value => <option key={value} value={value}>{value}★ {t.min}</option>)}
    </select>
  </label>;
}

export function CatalogStarRating({ locale, summary, onRate, unavailable = false, compact = false }: {
  locale: string; summary?: StarSummary; onRate?: (stars: number) => Promise<unknown>;
  unavailable?: boolean; compact?: boolean;
}) {
  const t = WORDS[language(locale)];
  const value = summary || EMPTY;
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [signIn, setSignIn] = useState(false);
  async function vote(stars: number) {
    if (!onRate || pending) return;
    setPending(true); setError(""); setNotice(""); setSignIn(false);
    try { await onRate(stars); setNotice(t.saved); }
    catch (cause) {
      const code = cause instanceof Error ? cause.message : "";
      if (code === "SIGN_IN_REQUIRED" || code === "ACCOUNT_REQUIRED") setSignIn(true);
      else setError(code === "SELF_REVIEW_NOT_ALLOWED" ? t.own : t.error);
    } finally { setPending(false); }
  }
  return <div className={styles.root + (compact ? " " + styles.compact : "")} data-catalog-star-rating>
    <div className={styles.summary} aria-label={t.rating}>
      <strong>{!unavailable && value.count > 0 ? value.average.toFixed(1) : "—"} <span aria-hidden="true">★</span></strong>
      <small>{unavailable ? t.unavailable : value.count > 0 ? value.count + " " + t.voters : t.unrated}</small>
    </div>
    {onRate && !unavailable && <div className={styles.stars} role="group" aria-label={t.choose}>
      {[1,2,3,4,5].map(stars => <button key={stars} type="button"
        aria-label={stars + " / 5"} aria-pressed={value.mine === stars}
        disabled={pending} className={value.mine === stars ? styles.chosen : ""}
        title={stars + " / 5"} onClick={() => void vote(stars)}>★</button>)}
    </div>}
    {signIn && <Link className={styles.message} href={"/" + language(locale) + "/app"}>{t.login}</Link>}
    {notice && <small className={styles.message} role="status">{notice}</small>}
    {error && <small className={styles.error} role="alert">{error}</small>}
  </div>;
}
