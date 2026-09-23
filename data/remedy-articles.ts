import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { books } from "@/data/library";
import type { Remedy } from "@/data/remedies";

export type RemedyArticleLink = {
  title: string;
  bookTitle: string;
  href: string;
};

function decodeText(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^\${}()|[\]\\]/g, "\\$&");
}

function termsFor(remedy: Remedy) {
  const aliases = String(remedy.aliases ?? "").split(";").map((value) => value.trim()).filter(Boolean);
  return [...new Set([
    remedy.canonical_latin_name,
    remedy.russian_common_name,
    ...aliases,
  ].filter(Boolean).map((value) => String(value).trim()).filter((value) => value.length >= 4))];
}

function containsTerm(text: string, terms: string[]) {
  return terms.some((term) => {
    const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(term)}([^\\p{L}\\p{N}]|$)`, "iu");
    return pattern.test(text);
  });
}

export function getRemedyArticleLinks(remedy: Remedy, limit = 10): RemedyArticleLink[] {
  const terms = termsFor(remedy);
  if (!terms.length) return [];

  const results: RemedyArticleLink[] = [];
  const seen = new Set<string>();

  for (const book of books) {
    if (book.id === "alchemy-homeopathy-remedies") continue;
    const filePath = path.join(process.cwd(), book.originalSourceFile);
    if (!existsSync(filePath)) continue;
    const source = readFileSync(filePath, "utf8");

    for (const match of source.matchAll(/<article\b([^>]*)>([\s\S]*?)<\/article>/gi)) {
      const attributes = match[1] ?? "";
      const body = match[2] ?? "";
      const id = attributes.match(/\bid=["']([^"']+)["']/i)?.[1];
      if (!id) continue;
      const text = decodeText(body);
      if (!containsTerm(text, terms)) continue;
      const heading = body.match(/<h[2-5]\b[^>]*>([\s\S]*?)<\/h[2-5]>/i)?.[1];
      const title = decodeText(heading ?? "");
      if (!title) continue;
      const href = `/books/${book.id}#${id}`;
      if (seen.has(href)) continue;
      seen.add(href);
      results.push({ title, bookTitle: book.title, href });
      if (results.length >= limit) return results;
    }
  }

  return results;
}
