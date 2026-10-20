import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(new URL("../" + file, import.meta.url), "utf8");

test("main personal Services changes visible sections by online/in-person mode", () => {
  const page = read("app/[locale]/services/page.tsx");
  const ui = read("components/services-studio-offers.tsx");
  const css = read("components/services-studio-offers.module.css");
  assert.match(page, /<ServicesStudioOffers locale=/);
  assert.match(ui, /"use client"/);
  assert.match(ui, /useState<ServiceMode>\("all"\)/);
  assert.match(ui, /data-services-format-picker/);
  assert.match(ui, /aria-pressed=\{format === value\}/);
  assert.match(ui, /format === "in-person" \? \(/);
  assert.match(ui, /format === "online" \? m\.onlineTitle : format === "in-person" \? m\.inPersonTitle/);
  assert.match(ui, /offer\.id !== "remote-energy-support"/);
  assert.match(ui, /format !== "online" \? \(/);
  for(const route of ["/academy/reiki/tantra-reiki", "/academy/reiki/yggdrasil", "/academy/reiki/kundalini-reiki", "/events"]) {
    assert.ok(ui.includes(route), "Reuse existing page: "+route);
  }
  for(const label of ["Preferred format: Online", "Предпочтительный формат: онлайн", "Modalidad preferida: en línea"])
    assert.ok(ui.includes(label));
  assert.match(css, /\.formatOptions button\{[^}]*min-height:44px/);
  assert.match(css, /@media\(max-width:680px\)/);
});

test("consented service enquiry records preferred format without an extra system", () => {
  const chooser = read("components/contact-channel-chooser.tsx");
  const ui = read("components/services-studio-offers.tsx");
  assert.match(chooser, /requestContext\?: string/);
  assert.match(ui, /requestContext=\{preferredFormat/);
  assert.match(chooser, /description: \[requestContext\?\.trim\(\), description\.trim\(\)\]/);
  assert.match(chooser, /contactConsent: consent/);
});
