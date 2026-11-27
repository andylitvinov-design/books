"use client";

import { useEffect, useId, useRef } from "react";
import { ArrowRight, BookOpen, Layers, LockKeyhole, Sparkles, X } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./reiki-join-dialog.module.css";

const coachCopy = {
  en: { badge: 'MY COACH', title: 'Sign in / create your account', intro: 'Continue with your chosen coach in your personal Holistic House account.', course: 'My Coach', cover: 'Your personal Daybook', lessons: 'Your coach', progress: 'Save progress', practices: 'Private sessions', google: 'Sign in with Google', action: 'and continue', wait: 'Opening Google…', note: 'A free account is created automatically if you are new. Your sessions stay private; no mailing subscription.', private: 'Secure & private', free: 'Free account', close: 'Close sign-in window' },
  ru: { badge: 'MY COACH', title: 'Войти / создать кабинет', intro: 'Продолжите с выбранным коучем в личном кабинете Holistic House.', course: 'My Coach', cover: 'Ваш личный Daybook', lessons: 'Ваш коуч', progress: 'Ваш прогресс', practices: 'Личные сессии', google: 'Войти через Google', action: 'и продолжить', wait: 'Открываем Google…', note: 'Если вы здесь впервые, бесплатный кабинет создаётся автоматически. Сессии остаются личными; без подписки на рассылку.', private: 'Конфиденциально', free: 'Бесплатный кабинет', close: 'Закрыть окно входа' },
  es: { badge: 'MY COACH', title: 'Accede / crea tu cuenta', intro: 'Continúa con tu coach en tu cuenta personal de Holistic House.', course: 'My Coach', cover: 'Tu Daybook personal', lessons: 'Tu coach', progress: 'Guarda tu progreso', practices: 'Sesiones privadas', google: 'Accede con Google', action: 'y continúa', wait: 'Abriendo Google…', note: 'Si eres nuevo, se crea una cuenta gratuita automáticamente. Tus sesiones son privadas; sin suscripción a correos.', private: 'Seguro y privado', free: 'Cuenta gratuita', close: 'Cerrar ventana de acceso' },
} as const;

const copy = {
  en: { badge: "JOIN THE COURSE", title: "Join the Reiki Practitioner Course", intro: "Start your free Reiki journey in your personal Daybook.", course: "Reiki Practitioner", cover: "5 weeks · 3 Reiki systems · Free", lessons: "Online lessons", progress: "Save progress", practices: "Reiki practices", google: "Sign in with Google", action: "and join the course", wait: "Opening Google…", note: "Your free account is created automatically. Name and email are saved in Academy CRM for enrollment. Your journal stays private; no mailing subscription.", private: "Secure & private", free: "Free access", close: "Close sign-in window" },
  ru: { badge: "ПРИСОЕДИНИТЬСЯ К КУРСУ", title: "Станьте практиком Рейки", intro: "Начните бесплатный курс в личном дневнике Daybook.", course: "Практик Рейки", cover: "5 недель · 3 системы · Бесплатно", lessons: "Онлайн-уроки", progress: "Ваш прогресс", practices: "Практики Рейки", google: "Войти через Google", action: "и начать курс", wait: "Открываем Google…", note: "Бесплатный кабинет создаётся автоматически. Имя и email сохраняются в CRM Академии для записи на курс. Дневник личный, без рассылок.", private: "Конфиденциально", free: "Бесплатный доступ", close: "Закрыть окно входа" },
  es: { badge: "ÚNETE AL CURSO", title: "Únete al curso Reiki Practitioner", intro: "Comienza gratis en tu Daybook personal. Curso disponible en inglés y ruso.", course: "Reiki Practitioner", cover: "5 semanas · 3 sistemas · Gratis", lessons: "Clases en línea", progress: "Guarda tu progreso", practices: "Prácticas Reiki", google: "Accede con Google", action: "y únete al curso", wait: "Abriendo Google…", note: "Tu cuenta gratuita se crea automáticamente. Nombre y correo se guardan en el CRM de la Academia para la inscripción. Diario privado, sin suscripción a correos.", private: "Seguro y privado", free: "Acceso gratuito", close: "Cerrar ventana de acceso" },
} as const;

function GoogleMark() {
  return <svg className={styles.googleMark} aria-hidden="true" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.25 5.48-4.77 7.18l7.73 6C44.4 38.02 46.98 31.86 46.98 24.55z"/>
    <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.28-3.13.78-4.59l-7.97-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.73-6C30.02 37.65 27.25 38.5 24 38.5c-6.26 0-11.57-4.22-13.47-9.91l-7.97 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>;
}

export function ReikiJoinDialog({ locale, busy, error, onGoogle, onDismiss, mode = 'reiki' }: { locale: PublicLocale; busy: boolean; error: string; onGoogle: () => void; onDismiss: () => void; mode?: 'reiki' | 'coach' }) {
  const words = mode === 'coach' ? coachCopy : copy;
  const t = words[locale] || words.en;
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
  return <dialog ref={dialogRef} className={styles.dialog} data-reiki-join-dialog={mode === 'reiki' ? true : undefined} data-hh-google-join={mode} aria-labelledby={titleId}
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
      <p className={styles.note}>{t.note}</p>
      <button type="button" className={styles.google} data-reiki-join-google={mode === 'reiki' ? true : undefined} data-hh-google-join-action disabled={busy} aria-busy={busy} onClick={onGoogle} autoFocus>
        <GoogleMark /><span>{busy ? t.wait : <>{t.google}<br />{t.action}</>}</span><ArrowRight size={22} aria-hidden="true" />
      </button>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.footer}><span><LockKeyhole size={15} aria-hidden="true" />{t.private}</span><span><BookOpen size={15} aria-hidden="true" />{t.free}</span></div>
    </div>
  </dialog>;
}
