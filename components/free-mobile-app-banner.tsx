import Link from "next/link";
import { Download, Smartphone } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./free-mobile-app-banner.module.css";

const copy = {
  en: {
    eyebrow: "HOLISTIC HOUSE · FREE APP",
    title: "Keep Holistic House on your phone",
    description: "Install the free Home Screen web app today with Messenger inside. Signed native releases will appear after verification.",
    action: "Install free web app", 
  },
  ru: {
    eyebrow: "HOLISTIC HOUSE · БЕСПЛАТНО",
    title: "Holistic House на вашем телефоне",
    description: "Установите бесплатное веб-приложение на экран iPhone или Android уже сейчас. Мессенджер внутри, нативные версии готовятся.",
    action: "Установить на телефон", 
  },
  es: {
    eyebrow: "HOLISTIC HOUSE · APP GRATIS",
    title: "Holistic House en tu teléfono",
    description: "Instala hoy la aplicación web gratuita en la pantalla de inicio con mensajería. Las versiones nativas aún se preparan.",
    action: "Instalar gratis", 
  },
} as const;

export function FreeMobileAppBanner({locale}: {locale: PublicLocale}) {
  const text = copy[locale];
  return <aside className={styles.banner} aria-label={text.title} data-hh-free-app-banner>
    <span className={styles.symbol} aria-hidden="true"><Smartphone size={25}/></span>
    <div className={styles.copy}>
      <p className={styles.eyebrow}>{text.eyebrow}</p>
      <h2>{text.title}</h2>
      <p className={styles.description}>{text.description}</p>
    </div>
    <Link href={`/${locale}/install`} className={styles.action} prefetch={false} data-hh-free-app-link>
      <Download size={18} aria-hidden="true"/>{text.action}
    </Link>
  </aside>;
}
