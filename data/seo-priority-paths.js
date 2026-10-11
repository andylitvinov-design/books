// Public, human-reviewed, locale-complete SEO landing paths.
// Keep this short: a route must exist, be indexable, and provide genuinely translated content.
// Current routes checked on the Holistic House public site on 2026-10-11.
export const SEO_PRIORITY_LOCALES = Object.freeze(["en", "ru", "es"]);

export const SEO_PRIORITY_PAGE_FAMILIES = Object.freeze([
  Object.freeze({ id: "about", suffix: "/about", priority: 0.8 }),
  Object.freeze({ id: "free-assessment", suffix: "/services/free-situation-review", priority: 0.9 }),
  Object.freeze({ id: "yggdrasil-basic-course", suffix: "/academy/reiki/yggdrasil/basic-course", priority: 0.8 }),
  Object.freeze({ id: "yggdrasil-level-1", suffix: "/academy/reiki/yggdrasil/free-initiation", priority: 0.85 }),
]);

export function getPrioritySitemapEntries(baseUrl) {
  const parsed = new URL(baseUrl);
  if (parsed.protocol !== "https:" || parsed.search || parsed.hash) {
    throw new Error("Public SEO sitemap requires a canonical HTTPS origin");
  }
  const origin = parsed.origin;
  return SEO_PRIORITY_PAGE_FAMILIES.flatMap(({ suffix, priority }) => {
    const languages = Object.fromEntries(
      SEO_PRIORITY_LOCALES.map((locale) => [locale, origin + "/" + locale + suffix]),
    );
    return SEO_PRIORITY_LOCALES.map((locale) => ({
      url: languages[locale],
      changeFrequency: "monthly",
      priority,
      alternates: { languages: { ...languages } },
    }));
  });
}
