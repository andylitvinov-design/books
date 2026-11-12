"use client";

import Link from "next/link";
import { Sparkles, UserRound } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchVideoCreditCatalog, fetchVideoCreditStatus } from "@/lib/video-credits/client.mjs";
import { formatHeaderCredits, headerCreditPercentage } from "@/lib/video-credits/header-display.mjs";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./header-credit-profile.module.css";

type CreditState =
  | { kind: "loading" | "guest" | "disabled" | "unavailable"; balance: null; capacity: 0 }
  | { kind: "ready"; balance: number; capacity: number };

const labels = {
  en: { title: "Video credits", profile: "My profile", balance: "Credits remaining",
    open: "Open video-credit balance", cabinet: "Open my cabinet",
    guest: "Sign in to see your balance.", disabled: "Credit balance is not enabled yet.",
    unavailable: "Balance temporarily unavailable.", loading: "Checking your balance…" },
  ru: { title: "Видеокредиты", profile: "Мой профиль", balance: "Осталось кредитов",
    open: "Открыть баланс видеокредитов", cabinet: "Открыть мой кабинет",
    guest: "Войдите, чтобы увидеть баланс.", disabled: "Учёт видеокредитов пока не включён.",
    unavailable: "Баланс временно недоступен.", loading: "Проверяем баланс…" },
  es: { title: "Créditos de vídeo", profile: "Mi perfil", balance: "Créditos restantes",
    open: "Abrir saldo de créditos", cabinet: "Abrir mi espacio",
    guest: "Inicia sesión para ver tu saldo.", disabled: "El saldo aún no está habilitado.",
    unavailable: "Saldo no disponible temporalmente.", loading: "Consultando saldo…" },
} as const;

/** Shared read-only visual balance. This never creates or spends credits. */
export function HeaderCreditProfile({ locale = "en" }: { locale?: PublicLocale }) {
  const t = labels[locale];
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const requestRef = useRef(0);
  const [state, setState] = useState<CreditState>({ kind: "loading", balance: null, capacity: 0 });

  const refresh = useCallback(async () => {
    const request = ++requestRef.current;
    try {
      const catalog = await fetchVideoCreditCatalog();
      if (request !== requestRef.current) return;
      if (!catalog.ready) {
        setState({ kind: "disabled", balance: null, capacity: 0 });
        return;
      }
      const status = await fetchVideoCreditStatus();
      if (request !== requestRef.current) return;
      if (!Number.isSafeInteger(status.balanceCredits) || status.balanceCredits < 0) {
        throw new Error("INVALID_VIDEO_CREDIT_STATUS");
      }
      const capacity = Math.max(1, catalog.starterGrant + catalog.monthlyGrant, status.balanceCredits);
      setState({ kind: "ready", balance: status.balanceCredits, capacity });
    } catch (error) {
      if (request !== requestRef.current) return;
      setState({ kind: error instanceof Error && error.message === "SIGN_IN_REQUIRED"
        ? "guest" : "unavailable", balance: null, capacity: 0 });
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    const onChanged = () => { void refresh(); };
    window.addEventListener("focus", onVisible);
    window.addEventListener("hh:video-credits-changed", onChanged);
    return () => {
      ++requestRef.current;
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("hh:video-credits-changed", onChanged);
    };
  }, [refresh]);

  useEffect(() => {
    const onOutside = (event: PointerEvent) => {
      if (detailsRef.current?.open && event.target instanceof Node &&
          !detailsRef.current.contains(event.target)) detailsRef.current.open = false;
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !detailsRef.current?.open) return;
      detailsRef.current.open = false;
      detailsRef.current.querySelector<HTMLElement>("summary")?.focus();
    };
    document.addEventListener("pointerdown", onOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  const known = state.kind === "ready";
  const displayed = formatHeaderCredits(state.balance);
  const percent = known ? headerCreditPercentage(state.balance, state.capacity) : null;
  const detail = state.kind === "ready" ? t.balance : state.kind === "loading" ? t.loading
    : state.kind === "guest" ? t.guest : state.kind === "disabled" ? t.disabled : t.unavailable;
  const cabinet = "/" + (locale === "es" ? "en" : locale) + "/app/portrait";

  return <div className={styles.widget} data-hh-credit-profile data-credit-state={state.kind}>
    <details className={styles.credits} ref={detailsRef}>
      <summary className={styles.summary}
        aria-label={t.open + ": " + (known ? displayed : detail)} title={t.title}>
        <Sparkles className={styles.sparkle} size={13} aria-hidden="true" />
        <span className={styles.readout}>
          <span className={styles.number} data-hh-credit-count aria-live="polite">{displayed}</span>
          <span className={styles.track} role={known ? "progressbar" : undefined}
            aria-label={known ? t.balance : undefined}
            aria-valuemin={known ? 0 : undefined} aria-valuemax={known ? 100 : undefined}
            aria-valuenow={known && percent !== null ? percent : undefined}>
            <span className={styles.fill} style={{ width: (percent ?? 0) + "%" }} />
          </span>
        </span>
      </summary>
      <div className={styles.popover} data-hh-credit-details>
        <small>{t.title}</small>
        <strong>{displayed}</strong>
        <p>{detail}</p>
        <Link href={cabinet} prefetch={false}>{t.cabinet}</Link>
      </div>
    </details>
    <Link className={styles.profile} href={cabinet} prefetch={false}
      aria-label={t.profile} title={t.profile} data-hh-credit-profile-link>
      <UserRound size={19} strokeWidth={1.65} aria-hidden="true" />
    </Link>
  </div>;
}
