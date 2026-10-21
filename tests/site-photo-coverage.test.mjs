import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { servicesStudioContract } from "./helpers/services-studio-contract.mjs";

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

test("critical photo-first sections use existing local image files, never placeholders", async () => {
  for (const file of [
    "components/personal-work-journey.tsx",
    "app/es/services/page.tsx",
    "data/academy/catalog.ts",
    "components/academy-hub.tsx",
    "data/academy/temple-studies-curriculum.ts",
    "data/core-service-offers.ts",
    "components/sitewide-lead-capture.tsx",
    "data/personal-service-pages.ts",
    "app/[locale]/wu-xing/page.tsx",
    "app/es/page.tsx",
  ]) {
    if (file !== "app/es/services/page.tsx") {
      validateFiles(file);
      continue;
    }
    const view = await servicesStudioContract("es");
    const expectedImageById = {
      tests: "/images/holistic-house/course-start-heron.webp",
      situation: "/images/holistic-house/andy-about.png",
      dao: "/academy/reiki-yggdrasil/source/eastern-tradition.png",
      alchemy: "/images/holistic-house/video-posters/constellations-en-v1.webp",
      hypnotherapy: "/images/holistic-house/video-posters/hypnotherapy-en-v1.webp",
      constellations: "/images/holistic-house/video-posters/constellations-en-v1.webp",
      business: "/images/holistic-house/andy-about.png",
      "remote-energy-support": "/academy/reiki-yggdrasil/source/basic-program.jpg",
    };
    assert.deepEqual([...view.cards.map(card => card.props["data-services-studio-card"])].sort(), Object.keys(expectedImageById).sort(), "Actual Spanish studio retains each intended service identity exactly once");
    assert.ok(view.cards.length, "No local images found in " + file);
    for (const card of view.cards) {
      const id = card.props["data-services-studio-card"];
      const photos = view.descendants(card).filter(node => node.type === view.image || node.type === view.portrait);
      assert.equal(photos.length, 1, "Mounted Spanish service card retains its photo: " + id);
      const src = photos[0].props.src;
      assert.equal(typeof src, "string", "Spanish service image is a local source: " + id);
      assert.equal(src, expectedImageById[id], "Spanish service retains its source image: " + id);
      assert.ok(readImage(src), file + " points to a missing local image: " + src);
    }
  }
});

test("personal services retain source images and nine compact Spanish image-left cards", () => {
  const shared = read("components/personal-work-journey.tsx");
  const es = read("app/es/services/page.tsx");
  const photos = shared.match(/const photos = \[([\s\S]*?)\];/)?.[1]?.match(/"\/[^"]+\.(?:jpg|webp|png|svg)"/g) || [];
  assert.equal(photos.length, 3);
  assert.equal(new Set(photos).size, 3);
  for (const photo of photos) assert.ok(readImage(photo.slice(1, -1)), "Missing service image: " + photo);
  assert.match(shared, /<Image src=\{photos\[index\]\}/);
  assert.match(shared, /styles\.servicePhoto/);
  const images = [...es.matchAll(/image: "(\/[^"]+\.(?:jpg|png|webp))"/g)].map(m => m[1]);
  assert.equal(images.length, 9);
  assert.equal(new Set(images).size, 6); // Owner Business landing now uses its approved practitioner portrait.
  assert.match(es, /id: "business", image: "\/images\/holistic-house\/andy-about\.png"/);
  assert.ok(es.includes("/es/services/business-consulting"));
  for (const image of images) assert.ok(readImage(image), "Missing Spanish service image: " + image);
  assert.ok(es.includes("className={offerStyles.photo}"));
  assert.ok(read("components/services-es-offers.module.css").includes("minmax(106px,2fr)"));
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
