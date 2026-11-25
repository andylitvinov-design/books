"use client";

import { useEffect, useId, useRef } from "react";
import { ArrowRight, BookOpen, Layers, LockKeyhole, Sparkles, X } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./reiki-join-dialog.module.css";

const copy = {
  en: { badge: "JOIN THE COURSE", title: "Join the Reiki Practitioner Course", intro: "Start your free Reiki journey in your personal Daybook.", course: "Reiki Practitioner", cover: "5 weeks · 3 Reiki systems · Free", lessons: "Online lessons", progress: "Save progress", practices: "Reiki practices", google: "Sign in with Google", action: "and join the course", wait: "Opening Google…", note: "New here? Your free personal account is created automatically.", private: "Secure & private", free: "Free access", close: "Close sign-in window" },
  ru: { badge: "ПРИСОЕДИНИТЬСЯ К КУРСУ", title: "Станьте практиком Рейки", intro: "Начните бесплатный курс в личном дневнике Daybook.", course: "Практик Рейки", cover: "5 недель · 3 системы · Бесплатно", lessons: "Онлайн-уроки", progress: "Ваш прогресс", practices: "Практики Рейки", google: "Войти через Google", action: "и начать курс", wait: "Открываем Google…", note: "Если вы впервые здесь, личный кабинет создастся автоматически и бесплатно.", private: "Конфиденциально", free: "Бесплатный доступ", close: "Закрыть окно входа" },
  es: { badge: "ÚNETE AL CURSO", title: "Únete al curso Reiki Practitioner", intro: "Comienza gratis en tu Daybook personal. Curso disponible en inglés y ruso.", course: "Reiki Practitioner", cover: "5 semanas · 3 sistemas · Gratis", lessons: "Clases en línea", progress: "Guarda tu progreso", practices: "Prácticas Reiki", google: "Accede con Google", action: "y únete al curso", wait: "Abriendo Google…", note: "Si eres nuevo, tu cuenta personal se creará automáticamente y sin coste.", private: "Seguro y privado", free: "Acceso gratuito", close: "Cerrar ventana de acceso" },
} as const;

function GoogleMark() {
  return <svg className={styles.googleMark} aria-hidden="true" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.25 5.48-4.77 7.18l7.73 6C44.4 38.02 46.98 31.86 46.98 24.55z"/>
    <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.28-3.13.78-4.59l-7.97-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.73-6C30.02 37.65 27.25 38.5 24 38.5c-6.26 0-11.57-4.22-13.47-9.91l-7.97 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>;
}

export function ReikiJoinDialog({ locale, busy, error, onGoogle, onDismiss }: { locale: PublicLocale; busy: boolean; error: string; onGoogle: () => void; onDismiss: () => void }) {
  const t = copy[locale] || copy.en;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const node = dialogRef.current;
    const previous = document.activeElement;
    if (node && !node.open) node.showModal();
    return () => {
      if (node?.open) node.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  return <dialog ref={dialogRef} className={styles.dialog} data-reiki-join-dialog aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); if (!busy) onDismiss(); }}
    onClick={event => { if (event.target === event.currentTarget && !busy) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onDismiss(); } }}>
    <div className={styles.inner}>
      <header className={styles.header}>
        <span className={styles.brand}><span className={styles.brandMark} aria-hidden="true" />Holistic House</span>
        <button type="button" className={styles.close} onClick={onDismiss} disabled={busy} aria-label={t.close}><X size={21} aria-hidden="true" /></button>
      </header>
      <div className={styles.hero}>
        <div className={styles.copy}>
          <span className={styles.badge}><BookOpen size={15} aria-hidden="true" />{t.badge}</span>
          <h2 id={titleId}>{t.title}</h2>
          <span className={styles.rule} aria-hidden="true" />
          <p>{t.intro}</p>
        </div>
        <div className={styles.art} aria-hidden="true">
          <div className={styles.tablet}>
            <div className={styles.cover}>
              <span className={styles.coverBrand}>Holistic House</span>
              <strong>{t.course}</strong>
              <small>{t.cover}</small>
              <Sparkles className={styles.coverStar} size={29} />
            </div>
          </div>
        </div>
      </div>
      <div className={styles.features}>
        <div><span><BookOpen size={21} aria-hidden="true" /></span>{t.lessons}</div>
        <div><span><Layers size={21} aria-hidden="true" /></span>{t.progress}</div>
        <div><span><Sparkles size={21} aria-hidden="true" /></span>{t.practices}</div>
      </div>
      <button type="button" className={styles.google} data-reiki-join-google disabled={busy} aria-busy={busy} onClick={onGoogle} autoFocus>
        <GoogleMark /><span>{busy ? t.wait : <>{t.google}<br />{t.action}</>}</span><ArrowRight size={22} aria-hidden="true" />
      </button>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <p className={styles.note}>{t.note}</p>
      <div className={styles.footer}><span><LockKeyhole size={15} aria-hidden="true" />{t.private}</span><span><BookOpen size={15} aria-hidden="true" />{t.free}</span></div>
    </div>
  </dialog>;
}
