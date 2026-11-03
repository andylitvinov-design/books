import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(join(root,path),"utf8");

test("Service discovery renders local photo-left cards without changing order or detail actions", () => {
  const ui=read("components/services-smart-discovery.tsx");
  const css=read("components/services-smart-discovery.module.css");
  const pages=[read("app/[locale]/services/page.tsx"),read("app/es/services/page.tsx")];
  assert.match(ui,/import Image from "next\/image"/);
  assert.match(ui,/servicePhoto\(service.imagePath,service.areaKey\)/);
  assert.match(ui,/servicePhoto\(item.image,item.areaKey\)/);
  assert.equal((ui.match(/<Image src=\{servicePhoto\(/g)||[]).length,2);
  assert.equal((ui.match(/fill unoptimized loading="lazy"/g)||[]).length,2);
  assert.match(ui,/className=\{styles.editorialDetailsPanel\}/);
  assert.match(ui,/className=\{styles.editorialOrderPanel\}/);
  assert.match(ui,/aria-expanded=\{ordering\}/);
  assert.match(ui,/aria-expanded=\{expanded\}/);
  assert.match(ui,/telegramEnquiryUrlFromWhatsApp/);
  assert.match(css,/\.editorialCard \.servicePhoto\{grid-row:1\/4\}/);
  assert.match(css,/\.suggestion \.servicePhoto\{grid-row:1\/6\}/);
  assert.match(css,/\.editorialCard \.editorialCardActions\{[\s\S]*?grid-column:2;grid-row:3;display:grid/);
  assert.match(css,/\.suggestion \.suggestionActions\{[\s\S]*?grid-column:2;grid-row:5;display:grid/);
  assert.match(css,/@media\(max-width:350px\)\{[\s\S]*?\.editorialCard \.editorialCardActions\{grid-column:1\/-1;grid-row:3\}/);
  for (const page of pages) assert.match(page, /<ServicesStudioOffers/);
  assert.match(read("components/services-directory-page.tsx"), /image: offer.image/);
  assert.match(read("components/services-studio-offers.tsx"), /<Image src=\{offer.image\}/);
});

test("Service discovery uses shipped service photos, not remote stock art", () => {
  const paths=[
    "images/holistic-house/hero-olive-incense.webp",
    "images/holistic-house/distance-homeopathy.webp",
    "images/holistic-house/video-posters/constellations-en-v1.webp",
    "images/holistic-house/video-posters/hypnotherapy-en-v1.webp",
    "academy/reiki-yggdrasil/source/basic-program.jpg",
    "images/tantra-reiki/participant-1-poster.png",
  ];
  for (const path of paths) assert.ok(existsSync(join(root,"public",path)),"Missing shipped service image: "+path);
});
