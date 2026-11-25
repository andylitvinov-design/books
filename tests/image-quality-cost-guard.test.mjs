import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const config = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
const books = readFileSync(new URL("../components/book-catalog.tsx", import.meta.url), "utf8");

test("Vercel only transforms the default q=75 and WebP format", () => {
  assert.match(config, /qualities:\s*\[75\]/);
  assert.match(config, /formats:\s*\["image\/webp"\]/);
  assert.doesNotMatch(config, /images:\s*\{\s*unoptimized:\s*true/);
  assert.match(books, /bookCoverArtworkUrl\(book\.id, "\/media\/" \+ book\.mediaSeries/);
  assert.match(books, /unoptimized=\{hasBookCoverArtwork\(book\.id\)\}/);
});
