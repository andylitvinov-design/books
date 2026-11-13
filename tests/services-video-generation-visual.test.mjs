import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const jsx = read("components/services-video-generation-card.tsx");
const css = read("components/services-video-generation-card.module.css");
const offers = read("components/services-studio-offers.tsx");
test("three accessible, localized Assist videos lead to the real existing editor", () => {
  for (const s of ["Видео-настрой", "Видео-медитация", "Видео-послание",
    "Сгенерировать видео", "Video meditation", "Vídeo meditación",
    "data-assist-video-scenario", "data-assist-video-create"]) assert.ok(jsx.includes(s), s);
  assert.equal((jsx.match(/data-assist-video-scenario=/g) || []).length, 1);
  assert.match(jsx, /holistic-support\/mandala/);
  assert.match(jsx, /create:"Create video"/);
  assert.match(jsx, /create:"Crear vídeo"/);
  assert.match(offers, /offer\.id === "alchemy".*ServicesVideoGenerationCard/);
});
test("approved photographic stills are first-party, small WebP files", () => {
  for (const name of ["intention", "meditation", "message"]) {
    const path = "public/images/holistic-house/assist-video-" + name + ".webp";
    const data = readFileSync(new URL("../" + path, import.meta.url));
    assert.ok(jsx.includes("/images/holistic-house/assist-video-" + name + ".webp"), name);
    assert.equal(data.toString("ascii", 0, 4), "RIFF", name);
    assert.equal(data.toString("ascii", 8, 12), "WEBP", name);
    assert.ok(data.length > 500 && data.length < 12000, name);
  }
  const decoration = read("public/images/holistic-house/assist-video-botanical.svg");
  assert.match(decoration, /^<svg [^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.ok(jsx.includes("assist-video-botanical.svg"));
  assert.match(jsx, /alt=""/);
});
test("compact 320-430px card has safe floral art and one 52px primary CTA", () => {
  assert.match(css, /grid-template-columns:104px minmax\(0,1fr\)/);
  assert.match(css, /height:69px/);
  assert.match(css, /@media\(max-width:355px\)/);
  assert.match(css, /min-height:52px/);
  assert.match(css, /\.cta\{[^}]*white-space:nowrap/);
  assert.match(css, /mask-image:linear-gradient\(to right,transparent/);
  assert.match(css, /\.flora\{width:110px/);
  assert.match(css, /focus-visible/);
});
