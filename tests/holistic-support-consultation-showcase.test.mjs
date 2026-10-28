import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const gallery = read("components/holistic-support-master-gallery.tsx");
const css = read("components/holistic-support-master-gallery.module.css");
const publicOffers = read("lib/practitioners/public-remote-support-masters.ts");
const endpoint = read("app/api/public/remote-energy-support-masters/route.ts");

test("consultation showcase shares scenic gallery while preserving Reiki and master flows", () => {
  assert.match(gallery, /data-support-consultation-categories/);
  assert.match(gallery, /data-support-consultation-hero/);
  assert.match(gallery, /data-support-master-hero=\{id\(selected\)\}/);
  assert.match(gallery, /data-support-master-rail/);
  assert.match(gallery, /data-support-master-thumb=\{id\(entry\)\}/);
  assert.match(gallery, /data-support-reiki-central/);
  assert.match(gallery, /<RemoteEnergySupportBooking/);
  assert.match(gallery, /data-support-offer-request/);
  assert.match(gallery, /href=\{selectedOffer.href\}/);
});

test("category, practitioner, format and price filters use only published offer fields", () => {
  for (const key of ['"all"', '"psycho"', '"imagery"', '"constellations"', '"business"']) {
    assert.ok(gallery.includes(key), "category " + key);
  }
  for (const label of ["Психогомеопатия", "Гайдед имажери", "Системные расстановки",
    "Бизнес-консалтинг", "Psycho-homeopathy", "Imágenes guiadas"]) {
    assert.ok(gallery.includes(label), label);
  }
  for (const control of ["data-support-consultation-master", "data-support-consultation-format",
    "data-support-offer-price-filter", "data-support-consultation-details"]) {
    assert.ok(gallery.includes(control), control);
  }
  assert.match(gallery, /offer.practitionerName !== consultMaster/);
  assert.match(gallery, /offer.deliveryFormat !== consultFormat/);
  assert.match(gallery, /matchesConsultationCategory\(offer, consultCategory\)/);
  assert.match(gallery, /offer.pricingMode !== "contact"/);
  assert.match(gallery, /setConsultCategory\("all"\)/);
});

test("photos and presentation links come only from published service data or bundled assets", () => {
  assert.match(publicOffers, /service.status === "published" && service.active/);
  assert.match(publicOffers, /\["session", "assessment", "intro"\]/);
  assert.match(publicOffers, /isPublicPresentationUrl\(intro.media.url\)/);
  assert.match(publicOffers, /publicConsultationPhoto/);
  assert.match(publicOffers, /deliveryFormat: service.deliveryFormat/);
  assert.match(publicOffers, /photos: \[\.\.\.new Set/);
  assert.match(gallery, /consultationCover\(offer\)/);
  assert.match(gallery, /selectedOffer.presentations\[0\].url/);
  assert.match(gallery, /rel="noopener noreferrer"/);
  assert.match(gallery, /consultationPrice\(offer\)/);
  assert.match(endpoint, /listPublishedConsultationOffers\(locale\)/);
});

test("responsive services preserve horizontal scroll, 320-430 touch layout and accessible buttons", () => {
  assert.match(css, /\.consultCategoryRail \{ display:flex/);
  assert.match(css, /scroll-snap-type:x mandatory/);
  assert.match(css, /\.consultFilters \{ display:grid/);
  assert.match(css, /\.consultCard\[aria-pressed="true"\]/);
  assert.match(css, /\.hero\[data-support-consultation-hero="true"\]/);
  assert.match(css, /@media\(max-width:640px\)/);
  assert.match(css, /@media\(max-width:350px\)/);
  assert.match(gallery, /aria-pressed=\{consultCategory === category\}/);
  assert.match(gallery, /aria-expanded=\{consultDetailsOpen\}/);
  assert.match(gallery, /c.notice/);
});

test("modified TSX and published source transpile without parser errors", () => {
  for (const [name, text] of [
    ["gallery.tsx", gallery], ["public-remote-support-masters.ts", publicOffers],
  ]) {
    const result = ts.transpileModule(text, { fileName: name, reportDiagnostics: true,
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext } });
    assert.deepEqual((result.diagnostics ?? [])
      .filter(d => d.category === ts.DiagnosticCategory.Error)
      .map(d => ts.flattenDiagnosticMessageText(d.messageText, " ")), [], name);
  }
});
