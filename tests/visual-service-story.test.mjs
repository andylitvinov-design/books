import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("each public personal service has photo or approved click-to-play video on every narrative screen", () => {
  const ui = read("components/personal-service-landing.tsx");
  const routes = ["psychohomeopathy", "imagery-therapy", "systemic-constellations", "business-consulting"];
  for (const route of routes) {
    const page = read("app/[locale]/services/" + route + "/page.tsx");
    assert.match(page, /PersonalServiceLanding/, route);
  }
  assert.match(ui, /data-visual-service-landing="one-screen"/);
  assert.match(ui, /data-service-visual-screen="introduction"/);
  assert.match(ui, /data-service-visual-screen="video"/);
  assert.match(ui, /<ServiceVideoShowcase/);
  assert.match(ui, /<Image src=\{personalServiceImages\[service\]\}/);
  assert.match(ui, /data-service-visual-screen="questions"/);
  assert.match(ui, /data-service-visual-screen=\{`process-\$\{index \+ 1\}`\}/);
  assert.match(ui, /t\.process\.map/);
  assert.match(ui, /data-service-visual-screen="takeaways"/);
  assert.match(ui, /data-service-visual-screen="questions-before-booking"/);
  assert.ok((ui.match(/className=\{styles\.sceneImage\}/g) || []).length >= 4,
    "Each photography-led section must have a real image, not an empty gradient");
});

test("the paid landing ends with opt-in CRM form, rate choices, source attribution and saved receipt", () => {
  const ui = read("components/personal-service-landing.tsx");
  const form = read("components/compact-lead-capture.tsx");
  const css = read("app/sitewide-capture.css");
  assert.match(ui, /data-service-visual-screen="final-capture"/);
  assert.match(ui, /<CompactLeadCapture/);
  assert.match(ui, /sourcePath=\{`\/\$\{locale\}\/services\/\$\{service\}`\}/);
  assert.match(ui, /formatOptions=\{\[/);
  assert.ok(ui.lastIndexOf('data-service-visual-screen="final-capture"') >
    ui.lastIndexOf('data-service-visual-screen="questions-before-booking"'));
  assert.ok(ui.lastIndexOf("<CompactLeadCapture") > ui.lastIndexOf("<ServiceVideoShowcase"));
  assert.match(form, /fetch\("\/api\/service-enquiries"/);
  assert.match(form, /contactConsent: true/);
  assert.match(form, /result\?\.saved !== true/);
  assert.match(form, /setReference\(result\.referenceCode\)/);
  assert.match(css, /data-visual-service-landing/);
  assert.match(css, /data-core-service-visual/);
});

test("other core service details reuse the same photo stages, approved video and final request", () => {
  const ui = read("components/core-service-detail.tsx");
  const form = read("components/compact-lead-capture.tsx");
  assert.match(ui, /data-core-service-visual="one-screen"/);
  assert.match(ui, /data-core-visual-screen="video"/);
  assert.match(ui, /data-core-visual-screen=\{`step-\$\{index \+ 1\}`\}/);
  assert.match(ui, /data-core-visual-screen="limitations"/);
  assert.match(ui, /data-core-visual-screen="final-capture"/);
  assert.ok(ui.lastIndexOf('<CompactLeadCapture') > ui.lastIndexOf('data-core-visual-screen="limitations"'));
  assert.match(ui, /src="\/images\/holistic-house\/andy-about\.png"/);
  assert.match(form, /Contact/);
});

test("portrait 320–430px and reduced-motion styles avoid text-heavy full-height sections", () => {
  const css = read("components/personal-service-landing.module.css");
  const core = read("components/core-service-detail.module.css");
  assert.match(css, /@media\(max-width:767px\)/);
  assert.match(css, /@media\(max-width:350px\)/);
  assert.match(css, /23svh/);
  assert.match(css, /\.capturePortrait/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(core, /@media\(max-width:760px\)/);
  assert.match(core, /@media\(max-width:350px\)/);
  assert.match(core, /\.captureScene/);
});
