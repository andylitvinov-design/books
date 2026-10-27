import Link from "next/link";
import { Download, Smartphone } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./free-mobile-app-banner.module.css";

const copy = {
  en: {
    eyebrow: "HOLISTIC HOUSE · FREE APP",
    title: "Keep Holistic House on your phone",
    description: "Install free on iPhone or Android, without an app store. Open your private Cabinet from its own Home Screen icon.",
    action: "Install for free",
  },
  ru: {
    eyebrow: "HOLISTIC HOUSE · БЕСПЛАТНО",
    title: "Holistic House на вашем телефоне",
    description: "Установите бесплатно на iPhone или Android без магазина приложений. Открывайте личный кабинет с отдельной иконки.",
    action: "Установить бесплатно",
  },
  es: {
    eyebrow: "HOLISTIC HOUSE · APP GRATIS",
    title: "Holistic House en tu teléfono",
    description: "Instala gratis en iPhone o Android, sin tienda de aplicaciones. Abre tu espacio privado desde su propio icono.",
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
