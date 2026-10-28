"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getPublicServiceDetailHref } from "@/lib/practitioners/public-service-links.js";
import styles from "./practitioner-reviews.module.css";

type PublicReview = {
  id: string;
  displayName: string;
  rating: number;
  body: string;
  createdAt: string;
  updatedAt: string;
  serviceId: string;
  serviceSlug: string;
};
type ReviewList = {
  summary: { count: number; average: number };
  reviews: PublicReview[];
  page: number;
  hasMore: boolean;
};
type ServiceLabel = { id: string; slug: string; title: string };

const COPY = {
  en: {
    title: "Reviews of this practitioner", kicker: "EXPERIENCES", count: "service reviews",
    empty: "No published reviews yet. You can share your experience under a service.",
    note: "Reviews are submitted by Holistic House members. Service completion is not independently verified.",
    choose: "Leave a review for a service", write: "Write a review", loading: "Loading reviews…",
    error: "Reviews could not be loaded.", retry: "Try again", prev: "Previous", next: "Next",
    member: "Member review", edited: "Edited", stars: "out of 5 stars",
  },
  ru: {
    title: "Отзывы о мастере", kicker: "ОПЫТ УЧАСТНИКОВ", count: "отзывов об услугах",
    empty: "Опубликованных отзывов пока нет. Вы можете поделиться опытом на странице услуги.",
    note: "Отзывы оставляют участники Holistic House. Факт получения услуги отдельно не подтверждается.",
    choose: "Оставить отзыв об услуге", write: "Написать отзыв", loading: "Загружаем отзывы…",
    error: "Не удалось загрузить отзывы.", retry: "Повторить", prev: "Назад", next: "Далее",
    member: "Отзыв участника", edited: "Изменён", stars: "звёзд из 5",
  },
  es: {
    title: "Opiniones del profesional", kicker: "EXPERIENCIAS", count: "opiniones de servicios",
    empty: "Todavía no hay opiniones publicadas. Puedes compartir tu experiencia en la página del servicio.",
    note: "Las opiniones son de miembros de Holistic House. No se verifica por separado la realización del servicio.",
    choose: "Deja una opinión sobre un servicio", write: "Escribir opinión", loading: "Cargando opiniones…",
    error: "No se pudieron cargar las opiniones.", retry: "Reintentar", prev: "Anterior", next: "Siguiente",
    member: "Opinión de miembro", edited: "Editada", stars: "estrellas de 5",
  },
} as const;

export function PractitionerReviews({
  practitionerSlug, locale, services,
}: {
  practitionerSlug: string;
  locale: string;
  services: ServiceLabel[];
}) {
  const language = locale === "ru" || locale === "es" ? locale : "en";
  const t = COPY[language];
  const [data, setData] = useState<ReviewList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const byId = useMemo(() => new Map(services.map(service => [service.id, service])), [services]);
  const dateLocale = language === "ru" ? "ru-RU" : language === "es" ? "es-ES" : "en-CA";

  const load = useCallback(async (page: number, signal?: AbortSignal) => {
    setLoading(true);
    setError(false);
    try {
      const response = await fetch(
        "/api/marketplace/reviews?practitionerSlug=" + encodeURIComponent(practitionerSlug) + "&page=" + page,
        { cache: "no-store", credentials: "same-origin", signal },
      );
      const value = await response.json();
      if (!response.ok || !value?.summary || !Array.isArray(value?.reviews)) throw new Error("REVIEWS_UNAVAILABLE");
      if (!signal?.aborted) setData(value as ReviewList);
    } catch {
      if (!signal?.aborted) setError(true);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [practitionerSlug]);

  useEffect(() => {
    const controller = new AbortController();
    void load(1, controller.signal);
    return () => controller.abort();
  }, [load]);

  return (
    <section id="practitioner-reviews" className={styles.root} aria-labelledby="practitioner-reviews-heading">
      <div className={styles.heading}>
        <div>
          <p className={styles.kicker}>{t.kicker}</p>
          <h2 id="practitioner-reviews-heading">{t.title}</h2>
        </div>
        {data && (
          <div className={styles.score} aria-label={t.title} role="status">
            <strong>{data.summary.count ? data.summary.average.toFixed(1) : "—"}</strong>
            <span aria-hidden="true">★</span>
            <small>{data.summary.count} {t.count}</small>
          </div>
        )}
      </div>
      <p className={styles.note}>{t.note}</p>
      {loading && !data && <p className={styles.notice} role="status">{t.loading}</p>}
      {error && <p className={styles.notice} role="alert">
        {t.error} <button type="button" onClick={() => void load(data?.page || 1)}>{t.retry}</button>
      </p>}
      {data && !error && (
        <>
          {data.reviews.length === 0 ? <p className={styles.empty}>{t.empty}</p> : (
            <div className={styles.list}>
              {data.reviews.map(review => {
                const service = byId.get(review.serviceId);
                return (
                  <article key={review.id} className={styles.card}>
                    <div className={styles.cardTop}>
                      <div><strong>{review.displayName}</strong><small>{t.member}</small></div>
                      <div className={styles.stamp}>
                        <span aria-label={review.rating + " " + t.stars}>
                          {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                        </span>
                        <time dateTime={review.createdAt}>
                          {new Date(review.createdAt).toLocaleDateString(dateLocale)}
                        </time>
                      </div>
                    </div>
                    {service && <Link className={styles.service} href={
                      getPublicServiceDetailHref(locale, practitionerSlug, service.slug) + "#reviews"
                    }>{service.title}</Link>}
                    <p className={styles.body}>{review.body}</p>
                    {review.updatedAt !== review.createdAt && <small className={styles.note}>{t.edited}</small>}
                  </article>
                );
              })}
            </div>
          )}
          {(data.page > 1 || data.hasMore) && (
            <div className={styles.pagination}>
              <button type="button" disabled={loading || data.page <= 1}
                onClick={() => void load(data.page - 1)}>{t.prev}</button>
              <span>{data.page}</span>
              <button type="button" disabled={loading || !data.hasMore}
                onClick={() => void load(data.page + 1)}>{t.next}</button>
            </div>
          )}
        </>
      )}
      {services.length > 0 && (
        <div className={styles.leave}>
          <h3>{t.choose}</h3>
          <div className={styles.serviceLinks}>
            {services.map(service => (
              <Link key={service.id} href={
                getPublicServiceDetailHref(locale, practitionerSlug, service.slug) + "#reviews"
              }>
                <span>{service.title}</span><strong>{t.write} →</strong>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
