import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = file => readFileSync(path.join(root, file), "utf8");
const readImage = location => existsSync(path.join(root, "public", location.slice(1)));
const extracts = (source) => [...source.matchAll(/\/(?:images|library|academy|media)\/[A-Za-z0-9_@/.%-]+\.(?:jpg|jpeg|png|webp|avif|svg)/gi)].map(m => m[0]);
const validateFiles = (file) => {
  const unique = [...new Set(extracts(read(file)))];
  assert.ok(unique.length, "No local images found in " + file);
  for (const src of unique) assert.ok(readImage(src), file + " points to a missing local image: " + src);
  return unique;
};

test("critical photo-first sections use existing local image files, never placeholders", () => {
  for (const file of [
    "components/personal-work-journey.tsx",
    "app/es/services/page.tsx",
    "data/academy/catalog.ts",
    "components/academy-hub.tsx",
    "data/academy/temple-studies-curriculum.ts",
    "app/[locale]/services/page.tsx",
    "components/sitewide-lead-capture.tsx",
    "data/personal-service-pages.ts",
    "app/[locale]/wu-xing/page.tsx",
    "app/es/page.tsx",
  ]) validateFiles(file);
});

test("three personal services show three distinct local illustrations or photos on EN/RU and Spanish routes", () => {
  const shared = read("components/personal-work-journey.tsx");
  const es = read("app/es/services/page.tsx");
  const photos = shared.match(/const photos = \[([\s\S]*?)\];/)?.[1]?.match(/"\/[^"]+\.(?:jpg|webp|png|svg)"/g) || [];
  assert.equal(photos.length, 3);
  assert.equal(new Set(photos).size, 3);
  for (const photo of photos) assert.ok(readImage(photo.slice(1, -1)), "Missing service image: " + photo);
  assert.match(shared, /<Image src=\{photos\[index\]\}/);
  assert.match(shared, /styles\.servicePhoto/);
  const images = [...es.matchAll(/image: "(\/[^"]+\.(?:jpg|png|webp))"/g)].map(m => m[1]);
  assert.equal(images.length, 3);
  assert.equal(new Set(images).size, 3);
  assert.match(es, /services-studio-card-photo/);
  const esHome = read("app/es/page.tsx");
  const esHomePhotos = [...esHome.matchAll(/image: '([^']+)'/g)].map(x => x[1]);
  assert.equal(esHomePhotos.length, 3);
  assert.equal(new Set(esHomePhotos).size, 3);
  assert.match(esHome, /service-home-card-photo/);
});

test("all seven Temple Studies stages use different original local images", () => {
  const source = read("data/academy/temple-studies-curriculum.ts");
  const images = [...source.matchAll(/    image: "(\/[^"]+)"/g)].map(m => m[1]);
  assert.equal(images.length, 7);
  assert.equal(new Set(images).size, 7);
  for (const image of images) assert.ok(readImage(image));
});

test("Academy featured courses and six directions have distinct suitable cover assets", () => {
  const catalog = read("data/academy/catalog.ts");
  const dirImages = [...catalog.matchAll(/\{ id: "(?:reiki|mysteries|symbolic|applied|school|archive)", path: "[^"]+", image: "(\/[^"]+)"/g)].map(m => m[1]);
  assert.equal(dirImages.length, 6);
  assert.equal(new Set(dirImages).size, 6);
  const hub = read("components/academy-hub.tsx");
  assert.match(hub, /mediaForRecord\(record\)/);
  assert.match(hub, /i\.ytimg\.com\/vi\//);
  assert.match(hub, /recordImage\(record, index\)/);
  const decks = hub.slice(hub.indexOf("const imageDeck"), hub.indexOf("function recordImage"));
  for (const [, name, body] of [...decks.matchAll(/  ([a-z]+): \[([\s\S]*?)\],/g)]) {
    const items = [...body.matchAll(/"(\/[^"]+)"/g)].map(x => x[1]);
    assert.ok(items.length >= 4, "Insufficient rotation for " + name);
    assert.equal(items.length, new Set(items).size, "Repeats within " + name);
  }
});

test("editorial images are visually integrated, responsive and appropriately varied", () => {
  assert.match(read("components/personal-work-journey.module.css"), /servicePhoto/);
  assert.match(read("app/es/spanish-public.css"), /services-studio-card-photo/);
  assert.match(read("app/[locale]/services/offerings.module.css"), /editorialPhoto/);
  assert.match(read("app/[locale]/wu-xing/wu-xing-manual.module.css"), /heroPhoto/);
  const context = read("components/sitewide-lead-capture.tsx");
  assert.match(context, /kind === "training"/);
  assert.match(context, /kind === "reading"/);
  assert.match(context, /andy-about\.png/);
  assert.match(context, /books-library\.webp/);
  assert.match(read("app/[locale]/wu-xing/page.tsx"), /source\/eastern-tradition\.png/);
  assert.match(context, /pathname\.includes\("wu-xing"\) \? "\/academy\/reiki-yggdrasil\/source\/temple-studies\.png"/);
  assert.match(read("app/es/page.tsx"), /service-home-hero-photo/);
  const landing = read("components/personal-service-landing.tsx");
  assert.match(landing, /personalServiceImages\[service\]/);
  assert.match(landing, /heroMedia/);
  assert.match(landing, /<Image src=\{personalServiceImages\[service\]\}/);

});
