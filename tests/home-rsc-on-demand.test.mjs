import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Home removes heavyweight offer catalogues from its critical rendering path",()=>{
 const filters=read("components/home-more-disclosure.tsx");
 const home=read("components/holistic-house-home.tsx");
 const es=read("app/es/page.tsx");
 const dialog=read("components/home-dialog-first.tsx");
 assert.match(home,/<HomeDialogFirst locale=\{locale\}\/>/);
 assert.match(es,/<HomeDialogFirst locale="es"\/>/);
 for(const source of [home,es])
   assert.doesNotMatch(source,/HomeFeaturedWorkspace|HomeMoreDisclosure|HomeSectionCarousel|PersonalTestimonials|ProfileHubTabs|HomePresentationVideoSection|HomeFreeDiagnosisBanner/);
 assert.match(dialog,/data-home-conversation-hero/);
 assert.match(dialog,/data-home-quick-intents/);
 assert.match(filters,/data-home-more-deferred="true"/);
 assert.match(filters,/dynamic\(/);
 assert.match(filters,/ssr: false/);
});

test("filter chips link existing localized routes with compact, accessible styling", () => {
  const jsx = read("components/home-more-disclosure.tsx");
  const css = read("components/home-more-disclosure.module.css");
  // Dynamic localized links resolve through the exact legacy SEO landing routes.
  for (const [id,route] of Object.entries({
    "goals-money":"business","love-relationships":"love",
    "energy-confidence":"energy","stress-anxiety":"stress",
  })) {
    assert.ok(jsx.includes('"' + id + '": "' + route + '"'), id + " => " + route);
  }
  assert.match(jsx,/href=\{"\/" \+ locale \+ "\/explore\/" \+ categoryRoutes\[category\.id/);
  for (const route of ["/services","/academy"]) assert.ok(jsx.includes(route),route);
  for (const label of ["ВЫБЕРИТЕ НАПРАВЛЕНИЕ","CHOOSE YOUR DIRECTION","ELIGE TU DIRECCIÓN"])
    assert.ok(jsx.includes(label));
  for (const style of ["min-height: 44px","@media (max-width: 640px)",":focus-visible","flex-wrap: wrap","prefers-reduced-motion"])
    assert.ok(css.includes(style));
  assert.match(read("components/holistic-house-home.tsx"), /<HomeDialogFirst locale=\{locale\}\/>/);
  assert.match(read("app/es/page.tsx"), /<HomeDialogFirst locale="es"\/>/);
});
