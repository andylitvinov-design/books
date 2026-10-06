import Link from "next/link";

import { books } from "@/data/library";
import { localizedBookText } from "@/data/library-localization";
import { bookToolLinks, getRelatedBookIds, getBookMaterialRole, materialRoleLabel } from "@/data/library-structure";
import type { Locale } from "@/data/remedies";

const copy = {
  ru: {
    title: "Что читать дальше",
    lead: "Связанные материалы без лишнего уровня каталогов.",
    tools: "Рабочие справочники",
  },
  en: {
    title: "Continue reading",
    lead: "Related materials without another layer of folders.",
    tools: "Working references",
  },
} as const;

export function BookRelatedMaterials({ bookId, locale }: { bookId: string; locale: Locale }) {
  const text = copy[locale];
  const related = getRelatedBookIds(bookId)
    .map((id) => books.find((book) => book.id === id))
    .filter(Boolean);
  const tools = bookToolLinks(bookId, locale);

  if (!related.length && !tools.length) return null;

  return (
    <section className="reader-related" aria-labelledby="reader-related-title">
      <div className="reader-related-heading">
        <p>{locale === "ru" ? "Связанные материалы" : "Related materials"}</p>
        <h2 id="reader-related-title">{text.title}</h2>
        <span>{text.lead}</span>
      </div>

      <div className="reader-related-grid">
        {related.map((book) => {
          if (!book) return null;
          const display = localizedBookText(book, locale);
          const role = materialRoleLabel(locale, getBookMaterialRole(book.id));
          return (
            <Link href={"/books/" + book.id + (locale === "en" ? "?lang=en" : "")} key={book.id}>
              <small>{display.category} · {role}</small>
              <strong>{display.title}</strong>
              <span>{locale === "ru" ? "Открыть →" : "Open →"}</span>
            </Link>
          );
        })}
        {tools.map((tool) => (
          <Link className="reader-related-tool" href={tool.href} key={tool.href}>
            <small>{text.tools}</small>
            <strong>{tool.label}</strong>
            <span>{locale === "ru" ? "Открыть →" : "Open →"}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
