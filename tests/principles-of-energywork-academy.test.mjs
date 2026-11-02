import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");

test("Academy introduces the new Principles of Energywork course in all public locales", async () => {
  const [page, hub, component, sitemap] = await Promise.all([
    read("app/[locale]/academy/[[...slug]]/page.tsx"),
    read("components/academy-hub.tsx"),
    read("components/principles-of-energywork.tsx"),
    read("app/sitemap.ts"),
  ]);
  assert.match(page, /key === "principles-of-energywork"\) return <PrinciplesOfEnergywork locale=\{locale\}/);
  assert.match(page, /routeKey\(slug\) === "principles-of-energywork"/);
  assert.match(page, /alternates: \{ canonical: path/);
  assert.match(hub, /id: "academy-featured-principles-energywork"/);
  assert.match(hub, /"\/" \+ locale \+ "\/academy\/principles-of-energywork"/);
  assert.match(hub, /if \(direction === "reiki"\)/);
  assert.match(sitemap, /"\/principles-of-energywork"/);
  for (const marker of ["en:", "ru:", "es:", "Free Course Reiki Practitioner: Study & Initiation", "Бесплатный курс «Практик Рейки»: обучение и инициация", "Curso gratis Reiki Practitioner: estudio e iniciación"]) {
    assert.ok(component.includes(marker), "Missing locale or course title: " + marker);
  }
});

test("Three real Academy Reiki systems each have a study link and a separate free entry path", async () => {
  const component = await read("components/principles-of-energywork.tsx");
  const pairs = [
    ["reiki/yggdrasil", "reiki/yggdrasil/free-initiation"],
    ["reiki/tantra-reiki", "reiki/tantra-reiki/free-initiation"],
    ["reiki/kundalini-reiki", "reiki/kundalini-reiki/free-initiation"],
  ];
  for (const [study, free] of pairs) {
    assert.ok(component.includes('study: "' + study + '"'), "Missing full description: " + study);
    assert.ok(component.includes('free: "' + free + '"'), "Missing free flow: " + free);
  }
  assert.match(component, /href=\{academyUrl\(locale, system\.free\)\}/);
  assert.match(component, /href=\{academyUrl\(locale, system\.study\)\}/);
  assert.match(component, /data-reiki-path=\{system\.key\}/);
  assert.match(component, /t\.systemsTitle/);
  assert.match(component, /t\.steps\.map/);
});

test("Kundalini Level 1 has a genuine free request, source manual and visible confirmation boundaries", async () => {
  const [page, course, component, styles, sitemap] = await Promise.all([
    read("app/[locale]/academy/[[...slug]]/page.tsx"),
    read("components/kundalini-reiki-course.tsx"),
    read("components/principles-of-energywork.tsx"),
    read("components/principles-of-energywork.module.css"),
    read("app/sitemap.ts"),
  ]);
  assert.match(page, /key === "reiki\/kundalini-reiki\/free-initiation"\) return <KundaliniFreeInitiation locale=\{locale\}/);
  assert.match(sitemap, /"\/reiki\/kundalini-reiki\/free-initiation"/);
  assert.match(course, /academy\/reiki\/kundalini-reiki\/free-initiation/);
  assert.match(component, /whatsappEnquiryUrl\(\{/);
  assert.match(component, /"data-reiki-free-request": "kundalini"/);
  assert.match(component, /ContactChannelChooser/);
  assert.match(component, /kundalini-reiki-manual-paul-crick\.pdf/);
  assert.match(component, /Andrey confirms availability and the format personally/);
  assert.match(component, /Андрей лично подтвердит/);
  assert.match(component, /Reiki is not a substitute|Рейки не заменяет|Reiki no sustituye/i);
  assert.match(styles, /@media \(max-width: 550px\)/);
  assert.match(styles, /:focus-visible/);
});
