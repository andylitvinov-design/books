import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicSiteHeader } from "@/components/public-site-header";
import { TaoistTalismanCatalog } from "@/components/taoist-talisman-catalog";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";
import styles from "@/components/holistic-support-standalone.module.css";

type Props = { params: Promise<{ locale: string }> };
const copy = {
  en: {
    back: "Holistic Support", kicker: "SYMBOLIC PRACTICES · DAOIST FU",
    title: "Daoist talismans", lead: "Explore the illustration and meaning of each Fu-style symbol, then choose a practitioner to ask about a personal piece.",
    note: "These are illustrative designs, not ready-to-ship stock. The practitioner must confirm feasibility, price and delivery. An enquiry is not an order or payment.",
  },
  ru: {
    back: "Холистическая поддержка", kicker: "СИМВОЛИЧЕСКИЕ ПРАКТИКИ · ДАОССКИЕ ФУ",
    title: "Даосские талисманы", lead: "Сначала выберите талисман по фотографии и описанию. Ниже сразу показаны мастера, которым можно отправить запрос на изготовление.",
    note: "Изображения иллюстративные — это не готовые товары. Изготовление, цену и доставку мастер подтвердит отдельно. Заявка не является покупкой или оплатой.",
  },
  es: {
    back: "Apoyo holístico", kicker: "PRÁCTICAS SIMBÓLICAS · FU TAOÍSTAS",
    title: "Talismanes taoístas", lead: "Explora la imagen y el significado de cada símbolo Fu. Después, elige un profesional para consultar por una pieza personal.",
    note: "Son diseños ilustrativos, no artículos en stock. El profesional debe confirmar fabricación, precio y entrega. Una consulta no es una compra ni un pago.",
  },
} as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return { title: "Not found", robots: { index: false } };
  return {
    metadataBase: metadataBaseFor(),
    title: copy[locale].title + " | Holistic House",
    description: copy[locale].lead,
    alternates: {
      canonical: "/" + locale + "/talismans",
      languages: { en: "/en/talismans", ru: "/ru/talismans", es: "/es/talismans", "x-default": "/en/talismans" },
    },
  };
}

export default async function TalismansPage({ params }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  const t = copy[locale];
  return (
    <main className={styles.page} data-talisman-standalone-page lang={locale}>
      <PublicSiteHeader locale={locale} />
      <div className={styles.shell}>
        <nav className={styles.breadcrumb} aria-label={t.back}>
          <Link href={"/" + locale + "/holistic-support"} prefetch={false}>← {t.back}</Link>
        </nav>
        <header className={styles.hero}>
          <p className={styles.kicker}>{t.kicker}</p>
          <h1>{t.title}</h1>
          <p>{t.lead}</p>
        </header>
        <TaoistTalismanCatalog locale={locale} standalone />
        <p className={styles.disclaimer} role="note">{t.note}</p>
      </div>
    </main>
  );
}
