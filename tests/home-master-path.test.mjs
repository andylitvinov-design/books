import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const home = read("components/holistic-house-home.tsx");
const spanish = read("app/es/page.tsx");
const widget = read("components/home-master-path.tsx");
const styles = read("components/home-master-path.module.css");

test("all homepage locales remove the top path switch and put a single Master invitation just before footer", () => {
  for (const [source, cta] of [[home, "<HomepageContactCta"], [spanish, "<PublicConsultationCta"]]) {
    assert.equal((source.match(/<HomeMasterPath\b/g) || []).length, 1, "Exactly one Master invitation");
    assert.ok(source.indexOf("<HomeSectionCarousel") < source.indexOf("<HomeFreeDiagnosisBanner"));
    assert.ok(source.indexOf("<HomeFreeDiagnosisBanner") < source.indexOf("<HomeFeaturedWorkspace"));
    assert.ok(source.indexOf("<HomeFeaturedWorkspace") < source.indexOf("<HomeMasterPath"));
    assert.ok(source.indexOf(cta) < source.indexOf("<HomeMasterPath"), "Invitation follows other home CTAs");
    assert.ok(source.indexOf("<HomeMasterPath") < source.indexOf("<footer"), "Invitation precedes footer");
  }
  assert.match(home, /<HomeMasterPath locale=\{locale\} \/>/);
  assert.match(spanish, /<HomeMasterPath locale="es" \/>/);
  assert.match(widget, /data-home-master-invitation/);
  assert.doesNotMatch(widget, /useState|data-home-path-switch|data-home-path-panel|personalTargets/);
});

test("the compact invitation has localized actionable Pro and My Practice links without fake publication", () => {
  const pro = read("app/[locale]/pro/page.tsx");
  const practice = read("components/app/practice-workspace.jsx");
  assert.ok(widget.includes('href={"/" + locale + "/pro"}'));
  assert.ok(widget.includes('href={"/" + accountLocale + "/app/practice?panel=services"}'));
  assert.ok(widget.includes('locale === "es" ? "en" : locale'));
  assert.match(pro, /<ProfiHub locale=\{locale\}/);
  assert.match(practice, /if\(params\.get\('panel'\)==='services'\)\s*\{?\s*setActivePanel\('services'\)/);
  for (const label of ["Become a Master", "Станьте мастером", "Hazte profesional",
    "List my services", "Разместить свои услуги", "Publicar mis servicios"]) {
    assert.ok(widget.includes(label), label);
  }
  assert.match(widget, /reviewed before publication/);
  assert.match(widget, /после модерации/);
  assert.match(widget, /does not grant a professional qualification/);
  assert.doesNotMatch(widget, /fetch\(|sendBeacon|autoPublish|checkout|payment/);
});

test("the footer invitation is compact, photo-led, mobile-accessible and has no duplicated steps", () => {
  assert.match(widget, /<Image[\s\S]*?loading="lazy"/);
  assert.match(widget, /portrait-static\/andy-828-3dcbabded1e9\.webp/);
  assert.match(widget, /data-home-master-action="explore-pro"/);
  assert.match(widget, /data-home-master-action="publish-service"/);
  assert.match(styles, /grid-template-columns: 234px minmax\(0, 1fr\)/);
  assert.match(styles, /@media \(max-width: 640px\)/);
  assert.match(styles, /grid-template-columns: 108px minmax\(0, 1fr\)/);
  assert.match(styles, /min-height: 44px/);
  assert.match(styles, /:focus-visible/);
  assert.doesNotMatch(widget, /<ol|<button|mode === "personal"/);
});
