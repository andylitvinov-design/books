import registry from "@/data/public-card-artwork-urls.json";

// Public, reviewed marketing/course/book illustrations only.
// Private user or client media must never be introduced into this registry.
const images = registry.images as Record<string, { thumb: string; feature: string }>;
const books = registry.books as Record<string, string>;

export function cardArtworkUrl(source: string, size: "thumb" | "feature" = "thumb"): string {
  return images[source]?.[size] ?? source;
}

export function hasCardArtwork(source: string): boolean {
  return Object.prototype.hasOwnProperty.call(images, source);
}

export function bookCoverArtworkUrl(id: string, fallback: string): string {
  return books[id] ?? fallback;
}

export function hasBookCoverArtwork(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(books, id);
}
