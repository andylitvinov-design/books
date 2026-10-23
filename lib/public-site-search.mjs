// Pure public-catalog ranking; no account state, analytics or search-query logging.
export function normalizeSiteSearch(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function safePublicHref(href) {
  return typeof href === "string" && (
    (href.startsWith("/") && !href.startsWith("//") && !href.includes("\\")) ||
    /^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}$/.test(href)
  );
}

/**
 * Every token must occur somewhere within the same *public* item.
 * Titles outrank descriptions; stable order breaks equal-score ties.
 * Only safe on-site paths and verified-format public YouTube URLs are returned.
 */
export function searchPublicItems(entries, rawQuery, limit = 12) {
  const query = normalizeSiteSearch(rawQuery);
  if (query.length < 2 || query.length > 80 || !Array.isArray(entries)) return [];
  const words = query.split(/\s+/u).slice(0, 10);
  const maximum = Math.max(0, Math.min(20, Number.isInteger(limit) ? limit : 12));
  return entries.flatMap((entry, position) => {
    if (!entry || typeof entry.title !== "string" || !safePublicHref(entry.href)) return [];
    const title = normalizeSiteSearch(entry.title);
    const description = normalizeSiteSearch(entry.description);
    const keywords = normalizeSiteSearch(entry.keywords);
    const haystack = [title, description, keywords].join(" ");
    if (!words.every((word) => haystack.includes(word))) return [];
    const score =
      (title === query ? 280 : title.startsWith(query) ? 160 : title.includes(query) ? 100 : 0) +
      words.reduce((total, word) => total + (title.includes(word) ? 40 : description.includes(word) ? 12 : 4), 0) +
      (entry.kind === "service" ? 12 : entry.kind === "course" ? 8 : 0);
    return [{ score, position, item: {
      kind: entry.kind,
      title: entry.title,
      description: String(entry.description ?? "").slice(0, 260),
      href: entry.href,
    } }];
  }).sort((a, b) => b.score - a.score || a.position - b.position).slice(0, maximum).map(({ item }) => item);
}
