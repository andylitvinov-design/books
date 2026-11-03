import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import test from "node:test";
const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");

test("existing verified public About intro poster reuses the static Andy picture and keeps opt-in video", () => {
  const video = read("components/psychic-alchemy-intro-video.tsx");
  assert.match(video, /<StaticPortrait src="\/images\/holistic-house\/andy-about\.png"/);
  assert.doesNotMatch(video, /import Image from "next\/image"/);
  assert.match(video, /onClick=\{\(\) => setActive\(true\)\}/);
  assert.match(video, /https:\/\/app\.heygen\.com\/embeds/);
});

test("Yggdrasil module artwork is always a small verified local source and bypasses dynamic image variants", () => {
  const source = read("components/yggdrasil-module-landing.tsx");
  assert.equal((source.match(/<Image unoptimized src=\{module\.image\}/g)||[]).length,2);
  const map = read("data/academy/yggdrasil-module-map.ts");
  const images = [...map.matchAll(/image: "(\/academy\/reiki-yggdrasil\/source\/[^"]+)"/g)].map(x=>x[1]);
  assert.equal(images.length,7);
  for(const src of images){
    assert.match(src,/^\/academy\/reiki-yggdrasil\/source\//);
    const bytes = statSync(new URL("../public"+src, import.meta.url)).size;
    assert.ok(bytes>1000 && bytes<200000,src+" is too large for direct delivery");
  }
});

test("books use direct precompressed section artwork and prebuilt static catalogue covers", () => {
  const code = read("components/book-catalog.tsx");
  assert.match(code, /<Image\s+unoptimized\s+alt=[\s\S]*?src="\/images\/holistic-house\/books-library\.webp"/);
  assert.match(code, /bookCoverArtworkUrl\(book\.id, "\/media\/" \+ book\.mediaSeries/);
  assert.match(code, /unoptimized=\{hasBookCoverArtwork\(book\.id\)\}/);
  assert.equal(statSync(new URL("../public/images/holistic-house/books-library.webp", import.meta.url)).size,146898);
  assert.doesNotMatch(read("next.config.ts"), /images:\s*\{\s*unoptimized:\s*true/);
});
