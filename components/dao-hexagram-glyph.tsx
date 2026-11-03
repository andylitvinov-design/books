import { hexagramLines, trigramInfo } from "@/data/dao-hexagrams.mjs";
import styles from "./dao-hexagrams.module.css";

type Trigram = keyof typeof trigramInfo;

export function DaoHexagramGlyph({ upper, lower, label }: {
  upper: Trigram; lower: Trigram; label: string;
}) {
  const lines = hexagramLines({ upper, lower });
  return (
    <span className={styles.glyph} role="img" aria-label={label}>
      {lines.map((yang: boolean, index: number) => (
        <span aria-hidden="true" key={index} className={yang ? styles.line : styles.line + " " + styles.broken} />
      ))}
    </span>
  );
}
