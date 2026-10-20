import Link from "next/link";
import styles from "./dao-hexagrams.module.css";

const copy = {
  ru: { name: "64 гексаграммы И-Цзин", hint: "Фото-карточки, традиционные значения и 12 авторских трактовок" },
  en: { name: "64 I Ching hexagrams", hint: "Photo cards, traditional meanings and 12 original interpretations" },
  es: { name: "64 hexagramas del I Ching", hint: "Tarjetas ilustradas, significados tradicionales y 12 interpretaciones del autor" },
} as const;

export function DaoHexagramLibraryLink({ locale }: { locale: "ru" | "en" | "es" }) {
  return (
    <Link className={styles.libraryLink} href={"/" + locale + "/dao/hexagrams"}>
      <span className={styles.libraryLinkSymbol} aria-hidden="true">☯</span>
      <span><strong>{copy[locale].name}</strong><small>{copy[locale].hint}</small></span>
      <span aria-hidden="true" style={{ marginLeft: "auto" }}>→</span>
    </Link>
  );
}
