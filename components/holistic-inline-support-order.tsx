"use client";

import { useEffect, useState } from "react";
import { RemoteEnergySupportBooking, type EnergySupportMaster, type SupportRequestKind } from "@/components/remote-energy-support-booking";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./holistic-inline-support-order.module.css";

const copy = {
  en: { title: "Your personal request", loading: "Finding available practitioners…", failed: "The practitioner directory is temporarily unavailable.", retry: "Try again", close: "Close request" },
  ru: { title: "Ваш заказ", loading: "Загружаем доступных мастеров…", failed: "Список мастеров временно недоступен.", retry: "Повторить", close: "Закрыть форму" },
  es: { title: "Tu solicitud", loading: "Buscando profesionales disponibles…", failed: "El directorio no está disponible por el momento.", retry: "Reintentar", close: "Cerrar formulario" },
} as const;

export function HolisticInlineSupportOrder({ locale, kind, initialGoal, onKindChange, onClose }: {
  locale: PublicLocale;
  kind: SupportRequestKind;
  initialGoal: string;
  onKindChange: (kind: SupportRequestKind) => void;
  onClose: () => void;
}) {
  const [masters, setMasters] = useState<EnergySupportMaster[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const t = copy[locale];

  useEffect(() => {
    const controller = new AbortController();
    setFailed(false);
    setMasters(null);
    fetch("/api/public/remote-energy-support-masters?locale=" + locale, {
      credentials: "omit", signal: controller.signal,
    }).then(async response => {
      if (!response.ok) throw new Error("PRACTITIONERS_UNAVAILABLE");
      const data: unknown = await response.json();
      if (!data || typeof data !== "object" || !("masters" in data) ||
        !Array.isArray(data.masters)) throw new Error("INVALID_PRACTITIONERS");
      if (!controller.signal.aborted) setMasters(data.masters as EnergySupportMaster[]);
    }).catch(() => {
      if (!controller.signal.aborted) setFailed(true);
    });
    return () => controller.abort();
  }, [locale, attempt]);

  return (
    <aside className={styles.panel} id="holistic-inline-order" data-holistic-inline-order={kind}
      aria-labelledby="holistic-inline-order-title">
      <div className={styles.heading}>
        <h3 id="holistic-inline-order-title" tabIndex={-1}>{t.title}</h3>
        <button type="button" onClick={onClose} aria-label={t.close} className={styles.close}>× <span>{t.close}</span></button>
      </div>
      {!masters && !failed && <p className={styles.status} role="status">{t.loading}</p>}
      {failed && <div className={styles.status} role="alert">
        <p>{t.failed}</p>
        <button className={styles.retry} type="button" onClick={() => setAttempt(n => n + 1)}>{t.retry}</button>
      </div>}
      {masters && <RemoteEnergySupportBooking locale={locale} masters={masters}
        preferredPractitioner="" mode="inline" selectedKind={kind}
        initialGoal={initialGoal} onKindChange={onKindChange}/>}
    </aside>
  );
}
