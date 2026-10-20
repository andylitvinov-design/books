import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (...parts) => readFileSync(path.join(root, ...parts), "utf8");

test("public consultation CTA uses compact buttons and clean external-link icons", () => {
  const component = read("components", "public-consultation-cta.tsx");
  const styles = read("app", "globals.css");

  assert.match(component, /ContactChannelChooser/);
  assert.doesNotMatch(component, />↗</);
  assert.match(styles, /\.public-consultation-cta\s*\{[^}]*border-radius:\s*20px/);
  assert.match(styles, /\.public-consultation-cta__actions a\s*\{[^}]*min-height:\s*42px/);
  assert.match(styles, /\.public-consultation-cta__actions a svg\s*\{[^}]*width:\s*15px/);
  assert.match(styles, /@media \(max-width: 520px\)[\s\S]*?\.public-consultation-cta__actions a\s*\{[^}]*min-height:\s*40px/);
});

test("public personal and reading CTAs use the compact blue topic selector, while training stays contextual", () => {
  const component = read("components", "public-consultation-cta.tsx");
  const consultation = read("components", "consultation-choice-capture.tsx");
  const css = read("components", "consultation-choice-capture.module.css");
  assert.match(component, /mode !== "training"/);
  assert.match(component, /<ConsultationChoiceCapture locale=\{locale\} variant=\{mode === "reading" \? "reading" : "personal"\} id=\{id\}/);
  assert.match(component, /trainingEnquiryUrl\(locale, pathname\)/);
  assert.match(component, /<ContactChannelChooser locale=\{locale\}/);
  assert.match(consultation, /data-consultation-cta=\{sitewide \? undefined : "true"\}/);
  assert.match(css, /background:#e66d50/);
  assert.match(css, /linear-gradient\(125deg, #e9f7fe/);
});

test("dedicated Services always exposes paid and express booking choices at the linked hash", () => {
  const home = read("components", "holistic-house-home.tsx");
  const page = read("app", "[locale]", "services", "page.tsx");
  const cta = read("components", "public-consultation-cta.tsx");
  assert.match(home, /\/services#consultation/);
  assert.match(home, /services\/free-situation-review/);
  assert.match(page, /<PublicConsultationCta locale=\{locale as Locale\} id="consultation" serviceBooking wiseEnabled=\{wisePaymentsEnabled\(\)\} paypalPersonalEnabled=\{personalPayPalEnabled\(\)\} \/>/);
  assert.match(read("app", "es", "page.tsx"), /href="\/es\/services#consultation"/);
  assert.match(read("app", "es", "services", "page.tsx"), /<PublicConsultationCta locale="es" id="consultation" serviceBooking wiseEnabled=\{wisePaymentsEnabled\(\)\} paypalPersonalEnabled=\{personalPayPalEnabled\(\)\} \/>/);
  assert.match(cta, /serviceBooking = false/);
  assert.match(cta, /if \(serviceBooking\) return <ConsultationCartEntry locale=\{locale\} id=\{id\} \/>/);
  assert.match(read("components", "commerce", "consultation-cart-entry.tsx"), /publicServiceCatalog\(locale\)/);
  assert.match(read("components", "commerce", "consultation-cart-entry.tsx"), /data-service-product=/);
});
