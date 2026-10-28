import Link from "next/link";
import { Download, Smartphone } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./free-mobile-app-banner.module.css";

const copy = {
  en: {
    eyebrow: "HOLISTIC HOUSE · FREE APP",
    title: "Keep Holistic House on your phone",
    description: "See iPhone and Android app download options. Signed native releases will appear after verification; the free web version works today.",
    action: "App downloads", 
  },
  ru: {
    eyebrow: "HOLISTIC HOUSE · БЕСПЛАТНО",
    title: "Holistic House на вашем телефоне",
    description: "Выберите приложение для iPhone или Android. Подписанные версии появятся после проверки, а веб-версия доступна уже сейчас.",
    action: "Скачать приложение", 
  },
  es: {
    eyebrow: "HOLISTIC HOUSE · APP GRATIS",
    title: "Holistic House en tu teléfono",
    description: "Consulta las opciones para iPhone y Android. Las versiones nativas se publicarán tras las pruebas; la versión web ya está disponible.",
    action: "Descargar aplicación", 
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
