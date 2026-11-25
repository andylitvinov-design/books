"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { appFetch } from "@/lib/app/client-fetch";
import { isNativeHolisticHouse } from "@/lib/native/client";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./principles-of-energywork.module.css";

const copy = {
  ru: { start: "Начать бесплатный курс", wait: "Открываем курс…", note: "Вход через Google для сохранения вашего прогресса.", error: "Не удалось открыть курс. Повторите попытку.", label: "БЕСПЛАТНО · DAYBOOK", title: "Практик Рейки", description: "5 недель · медитации, практики и знакомство с тремя системами Рейки.", details: "Подробнее о курсе" },
  en: { start: "Start free course", wait: "Opening course…", note: "Google sign-in keeps your progress in your profile.", error: "Could not open the course. Please try again.", label: "FREE · DAYBOOK", title: "Reiki Practitioner", description: "5 weeks of meditations, practices and three Reiki traditions.", details: "Explore the course" },
  es: { start: "Empezar gratis (EN)", wait: "Abriendo el curso…", note: "Accede con Google para guardar tu progreso. El curso está disponible en inglés y ruso.", error: "No se pudo abrir el curso. Inténtalo de nuevo.", label: "GRATIS · DAYBOOK", title: "Reiki Practitioner", description: "5 semanas de meditaciones, prácticas y tres tradiciones Reiki (EN/RU).", details: "Ver el curso" },
} as const;

export function reikiLandingPath(locale: PublicLocale) {
  return "/" + locale + "/academy/principles-of-energywork";
}

export function ReikiDaybookStart({ locale, className }: { locale: PublicLocale; className?: string }) {
  const t = copy[locale] || copy.en;
  const language = locale === "ru" ? "ru" : "en";
  const destination = reikiLandingPath(language) + "/daybook";
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function begin() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(false);
    try {
      try {
        // A verified existing account must not be asked to register again.
        await appFetch("bootstrap?view=portrait");
        window.location.assign(destination);
        return;
      } catch (failure: unknown) {
        if ((failure as { status?: number })?.status !== 401) throw failure;
      }
      const native = isNativeHolisticHouse();
      const response = await appFetch("auth/start", {
        locale: language, continueTo: "energywork-daybook", ...(native ? { native: true } : {}),
      }, "POST");
      if (!response?.redirectUrl || new URL(response.redirectUrl).protocol !== "https:") {
        throw new Error("BAD_OAUTH_URL");
      }
      if (native) {
        const { Browser } = await import("@capacitor/browser");
        await Browser.open({ url: response.redirectUrl });
      } else {
        window.location.assign(response.redirectUrl);
      }
    } catch {
      setError(true);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return <div className={styles.reikiEntry}>
    <button type="button" className={className || styles.primaryButton} onClick={() => void begin()} disabled={busy} data-reiki-start-free aria-busy={busy}>
      <BookOpen size={20} aria-hidden="true" />{busy ? t.wait : t.start}<ArrowRight size={19} aria-hidden="true" />
    </button>
    <small>{t.note}</small>
    {error && <p role="alert" className={styles.reikiEntryError}>{t.error}</p>}
  </div>;
}

export function ReikiProfileCourseCard({ locale }: { locale: PublicLocale }) {
  const t = copy[locale] || copy.en;
  return <Link href={reikiLandingPath(locale)} prefetch={false} className={styles.profileReikiCard} data-clarity-reiki-practitioner>
    <span className={styles.profileReikiPhoto} aria-hidden="true"><Sparkles size={24} /></span>
    <span className={styles.profileReikiText}><small>{t.label}</small><strong>{t.title}</strong><span>{t.description}</span><b>{t.details}</b></span>
    <ArrowRight size={20} aria-hidden="true" />
  </Link>;
}
