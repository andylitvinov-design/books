"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { appFetch } from "@/lib/app/client-fetch";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./test-explorer-google-banner.module.css";

const copy = {
  en: { heading: "Your tests, matched to your priorities",
    intro: "The list below is sorted by the topics you chose. Your scores and private answers are never included in its URL.",
    google: "Sign in with Google", hint: "Bring your saved tests and progress into My Tests.",
    member: "Your account is connected", account: "Open My Tests and saved results",
    checking: "Checking your account…", error: "Google sign-in could not start. You can still take free tests without signing in.",
    private: "Signing in is optional. Existing results load only into your protected Cabinet." },
  ru: { heading: "Тесты по твоему запросу",
    intro: "Ниже тесты отсортированы по выбранным темам. Баллы и личные ответы не передаются в ссылке.",
    google: "Войти через Google", hint: "Подтянуть сохранённые тесты и прогресс из личного кабинета.",
    member: "Вход в кабинет подтверждён", account: "Мои тесты и сохранённые результаты",
    checking: "Проверяем вход…", error: "Не удалось начать вход через Google. Бесплатные тесты по-прежнему доступны.",
    private: "Вход необязателен. Личные результаты открываются только в защищённом кабинете." },
  es: { heading: "Pruebas según tus prioridades",
    intro: "Las pruebas se ordenan por los temas elegidos. Las respuestas y puntuaciones no aparecen en el enlace.",
    google: "Entrar con Google", hint: "Recupera tus pruebas y tu progreso en el espacio privado.",
    member: "Sesión verificada", account: "Abrir mis pruebas y resultados",
    checking: "Comprobando sesión…", error: "No se pudo iniciar Google. Las pruebas gratuitas siguen disponibles.",
    private: "Entrar es opcional. Los resultados solo se cargan en tu espacio privado." },
} as const;

export function TestExplorerGoogleBanner({ locale, hasFocus }: { locale: PublicLocale; hasFocus: boolean }) {
  const t = copy[locale];
  const cabinetLocale = locale === "es" ? "en" : locale;
  const [access, setAccess] = useState<"checking" | "member" | "guest">("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void appFetch("auth/status", undefined, "GET", { signal: controller.signal })
      .then(value => { if (!controller.signal.aborted) setAccess(value?.signedIn === true ? "member" : "guest"); })
      .catch(() => { if (!controller.signal.aborted) setAccess("guest"); });
    return () => controller.abort();
  }, []);

  async function startGoogle() {
    if (busy) return;
    setBusy(true); setError(false);
    try {
      const result = await appFetch("auth/start", { locale: cabinetLocale, continueTo: "my-tests" });
      const redirect = new URL(result.redirectUrl);
      if (redirect.protocol !== "https:" || redirect.username || redirect.password)
        throw new Error("INVALID_GOOGLE_REDIRECT");
      window.location.assign(redirect.href);
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  return <section className={styles.banner} data-test-explorer-google-banner aria-label={t.heading}>
    <div className={styles.content}>
      <strong>{t.heading}</strong>
      <p>{hasFocus ? t.intro : t.private}</p>
      <small><ShieldCheck size={15} aria-hidden="true" />{t.private}</small>
    </div>
    <div className={styles.actions}>
      {access === "member" ? <>
        <span className={styles.member}><ShieldCheck size={16} aria-hidden="true" />{t.member}</span>
        <Link className={styles.google} href={"/" + cabinetLocale + "/app/tests"} prefetch={false}>
          {t.account}<ArrowRight size={18} aria-hidden="true" />
        </Link>
      </> : <button type="button" className={styles.google} disabled={busy || access === "checking"}
        data-test-explorer-google-signin onClick={startGoogle}>
        <LockKeyhole size={18} aria-hidden="true" />{access === "checking" ? t.checking : t.google}
        <ArrowRight size={18} aria-hidden="true" />
      </button>}
      {access !== "member" ? <span className={styles.hint}>{t.hint}</span> : null}
      {error ? <p role="alert" className={styles.error}>{t.error}</p> : null}
    </div>
  </section>;
}
