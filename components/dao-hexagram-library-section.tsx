import { DaoDivinationPanel } from "@/components/dao-divination-panel";
import { DaoHexagramDirectory, type DaoHexagramEntry } from "@/components/dao-hexagram-directory";
import { archivePhotoFor, hexagramEssence, hexagramTitle, hexagrams } from "@/data/dao-hexagrams.mjs";
import authorRecords from "@/data/dao-hexagram-author.json";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./dao-hexagrams.module.css";

const authorByNumber = new Map(authorRecords.map((record) => [record.number, record]));
const copy = {
  ru: { title: "Все 64 символа", lead: "Карточки И-Цзин с изображениями: авторские трактовки и традиционные справочные значения. Нажмите на карту, чтобы открыть её отдельную страницу." },
  en: { title: "All 64 symbols", lead: "An illustrated I Ching directory. Browse verified original readings and traditional reference entries, each on its own page." },
  es: { title: "Los 64 símbolos", lead: "Un catálogo ilustrado del I Ching. Descubre interpretaciones originales y referencias tradicionales, cada una con su propia página." },
} as const;

export function DaoHexagramLibrarySection({ locale }: { locale: PublicLocale }) {
  const entries: DaoHexagramEntry[] = hexagrams.map((item) => {
    const author = authorByNumber.get(item.number);
    return {
      number: item.number, hanzi: item.hanzi, ru: item.ru, en: item.en, es: item.es,
      title: hexagramTitle(item, locale), upper: item.upper, lower: item.lower,
      essence: hexagramEssence(item, locale), photo: archivePhotoFor(item, author?.photo),
      author: Boolean(author),
    };
  });
  return (
    <div>
      <DaoDivinationPanel locale={locale} />
      <section aria-labelledby="dao-library-all-cards">
        <div className={styles.catalogueHeading}>
          <h2 id="dao-library-all-cards">{copy[locale].title}</h2>
          <p>{copy[locale].lead}</p>
        </div>
        <DaoHexagramDirectory locale={locale} entries={entries} />
      </section>
    </div>
  );
}
