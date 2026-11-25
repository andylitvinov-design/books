import Link from "next/link";
import styles from "./dao-hexagrams.module.css";

const copy = {
  ru: { name: "Даосское гадание · 64 гексаграммы", hint: "Задайте вопрос, выберите номер или откройте любую карточку" },
  en: { name: "Daoist divination · 64 hexagrams", hint: "Ask a question, choose a number or browse the illustrated cards" },
  es: { name: "Oráculo taoísta · 64 hexagramas", hint: "Haz una pregunta, elige un número o explora las tarjetas ilustradas" },
} as const;

export function DaoHexagramLibraryLink({ locale }: { locale: "ru" | "en" | "es" }) {
  return (
    <Link className={styles.libraryLink} href={"/" + locale + "/library?view=dao"}>
      <span className={styles.libraryLinkSymbol} aria-hidden="true">☯</span>
      <span><strong>{copy[locale].name}</strong><small>{copy[locale].hint}</small></span>
      <span aria-hidden="true" style={{ marginLeft: "auto" }}>→</span>
    </Link>
  );
}
